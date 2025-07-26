'use client';

import { useState, useEffect } from 'react';
import { 
  IconMoodHappy,
  IconMoodSad,
  IconMoodNeutral,
  IconMoodCrazyHappy,
  IconMoodX,
  IconNews,
  IconBrandTwitter,
  IconChartLine,
  IconTrendingUp,
  IconRefresh
} from '@tabler/icons-react';

interface SentimentData {
  symbol: string;
  overallScore: number;
  overallConfidence: number;
  sentiment: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  sources: {
    news: SentimentSource;
    socialMedia: SentimentSource;
    technical: SentimentSource;
    optionsFlow: SentimentSource;
  };
  lastAnalyzed: Date;
}

interface SentimentSource {
  name: string;
  score: number;
  confidence: number;
  details: string;
  lastUpdated: Date;
}

interface MarketOverview {
  overallSentiment: number;
  sentimentDistribution: Record<string, number>;
  topBullish: { symbol: string; score: number }[];
  topBearish: { symbol: string; score: number }[];
}

function getSentimentIcon(sentiment: string, size = 20) {
  const iconProps = { size };
  
  switch (sentiment) {
    case 'very_bullish':
      return <IconMoodCrazyHappy className="text-green-600" {...iconProps} />;
    case 'bullish':
      return <IconMoodHappy className="text-green-500" {...iconProps} />;
    case 'neutral':
      return <IconMoodNeutral className="text-gray-500" {...iconProps} />;
    case 'bearish':
      return <IconMoodSad className="text-red-500" {...iconProps} />;
    case 'very_bearish':
      return <IconMoodX className="text-red-600" {...iconProps} />;
    default:
      return <IconMoodNeutral className="text-gray-400" {...iconProps} />;
  }
}

function getSentimentColor(sentiment: string): string {
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

function getSourceIcon(sourceName: string) {
  switch (sourceName.toLowerCase()) {
    case 'news sentiment':
      return <IconNews size={16} className="text-blue-500" />;
    case 'social media sentiment':
      return <IconBrandTwitter size={16} className="text-sky-500" />;
    case 'technical analysis':
      return <IconChartLine size={16} className="text-purple-500" />;
    case 'options flow':
      return <IconTrendingUp size={16} className="text-orange-500" />;
    default:
      return <IconChartLine size={16} className="text-gray-500" />;
  }
}

interface SentimentDashboardProps {
  symbols?: string[];
  showOverview?: boolean;
}

export function SentimentDashboard({ symbols = ['SPY', 'QQQ', 'AAPL'], showOverview = true }: SentimentDashboardProps) {
  const [sentimentData, setSentimentData] = useState<{ [key: string]: SentimentData }>({});
  const [marketOverview, setMarketOverview] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentimentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sentiment data for symbols
      const sentimentResponse = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, type: 'batch' })
      });

      if (!sentimentResponse.ok) {
        throw new Error('Failed to fetch sentiment data');
      }

      const sentimentResult = await sentimentResponse.json();
      setSentimentData(sentimentResult.sentiments || {});

      // Fetch market overview if requested
      if (showOverview) {
        const overviewResponse = await fetch('/api/sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: ['SPY', 'QQQ', 'IWM'], type: 'overview' })
        });

        if (overviewResponse.ok) {
          const overviewResult = await overviewResponse.json();
          setMarketOverview(overviewResult.overview);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentimentData();
  }, [symbols]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted/50 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted/30 rounded"></div>
              <div className="h-4 bg-muted/30 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading sentiment data: {error}</p>
          <button 
            onClick={fetchSentimentData}
            className="glass-button px-4 py-2 rounded-lg"
          >
            <IconRefresh size={16} className="inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      {showOverview && marketOverview && (
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold mb-4">Market Sentiment Overview</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold mb-3">Overall Market Mood</h4>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <div className="w-full bg-muted/50 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.abs(marketOverview.overallSentiment) * 100}%`,
                        backgroundColor: marketOverview.overallSentiment >= 0 ? '#10B981' : '#EF4444',
                        marginLeft: marketOverview.overallSentiment < 0 ? `${100 - Math.abs(marketOverview.overallSentiment) * 100}%` : '0'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Bearish</span>
                    <span>Neutral</span>
                    <span>Bullish</span>
                  </div>
                </div>
                <span className="font-bold text-lg">
                  {(marketOverview.overallSentiment * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">Sentiment Distribution</h4>
              <div className="space-y-2">
                {Object.entries(marketOverview.sentimentDistribution).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getSentimentIcon(sentiment, 16)}
                      <span className="capitalize">{sentiment.replace('_', ' ')}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Symbol Sentiment */}
      <div className="grid gap-6">
        {Object.entries(sentimentData).map(([symbol, data]) => (
          <div key={symbol} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{symbol}</h3>
                {getSentimentIcon(data.sentiment, 24)}
                <span 
                  className="font-semibold capitalize"
                  style={{ color: getSentimentColor(data.sentiment) }}
                >
                  {data.sentiment.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">
                  {(data.overallScore * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {(data.overallConfidence * 100).toFixed(0)}% confidence
                </div>
              </div>
            </div>

            {/* Overall Sentiment Bar */}
            <div className="mb-6">
              <div className="w-full bg-muted/50 rounded-full h-4">
                <div 
                  className="h-4 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.abs(data.overallScore) * 100}%`,
                    backgroundColor: getSentimentColor(data.sentiment),
                    marginLeft: data.overallScore < 0 ? `${100 - Math.abs(data.overallScore) * 100}%` : '0'
                  }}
                />
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(data.sources).map(([sourceKey, source]) => (
                <div key={sourceKey} className="bg-muted/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getSourceIcon(source.name)}
                    <span className="font-medium text-sm">{source.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Score</span>
                    <span className={`font-bold text-sm ${
                      source.score >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {source.score > 0 ? '+' : ''}{(source.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-muted/50 rounded-full h-2 mb-2">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${Math.abs(source.score) * 100}%`,
                        backgroundColor: source.score >= 0 ? '#10B981' : '#EF4444',
                        marginLeft: source.score < 0 ? `${100 - Math.abs(source.score) * 100}%` : '0'
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Confidence: {(source.confidence * 100).toFixed(0)}%</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {source.details}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Last analyzed: {new Date(data.lastAnalyzed).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button 
          onClick={fetchSentimentData}
          className="glass-button px-6 py-2 rounded-lg"
          disabled={loading}
        >
          <IconRefresh size={16} className="inline mr-2" />
          Refresh Sentiment Data
        </button>
      </div>
    </div>
  );
}