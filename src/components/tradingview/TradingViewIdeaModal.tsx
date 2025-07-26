'use client';

import { TradingViewIdea } from '@/types/trade';
import { 
  IconX, 
  IconSparkles, 
  IconTrendingUp, 
  IconTarget, 
  IconAlertTriangle,
  IconClock,
  IconChartBar,
  IconShield,
  IconUsers,
  IconExternalLink,
  IconBookmark
} from '@tabler/icons-react';

interface TradingViewIdeaModalProps {
  idea: TradingViewIdea | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TradingViewIdeaModal({ idea, isOpen, onClose }: TradingViewIdeaModalProps) {
  if (!isOpen || !idea) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'momentum': return <IconTrendingUp size={20} />;
      case 'technical': return <IconChartBar size={20} />;
      case 'volatility': return <IconTarget size={20} />;
      case 'earnings': return <IconSparkles size={20} />;
      case 'income': return <IconShield size={20} />;
      default: return <IconChartBar size={20} />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWheelAlignmentColor = (alignment: number) => {
    if (alignment >= 0.8) return 'text-green-600 bg-green-50';
    if (alignment >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {getCategoryIcon(idea.category)}
            <div>
              <h2 className="text-2xl font-bold">{idea.symbol}</h2>
              <p className="text-muted-foreground">{idea.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(idea.difficulty)}`}>
              {idea.difficulty}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Confidence</p>
              <p className="text-2xl font-bold text-primary">{Math.round(idea.confidence * 100)}%</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Risk/Reward</p>
              <p className="text-2xl font-bold text-green-600">{idea.riskRewardRatio.toFixed(1)}:1</p>
            </div>
            <div className={`rounded-lg p-4 text-center ${getWheelAlignmentColor(idea.wheelAlignment)}`}>
              <p className="text-sm mb-1">Wheel Alignment</p>
              <p className="text-2xl font-bold">{Math.round(idea.wheelAlignment * 100)}%</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Time Horizon</p>
              <p className="text-sm font-bold">{idea.timeHorizon}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Analysis</h3>
            <p className="text-muted-foreground leading-relaxed">{idea.description}</p>
          </div>

          {/* Technical Setup */}
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconChartBar size={18} />
              <h3 className="text-lg font-semibold">Technical Setup</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium mb-1">Setup Type: <span className="capitalize">{idea.technicalSetup.type.replace('_', ' ')}</span></p>
                <p className="text-muted-foreground text-sm">{idea.technicalSetup.description}</p>
              </div>
              
              {/* Key Levels */}
              {Object.keys(idea.technicalSetup.keyLevels).length > 0 && (
                <div>
                  <p className="font-medium mb-2">Key Levels:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {idea.technicalSetup.keyLevels.support && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-700 font-medium">Support</p>
                        <p className="text-green-800 font-bold">${idea.technicalSetup.keyLevels.support.toFixed(2)}</p>
                      </div>
                    )}
                    {idea.technicalSetup.keyLevels.resistance && (
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <p className="text-xs text-red-700 font-medium">Resistance</p>
                        <p className="text-red-800 font-bold">${idea.technicalSetup.keyLevels.resistance.toFixed(2)}</p>
                      </div>
                    )}
                    {idea.technicalSetup.keyLevels.breakoutLevel && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs text-blue-700 font-medium">Breakout Level</p>
                        <p className="text-blue-800 font-bold">${idea.technicalSetup.keyLevels.breakoutLevel.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                <span>Timeframe: <span className="font-medium">{idea.technicalSetup.timeframe}</span></span>
                <span>Setup Strength: <span className="font-medium">{Math.round(idea.technicalSetup.strength * 100)}%</span></span>
              </div>
            </div>
          </div>

          {/* Volatility Analysis */}
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconTarget size={18} />
              <h3 className="text-lg font-semibold">Volatility Analysis</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Implied Vol</p>
                <p className="font-semibold">{(idea.volatilityData.impliedVolatility * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Historical Vol</p>
                <p className="font-semibold">{(idea.volatilityData.historicalVolatility * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IV Rank</p>
                <p className="font-semibold">{idea.volatilityData.ivRank}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trend</p>
                <p className="font-semibold capitalize">{idea.volatilityData.trend}</p>
              </div>
            </div>
          </div>

          {/* Options Flow (if available) */}
          {idea.optionsFlow && (
            <div className="bg-muted/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <IconTrendingUp size={18} />
                <h3 className="text-lg font-semibold">Options Flow</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    idea.optionsFlow.unusualActivity ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {idea.optionsFlow.unusualActivity ? 'Unusual Activity' : 'Normal Activity'}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    idea.optionsFlow.sentiment === 'bullish' ? 'bg-green-100 text-green-800' :
                    idea.optionsFlow.sentiment === 'bearish' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {idea.optionsFlow.sentiment.charAt(0).toUpperCase() + idea.optionsFlow.sentiment.slice(1)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Put/Call Ratio</p>
                    <p className="font-semibold">{idea.optionsFlow.putCallRatio.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Large Trade Volume</p>
                    <p className="font-semibold">{idea.optionsFlow.largeTradeVolume.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Open Interest</p>
                    <p className="font-semibold">{idea.optionsFlow.openInterest.toLocaleString()}</p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{idea.optionsFlow.flowDescription}</p>
              </div>
            </div>
          )}

          {/* Social Sentiment (if available) */}
          {idea.socialSentiment && (
            <div className="bg-muted/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <IconUsers size={18} />
                <h3 className="text-lg font-semibold">Social Sentiment</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Mentions</p>
                  <p className="font-semibold">{idea.socialSentiment.mentions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Positive Ratio</p>
                  <p className="font-semibold">{Math.round(idea.socialSentiment.positiveRatio * 100)}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trending Score</p>
                  <p className="font-semibold">{idea.socialSentiment.trendingScore}/100</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Influencer Buzz</p>
                  <p className="font-semibold">{idea.socialSentiment.influencerBuzz ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              {/* Key Topics */}
              <div>
                <p className="text-sm font-medium mb-2">Key Topics:</p>
                <div className="flex flex-wrap gap-2">
                  {idea.socialSentiment.keyTopics.map((topic, index) => (
                    <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Risk & Return */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconAlertTriangle size={18} className="text-red-600" />
                <h4 className="font-semibold text-red-800">Risk Assessment</h4>
              </div>
              <p className="text-sm text-red-700 mb-2">Maximum Risk: <span className="font-bold">${idea.maxRisk.toFixed(2)}</span></p>
              <p className="text-xs text-red-600">{idea.riskWarning}</p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <IconTarget size={18} className="text-green-600" />
                <h4 className="font-semibold text-green-800">Return Potential</h4>
              </div>
              <p className="text-sm text-green-700 mb-2">Expected Return: <span className="font-bold">${idea.expectedReturn.toFixed(2)}</span></p>
              <p className="text-xs text-green-600">Risk/Reward Ratio: {idea.riskRewardRatio.toFixed(1)}:1</p>
            </div>
          </div>

          {/* Educational Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <IconSparkles size={18} className="text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Educational Note</h4>
                <p className="text-sm text-blue-700">{idea.educationalNote}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="font-semibold mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {idea.tags.map((tag, index) => (
                <span key={index} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Author & Timestamp */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
            <div>
              <p>Author: <span className="font-medium">{idea.author}</span></p>
              <p>Created: {idea.createdAt.toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-muted rounded-md transition-colors">
                <IconBookmark size={16} />
              </button>
              {idea.tradingViewUrl && (
                <button className="p-2 hover:bg-muted rounded-md transition-colors">
                  <IconExternalLink size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}