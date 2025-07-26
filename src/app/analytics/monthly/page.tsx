'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconTrendingUp, 
  IconTrendingDown,
  IconCalendarEvent,
  IconCoins,
  IconChartLine,
  IconCurrencyDollar
} from '@tabler/icons-react';
import { Trade, WheelCycle } from '@/types/trade';
import { AnalyticsEngine, TimeSeriesData } from '@/services/analyticsEngine';

interface MonthlyData {
  month: Date;
  income: number;
  fees: number;
  netIncome: number;
  trades: Trade[];
  cycles: WheelCycle[];
  weeks: WeeklyData[];
}

interface WeeklyData {
  week: Date;
  weekEnd: Date;
  income: number;
  fees: number;
  netIncome: number;
  trades: Trade[];
  cycles: WheelCycle[];
  symbols: SymbolData[];
}

interface SymbolData {
  symbol: string;
  income: number;
  fees: number;
  netIncome: number;
  trades: Trade[];
  cycles: WheelCycle[];
}

export default function MonthlyAnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cycles, setCycles] = useState<Map<string, WheelCycle[]>>(new Map());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
      if (data.error) {
        console.error('Error loading trade data:', data.error);
        return;
      }

      // Convert dates
      const tradesWithDates = data.trades.map((trade: any) => ({
        ...trade,
        dateTime: new Date(trade.dateTime),
        orderTime: new Date(trade.orderTime),
        openDateTime: new Date(trade.openDateTime),
        reportDate: new Date(trade.reportDate),
        tradeDate: new Date(trade.tradeDate),
        expiry: trade.expiry ? new Date(trade.expiry) : undefined
      }));

      // Convert cycles
      const cyclesMap = new Map();
      Object.entries(data.cycles).forEach(([key, cycles]: [string, any]) => {
        const cyclesWithDates = cycles.map((cycle: any) => ({
          ...cycle,
          startDate: new Date(cycle.startDate),
          endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
          trades: cycle.trades.map((trade: any) => ({
            ...trade,
            dateTime: new Date(trade.dateTime),
            orderTime: new Date(trade.orderTime),
            openDateTime: new Date(trade.openDateTime),
            reportDate: new Date(trade.reportDate),
            tradeDate: new Date(trade.tradeDate),
            expiry: trade.expiry ? new Date(trade.expiry) : undefined
          }))
        }));
        cyclesMap.set(key, cyclesWithDates);
      });

      setTrades(tradesWithDates);
      setCycles(cyclesMap);
      
      // Process monthly data
      const analytics = new AnalyticsEngine(tradesWithDates, cyclesMap);
      const processed = processMonthlyData(tradesWithDates, cyclesMap, analytics);
      setMonthlyData(processed);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (trades: Trade[], cycles: Map<string, WheelCycle[]>, analytics: AnalyticsEngine): MonthlyData[] => {
    const monthlyMap = new Map<string, MonthlyData>();
    
    // Get all unique months from trades
    const monthSet = new Set<string>();
    trades.forEach(trade => {
      const monthStart = startOfMonth(trade.dateTime);
      monthSet.add(monthStart.toISOString());
    });

    // Initialize months
    Array.from(monthSet).forEach(monthKey => {
      const month = new Date(monthKey);
      monthlyMap.set(monthKey, {
        month,
        income: 0,
        fees: 0,
        netIncome: 0,
        trades: [],
        cycles: [],
        weeks: []
      });
    });

    // Process trades for each month
    trades.forEach(trade => {
      const monthStart = startOfMonth(trade.dateTime);
      const monthKey = monthStart.toISOString();
      const monthData = monthlyMap.get(monthKey)!;
      
      monthData.trades.push(trade);

      // Calculate income for option trades
      if (trade.assetCategory === 'OPT') {
        const fee = Math.abs(trade.commissionAndTax);
        monthData.fees += fee;

        if (trade.buy_sell === 'SELL') {
          const premium = Math.abs(trade.netCash);
          monthData.income += premium;
          monthData.netIncome += premium - fee;
        } else if (trade.buy_sell === 'BUY') {
          const cost = Math.abs(trade.netCash);
          monthData.income -= cost;
          monthData.netIncome -= cost + fee;
        }
      }
    });

    // Process weekly data for each month
    monthlyMap.forEach((monthData, monthKey) => {
      const monthStart = monthData.month;
      const monthEnd = endOfMonth(monthStart);
      
      // Get all weeks in this month
      const weeks = eachWeekOfInterval(
        { start: monthStart, end: monthEnd },
        { weekStartsOn: 1 }
      );

      monthData.weeks = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekTrades = monthData.trades.filter(trade =>
          isWithinInterval(trade.dateTime, { start: weekStart, end: weekEnd })
        );

        // Calculate week income
        let weekIncome = 0;
        let weekFees = 0;
        let weekNetIncome = 0;

        weekTrades.forEach(trade => {
          if (trade.assetCategory === 'OPT') {
            const fee = Math.abs(trade.commissionAndTax);
            weekFees += fee;

            if (trade.buy_sell === 'SELL') {
              const premium = Math.abs(trade.netCash);
              weekIncome += premium;
              weekNetIncome += premium - fee;
            } else if (trade.buy_sell === 'BUY') {
              const cost = Math.abs(trade.netCash);
              weekIncome -= cost;
              weekNetIncome -= cost + fee;
            }
          }
        });

        // Process symbols for this week
        const symbolMap = new Map<string, SymbolData>();
        weekTrades.forEach(trade => {
          const symbol = trade.underlyingSymbol || trade.symbol;
          if (!symbolMap.has(symbol)) {
            symbolMap.set(symbol, {
              symbol,
              income: 0,
              fees: 0,
              netIncome: 0,
              trades: [],
              cycles: []
            });
          }

          const symbolData = symbolMap.get(symbol)!;
          symbolData.trades.push(trade);

          if (trade.assetCategory === 'OPT') {
            const fee = Math.abs(trade.commissionAndTax);
            symbolData.fees += fee;

            if (trade.buy_sell === 'SELL') {
              const premium = Math.abs(trade.netCash);
              symbolData.income += premium;
              symbolData.netIncome += premium - fee;
            } else if (trade.buy_sell === 'BUY') {
              const cost = Math.abs(trade.netCash);
              symbolData.income -= cost;
              symbolData.netIncome -= cost + fee;
            }
          }
        });

        return {
          week: weekStart,
          weekEnd,
          income: weekIncome,
          fees: weekFees,
          netIncome: weekNetIncome,
          trades: weekTrades,
          cycles: [],
          symbols: Array.from(symbolMap.values()).sort((a, b) => b.netIncome - a.netIncome)
        };
      }).filter(week => week.trades.length > 0); // Only include weeks with trades
    });

    return Array.from(monthlyMap.values()).sort((a, b) => b.month.getTime() - a.month.getTime());
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-indigo-900 dark:to-slate-800"></div>
        
        <main className="relative ml-72 p-8">
          <div className="glass-card p-8 text-center">
            <div className="modern-spinner w-12 h-12 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Loading Monthly Analytics...
            </h3>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-indigo-900 dark:to-slate-800"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-purple-400/20"></div>
      
      <main className="relative ml-72 p-8">
        {/* Header */}
        <div className="glass-card p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm">
              <IconCalendarEvent size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black mb-2">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Monthly Income Analytics
                </span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Detailed breakdown by month, week, and symbol
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="metric-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <IconCurrencyDollar size={20} className="text-emerald-600" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Income</span>
              </div>
              <div className="premium-number text-2xl">
                {formatCurrency(monthlyData.reduce((sum, month) => sum + month.netIncome, 0))}
              </div>
            </div>
            
            <div className="metric-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <IconCoins size={20} className="text-amber-600" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Fees</span>
              </div>
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {formatCurrency(monthlyData.reduce((sum, month) => sum + month.fees, 0))}
              </div>
            </div>
            
            <div className="metric-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <IconChartLine size={20} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Active Months</span>
              </div>
              <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {monthlyData.length}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="space-y-6">
          {monthlyData.map((month) => {
            const monthKey = month.month.toISOString();
            const isExpanded = expandedMonths.has(monthKey);

            return (
              <div key={monthKey} className="data-card">
                {/* Month Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-white/20 dark:hover:bg-slate-800/20 rounded-lg p-4 -m-4 transition-colors"
                  onClick={() => toggleMonth(monthKey)}
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? 
                      <IconChevronDown size={20} className="text-slate-500" /> : 
                      <IconChevronRight size={20} className="text-slate-500" />
                    }
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {format(month.month, 'MMMM yyyy')}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {month.weeks.length} weeks • {month.trades.length} trades
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(month.netIncome)}
                      </div>
                      <div className="text-xs text-slate-500">Net Income</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {month.netIncome >= 0 ? 
                        <IconTrendingUp size={20} className="text-emerald-500" /> :
                        <IconTrendingDown size={20} className="text-rose-500" />
                      }
                    </div>
                  </div>
                </div>

                {/* Week Breakdown */}
                {isExpanded && (
                  <div className="mt-6 space-y-4">
                    {month.weeks.map((week) => {
                      const weekKey = `${monthKey}-${week.week.toISOString()}`;
                      const isWeekExpanded = expandedWeeks.has(weekKey);

                      return (
                        <div key={weekKey} className="border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
                          {/* Week Header */}
                          <div 
                            className="flex items-center justify-between cursor-pointer hover:bg-white/20 dark:hover:bg-slate-800/20 rounded-lg p-2 -m-2 transition-colors"
                            onClick={() => toggleWeek(weekKey)}
                          >
                            <div className="flex items-center gap-3">
                              {isWeekExpanded ? 
                                <IconChevronDown size={16} className="text-slate-400" /> : 
                                <IconChevronRight size={16} className="text-slate-400" />
                              }
                              <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                                  Week of {format(week.week, 'MMM d')} - {format(week.weekEnd, 'MMM d')}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  {week.symbols.length} symbols • {week.trades.length} trades
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">
                                {formatCurrency(week.netIncome)}
                              </div>
                              <div className="text-xs text-slate-500">Net Income</div>
                            </div>
                          </div>

                          {/* Symbol Breakdown */}
                          {isWeekExpanded && (
                            <div className="mt-4 space-y-2">
                              {week.symbols.map((symbol) => (
                                <div key={symbol.symbol} className="flex items-center justify-between p-3 bg-white/40 dark:bg-slate-800/40 rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                        {symbol.symbol.slice(0, 2)}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-slate-700 dark:text-slate-300">
                                        {symbol.symbol}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {symbol.trades.length} trades
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                                      {formatCurrency(symbol.netIncome)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      Fees: {formatCurrency(symbol.fees)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {monthlyData.length === 0 && (
          <div className="glass-card p-8 text-center">
            <IconCalendarEvent size={48} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
              No Monthly Data Available
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Start trading to see your monthly income breakdown here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}