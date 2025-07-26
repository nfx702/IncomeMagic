'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TargetComparison } from '@/components/analytics/TargetComparison';
import { IncomeTargetsService, TargetAnalytics, TargetComparison as ITargetComparison } from '@/services/incomeTargets';
import { AnalyticsEngine } from '@/services/analyticsEngine';
import { Trade, WheelCycle } from '@/types/trade';
import { 
  IconTarget,
  IconSettings,
  IconTrendingUp,
  IconCalendar,
  IconAdjustments
} from '@tabler/icons-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';

export default function TargetsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cycles, setCycles] = useState<Map<string, WheelCycle[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [targetAnalytics, setTargetAnalytics] = useState<TargetAnalytics | null>(null);
  const [showTargetSettings, setShowTargetSettings] = useState(false);
  const [targetsService] = useState(() => new IncomeTargetsService());
  const [newTarget, setNewTarget] = useState({
    weekly: 325,
    monthly: 1300
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      generateAnalytics();
    }
  }, [trades, cycles]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = () => {
    const analyticsEngine = new AnalyticsEngine(trades, cycles);
    
    // Get weekly analytics
    const weeklyAnalytics = analyticsEngine.getWeeklyAnalytics();
    const weeklyHistory: Array<{ weekStart: Date; comparison: ITargetComparison }> = [];
    
    // Aggregate weekly data across all symbols
    const weeklyMap = new Map<string, number>();
    for (const [symbol, weeks] of weeklyAnalytics) {
      for (const week of weeks) {
        const weekKey = week.date.toISOString();
        const existing = weeklyMap.get(weekKey) || 0;
        weeklyMap.set(weekKey, existing + week.netIncome);
      }
    }
    
    // Create comparisons
    for (const [dateStr, income] of weeklyMap) {
      const date = new Date(dateStr);
      const target = targetsService.getCurrentTarget('weekly');
      const comparison = targetsService.compareToTarget(income, target);
      weeklyHistory.push({ weekStart: date, comparison });
    }
    
    // Sort by date
    weeklyHistory.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    
    // Get monthly analytics
    const monthlyAnalytics = analyticsEngine.getMonthlyAnalytics();
    const monthlyHistory: Array<{ month: Date; comparison: ITargetComparison }> = [];
    
    // Aggregate monthly data
    const monthlyMap = new Map<string, number>();
    for (const [symbol, months] of monthlyAnalytics) {
      for (const month of months) {
        const monthKey = month.date.toISOString();
        const existing = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, existing + month.netIncome);
      }
    }
    
    // Create comparisons
    for (const [dateStr, income] of monthlyMap) {
      const date = new Date(dateStr);
      const target = targetsService.getCurrentTarget('monthly');
      const comparison = targetsService.compareToTarget(income, target);
      monthlyHistory.push({ month: date, comparison });
    }
    
    // Sort by date
    monthlyHistory.sort((a, b) => a.month.getTime() - b.month.getTime());
    
    // Calculate current period
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentMonthStart = startOfMonth(now);
    
    // Get current week income
    let currentWeekIncome = 0;
    const currentWeekTrades = trades.filter(t => 
      t.dateTime >= currentWeekStart && 
      t.dateTime <= endOfWeek(now, { weekStartsOn: 1 }) &&
      (t.assetCategory === 'OPT' || t.assetCategory === 'FOP')
    );
    
    for (const trade of currentWeekTrades) {
      if (trade.buy_sell === 'SELL') {
        currentWeekIncome += Math.abs(trade.netCash);
      } else if (trade.buy_sell === 'BUY') {
        currentWeekIncome -= Math.abs(trade.netCash);
      }
    }
    
    // Get current month income
    let currentMonthIncome = 0;
    const currentMonthTrades = trades.filter(t => 
      t.dateTime >= currentMonthStart && 
      t.dateTime <= endOfMonth(now) &&
      (t.assetCategory === 'OPT' || t.assetCategory === 'FOP')
    );
    
    for (const trade of currentMonthTrades) {
      if (trade.buy_sell === 'SELL') {
        currentMonthIncome += Math.abs(trade.netCash);
      } else if (trade.buy_sell === 'BUY') {
        currentMonthIncome -= Math.abs(trade.netCash);
      }
    }
    
    // Create current comparisons
    const currentWeekTarget = targetsService.getCurrentTarget('weekly');
    const currentWeekComparison = targetsService.compareToTarget(currentWeekIncome, currentWeekTarget);
    
    const currentMonthTarget = targetsService.getCurrentTarget('monthly');
    const currentMonthComparison = targetsService.compareToTarget(currentMonthIncome, currentMonthTarget);
    
    // Calculate averages and consistency
    const weeklyComparisons = weeklyHistory.map(h => h.comparison);
    const monthlyComparisons = monthlyHistory.map(h => h.comparison);
    
    const weeklyAvgAchievement = weeklyComparisons.length > 0
      ? weeklyComparisons.reduce((sum, c) => sum + c.percentageAchieved, 0) / weeklyComparisons.length
      : 0;
    
    const monthlyAvgAchievement = monthlyComparisons.length > 0
      ? monthlyComparisons.reduce((sum, c) => sum + c.percentageAchieved, 0) / monthlyComparisons.length
      : 0;
    
    const weeklyConsistency = targetsService.calculateConsistencyScore(weeklyComparisons);
    const monthlyConsistency = targetsService.calculateConsistencyScore(monthlyComparisons);
    
    // Determine recent trend
    const recentWeeks = weeklyHistory.slice(-4);
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentWeeks.length >= 2) {
      const firstHalf = recentWeeks.slice(0, Math.floor(recentWeeks.length / 2));
      const secondHalf = recentWeeks.slice(Math.floor(recentWeeks.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, w) => sum + w.comparison.percentageAchieved, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, w) => sum + w.comparison.percentageAchieved, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) {
        recentTrend = 'improving';
      } else if (secondAvg < firstAvg * 0.9) {
        recentTrend = 'declining';
      }
    }
    
    // Generate recommendations
    const recommendations = targetsService.generateRecommendations({
      weeklyAchievement: weeklyAvgAchievement,
      monthlyAchievement: monthlyAvgAchievement,
      weeklyConsistency,
      monthlyConsistency,
      recentTrend
    });
    
    const analytics: TargetAnalytics = {
      weekly: {
        current: currentWeekComparison,
        history: weeklyHistory,
        averageAchievement: weeklyAvgAchievement,
        consistencyScore: weeklyConsistency
      },
      monthly: {
        current: currentMonthComparison,
        history: monthlyHistory,
        averageAchievement: monthlyAvgAchievement,
        consistencyScore: monthlyConsistency
      },
      recommendations
    };
    
    setTargetAnalytics(analytics);
  };

  const handleTargetUpdate = () => {
    if (timeframe === 'weekly') {
      targetsService.setTarget('weekly', newTarget.weekly);
    } else {
      targetsService.setTarget('monthly', newTarget.monthly);
    }
    
    // Regenerate analytics with new target
    generateAnalytics();
    setShowTargetSettings(false);
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <IconTarget size={32} className="text-primary" />
                <h1 className="text-3xl font-bold">Target vs Actual</h1>
              </div>
              <p className="text-muted-foreground">
                Track your performance against income targets
              </p>
            </div>
            
            <button
              onClick={() => setShowTargetSettings(!showTargetSettings)}
              className="glass-button px-4 py-2 flex items-center gap-2"
            >
              <IconSettings size={18} />
              Manage Targets
            </button>
          </div>
        </div>

        {/* Target Settings */}
        {showTargetSettings && (
          <div className="glass-card p-6 liquid-glass mb-6">
            <h3 className="text-lg font-semibold mb-4">Target Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Weekly Target
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    value={newTarget.weekly}
                    onChange={(e) => setNewTarget({ ...newTarget, weekly: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Current: ${targetsService.getCurrentTarget('weekly')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Monthly Target
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400">$</span>
                  <input
                    type="number"
                    value={newTarget.monthly}
                    onChange={(e) => setNewTarget({ ...newTarget, monthly: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Current: ${targetsService.getCurrentTarget('monthly')}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTargetSettings(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleTargetUpdate}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Update Targets
              </button>
            </div>
          </div>
        )}

        {/* Timeframe Toggle */}
        <div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-1 w-fit mb-8">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              timeframe === 'weekly' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              timeframe === 'monthly' 
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Target Comparison Component */}
        {targetAnalytics && (
          <TargetComparison 
            analytics={targetAnalytics} 
            timeframe={timeframe}
          />
        )}
      </div>
    </AppLayout>
  );
}