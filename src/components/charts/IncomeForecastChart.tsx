'use client';

import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { IconTrendingUp, IconTrendingDown, IconMinus, IconInfoCircle } from '@tabler/icons-react';
import { ForecastPoint, IncomeForecast } from '@/services/incomeForecast';

interface IncomeForecastChartProps {
  forecast: IncomeForecast;
  historicalData: Array<{
    date: Date;
    income: number;
  }>;
  timeframe: 'weekly' | 'monthly';
  height?: number;
  showConfidenceBands?: boolean;
  showTrend?: boolean;
}

interface ChartDataPoint {
  date: string;
  dateObj: Date;
  actual?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
  isHistorical: boolean;
  formattedPeriod: string;
}

export function IncomeForecastChart({
  forecast,
  historicalData,
  timeframe = 'weekly',
  height = 400,
  showConfidenceBands = true,
  showTrend = true
}: IncomeForecastChartProps) {
  const chartData = useMemo((): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const forecastData = timeframe === 'weekly' ? forecast.weekly : forecast.monthly;
    
    // Add historical data
    historicalData.forEach(point => {
      const formattedPeriod = timeframe === 'weekly'
        ? `${format(point.date, 'MMM d')} - ${format(endOfWeek(point.date, { weekStartsOn: 1 }), 'MMM d')}`
        : format(point.date, 'MMMM yyyy');
      
      data.push({
        date: format(point.date, 'MMM d'),
        dateObj: point.date,
        actual: point.income,
        predicted: undefined,
        lower: undefined,
        upper: undefined,
        isHistorical: true,
        formattedPeriod
      });
    });
    
    // Add forecast data
    forecastData.forEach(point => {
      const formattedPeriod = timeframe === 'weekly'
        ? `${format(point.date, 'MMM d')} - ${format(endOfWeek(point.date, { weekStartsOn: 1 }), 'MMM d')}`
        : format(point.date, 'MMMM yyyy');
      
      data.push({
        date: format(point.date, 'MMM d'),
        dateObj: point.date,
        actual: undefined,
        predicted: point.predicted,
        lower: point.lower,
        upper: point.upper,
        isHistorical: false,
        formattedPeriod
      });
    });
    
    return data.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [forecast, historicalData, timeframe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTrendIcon = () => {
    switch (forecast.patterns.trend) {
      case 'increasing':
        return <IconTrendingUp size={16} className="text-emerald-500" />;
      case 'decreasing':
        return <IconTrendingDown size={16} className="text-rose-500" />;
      default:
        return <IconMinus size={16} className="text-blue-500" />;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload as ChartDataPoint;
    
    return (
      <div className="glass-card p-4 shadow-xl border border-white/30">
        <div className="mb-3">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {data.formattedPeriod}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {data.isHistorical ? 'Historical' : 'Forecast'}
          </p>
        </div>
        
        <div className="space-y-2">
          {data.actual !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">Actual:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formatCurrency(data.actual)}
              </span>
            </div>
          )}
          
          {data.predicted !== undefined && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400">Predicted:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(data.predicted)}
                </span>
              </div>
              
              {showConfidenceBands && data.lower !== undefined && data.upper !== undefined && (
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    {(forecast.accuracy.confidence * 100).toFixed(0)}% Confidence Range:
                  </p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatCurrency(data.lower)} - {formatCurrency(data.upper)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const lastHistoricalDate = historicalData[historicalData.length - 1]?.date || new Date();

  return (
    <div className="w-full">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">Trend</p>
            {getTrendIcon()}
          </div>
          <p className="text-sm font-medium capitalize">{forecast.patterns.trend}</p>
        </div>
        
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
            Average {timeframe === 'weekly' ? 'Weekly' : 'Monthly'}
          </p>
          <p className="text-lg font-bold">
            {formatCurrency(
              timeframe === 'weekly' 
                ? forecast.patterns.averageWeeklyIncome 
                : forecast.patterns.averageMonthlyIncome
            )}
          </p>
        </div>
        
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
            Forecast Confidence
          </p>
          <p className="text-lg font-bold">
            {(forecast.accuracy.confidence * 100).toFixed(0)}%
          </p>
        </div>
        
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
            Volatility
          </p>
          <p className="text-lg font-bold">
            {(forecast.patterns.volatility * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Info Banner */}
      {forecast.patterns.seasonality && (
        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-lg p-3 mb-4 flex items-start gap-2">
          <IconInfoCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Seasonal Pattern Detected:</span> Your income shows recurring patterns. 
            The forecast accounts for these seasonal variations.
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date"
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
            
            {/* Vertical line separating historical and forecast */}
            <ReferenceLine 
              x={format(lastHistoricalDate, 'MMM d')} 
              stroke="#64748B" 
              strokeDasharray="5 5" 
              label={{ value: "Forecast Start", position: "top" }}
            />
            
            {/* Show trend line if enabled */}
            {showTrend && (
              <ReferenceLine 
                y={timeframe === 'weekly' 
                  ? forecast.patterns.averageWeeklyIncome 
                  : forecast.patterns.averageMonthlyIncome
                } 
                stroke="#8B5CF6" 
                strokeDasharray="8 4" 
                strokeWidth={2}
                label={{ value: `Average ${timeframe === 'weekly' ? 'Weekly' : 'Monthly'} Income`, position: "left" }}
              />
            )}
            
            {/* Confidence bands */}
            {showConfidenceBands && (
              <>
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="url(#confidenceGradient)"
                  name="Upper Bound"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill="#FFFFFF"
                  name="Lower Bound"
                  connectNulls={false}
                />
              </>
            )}
            
            {/* Historical income */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#actualGradient)"
              name="Actual Income"
              connectNulls={false}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
            
            {/* Predicted income */}
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#3B82F6"
              strokeWidth={3}
              strokeDasharray="5 3"
              fill="url(#predictedGradient)"
              name="Predicted Income"
              connectNulls={false}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Accuracy Metrics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">MAPE</p>
          <p className="text-sm font-medium">
            {(forecast.accuracy.mape * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">Mean Absolute % Error</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">RMSE</p>
          <p className="text-sm font-medium">
            {formatCurrency(forecast.accuracy.rmse)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">Root Mean Square Error</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Seasonality</p>
          <p className="text-sm font-medium">
            {forecast.patterns.seasonality ? 'Detected' : 'Not Detected'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">Pattern Recognition</p>
        </div>
      </div>
    </div>
  );
}