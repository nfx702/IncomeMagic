'use client';

import { useState, useEffect } from 'react';
import { TradingViewIdea } from '@/types/trade';
import { 
  IconSparkles, 
  IconTrendingUp, 
  IconTarget, 
  IconAlertTriangle,
  IconClock,
  IconChartBar,
  IconShield,
  IconFilter,
  IconRefresh,
  IconBookmark,
  IconExternalLink
} from '@tabler/icons-react';

interface TradingViewIdeasProps {
  symbols: string[];
  onIdeaSelect?: (idea: TradingViewIdea) => void;
}

interface FiltersState {
  category: string;
  difficulty: string;
  timeHorizon: string;
  minWheelAlignment: number;
}

export function TradingViewIdeas({ symbols, onIdeaSelect }: TradingViewIdeasProps) {
  const [ideas, setIdeas] = useState<TradingViewIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FiltersState>({
    category: 'all',
    difficulty: 'all',
    timeHorizon: 'all',
    minWheelAlignment: 0.5
  });
  const [showFilters, setShowFilters] = useState(false);
  const [savedIdeas, setSavedIdeas] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchIdeas();
  }, [symbols, filters]);

  const fetchIdeas = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/trading-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols,
          ...filters,
          limit: 15
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trading ideas');
      }

      const data = await response.json();
      setIdeas(data.ideas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ideas');
      console.error('Error fetching trading ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'momentum': return <IconTrendingUp size={16} />;
      case 'technical': return <IconChartBar size={16} />;
      case 'volatility': return <IconTarget size={16} />;
      case 'earnings': return <IconSparkles size={16} />;
      case 'income': return <IconShield size={16} />;
      default: return <IconChartBar size={16} />;
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
    if (alignment >= 0.8) return 'text-green-600';
    if (alignment >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const toggleSavedIdea = (ideaId: string) => {
    setSavedIdeas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const handleFilterChange = (key: keyof FiltersState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="glass-card p-6 liquid-glass">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mr-3"></div>
          <span className="text-muted-foreground">Generating trading ideas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 liquid-glass">
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <IconAlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-semibold mb-2">Failed to load trading ideas</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchIdeas}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <IconSparkles className="text-primary" />
            TradingView-Style Ideas
          </h2>
          <p className="text-muted-foreground">AI-powered trade setups with wheel strategy focus</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              showFilters ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <IconFilter size={16} className="mr-1 inline" />
            Filters
          </button>
          <button
            onClick={fetchIdeas}
            className="px-3 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            <IconRefresh size={16} className="mr-1 inline" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="glass-card p-4 liquid-glass">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="income">Income</option>
                <option value="technical">Technical</option>
                <option value="volatility">Volatility</option>
                <option value="momentum">Momentum</option>
                <option value="earnings">Earnings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time Horizon</label>
              <select
                value={filters.timeHorizon}
                onChange={(e) => handleFilterChange('timeHorizon', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm"
              >
                <option value="all">All Timeframes</option>
                <option value="1-7 days">1-7 days</option>
                <option value="1-2 weeks">1-2 weeks</option>
                <option value="2-4 weeks">2-4 weeks</option>
                <option value="1-3 months">1-3 months</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Min Wheel Alignment ({Math.round(filters.minWheelAlignment * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.minWheelAlignment}
                onChange={(e) => handleFilterChange('minWheelAlignment', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="glass-card p-6 liquid-glass text-center">
          <IconSparkles size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No trading ideas match your current filters.</p>
          <p className="text-sm text-muted-foreground mt-2">Try adjusting your filter settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ideas.map((idea) => (
            <div key={idea.id} className="glass-card p-6 liquid-glass hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(idea.category)}
                    <span className="font-bold text-lg">{idea.symbol}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(idea.difficulty)}`}>
                      {idea.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold text-md mb-2">{idea.title}</h3>
                </div>
                <button
                  onClick={() => toggleSavedIdea(idea.id)}
                  className={`p-2 rounded-md transition-colors ${
                    savedIdeas.has(idea.id) 
                      ? 'text-yellow-500 bg-yellow-50' 
                      : 'text-muted-foreground hover:text-yellow-500'
                  }`}
                >
                  <IconBookmark size={16} />
                </button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{Math.round(idea.confidence * 100)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">R/R Ratio</p>
                  <p className="font-semibold">{idea.riskRewardRatio.toFixed(1)}:1</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Wheel Fit</p>
                  <p className={`font-semibold ${getWheelAlignmentColor(idea.wheelAlignment)}`}>
                    {Math.round(idea.wheelAlignment * 100)}%
                  </p>
                </div>
              </div>

              {/* Technical Setup */}
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconChartBar size={14} />
                  <span className="text-sm font-medium">Technical Setup</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{idea.technicalSetup.description}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span>Timeframe: {idea.technicalSetup.timeframe}</span>
                  <span>Strength: {Math.round(idea.technicalSetup.strength * 100)}%</span>
                </div>
              </div>

              {/* Volatility Info */}
              <div className="bg-muted/20 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconTarget size={14} />
                  <span className="text-sm font-medium">Volatility</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">IV Rank: </span>
                    <span className="font-medium">{idea.volatilityData.ivRank}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trend: </span>
                    <span className="font-medium capitalize">{idea.volatilityData.trend}</span>
                  </div>
                </div>
              </div>

              {/* Time & Risk */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  <IconClock size={14} />
                  <span>{idea.timeHorizon}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconAlertTriangle size={14} className="text-orange-500" />
                  <span>Max Risk: ${idea.maxRisk.toFixed(2)}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4">{idea.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {idea.tags.slice(0, 4).map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {tag}
                  </span>
                ))}
                {idea.tags.length > 4 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                    +{idea.tags.length - 4} more
                  </span>
                )}
              </div>

              {/* Risk Warning */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <IconAlertTriangle size={16} className="text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-orange-800 mb-1">Risk Warning</p>
                    <p className="text-xs text-orange-700">{idea.riskWarning}</p>
                  </div>
                </div>
              </div>

              {/* Educational Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <IconSparkles size={16} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-1">Educational Note</p>
                    <p className="text-xs text-blue-700">{idea.educationalNote}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onIdeaSelect?.(idea)}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  View Details
                </button>
                {idea.tradingViewUrl && (
                  <button className="px-3 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors">
                    <IconExternalLink size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}