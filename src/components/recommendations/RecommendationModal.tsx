'use client';

import { useState } from 'react';
import { RecommendedTrade } from '@/types/trade';
import { format } from 'date-fns';
import { 
  IconX,
  IconTrendingUp, 
  IconCalendarEvent, 
  IconTarget,
  IconBrain,
  IconArrowUp,
  IconArrowDown,
  IconChartLine,
  IconAlertTriangle,
  IconCash,
  IconClock,
  IconActivity
} from '@tabler/icons-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar
} from 'recharts';

interface PredictionData {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  percentageChange: number;
  confidence: number;
  chartData: { day: number; ensemble: number; linear?: number; ma?: number; arima?: number; nn?: number }[];
  modelConfidences: {
    linear: number;
    movingAverage: number;
    arima: number;
    neuralNetwork: number;
  };
  modelPerformance: {
    bestModel: string;
    accuracy: number;
    rmse: number;
  };
}

interface MaxPainResult {
  symbol: string;
  expiry: Date;
  maxPainPrice: number;
  totalPainAtMaxPain: number;
  confidence: number;
  week: string;
  daysToExpiry: number;
  strikeAnalysis: Array<{
    strike: number;
    callPain: number;
    putPain: number;
    totalPain: number;
    callOpenInterest: number;
    putOpenInterest: number;
  }>;
}

interface RecommendationModalProps {
  recommendation: RecommendedTrade | null;
  prediction?: PredictionData;
  maxPainData?: MaxPainResult[];
  isOpen: boolean;
  onClose: () => void;
}

export function RecommendationModal({ 
  recommendation, 
  prediction, 
  maxPainData, 
  isOpen, 
  onClose 
}: RecommendationModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'risk'>('overview');

  if (!isOpen || !recommendation) return null;

  const isCall = recommendation.optionType === 'CALL';

  // Risk Analysis Calculations
  const daysToExpiry = Math.ceil((new Date(recommendation.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const timeDecayRisk = daysToExpiry < 7 ? 'High' : daysToExpiry < 14 ? 'Medium' : 'Low';
  const moneyness = prediction ? 
    (isCall ? 
      (prediction.currentPrice / recommendation.strike - 1) * 100 : 
      (recommendation.strike / prediction.currentPrice - 1) * 100
    ) : 0;
  
  const riskLevel = moneyness > 5 ? 'Low' : moneyness > -5 ? 'Medium' : 'High';

  const riskMetrics = [
    { label: 'Time Decay Risk', value: timeDecayRisk, color: timeDecayRisk === 'High' ? 'text-red-500' : timeDecayRisk === 'Medium' ? 'text-yellow-500' : 'text-green-500' },
    { label: 'Strike Risk', value: riskLevel, color: riskLevel === 'High' ? 'text-red-500' : riskLevel === 'Medium' ? 'text-yellow-500' : 'text-green-500' },
    { label: 'Liquidity Risk', value: 'Medium', color: 'text-yellow-500' },
    { label: 'Volatility Risk', value: 'Medium', color: 'text-yellow-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card liquid-glass w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCall ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {isCall ? <IconArrowUp className="text-green-500" /> : <IconArrowDown className="text-red-500" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{recommendation.symbol}</h2>
              <p className="text-muted-foreground">
                ${recommendation.strike} {recommendation.optionType} • {format(new Date(recommendation.expiry), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted/20 rounded-lg transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/50">
          {[
            { id: 'overview', label: 'Overview', icon: IconTarget },
            { id: 'analysis', label: 'ML Analysis', icon: IconChartLine },
            { id: 'risk', label: 'Risk Assessment', icon: IconAlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconCash size={16} className="text-green-500" />
                    <span className="text-sm text-muted-foreground">Premium</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    ${(recommendation.premium || 0).toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconTarget size={16} className="text-primary" />
                    <span className="text-sm text-muted-foreground">Strike Price</span>
                  </div>
                  <div className="text-2xl font-bold">
                    ${recommendation.strike}
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconClock size={16} className="text-blue-500" />
                    <span className="text-sm text-muted-foreground">Days to Expiry</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {daysToExpiry}
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconActivity size={16} className="text-purple-500" />
                    <span className="text-sm text-muted-foreground">Confidence</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {(recommendation.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Trade Details */}
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">Trade Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Option Type:</span>
                      <span className="font-medium">{recommendation.optionType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Strike Price:</span>
                      <span className="font-medium">${recommendation.strike}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiration:</span>
                      <span className="font-medium">{format(new Date(recommendation.expiry), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Premium:</span>
                      <span className="font-medium text-green-500">${(recommendation.premium || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {recommendation.maxPain && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Pain:</span>
                        <span className="font-medium">${recommendation.maxPain.toFixed(2)}</span>
                      </div>
                    )}
                    {prediction && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Price:</span>
                          <span className="font-medium">${prediction.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ML Forecast:</span>
                          <span className={`font-medium ${prediction.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {prediction.percentageChange > 0 ? '+' : ''}{prediction.percentageChange.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Moneyness:</span>
                          <span className="font-medium">{moneyness.toFixed(1)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Trade Reasoning */}
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-3">Trade Reasoning</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {recommendation.reasoning}
                </p>
              </div>

              {/* Max Pain Analysis */}
              {maxPainData && maxPainData.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="text-lg font-semibold mb-4">Max Pain Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {maxPainData.map((maxPain, index) => {
                      const isCurrentWeek = daysToExpiry <= 7;
                      const weekLabel = isCurrentWeek ? 'This Week' : 'Next Week';
                      
                      return (
                        <div key={index} className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg p-4 border border-red-200/20">
                          <div className="flex items-center gap-2 mb-2">
                            <IconBrain size={16} className="text-red-500" />
                            <span className="font-medium">{weekLabel} Max Pain</span>
                          </div>
                          <div className="text-2xl font-bold text-red-500 mb-1">
                            ${maxPain.maxPainPrice.toFixed(0)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(maxPain.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analysis' && prediction && (
            <div className="space-y-6">
              {/* ML Forecast Chart */}
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">14-Day ML Price Forecast</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prediction.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis 
                        dataKey="day" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                        labelFormatter={(label) => `Day ${label}`}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <ReferenceLine 
                        y={prediction.currentPrice} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="5 5" 
                        label="Current Price" 
                      />
                      <ReferenceLine 
                        y={recommendation.strike} 
                        stroke={isCall ? "#10b981" : "#ef4444"} 
                        strokeDasharray="8 4" 
                        strokeWidth={2}
                        label={`Strike $${recommendation.strike}`}
                      />
                      
                      <Line 
                        type="monotone" 
                        dataKey="ensemble" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        name="Ensemble Forecast"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Model Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-4">
                  <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Best Model:</span>
                      <span className="font-medium text-green-500">{prediction.modelPerformance.bestModel}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Accuracy:</span>
                      <span className="font-medium">{(prediction.modelPerformance.accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">RMSE:</span>
                      <span className="font-medium">{prediction.modelPerformance.rmse.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="text-lg font-semibold mb-4">Model Confidence Scores</h3>
                  <div className="space-y-3">
                    {Object.entries(prediction.modelConfidences).map(([model, confidence]) => (
                      <div key={model} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-sm capitalize">{model.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                        <span className="text-sm font-medium">{(confidence * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prediction Summary */}
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">Prediction Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Current Price</div>
                    <div className="text-xl font-bold">${prediction.currentPrice.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Predicted Price (Day 14)</div>
                    <div className="text-xl font-bold">${prediction.predictedPrice.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Expected Change</div>
                    <div className={`text-xl font-bold ${
                      prediction.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {prediction.percentageChange > 0 ? '+' : ''}{prediction.percentageChange.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              {/* Risk Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {riskMetrics.map((metric) => (
                  <div key={metric.label} className="glass-card p-4 text-center">
                    <div className="text-sm text-muted-foreground mb-1">{metric.label}</div>
                    <div className={`text-lg font-bold ${metric.color}`}>{metric.value}</div>
                  </div>
                ))}
              </div>

              {/* Risk Factors */}
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">Risk Factors</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <IconClock className="text-yellow-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium">Time Decay (Theta)</div>
                      <div className="text-sm text-muted-foreground">
                        Option loses value as expiration approaches. {daysToExpiry} days remaining.
                        {daysToExpiry < 7 && ' High decay risk due to short time to expiry.'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <IconTarget className="text-blue-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium">Strike Price Risk</div>
                      <div className="text-sm text-muted-foreground">
                        Current moneyness: {moneyness.toFixed(1)}%. 
                        {Math.abs(moneyness) < 5 && ' Near-the-money options have higher gamma risk.'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <IconActivity className="text-purple-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium">Volatility Risk (Vega)</div>
                      <div className="text-sm text-muted-foreground">
                        Option value sensitive to implied volatility changes. Market volatility can impact profitability.
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <IconAlertTriangle className="text-red-500 mt-1" size={16} />
                    <div>
                      <div className="font-medium">Assignment Risk</div>
                      <div className="text-sm text-muted-foreground">
                        {isCall ? 'Call options may be assigned if underlying moves significantly above strike.' : 'Put options may be assigned if underlying moves significantly below strike.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Score */}
              <div className="glass-card p-4">
                <h3 className="text-lg font-semibold mb-4">Overall Risk Assessment</h3>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Risk Score</span>
                  <span className="text-2xl font-bold text-yellow-500">Medium</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-3 rounded-full"
                    style={{ width: '60%' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Low Risk</span>
                  <span>High Risk</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border/50">
          <div className="text-sm text-muted-foreground">
            Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Execute Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}