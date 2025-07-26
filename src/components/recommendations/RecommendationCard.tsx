'use client';

import { RecommendedTrade } from '@/types/trade';
import { format } from 'date-fns';
import { MaxPainResult } from '@/services/maxPainCalculator';
import { 
  IconTrendingUp, 
  IconCalendarEvent, 
  IconTarget,
  IconBrain,
  IconArrowUp,
  IconArrowDown,
  IconChartLine,
  IconMoodHappy,
  IconMoodSad,
  IconMoodNeutral,
  IconMoodCrazyHappy,
  IconMoodX
} from '@tabler/icons-react';

interface PredictionSummary {
  predictedPrice: number;
  percentageChange: number;
  confidence: number;
}

interface RecommendationCardProps {
  recommendation: RecommendedTrade;
  prediction?: PredictionSummary;
  maxPainData?: MaxPainResult[];
}

function getSentimentIcon(sentiment?: string) {
  switch (sentiment) {
    case 'very_bullish':
      return <IconMoodCrazyHappy className="text-green-600" size={16} />;
    case 'bullish':
      return <IconMoodHappy className="text-green-500" size={16} />;
    case 'neutral':
      return <IconMoodNeutral className="text-gray-500" size={16} />;
    case 'bearish':
      return <IconMoodSad className="text-red-500" size={16} />;
    case 'very_bearish':
      return <IconMoodX className="text-red-600" size={16} />;
    default:
      return <IconMoodNeutral className="text-gray-400" size={16} />;
  }
}

function getSentimentColor(sentiment?: string): string {
  switch (sentiment) {
    case 'very_bullish':
      return '#10B981';
    case 'bullish':
      return '#34D399';
    case 'neutral':
      return '#6B7280';
    case 'bearish':
      return '#F87171';
    case 'very_bearish':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

function formatSentimentLabel(sentiment?: string): string {
  if (!sentiment) return 'N/A';
  return sentiment.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

export function RecommendationCard({ recommendation, prediction, maxPainData }: RecommendationCardProps) {
  const isCall = recommendation.optionType === 'CALL';
  const hasSentiment = recommendation.sentimentScore !== undefined;
  
  return (
    <div className="glass-card p-6 liquid-glass hover:scale-[1.02] transition-transform duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{recommendation.symbol}</h3>
          <p className="text-sm text-muted-foreground">
            {recommendation.optionType} Option
          </p>
        </div>
        <div className={`p-2 rounded-lg ${isCall ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {isCall ? <IconArrowUp className="text-green-500" /> : <IconArrowDown className="text-red-500" />}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <IconTarget size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Strike:</span>
          <span className="font-medium">${recommendation.strike}</span>
        </div>

        <div className="flex items-center gap-2">
          <IconCalendarEvent size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Expiry:</span>
          <span className="font-medium">{format(new Date(recommendation.expiry), 'MMM dd, yyyy')}</span>
        </div>

        <div className="flex items-center gap-2">
          <IconTrendingUp size={18} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Premium:</span>
          <span className="font-bold text-green-500">${(recommendation.premium || 0).toFixed(2)}</span>
        </div>

        {recommendation.maxPain && (
          <div className="flex items-center gap-2">
            <IconBrain size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Max Pain:</span>
            <span className="font-medium">${(recommendation.maxPain || 0).toFixed(2)}</span>
          </div>
        )}

        {/* Sentiment Analysis */}
        {hasSentiment && (
          <div className="flex items-center gap-2">
            {getSentimentIcon(recommendation.sentimentLabel)}
            <span className="text-sm text-muted-foreground">Sentiment:</span>
            <span 
              className="font-medium text-sm"
              style={{ color: getSentimentColor(recommendation.sentimentLabel) }}
            >
              {formatSentimentLabel(recommendation.sentimentLabel)}
            </span>
            {recommendation.sentimentScore && (
              <span className="text-xs text-muted-foreground ml-1">
                ({(recommendation.sentimentScore * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <span className="text-sm font-medium">{(recommendation.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-muted/50 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
            style={{ width: `${recommendation.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Sentiment Confidence Bar */}
      {hasSentiment && recommendation.sentimentConfidence && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Sentiment Confidence</span>
            <span className="text-sm font-medium">{(recommendation.sentimentConfidence * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted/50 rounded-full h-2">
            <div 
              className="h-2 rounded-full"
              style={{ 
                width: `${recommendation.sentimentConfidence * 100}%`,
                backgroundColor: getSentimentColor(recommendation.sentimentLabel),
                opacity: 0.8
              }}
            />
          </div>
        </div>
      )}

      {/* ML Prediction Summary */}
      {prediction && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <IconChartLine size={16} className="text-primary" />
            <span className="text-sm font-medium">14-Day ML Forecast</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 rounded p-2">
              <p className="text-xs text-muted-foreground">Target Price</p>
              <p className="text-sm font-semibold">
                ${isFinite(prediction.predictedPrice) && !isNaN(prediction.predictedPrice) ? 
                  prediction.predictedPrice.toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-muted/30 rounded p-2">
              <p className="text-xs text-muted-foreground">Expected Change</p>
              <p className={`text-sm font-semibold ${
                prediction.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {isFinite(prediction.percentageChange) && !isNaN(prediction.percentageChange) ? 
                  `${prediction.percentageChange > 0 ? '+' : ''}${prediction.percentageChange.toFixed(1)}%` : 
                  '0.0%'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">ML Confidence</span>
            <span className="text-xs font-medium">
              {isFinite(prediction.confidence) && !isNaN(prediction.confidence) ? 
                (prediction.confidence * 100).toFixed(0) : '70'}%
            </span>
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">{recommendation.reasoning}</p>
      </div>

      <button className="w-full mt-4 py-2 glass-button rounded-lg font-medium">
        Execute Trade
      </button>
    </div>
  );
}