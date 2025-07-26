/**
 * Live Data Dashboard Component
 * Displays real-time market data, recommendations, and risk metrics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import { formatCurrency, formatPercentage } from '@/utils/formatting';

interface LiveDataDashboardProps {
  symbols?: string[];
  portfolioValue?: number;
  trades?: any[];
  className?: string;
}

export function LiveDataDashboard({
  symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL'],
  portfolioValue = 100000,
  trades = [],
  className = ''
}: LiveDataDashboardProps) {
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbols[0] || '');

  const liveData = useLiveData({
    symbols,
    autoRefresh: true,
    refreshInterval: 10000,
    enableStreaming: true
  });

  // Generate recommendations on component mount
  useEffect(() => {
    liveData.actions.generateRecommendations(trades, portfolioValue, riskTolerance);
    liveData.actions.assessRisk(trades, [], portfolioValue);
  }, [portfolioValue, riskTolerance, trades]);

  const handleRefresh = () => {
    liveData.actions.refresh();
    liveData.actions.generateRecommendations(trades, portfolioValue, riskTolerance);
  };

  const handleRiskToleranceChange = (newTolerance: typeof riskTolerance) => {
    setRiskTolerance(newTolerance);
    liveData.actions.generateRecommendations(trades, portfolioValue, newTolerance);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Live Market Data</h2>
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              liveData.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm">
              {liveData.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={liveData.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {liveData.isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {liveData.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {liveData.error}
        </div>
      )}

      {/* Market Indicators */}
      {liveData.marketIndicators && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">VIX</h3>
            <p className="text-2xl font-bold">{liveData.marketIndicators.vix.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">SPY</h3>
            <p className="text-2xl font-bold">{formatCurrency(liveData.marketIndicators.spyPrice)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Market Sentiment</h3>
            <p className={`text-2xl font-bold capitalize ${
              liveData.marketIndicators.marketSentiment === 'bullish' ? 'text-green-600' :
              liveData.marketIndicators.marketSentiment === 'bearish' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {liveData.marketIndicators.marketSentiment}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Fear & Greed</h3>
            <p className="text-2xl font-bold">{liveData.marketIndicators.fearGreedIndex.toFixed(0)}</p>
          </div>
        </div>
      )}

      {/* Real-time Quotes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Real-time Quotes</h3>
          {liveData.lastUpdate && (
            <p className="text-sm text-gray-500">
              Last updated: {liveData.lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {symbols.map(symbol => {
              const quote = liveData.quotes[symbol];
              if (!quote) return null;

              return (
                <div
                  key={symbol}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedSymbol === symbol 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSymbol(symbol)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{symbol}</h4>
                      <p className="text-2xl font-bold">{formatCurrency(quote.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        quote.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {quote.changePercent >= 0 ? '+' : ''}{formatPercentage(quote.changePercent)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vol: {quote.volume?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      Sources: {quote.sources?.join(', ') || 'N/A'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      quote.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                      quote.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(quote.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Risk Tolerance Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Risk Settings</h3>
        <div className="flex space-x-4">
          {(['conservative', 'moderate', 'aggressive'] as const).map(tolerance => (
            <button
              key={tolerance}
              onClick={() => handleRiskToleranceChange(tolerance)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                riskTolerance === tolerance
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tolerance}
            </button>
          ))}
        </div>
      </div>

      {/* Live Recommendations */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Live Recommendations</h3>
          <p className="text-sm text-gray-500">
            {liveData.recommendations.length} opportunities found
          </p>
        </div>
        <div className="p-6">
          {liveData.recommendations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No recommendations available. Try adjusting your risk tolerance.
            </p>
          ) : (
            <div className="space-y-4">
              {liveData.recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-lg">{rec.symbol}</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {rec.strategy.replace('_', ' ')} • {rec.action.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatPercentage(rec.expectedReturn)} annual
                      </p>
                      <p className="text-sm text-gray-500">
                        {Math.round(rec.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Strike:</span>
                      <p className="font-medium">{formatCurrency(rec.strike)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Premium:</span>
                      <p className="font-medium">{formatCurrency(rec.premium)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Probability:</span>
                      <p className="font-medium">{formatPercentage(rec.probability)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Max Loss:</span>
                      <p className="font-medium">{formatCurrency(rec.maxLoss)}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      <strong>Reasoning:</strong> {rec.reasoning.join('; ')}
                    </p>
                    {rec.warnings.length > 0 && (
                      <p className="text-sm text-orange-600 mt-1">
                        <strong>Warnings:</strong> {rec.warnings.join('; ')}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Data freshness: {rec.dataFreshness.toFixed(1)} minutes old
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Risk Assessment */}
      {liveData.portfolioRisk && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Portfolio Risk Assessment</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-gray-500 text-sm">Total Risk</span>
                <p className="text-2xl font-bold">
                  {formatPercentage(liveData.portfolioRisk.totalRisk)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Risk Budget Used</span>
                <p className="text-2xl font-bold">
                  {liveData.portfolioRisk.riskBudgetUsed.toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Concentration Risk</span>
                <p className="text-2xl font-bold">
                  {formatPercentage(liveData.portfolioRisk.concentrationRisk)}
                </p>
              </div>
            </div>

            {liveData.portfolioRisk.alerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Risk Alerts</h4>
                {liveData.portfolioRisk.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      alert.level === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.level === 'warning' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm">{alert.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}