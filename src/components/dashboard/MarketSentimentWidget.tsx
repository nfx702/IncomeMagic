'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  IconMoodHappy,
  IconMoodSad,
  IconMoodNeutral,
  IconMoodCrazyHappy,
  IconMoodX,
  IconArrowRight
} from '@tabler/icons-react';

interface MarketOverview {
  overallSentiment: number;
  sentimentDistribution: Record<string, number>;
  topBullish: { symbol: string; score: number }[];
  topBearish: { symbol: string; score: number }[];
}

function getSentimentIcon(score: number, size = 20) {
  const iconProps = { size };
  
  if (score >= 0.5) return <IconMoodCrazyHappy className="text-green-600" {...iconProps} />;
  if (score >= 0.2) return <IconMoodHappy className="text-green-500" {...iconProps} />;
  if (score <= -0.5) return <IconMoodX className="text-red-600" {...iconProps} />;
  if (score <= -0.2) return <IconMoodSad className="text-red-500" {...iconProps} />;
  return <IconMoodNeutral className="text-gray-500" {...iconProps} />;
}

function getSentimentColor(score: number): string {
  if (score >= 0.5) return '#10B981';
  if (score >= 0.2) return '#34D399';
  if (score <= -0.5) return '#EF4444';
  if (score <= -0.2) return '#F87171';
  return '#6B7280';
}

function getSentimentLabel(score: number): string {
  if (score >= 0.5) return 'Very Bullish';
  if (score >= 0.2) return 'Bullish';
  if (score <= -0.5) return 'Very Bearish';
  if (score <= -0.2) return 'Bearish';
  return 'Neutral';
}

export function MarketSentimentWidget() {
  const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketOverview();
  }, []);

  const fetchMarketOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: ['SPY', 'QQQ', 'IWM'], type: 'overview' })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch market overview');
      }

      const result = await response.json();
      setMarketOverview(result.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market overview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted/50 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted/30 rounded"></div>
            <div className="h-4 bg-muted/30 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !marketOverview) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconMoodNeutral size={24} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold">Market Sentiment</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {error || 'Unable to load sentiment data'}
        </p>
        <Link 
          href="/sentiment"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          View Detailed Analysis
          <IconArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const sentimentScore = marketOverview.overallSentiment;
  const sentimentLabel = getSentimentLabel(sentimentScore);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getSentimentIcon(sentimentScore, 24)}
          <h3 className="text-lg font-semibold">Market Sentiment</h3>
        </div>
        <Link 
          href="/sentiment"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Details
          <IconArrowRight size={14} />
        </Link>
      </div>

      <div className="space-y-4">
        {/* Overall Sentiment */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Overall Mood</span>
            <span 
              className="font-semibold text-sm"
              style={{ color: getSentimentColor(sentimentScore) }}
            >
              {sentimentLabel}
            </span>
          </div>
          
          <div className="w-full bg-muted/50 rounded-full h-3 mb-2">
            <div 
              className="h-3 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.abs(sentimentScore) * 100}%`,
                backgroundColor: getSentimentColor(sentimentScore),
                marginLeft: sentimentScore < 0 ? `${100 - Math.abs(sentimentScore) * 100}%` : '0'
              }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
        </div>

        {/* Top Movers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-500 mb-2">Most Bullish</h4>
            {marketOverview.topBullish.slice(0, 2).map((item) => (
              <div key={item.symbol} className="flex justify-between text-xs mb-1">
                <span className="font-medium">{item.symbol}</span>
                <span className="text-green-500">+{(item.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-red-500 mb-2">Most Bearish</h4>
            {marketOverview.topBearish.slice(0, 2).map((item) => (
              <div key={item.symbol} className="flex justify-between text-xs mb-1">
                <span className="font-medium">{item.symbol}</span>
                <span className="text-red-500">{(item.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}