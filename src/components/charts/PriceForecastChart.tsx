'use client';

import { useMemo, useState } from 'react';
import { format, addDays } from 'date-fns';
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
  Brush
} from 'recharts';
import { 
  IconChartLine, 
  IconChartBar, 
  IconTrendingUp,
  IconTarget,
  IconInfoCircle 
} from '@tabler/icons-react';

interface PriceForecastChartProps {
  symbol: string;
  currentPrice: number;
  predictions: {
    ensemble: number[];
    models: {
      linear: { prices: number[]; confidence: number; model: string };
      movingAverage: { prices: number[]; confidence: number; model: string };
      arima: { prices: number[]; confidence: number; model: string };
      neuralNetwork: { prices: number[]; confidence: number; model: string };
    };
  };
  maxPainData?: Array<{
    expiry: Date;
    maxPainPrice: number;
    confidence: number;
    totalOI: number;
  }>;
  height?: number;
  showIndividualModels?: boolean;
}

interface ChartDataPoint {
  day: number;
  date: string;
  dateObj: Date;
  ensemble: number;
  linear?: number;
  movingAverage?: number;
  arima?: number;
  neuralNetwork?: number;
  confidenceBand?: { upper: number; lower: number };
}

export function PriceForecastChart({
  symbol,
  currentPrice,
  predictions,
  maxPainData = [],
  height = 400,
  showIndividualModels = false
}: PriceForecastChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [selectedModels, setSelectedModels] = useState({
    linear: true,
    movingAverage: true,
    arima: true,
    neuralNetwork: true
  });
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);

  const chartData = useMemo((): ChartDataPoint[] => {
    const startDate = new Date();
    
    return predictions.ensemble.map((price, index) => {
      const currentDate = addDays(startDate, index + 1);
      
      // Calculate confidence bands based on model uncertainty
      const modelPrices = [
        predictions.models.linear.prices[index] || price,
        predictions.models.movingAverage.prices[index] || price,
        predictions.models.arima.prices[index] || price,
        predictions.models.neuralNetwork.prices[index] || price
      ].filter(p => isFinite(p) && !isNaN(p) && p > 0);
      
      const avgPrice = modelPrices.reduce((sum, p) => sum + p, 0) / modelPrices.length;
      const variance = modelPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / modelPrices.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        day: index + 1,
        date: format(currentDate, 'MMM d'),
        dateObj: currentDate,
        ensemble: price,
        linear: predictions.models.linear.prices[index],
        movingAverage: predictions.models.movingAverage.prices[index],
        arima: predictions.models.arima.prices[index],
        neuralNetwork: predictions.models.neuralNetwork.prices[index],
        confidenceBand: {
          upper: price + stdDev * 1.96, // 95% confidence interval
          lower: Math.max(price - stdDev * 1.96, currentPrice * 0.5) // Prevent negative prices
        }
      };
    });
  }, [predictions, currentPrice]);

  const averageConfidence = useMemo(() => {
    const confidences = [
      predictions.models.linear.confidence,
      predictions.models.movingAverage.confidence,
      predictions.models.arima.confidence,
      predictions.models.neuralNetwork.confidence
    ].filter(conf => isFinite(conf) && !isNaN(conf));
    
    return confidences.length > 0 ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length : 0.7;
  }, [predictions]);

  const priceChange = useMemo(() => {
    if (chartData.length === 0) return { absolute: 0, percentage: 0 };
    
    const finalPrice = chartData[chartData.length - 1].ensemble;
    const absolute = finalPrice - currentPrice;
    const percentage = (absolute / currentPrice) * 100;
    
    return { absolute, percentage };
  }, [chartData, currentPrice]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload as ChartDataPoint;
    
    return (
      <div className="glass-card p-4 shadow-xl border border-white/30">
        <div className="mb-3">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {data.date} (Day {data.day})
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {format(data.dateObj, 'EEEE, MMMM do')}
          </p>
        </div>
        
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'confidenceBand') return null;
            
            const value = entry.value;
            if (!isFinite(value) || isNaN(value)) return null;
            
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {entry.name}:
                  </span>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatCurrency(value)}
                </span>
              </div>
            );
          })}
          
          {data.confidenceBand && showConfidenceBands && (
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-600 dark:text-slate-400">95% Confidence:</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {formatCurrency(data.confidenceBand.lower)} - {formatCurrency(data.confidenceBand.upper)}
                </span>
              </div>
            </div>
          )}
        </div>

        {maxPainData.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Max Pain Levels:
            </p>
            {maxPainData.map((maxPain, idx) => {
              const daysToExpiry = Math.ceil((maxPain.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isRelevant = daysToExpiry <= 14;
              
              if (!isRelevant) return null;
              
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    {format(maxPain.expiry, 'MMM d')}:
                  </span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(maxPain.maxPainPrice)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id={`ensembleGradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
            </linearGradient>
            {showConfidenceBands && (
              <linearGradient id={`confidenceGradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.05} />
              </linearGradient>
            )}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={Math.floor(chartData.length / 6)} // Show ~6 labels
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatCurrency}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Current Price Reference */}
          <ReferenceLine 
            y={currentPrice} 
            stroke="#64748B" 
            strokeDasharray="5 5" 
            label={{ value: "Current Price", position: "left" }}
          />
          
          {/* Max Pain Reference Lines */}
          {maxPainData.map((maxPain, index) => {
            const daysToExpiry = Math.ceil((maxPain.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            if (daysToExpiry > 14) return null;
            
            return (
              <ReferenceLine
                key={`maxpain-${index}`}
                y={maxPain.maxPainPrice}
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="8 4"
                label={{ 
                  value: `Max Pain ${format(maxPain.expiry, 'MMM d')}`, 
                  position: "right",
                  fontSize: 10
                }}
              />
            );
          })}
          
          {/* Confidence Band */}
          {showConfidenceBands && (
            <Area
              type="monotone"
              dataKey="confidenceBand"
              stroke="none"
              fill={`url(#confidenceGradient-${symbol})`}
              name="95% Confidence"
              connectNulls={false}
            />
          )}
          
          {/* Main Ensemble Prediction */}
          <Area
            type="monotone"
            dataKey="ensemble"
            stroke="#3B82F6"
            strokeWidth={3}
            fill={`url(#ensembleGradient-${symbol})`}
            name="AI Forecast"
            dot={false}
          />
          
          {/* Individual Models (if enabled) */}
          {showIndividualModels && selectedModels.linear && (
            <Area
              type="monotone"
              dataKey="linear"
              stroke="#10B981"
              strokeWidth={1.5}
              strokeOpacity={predictions.models.linear.confidence}
              strokeDasharray="3 3"
              fill="none"
              name="Linear Regression"
              dot={false}
            />
          )}
          
          {showIndividualModels && selectedModels.movingAverage && (
            <Area
              type="monotone"
              dataKey="movingAverage"
              stroke="#F59E0B"
              strokeWidth={1.5}
              strokeOpacity={predictions.models.movingAverage.confidence}
              strokeDasharray="3 3"
              fill="none"
              name="Moving Average"
              dot={false}
            />
          )}
          
          {showIndividualModels && selectedModels.arima && (
            <Area
              type="monotone"
              dataKey="arima"
              stroke="#8B5CF6"
              strokeWidth={1.5}
              strokeOpacity={predictions.models.arima.confidence}
              strokeDasharray="3 3"
              fill="none"
              name="ARIMA"
              dot={false}
            />
          )}
          
          {showIndividualModels && selectedModels.neuralNetwork && (
            <Area
              type="monotone"
              dataKey="neuralNetwork"
              stroke="#EF4444"
              strokeWidth={1.5}
              strokeOpacity={predictions.models.neuralNetwork.confidence}
              strokeDasharray="3 3"
              fill="none"
              name="Neural Network"
              dot={false}
            />
          )}
          
          <Brush dataKey="date" height={30} />
        </AreaChart>
      );
    }

    return (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(chartData.length / 6)}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatCurrency}
          domain={['dataMin - 5', 'dataMax + 5']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {/* Reference Lines */}
        <ReferenceLine 
          y={currentPrice} 
          stroke="#64748B" 
          strokeDasharray="5 5" 
          label={{ value: "Current Price", position: "left" }}
        />
        
        {maxPainData.map((maxPain, index) => {
          const daysToExpiry = Math.ceil((maxPain.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (daysToExpiry > 14) return null;
          
          return (
            <ReferenceLine
              key={`maxpain-${index}`}
              y={maxPain.maxPainPrice}
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="8 4"
            />
          );
        })}
        
        {/* Main Ensemble Line */}
        <Line
          type="monotone"
          dataKey="ensemble"
          stroke="#3B82F6"
          strokeWidth={3}
          name="AI Forecast"
          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
        />
        
        {/* Individual Model Lines */}
        {showIndividualModels && selectedModels.linear && (
          <Line
            type="monotone"
            dataKey="linear"
            stroke="#10B981"
            strokeWidth={2}
            strokeOpacity={predictions.models.linear.confidence}
            strokeDasharray="3 3"
            name="Linear Regression"
            dot={false}
          />
        )}
        
        {showIndividualModels && selectedModels.movingAverage && (
          <Line
            type="monotone"
            dataKey="movingAverage"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeOpacity={predictions.models.movingAverage.confidence}
            strokeDasharray="3 3"
            name="Moving Average"
            dot={false}
          />
        )}
        
        {showIndividualModels && selectedModels.arima && (
          <Line
            type="monotone"
            dataKey="arima"
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeOpacity={predictions.models.arima.confidence}
            strokeDasharray="3 3"
            name="ARIMA"
            dot={false}
          />
        )}
        
        {showIndividualModels && selectedModels.neuralNetwork && (
          <Line
            type="monotone"
            dataKey="neuralNetwork"
            stroke="#EF4444"
            strokeWidth={2}
            strokeOpacity={predictions.models.neuralNetwork.confidence}
            strokeDasharray="3 3"
            name="Neural Network"
            dot={false}
          />
        )}
        
        <Brush dataKey="date" height={30} />
      </LineChart>
    );
  };

  return (
    <div className="w-full">
      {/* Header with Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">{symbol}</h3>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              priceChange.percentage >= 0 
                ? 'bg-emerald-500/20 text-emerald-600' 
                : 'bg-rose-500/20 text-rose-600'
            }`}>
              <IconTrendingUp size={12} />
              <span>
                {priceChange.percentage > 0 ? '+' : ''}
                {priceChange.percentage.toFixed(2)}%
              </span>
            </div>
          </div>
          
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Confidence: {(averageConfidence * 100).toFixed(0)}%
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`p-2 rounded-md transition-all duration-200 ${
                chartType === 'area' 
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Area Chart"
            >
              <IconChartBar size={16} />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded-md transition-all duration-200 ${
                chartType === 'line' 
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Line Chart"
            >
              <IconChartLine size={16} />
            </button>
          </div>

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
        </div>
      </div>

      {/* Price Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Current Price</p>
          <p className="text-lg font-bold">{formatCurrency(currentPrice)}</p>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">14-Day Target</p>
          <p className="text-lg font-bold">{formatCurrency(chartData[chartData.length - 1]?.ensemble || currentPrice)}</p>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Expected Change</p>
          <p className={`text-lg font-bold ${
            priceChange.absolute >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatCurrency(priceChange.absolute)}
          </p>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">AI Confidence</p>
          <p className="text-lg font-bold">{(averageConfidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Model Controls (if individual models are shown) */}
      {showIndividualModels && (
        <div className="mt-4 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <IconInfoCircle size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Individual Model Controls
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedModels).map(([model, enabled]) => {
              const modelColors = {
                linear: '#10B981',
                movingAverage: '#F59E0B',
                arima: '#8B5CF6',
                neuralNetwork: '#EF4444'
              };
              
              const modelNames = {
                linear: 'Linear Regression',
                movingAverage: 'Moving Average',
                arima: 'ARIMA',
                neuralNetwork: 'Neural Network'
              };
              
              const confidence = predictions.models[model as keyof typeof predictions.models]?.confidence || 0;
              
              return (
                <button
                  key={model}
                  onClick={() => setSelectedModels(prev => ({ ...prev, [model]: !prev[model as keyof typeof prev] }))}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all duration-200 ${
                    enabled
                      ? 'bg-white dark:bg-slate-700 shadow-sm border-2'
                      : 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                  }`}
                  style={{
                    borderColor: enabled ? modelColors[model as keyof typeof modelColors] : 'transparent',
                    color: enabled ? modelColors[model as keyof typeof modelColors] : undefined
                  }}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: modelColors[model as keyof typeof modelColors] }}
                  />
                  <span>{modelNames[model as keyof typeof modelNames]}</span>
                  <span className="text-xs opacity-70">({(confidence * 100).toFixed(0)}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}