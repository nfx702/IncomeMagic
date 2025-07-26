'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, TrendingUp, TrendingDown, Target, Info, Eye } from 'lucide-react';

interface StrategyRecommendation {
  strategy: 'cash_secured_put' | 'covered_call' | 'iron_condor';
  symbol: string;
  strikes: number[];
  expiry: Date;
  totalPremium: number;
  maxRisk: number;
  probabilityOfProfit: number;
  maxPainAlignment: number;
  mlPredictionAlignment: number;
  overallScore: number;
  reasoning: string;
  visualIndicators: {
    strikeZones: Array<{
      strike: number;
      zone: 'optimal' | 'good' | 'acceptable' | 'risky';
      confidence: number;
    }>;
    maxPainLevel: number;
    mlPredictionRange: [number, number];
  };
}

interface IntelligentStrikeProps {
  symbol: string;
  currentPrice?: number;
  trades?: any[];
}

const IntelligentStrikeRecommendations: React.FC<IntelligentStrikeProps> = ({
  symbol,
  currentPrice = 0,
  trades = []
}) => {
  const [recommendations, setRecommendations] = useState<StrategyRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEducation, setShowEducation] = useState(false);
  const [education, setEducation] = useState<any>(null);

  useEffect(() => {
    if (symbol) {
      fetchRecommendations();
    }
  }, [symbol]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/strike-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          trades,
          strategies: ['cash_secured_put', 'covered_call', 'iron_condor'],
          options: {
            minPremium: 100,
            maxRisk: 10000,
            targetProbability: 0.7
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setEducation(data.education);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'cash_secured_put':
        return <TrendingDown className="h-4 w-4" />;
      case 'covered_call':
        return <TrendingUp className="h-4 w-4" />;
      case 'iron_condor':
        return <Target className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStrategyName = (strategy: string) => {
    switch (strategy) {
      case 'cash_secured_put':
        return 'Cash-Secured Put';
      case 'covered_call':
        return 'Covered Call';
      case 'iron_condor':
        return 'Iron Condor';
      default:
        return strategy;
    }
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'optimal':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'acceptable':
        return 'bg-yellow-500';
      case 'risky':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const StrikeVisualization: React.FC<{ recommendation: StrategyRecommendation }> = ({ recommendation }) => {
    const { visualIndicators } = recommendation;
    const minStrike = Math.min(...visualIndicators.strikeZones.map(z => z.strike));
    const maxStrike = Math.max(...visualIndicators.strikeZones.map(z => z.strike));
    const range = maxStrike - minStrike;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-3 flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Strike Zone Analysis
        </h4>
        
        {/* Price scale visualization */}
        <div className="relative h-8 bg-gray-200 rounded mb-2">
          {visualIndicators.strikeZones.map((zone, index) => {
            const position = ((zone.strike - minStrike) / range) * 100;
            return (
              <div
                key={index}
                className={`absolute top-1 h-6 w-2 rounded ${getZoneColor(zone.zone)} opacity-80`}
                style={{ left: `${position}%` }}
                title={`$${zone.strike} - ${zone.zone} (${(zone.confidence * 100).toFixed(0)}%)`}
              />
            );
          })}
          
          {/* Max pain level indicator */}
          <div
            className="absolute top-0 h-8 w-1 bg-purple-600"
            style={{ left: `${((visualIndicators.maxPainLevel - minStrike) / range) * 100}%` }}
            title={`Max Pain: $${visualIndicators.maxPainLevel.toFixed(2)}`}
          />
        </div>
        
        {/* Scale labels */}
        <div className="flex justify-between text-xs text-gray-600 mb-3">
          <span>${minStrike}</span>
          <span className="text-purple-600 font-semibold">Max Pain: ${visualIndicators.maxPainLevel.toFixed(2)}</span>
          <span>${maxStrike}</span>
        </div>
        
        {/* ML prediction range */}
        <div className="flex items-center text-xs text-gray-600 mb-2">
          <span className="mr-2">ML Prediction Range:</span>
          <span className="font-mono">
            ${visualIndicators.mlPredictionRange[0].toFixed(2)} - ${visualIndicators.mlPredictionRange[1].toFixed(2)}
          </span>
        </div>
        
        {/* Zone legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
            <span>Optimal</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
            <span>Acceptable</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
            <span>Risky</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intelligent Strike Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Analyzing strikes...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intelligent Strike Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={fetchRecommendations} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Intelligent Strike Recommendations - {symbol}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEducation(!showEducation)}
          >
            <Info className="h-4 w-4 mr-1" />
            {showEducation ? 'Hide' : 'Show'} Education
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showEducation && education && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">How Strike Selection Works</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Max Pain Analysis:</strong> {education.maxPainExplanation}</p>
              <p><strong>ML Predictions:</strong> {education.mlPredictionExplanation}</p>
            </div>
          </div>
        )}

        {recommendations.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recommendations available for {symbol}</p>
            <p className="text-sm">Try providing trade history data for better analysis</p>
          </div>
        ) : (
          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
              {recommendations.map((rec, index) => (
                <TabsTrigger key={index} value={index.toString()} className="flex items-center">
                  {getStrategyIcon(rec.strategy)}
                  <span className="ml-1">{getStrategyName(rec.strategy)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {recommendations.map((recommendation, index) => (
              <TabsContent key={index} value={index.toString()}>
                <div className="space-y-4">
                  {/* Strategy overview */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${recommendation.totalPremium.toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">Premium</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(recommendation.probabilityOfProfit * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Profit Probability</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {(recommendation.overallScore * 100).toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">Overall Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        ${recommendation.maxRisk.toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">Max Risk</div>
                    </div>
                  </div>

                  {/* Strike information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Recommended Strikes</h4>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.strikes.map((strike, idx) => (
                        <Badge key={idx} variant="secondary" className="text-lg px-3 py-1">
                          ${strike}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Expiry: {new Date(recommendation.expiry).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Analysis & Reasoning</h4>
                    <p className="text-sm">{recommendation.reasoning}</p>
                  </div>

                  {/* Visual indicators */}
                  <StrikeVisualization recommendation={recommendation} />

                  {/* Alignment scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {(recommendation.maxPainAlignment * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">Max Pain Alignment</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {(recommendation.mlPredictionAlignment * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">ML Prediction Alignment</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default IntelligentStrikeRecommendations;