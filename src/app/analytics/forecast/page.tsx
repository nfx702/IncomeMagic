'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { IncomeForecastChart } from '@/components/charts/IncomeForecastChart';
import { IncomeForecastService, IncomeForecast } from '@/services/incomeForecast';
import { Trade, WheelCycle } from '@/types/trade';
import { 
  IconChartLine, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconMinus,
  IconCalendar,
  IconTarget,
  IconSparkles,
  IconInfoCircle
} from '@tabler/icons-react';
import { format, addWeeks, addMonths } from 'date-fns';

export default function IncomeForecastPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cycles, setCycles] = useState<Map<string, WheelCycle[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<IncomeForecast | null>(null);
  const [historicalData, setHistoricalData] = useState<Array<{ date: Date; income: number }>>([]);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [forecastHorizon, setForecastHorizon] = useState({
    weekly: 8,
    monthly: 3
  });
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);
  const [showTrend, setShowTrend] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      generateForecast();
    }
  }, [trades, cycles, forecastHorizon]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
      setTrades(data.trades || []);
      setCycles(new Map(Object.entries(data.cycles || {})));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = () => {
    const forecastService = new IncomeForecastService(trades, cycles);
    
    // Generate forecast with custom config
    const newForecast = forecastService.generateForecast({
      weeklyHorizon: forecastHorizon.weekly,
      monthlyHorizon: forecastHorizon.monthly,
      confidenceLevel: 0.95,
      minHistoricalData: 4,
      seasonalityPeriod: 12
    });
    
    setForecast(newForecast);
    
    // Get historical data for chart
    const analytics = forecastService['analytics'];
    const weeklyHistory = forecastService['getHistoricalWeeklyData']();
    const monthlyHistory = forecastService['getHistoricalMonthlyData']();
    
    setHistoricalData(timeframe === 'weekly' ? weeklyHistory : monthlyHistory);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTrendIcon = (size: number = 24) => {
    if (!forecast) return null;
    
    switch (forecast.patterns.trend) {
      case 'increasing':
        return <IconTrendingUp size={size} className="text-emerald-500" />;
      case 'decreasing':
        return <IconTrendingDown size={size} className="text-rose-500" />;
      default:
        return <IconMinus size={size} className="text-blue-500" />;
    }
  };

  const getNextPeriodForecast = () => {
    if (!forecast) return { value: 0, lower: 0, upper: 0 };
    
    const data = timeframe === 'weekly' ? forecast.weekly : forecast.monthly;
    if (data.length === 0) return { value: 0, lower: 0, upper: 0 };
    
    return {
      value: data[0].predicted,
      lower: data[0].lower,
      upper: data[0].upper
    };
  };

  const getTotalForecastedIncome = () => {
    if (!forecast) return 0;
    
    const data = timeframe === 'weekly' ? forecast.weekly : forecast.monthly;
    return data.reduce((sum, point) => sum + point.predicted, 0);
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

  const nextPeriod = getNextPeriodForecast();
  const totalForecasted = getTotalForecastedIncome();
  const horizonLabel = timeframe === 'weekly' 
    ? `Next ${forecastHorizon.weekly} Weeks` 
    : `Next ${forecastHorizon.monthly} Months`;

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <IconChartLine size={32} className="text-primary" />
            <h1 className="text-3xl font-bold">Income Forecast</h1>
          </div>
          <p className="text-muted-foreground">
            AI-powered predictions based on your historical trading patterns
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Weekly Target */}
          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Weekly Target</p>
                <p className="text-2xl font-bold text-blue-500">
                  {formatCurrency(1300)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Income goal per week
                </p>
              </div>
              <IconTarget size={24} className="text-blue-500 opacity-70" />
            </div>
          </div>

          {/* Next Period Forecast */}
          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Next {timeframe === 'weekly' ? 'Week' : 'Month'}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(nextPeriod.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(nextPeriod.lower)} - {formatCurrency(nextPeriod.upper)}
                </p>
              </div>
              <IconCalendar size={24} className="text-primary opacity-50" />
            </div>
          </div>

          {/* Total Forecasted */}
          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">{horizonLabel}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalForecasted)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total projected income
                </p>
              </div>
              <IconTarget size={24} className="text-primary opacity-50" />
            </div>
          </div>

          {/* Trend */}
          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Income Trend</p>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(20)}
                  <p className="text-xl font-semibold capitalize">
                    {forecast?.patterns.trend || 'Stable'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on historical data
                </p>
              </div>
              {getTrendIcon()}
            </div>
          </div>

          {/* Confidence */}
          <div className="glass-card p-6 liquid-glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Forecast Accuracy</p>
                <p className="text-2xl font-bold">
                  {forecast ? (forecast.accuracy.confidence * 100).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Model confidence level
                </p>
              </div>
              <IconSparkles size={24} className="text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card p-6 liquid-glass mb-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Timeframe Toggle */}
            <div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-1">
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  timeframe === 'weekly' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeframe('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  timeframe === 'monthly' 
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Horizon Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Forecast Horizon:
              </label>
              <select
                value={timeframe === 'weekly' ? forecastHorizon.weekly : forecastHorizon.monthly}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setForecastHorizon(prev => ({
                    ...prev,
                    [timeframe]: value
                  }));
                }}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                {timeframe === 'weekly' ? (
                  <>
                    <option value={4}>4 weeks</option>
                    <option value={8}>8 weeks</option>
                    <option value={12}>12 weeks</option>
                    <option value={16}>16 weeks</option>
                  </>
                ) : (
                  <>
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={9}>9 months</option>
                    <option value={12}>12 months</option>
                  </>
                )}
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Confidence Bands Toggle */}
              <button
                onClick={() => setShowConfidenceBands(!showConfidenceBands)}
                className={`px-3 py-2 text-xs rounded-lg transition-all duration-200 ${
                  showConfidenceBands
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                Confidence Bands
              </button>

              {/* Trend Line Toggle */}
              <button
                onClick={() => setShowTrend(!showTrend)}
                className={`px-3 py-2 text-xs rounded-lg transition-all duration-200 ${
                  showTrend
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                Trend Line
              </button>
            </div>
          </div>
        </div>

        {/* Forecast Chart */}
        {forecast && (
          <div className="glass-card p-6 liquid-glass mb-8">
            <IncomeForecastChart
              forecast={forecast}
              historicalData={historicalData}
              timeframe={timeframe}
              height={400}
              showConfidenceBands={showConfidenceBands}
              showTrend={showTrend}
            />
          </div>
        )}

        {/* Pattern Analysis */}
        {forecast && (
          <div className="glass-card p-6 liquid-glass">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <IconInfoCircle size={20} className="text-primary" />
              Pattern Analysis
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Income Characteristics
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Average Weekly Income:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(forecast.patterns.averageWeeklyIncome)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Average Monthly Income:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(forecast.patterns.averageMonthlyIncome)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Income Volatility:
                    </span>
                    <span className="font-medium">
                      {(forecast.patterns.volatility * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Seasonal Pattern:
                    </span>
                    <span className="font-medium">
                      {forecast.patterns.seasonality ? 'Detected' : 'Not Detected'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Forecast Quality
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Mean Absolute % Error:
                    </span>
                    <span className="font-medium">
                      {(forecast.accuracy.mape * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Root Mean Square Error:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(forecast.accuracy.rmse)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Model Confidence:
                    </span>
                    <span className="font-medium">
                      {(forecast.accuracy.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Forecast Method:
                    </span>
                    <span className="font-medium">
                      Exponential Smoothing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}