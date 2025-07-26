'use client';

import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Trade, WheelCycle } from '@/types/trade';
import { AnalyticsEngine } from '@/services/analyticsEngine';

interface IncomeChartProps {
  trades: Trade[];
  cycles: Map<string, WheelCycle[]>;
  type?: 'line' | 'area' | 'bar';
  timeframe?: 'weekly' | 'monthly';
  height?: number;
}

interface ChartDataPoint {
  date: string;
  dateObj: Date;
  income: number;
  fees: number;
  netIncome: number;
  trades: number;
  formattedPeriod: string;
}

export function IncomeChart({ 
  trades, 
  cycles, 
  type = 'area', 
  timeframe = 'weekly',
  height = 300 
}: IncomeChartProps) {
  const chartData = useMemo(() => {
    const analytics = new AnalyticsEngine(trades, cycles);
    
    if (timeframe === 'monthly') {
      // Get monthly data across all symbols
      const monthlyData = analytics.getMonthlyAnalytics();
      const allMonthlyData = new Map<string, ChartDataPoint>();
      
      // Aggregate data across all symbols by month
      for (const [symbol, monthlyBreakdown] of monthlyData) {
        for (const monthData of monthlyBreakdown) {
          const monthKey = monthData.date.toISOString();
          const existing = allMonthlyData.get(monthKey) || {
            date: monthKey,
            dateObj: monthData.date,
            income: 0,
            fees: 0,
            netIncome: 0,
            trades: 0,
            formattedPeriod: format(monthData.date, 'MMM yyyy')
          };
          
          existing.income += monthData.income;
          existing.fees += monthData.fees;
          existing.netIncome += monthData.netIncome;
          existing.trades += monthData.trades.length;
          
          allMonthlyData.set(monthKey, existing);
        }
      }
      
      return Array.from(allMonthlyData.values())
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    } else {
      // Get weekly data across all symbols
      const weeklyData = analytics.getWeeklyAnalytics();
      const allWeeklyData = new Map<string, ChartDataPoint>();
      
      // Aggregate data across all symbols by week
      for (const [symbol, weeklyBreakdown] of weeklyData) {
        for (const weekData of weeklyBreakdown) {
          const weekKey = weekData.date.toISOString();
          const weekEnd = endOfWeek(weekData.date, { weekStartsOn: 1 });
          const existing = allWeeklyData.get(weekKey) || {
            date: weekKey,
            dateObj: weekData.date,
            income: 0,
            fees: 0,
            netIncome: 0,
            trades: 0,
            formattedPeriod: `${format(weekData.date, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
          };
          
          existing.income += weekData.income;
          existing.fees += weekData.fees;
          existing.netIncome += weekData.netIncome;
          existing.trades += weekData.trades.length;
          
          allWeeklyData.set(weekKey, existing);
        }
      }
      
      return Array.from(allWeeklyData.values())
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    }
  }, [trades, cycles, timeframe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card p-4 shadow-xl">
          <p className="font-semibold text-primary mb-2">
            {data.formattedPeriod}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-success)' }}></div>
                <span className="text-sm text-secondary">Net Income:</span>
              </div>
              <span className="font-semibold text-success">
                {formatCurrency(data.netIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-primary)' }}></div>
                <span className="text-sm text-secondary">Gross Income:</span>
              </div>
              <span className="font-semibold text-accent-primary">
                {formatCurrency(data.income)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-danger)' }}></div>
                <span className="text-sm text-secondary">Fees:</span>
              </div>
              <span className="font-semibold text-danger">
                {formatCurrency(data.fees)}
              </span>
            </div>
            <div className="pt-2 border-t border-glass-border">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-secondary">Trades:</span>
                <span className="font-semibold text-primary">
                  {data.trades}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-secondary">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">No Data Available</div>
          <div className="text-sm">Start trading to see your income trends</div>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="formattedPeriod"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="netIncome" 
              stroke="#10B981" 
              strokeWidth={3}
              name="Net Income"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="income" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Gross Income"
              strokeDasharray="5 5"
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="formattedPeriod"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="netIncome" 
              fill="#10B981"
              name="Net Income"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="fees" 
              fill="#EF4444"
              name="Fees"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'area':
      default:
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="netIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="formattedPeriod"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fill="url(#incomeGradient)"
              name="Gross Income"
            />
            <Area 
              type="monotone" 
              dataKey="netIncome" 
              stroke="#10B981" 
              strokeWidth={3}
              fill="url(#netIncomeGradient)"
              name="Net Income"
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}