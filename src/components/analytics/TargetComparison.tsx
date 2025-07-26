'use client';

import { useMemo } from 'react';
import { 
  IconTarget, 
  IconTrendingUp, 
  IconTrendingDown,
  IconEqual,
  IconCheck,
  IconX,
  IconFlame,
  IconAlertCircle
} from '@tabler/icons-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { TargetComparison as ITargetComparison, TargetAnalytics } from '@/services/incomeTargets';

interface TargetComparisonProps {
  analytics: TargetAnalytics;
  timeframe: 'weekly' | 'monthly';
}

export function TargetComparison({ analytics, timeframe }: TargetComparisonProps) {
  const data = timeframe === 'weekly' ? analytics.weekly : analytics.monthly;
  const current = data.current;
  
  const chartData = useMemo(() => {
    const history = timeframe === 'weekly' 
      ? analytics.weekly.history.slice(-12)
      : analytics.monthly.history.slice(-6);
    
    return history.map(item => ({
      period: timeframe === 'weekly' 
        ? new Date((item as any).weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : new Date((item as any).month).toLocaleDateString('en-US', { month: 'short' }),
      target: item.comparison.target,
      actual: item.comparison.actual,
      percentageAchieved: item.comparison.percentageAchieved
    }));
  }, [analytics, timeframe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'met':
        return 'text-blue-600 dark:text-blue-400';
      case 'below':
        return 'text-rose-600 dark:text-rose-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <IconTrendingUp size={20} />;
      case 'met':
        return <IconCheck size={20} />;
      case 'below':
        return <IconTrendingDown size={20} />;
      default:
        return <IconEqual size={20} />;
    }
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 110) return '#10B981';
    if (percentage >= 95) return '#3B82F6';
    return '#EF4444';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    const data = payload[0].payload;
    const percentage = Math.round(data.percentageAchieved);
    
    return (
      <div className="glass-card p-4 shadow-xl border border-white/30">
        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
          {data.period}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">Target:</span>
            <span className="font-medium">{formatCurrency(data.target)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-600 dark:text-slate-400">Actual:</span>
            <span className="font-medium">{formatCurrency(data.actual)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-200/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">Achievement:</span>
            <span className={`font-bold ${percentage >= 95 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Period Summary */}
      <div className="glass-card p-6 liquid-glass">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Current {timeframe === 'weekly' ? 'Week' : 'Month'} Performance
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Target vs Actual Income Comparison
            </p>
          </div>
          <div className={`p-3 rounded-xl ${
            current.status === 'exceeded' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
            current.status === 'met' ? 'bg-blue-100 dark:bg-blue-900/30' :
            'bg-rose-100 dark:bg-rose-900/30'
          }`}>
            <div className={getStatusColor(current.status)}>
              {getStatusIcon(current.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Target */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <IconTarget size={16} className="text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Target</p>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(current.target)}
            </p>
          </div>

          {/* Actual */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <IconTrendingUp size={16} className="text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Actual</p>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {formatCurrency(current.actual)}
            </p>
          </div>

          {/* Achievement */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {current.percentageAchieved >= 100 ? (
                <IconFlame size={16} className="text-orange-500" />
              ) : (
                <IconAlertCircle size={16} className="text-slate-500" />
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">Achievement</p>
            </div>
            <p className={`text-2xl font-bold ${
              current.percentageAchieved >= 100 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {Math.round(current.percentageAchieved)}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-slate-400">Progress to Target</span>
            <span className={`font-medium ${getStatusColor(current.status)}`}>
              {current.variance > 0 ? '+' : ''}{formatCurrency(current.variance)}
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                current.status === 'exceeded' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                current.status === 'met' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                'bg-gradient-to-r from-rose-500 to-pink-500'
              }`}
              style={{ width: `${Math.min(100, current.percentageAchieved)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
            {/* Target line at 100% */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-800 dark:bg-slate-200" 
                 style={{ left: '100%', transform: 'translateX(-50%)' }}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-400">
                Target
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance Chart */}
      <div className="glass-card p-6 liquid-glass">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6">
          Historical Performance
        </h3>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <ReferenceLine y={0} stroke="#666" />
              
              <Bar dataKey="target" fill="#94A3B8" name="Target" />
              <Bar dataKey="actual" name="Actual">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.percentageAchieved)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 liquid-glass">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Average Achievement</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {Math.round(data.averageAchievement)}%
          </p>
        </div>
        
        <div className="glass-card p-4 liquid-glass">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Consistency Score</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {data.consistencyScore}%
          </p>
        </div>
        
        <div className="glass-card p-4 liquid-glass">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Periods Above Target</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {data.history.filter(h => h.comparison.status !== 'below').length}/{data.history.length}
          </p>
        </div>
        
        <div className="glass-card p-4 liquid-glass">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Success Rate</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {data.history.length > 0 
              ? Math.round((data.history.filter(h => h.comparison.status !== 'below').length / data.history.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Recommendations */}
      {analytics.recommendations.length > 0 && (
        <div className="glass-card p-6 liquid-glass">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Recommendations
          </h3>
          <div className="space-y-3">
            {analytics.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="text-blue-500 mt-0.5">
                  <IconAlertCircle size={16} />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}