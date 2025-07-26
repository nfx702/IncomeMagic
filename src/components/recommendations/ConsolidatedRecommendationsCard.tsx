'use client';

import { RecommendedTrade } from '@/types/trade';
import { format } from 'date-fns';
import { 
  IconTrendingUp, 
  IconCalendarEvent, 
  IconTarget,
  IconBrain,
  IconArrowUp,
  IconArrowDown,
  IconChartLine,
  IconEye,
  IconSparkles
} from '@tabler/icons-react';

interface PredictionSummary {
  predictedPrice: number;
  percentageChange: number;
  confidence: number;
}

interface ConsolidatedRecommendationsCardProps {
  recommendations: RecommendedTrade[];
  predictions?: Record<string, PredictionSummary>;
  onViewDetails: (recommendation: RecommendedTrade) => void;
}

export function ConsolidatedRecommendationsCard({ 
  recommendations, 
  predictions, 
  onViewDetails 
}: ConsolidatedRecommendationsCardProps) {
  const totalPremium = recommendations.reduce((sum, r) => sum + (r.premium || 0), 0);
  const avgConfidence = recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length;
  
  const callCount = recommendations.filter(r => r.optionType === 'CALL').length;
  const putCount = recommendations.filter(r => r.optionType === 'PUT').length;

  const topRecommendations = recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return (
    <div className="glass-card p-6 liquid-glass">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IconSparkles className="text-primary" size={24} />
            Trade Recommendations Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            {recommendations.length} AI-powered trade suggestions available
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-500">
            ${totalPremium.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">Total Premium</div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold">{recommendations.length}</div>
          <div className="text-xs text-muted-foreground">Total Trades</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold">{(avgConfidence * 100).toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground">Avg Confidence</div>
        </div>
        <div className="bg-green-500/20 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-green-500">{callCount}</div>
          <div className="text-xs text-muted-foreground">Calls</div>
        </div>
        <div className="bg-red-500/20 rounded-lg p-3 text-center">
          <div className="text-lg font-semibold text-red-500">{putCount}</div>
          <div className="text-xs text-muted-foreground">Puts</div>
        </div>
      </div>

      {/* Top Recommendations Preview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Top Recommendations</h3>
        <div className="space-y-3">
          {topRecommendations.map((recommendation, index) => {
            const isCall = recommendation.optionType === 'CALL';
            const prediction = predictions?.[recommendation.symbol];
            
            return (
              <div 
                key={`${recommendation.symbol}-${index}`}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onViewDetails(recommendation)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isCall ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {isCall ? 
                      <IconArrowUp className="text-green-500" size={16} /> : 
                      <IconArrowDown className="text-red-500" size={16} />
                    }
                  </div>
                  <div>
                    <div className="font-semibold">{recommendation.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      ${recommendation.strike} {recommendation.optionType} • {format(new Date(recommendation.expiry), 'MMM dd')}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-green-500">
                      ${(recommendation.premium || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(recommendation.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                  
                  {prediction && (
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        prediction.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {prediction.percentageChange > 0 ? '+' : ''}{prediction.percentageChange.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ML Forecast
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(recommendation);
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <IconEye size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Recommendations Grid */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">All Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendations.map((recommendation, index) => {
            const isCall = recommendation.optionType === 'CALL';
            const prediction = predictions?.[recommendation.symbol];
            
            return (
              <div 
                key={`${recommendation.symbol}-${index}`}
                className="p-3 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer border border-border/50"
                onClick={() => onViewDetails(recommendation)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${isCall ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      {isCall ? 
                        <IconArrowUp className="text-green-500" size={12} /> : 
                        <IconArrowDown className="text-red-500" size={12} />
                      }
                    </div>
                    <span className="font-medium text-sm">{recommendation.symbol}</span>
                  </div>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    {(recommendation.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Strike:</span>
                    <span className="font-medium">${recommendation.strike}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Premium:</span>
                    <span className="font-medium text-green-500">${(recommendation.premium || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiry:</span>
                    <span className="font-medium">{format(new Date(recommendation.expiry), 'MMM dd')}</span>
                  </div>
                  {prediction && (
                    <div className="flex justify-between">
                      <span>ML Forecast:</span>
                      <span className={`font-medium ${
                        prediction.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {prediction.percentageChange > 0 ? '+' : ''}{prediction.percentageChange.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4 border-t border-border/50">
        <button className="w-full glass-button py-3 rounded-lg font-medium flex items-center justify-center gap-2">
          <IconChartLine size={16} />
          View Detailed Analysis
        </button>
      </div>
    </div>
  );
}