'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SymbolAnalytics } from '@/services/analyticsEngine';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';
import { 
  IconTrendingUp, 
  IconTrendingDown,
  IconChartBar,
  IconCalendarStats,
  IconCurrencyDollar,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons-react';

export default function AnalyticsPage() {
  const [symbolAnalytics, setSymbolAnalytics] = useState<Map<string, SymbolAnalytics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Load both analytics and trade data to get connected cycles
      const [analyticsResponse, tradesResponse] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/trades')
      ]);
      
      const analyticsData = await analyticsResponse.json();
      const tradesData = await tradesResponse.json();
      
      if (analyticsData.error) {
        console.error('Error loading analytics:', analyticsData.error);
        return;
      }
      
      const analyticsMap = new Map();
      Object.entries(analyticsData.symbolAnalytics).forEach(([symbol, analytics]) => {
        analyticsMap.set(symbol, analytics);
      });
      
      setSymbolAnalytics(analyticsMap);
      
      // Connected cycles no longer needed - each PUT starts a new cycle
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const symbols = Array.from(symbolAnalytics.keys());
  const symbolPerformance = symbols.map(symbol => {
    const analytics = symbolAnalytics.get(symbol)!;
    return {
      symbol,
      netIncome: analytics.netIncome,
      winRate: analytics.winRate,
      activeCycles: analytics.activeCycles,
      completedCycles: analytics.completedCycles,
      avgPremium: analytics.averagePremiumPerTrade
    };
  }).sort((a, b) => b.netIncome - a.netIncome);

  // Get time series data
  const getTimeSeriesData = () => {
    if (selectedSymbol === 'all') {
      // Aggregate all symbols
      const aggregatedData = new Map<string, { date: Date, income: number, fees: number, netIncome: number }>();
      
      symbolAnalytics.forEach((analytics) => {
        const data = timeframe === 'weekly' ? analytics.weeklyBreakdown : analytics.monthlyBreakdown;
        data.forEach(item => {
          const dateObj = new Date(item.date);
          const key = dateObj.toISOString();
          if (!aggregatedData.has(key)) {
            aggregatedData.set(key, {
              date: dateObj,
              income: 0,
              fees: 0,
              netIncome: 0
            });
          }
          const existing = aggregatedData.get(key)!;
          existing.income += item.income;
          existing.fees += item.fees;
          existing.netIncome += item.netIncome;
        });
      });
      
      return Array.from(aggregatedData.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(item => ({
          ...item,
          dateStr: format(item.date, timeframe === 'weekly' ? 'MMM dd' : 'MMM yyyy')
        }));
    } else {
      const analytics = symbolAnalytics.get(selectedSymbol);
      if (!analytics) return [];
      
      const data = timeframe === 'weekly' ? analytics.weeklyBreakdown : analytics.monthlyBreakdown;
      return data.map(item => ({
        ...item,
        date: new Date(item.date),
        dateStr: format(new Date(item.date), timeframe === 'weekly' ? 'MMM dd' : 'MMM yyyy')
      }));
    }
  };

  const timeSeriesData = getTimeSeriesData();

  // Colors for pie chart
  const COLORS = ['#7469b6', '#64b5f6', '#fd7676', '#ffc658', '#8dd1e1', '#d084d0'];

  const toggleSymbolExpansion = (symbol: string) => {
    const newExpanded = new Set(expandedSymbols);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedSymbols(newExpanded);
  };

  const togglePeriodExpansion = (period: string) => {
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(period)) {
      newExpanded.delete(period);
    } else {
      newExpanded.add(period);
    }
    setExpandedPeriods(newExpanded);
  };

  const toggleCycleExpansion = (cycleId: string) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(cycleId)) {
      newExpanded.delete(cycleId);
    } else {
      newExpanded.add(cycleId);
    }
    setExpandedCycles(newExpanded);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">Deep dive into your trading performance</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex gap-4">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-4 py-2 rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:border-primary"
          >
            <option value="all">All Symbols</option>
            {symbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-4 py-2 rounded-lg transition-all ${
                timeframe === 'weekly' ? 'glass-button' : 'bg-muted/50 hover:bg-muted/70'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-4 py-2 rounded-lg transition-all ${
                timeframe === 'monthly' ? 'glass-button' : 'bg-muted/50 hover:bg-muted/70'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-2">
              <IconCurrencyDollar size={24} className="text-primary" />
              <span className="text-sm text-muted-foreground">Total Income</span>
            </div>
            <p className="text-2xl font-bold">
              ${symbolPerformance.reduce((sum, s) => sum + s.netIncome, 0).toFixed(2)}
            </p>
          </div>

          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-2">
              <IconChartBar size={24} className="text-accent" />
              <span className="text-sm text-muted-foreground">Avg Win Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {(symbolPerformance.reduce((sum, s) => sum + s.winRate, 0) / symbolPerformance.length).toFixed(1)}%
            </p>
          </div>

          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-2">
              <IconTrendingUp size={24} className="text-green-500" />
              <span className="text-sm text-muted-foreground">Active Cycles</span>
            </div>
            <p className="text-2xl font-bold">
              {symbolPerformance.reduce((sum, s) => sum + s.activeCycles, 0)}
            </p>
          </div>

          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-2">
              <IconCalendarStats size={24} className="text-orange-500" />
              <span className="text-sm text-muted-foreground">Completed Cycles</span>
            </div>
            <p className="text-2xl font-bold">
              {symbolPerformance.reduce((sum, s) => sum + s.completedCycles, 0)}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Income Over Time */}
          <div className="glass-card p-6 liquid-glass">
            <h3 className="text-lg font-semibold mb-4">Income Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(100, 116, 139, 0.2)" />
                <XAxis dataKey="dateStr" stroke="rgb(100, 116, 139)" />
                <YAxis stroke="rgb(100, 116, 139)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 28, 35, 0.9)', 
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="netIncome" 
                  stroke="#7469b6" 
                  strokeWidth={2}
                  dot={{ fill: '#7469b6', r: 4 }}
                  name="Net Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#64b5f6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Gross Income"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Symbol Performance */}
          <div className="glass-card p-6 liquid-glass">
            <h3 className="text-lg font-semibold mb-4">Symbol Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={symbolPerformance.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(100, 116, 139, 0.2)" />
                <XAxis dataKey="symbol" stroke="rgb(100, 116, 139)" />
                <YAxis stroke="rgb(100, 116, 139)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 28, 35, 0.9)', 
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
                <Bar dataKey="netIncome" fill="#7469b6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Income Distribution */}
          <div className="glass-card p-6 liquid-glass">
            <h3 className="text-lg font-semibold mb-4">Income Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={symbolPerformance.filter(s => s.netIncome > 0).slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="netIncome"
                  label={(entry) => `${entry.symbol}: $${entry.netIncome.toFixed(0)}`}
                >
                  {symbolPerformance.filter(s => s.netIncome > 0).slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(26, 28, 35, 0.9)', 
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Win Rate by Symbol */}
          <div className="glass-card p-6 liquid-glass">
            <h3 className="text-lg font-semibold mb-4">Win Rate by Symbol</h3>
            <div className="space-y-3">
              {symbolPerformance.slice(0, 10).map((item) => (
                <div key={item.symbol} className="flex items-center justify-between">
                  <span className="font-medium">{item.symbol}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted/50 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
                        style={{ width: `${item.winRate}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${item.winRate >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                      {item.winRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expandable Income Tables */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Income Breakdown by Period</h2>
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <h3 className="text-lg font-semibold">{timeframe === 'monthly' ? 'Monthly' : 'Weekly'} Income Details</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {timeSeriesData.map((period, idx) => {
                const periodKey = `${period.dateStr}-${idx}`;
                const isExpanded = expandedPeriods.has(periodKey);
                
                return (
                  <div key={periodKey} className="border-b border-border/30">
                    <div 
                      className="p-4 hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => togglePeriodExpansion(periodKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            <span className="font-medium">{period.dateStr}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Income: </span>
                            <span className="font-medium">${period.income.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fees: </span>
                            <span className="font-medium text-red-500">-${period.fees.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Net: </span>
                            <span className={`font-bold ${period.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${period.netIncome.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="bg-muted/10 p-4">
                        <div className="text-sm space-y-4">
                          {timeframe === 'monthly' ? (
                            <div className="space-y-4">
                              <p className="text-muted-foreground mb-2">Cycle Breakdown:</p>
                              {/* Show individual cycles within this month */}
                              {symbolAnalytics.size > 0 && Array.from(symbolAnalytics.entries()).map(([symbol, analytics]) => {
                                const periodData = analytics.monthlyBreakdown.find(m => format(new Date(m.date), 'MMM yyyy') === period.dateStr);
                                
                                if (!periodData || periodData.cycles.length === 0) return null;
                                
                                return (
                                  <div key={symbol} className="space-y-3">
                                    <h5 className="font-semibold text-primary">{symbol}</h5>
                                    <div className="space-y-2 ml-4">
                                      {periodData.cycles.map((cycle, cycleIdx) => (
                                        <div key={cycle.id || cycleIdx} className="p-3 rounded-lg bg-background/50 border border-border/30">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium">
                                                  {format(new Date(cycle.startDate), 'MMM dd, yyyy')} - 
                                                  {cycle.endDate ? format(new Date(cycle.endDate), 'MMM dd, yyyy') : 'Active'}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                  cycle.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-muted/50'
                                                }`}>
                                                  {cycle.status}
                                                </span>
                                              </div>
                                              <div className="text-xs text-muted-foreground capitalize">
                                                {cycle.cycleType?.replace(/-/g, ' ') || 'N/A'}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-3 gap-3 text-xs">
                                            <div>
                                              <p className="text-muted-foreground">Premium Collected</p>
                                              <p className="font-medium text-green-500">${cycle.totalPremiumCollected.toFixed(2)}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Fees</p>
                                              <p className="font-medium text-red-500">-${cycle.totalFees.toFixed(2)}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Net Profit</p>
                                              <p className={`font-medium ${cycle.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                ${cycle.netProfit.toFixed(2)}
                                              </p>
                                            </div>
                                          </div>
                                          
                                          {cycle.assignmentPrice && (
                                            <div className="mt-2 pt-2 border-t border-border/30 text-xs">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <span className="text-muted-foreground">Assignment: </span>
                                                  <span>{cycle.sharesAssigned || 0} shares @ ${cycle.assignmentPrice.toFixed(2)}</span>
                                                </div>
                                                {cycle.safeStrikePrice && cycle.safeStrikePrice > 0 && (
                                                  <div>
                                                    <span className="text-muted-foreground">Safe Strike: </span>
                                                    <span className="text-green-500">${cycle.safeStrikePrice.toFixed(2)}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }).filter(Boolean)}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-muted-foreground mb-2">Symbol Breakdown:</p>
                              {/* Weekly view - show symbol breakdown only */}
                              {symbolAnalytics.size > 0 && Array.from(symbolAnalytics.entries()).map(([symbol, analytics]) => {
                                const periodData = analytics.weeklyBreakdown.find(w => format(new Date(w.date), 'MMM dd') === period.dateStr);
                                
                                if (!periodData || periodData.netIncome === 0) return null;
                                
                                return (
                                  <div key={symbol} className="flex justify-between items-center py-1 px-3 rounded bg-background/50">
                                    <span className="font-medium">{symbol}</span>
                                    <span className={periodData.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}>
                                      ${periodData.netIncome.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              }).filter(Boolean)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>


        {/* Detailed Symbol Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-lg font-semibold">Detailed Symbol Analytics</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Symbol</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net Income</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Premiums</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Fees</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Win Rate</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Avg Premium</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Active</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Completed</th>
              </tr>
            </thead>
            <tbody>
              {symbolPerformance.map((item) => {
                const analytics = symbolAnalytics.get(item.symbol)!;
                const isExpanded = expandedSymbols.has(item.symbol);
                const totalCycles = item.activeCycles + item.completedCycles;
                
                return (
                  <React.Fragment key={item.symbol}>
                  <tr 
                    className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => toggleSymbolExpansion(item.symbol)}
                  >
                    <td className="py-3 px-4 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {totalCycles > 0 && (
                          isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />
                        )}
                        {item.symbol}
                        {totalCycles > 0 && (
                          <span className="text-xs text-muted-foreground">({totalCycles} cycles)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={item.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}>
                        ${item.netIncome.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">${analytics.totalPremiumCollected.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-500">-${analytics.totalFees.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-medium ${item.winRate >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                        {item.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right">${item.avgPremium.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-right">{item.activeCycles}</td>
                    <td className="py-3 px-4 text-sm text-right">{item.completedCycles}</td>
                  </tr>
                  {isExpanded && analytics.cycleBreakdown && (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <div className="bg-muted/10 p-4">
                          <h4 className="text-sm font-semibold mb-3">Cycle Details for {item.symbol}</h4>
                          <div className="space-y-2">
                            {analytics.cycleBreakdown
                              .sort((a: any, b: any) => {
                                // Sort by endDate for completed cycles, startDate for active cycles
                                if (a.status === 'completed' && b.status === 'completed') {
                                  const aEndDate = a.endDate ? new Date(a.endDate).getTime() : 0;
                                  const bEndDate = b.endDate ? new Date(b.endDate).getTime() : 0;
                                  return bEndDate - aEndDate; // Most recent end date first
                                } else if (a.status === 'active' && b.status === 'active') {
                                  return new Date(b.startDate).getTime() - new Date(a.startDate).getTime(); // Most recent start date first
                                } else {
                                  // Active cycles come before completed cycles
                                  return a.status === 'active' ? -1 : 1;
                                }
                              })
                              .map((cycle: any, idx: number) => {
                                const cycleId = `${item.symbol}-${idx}`;
                                const isExpanded = expandedCycles.has(cycleId);
                                const getCycleFlow = (type: string) => {
                                  switch (type) {
                                    case 'put-expired': return 'PUT (Expired)';
                                    case 'put-assigned-call-expired': return 'PUT → ASSIGNED';
                                    case 'put-assigned-call-assigned': return 'PUT → ASSIGNED → CALL → SOLD';
                                    default: return type?.replace(/-/g, ' ').toUpperCase();
                                  }
                                };
                                
                                return (
                                  <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/30">
                                    <div 
                                      className="flex items-start justify-between mb-2 cursor-pointer"
                                      onClick={() => toggleCycleExpansion(cycleId)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                                        <span className="text-xs font-medium">
                                          {format(new Date(cycle.startDate), 'MMM dd, yyyy')} - 
                                          {cycle.endDate ? format(new Date(cycle.endDate), 'MMM dd, yyyy') : 'Active'}
                                        </span>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        cycle.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-muted/50'
                                      }`}>
                                        {cycle.status}
                                      </span>
                                    </div>
                                    <div className="mb-2">
                                      <p className="text-sm font-medium">{getCycleFlow(cycle.cycleType)}</p>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                      <div>
                                        <p className="text-muted-foreground">Premiums</p>
                                        <p className="font-medium text-green-500">${(cycle.totalPremiumCollected || 0).toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Fees</p>
                                        <p className="font-medium text-red-500">-${(cycle.totalFees || 0).toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Net P&L</p>
                                        <p className={`font-medium ${cycle.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                          ${(cycle.netProfit || 0).toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Trades</p>
                                        <p className="font-medium">{cycle.trades?.length || 0}</p>
                                      </div>
                                    </div>
                                    {isExpanded && cycle.trades && (
                                      <div className="mt-3 pt-3 border-t border-border/20">
                                        <p className="text-xs font-semibold mb-2">Trade Details:</p>
                                        <div className="space-y-1">
                                          {cycle.trades.map((trade: any, tIdx: number) => (
                                            <div key={tIdx} className="text-xs p-2 rounded bg-muted/20">
                                              <div className="flex justify-between">
                                                <span>
                                                  {trade.assetCategory === 'OPT' ? 
                                                    `${trade.putCall} ${trade.strike} exp ${format(new Date(trade.expiry || trade.dateTime), 'MMM dd')}` : 
                                                    `${trade.quantity} shares @ $${trade.tradePrice}`
                                                  }
                                                </span>
                                                <span className={trade.buy_sell === 'SELL' ? 'text-green-500' : 'text-red-500'}>
                                                  {trade.buy_sell}
                                                </span>
                                              </div>
                                              <div className="flex justify-between mt-1 text-muted-foreground">
                                                <span>{format(new Date(trade.dateTime), 'MMM dd, yyyy')}</span>
                                                <span>${Math.abs(trade.netCash).toFixed(2)}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        {cycle.assignmentPrice && (
                                          <div className="mt-2 p-2 rounded bg-primary/10 text-xs">
                                            <p>Assignment: {cycle.sharesAssigned} shares @ ${cycle.assignmentPrice.toFixed(2)}</p>
                                            {cycle.safeStrikePrice && (
                                              <p>Safe Strike: ${cycle.safeStrikePrice.toFixed(2)}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}