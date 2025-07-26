'use client';

import { useState } from 'react';
import { SentimentDashboard } from '@/components/sentiment/SentimentDashboard';
import { IconMoodHappy, IconSearch, IconPlus, IconX } from '@tabler/icons-react';

export default function SentimentPage() {
  const [customSymbols, setCustomSymbols] = useState<string[]>(['AAPL', 'TSLA', 'NVDA', 'MSFT']);
  const [newSymbol, setNewSymbol] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const addSymbol = () => {
    const symbol = newSymbol.toUpperCase().trim();
    if (symbol && !customSymbols.includes(symbol)) {
      setCustomSymbols([...customSymbols, symbol]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbolToRemove: string) => {
    setCustomSymbols(customSymbols.filter(symbol => symbol !== symbolToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addSymbol();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <IconMoodHappy size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">Market Sentiment Analysis</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Comprehensive sentiment analysis from multiple sources including news, social media, 
          technical indicators, and options flow to gauge market mood and inform trading decisions.
        </p>
      </div>

      {/* Symbol Selection */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Analyze Symbols</h2>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="glass-button px-4 py-2 rounded-lg text-sm"
          >
            {showCustom ? 'Use Default' : 'Customize Symbols'}
          </button>
        </div>

        {showCustom && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <IconSearch size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Enter symbol (e.g., AAPL)"
                  className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <button
                onClick={addSymbol}
                className="glass-button px-4 py-2 rounded-lg"
                disabled={!newSymbol.trim()}
              >
                <IconPlus size={16} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {customSymbols.map((symbol) => (
                <div key={symbol} className="flex items-center gap-1 bg-primary/20 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium">{symbol}</span>
                  <button
                    onClick={() => removeSymbol(symbol)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Dashboard */}
      <SentimentDashboard 
        symbols={showCustom ? customSymbols : undefined}
        showOverview={true}
      />
    </div>
  );
}