'use client';

import { useState } from 'react';
import { IconPlus, IconX } from '@tabler/icons-react';

interface SymbolSearchProps {
  selectedSymbols: string[];
  onSymbolsChange: (symbols: string[]) => void;
}

export function SymbolSearch({ selectedSymbols, onSymbolsChange }: SymbolSearchProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = inputValue.trim().toUpperCase();
    if (symbol && !selectedSymbols.includes(symbol)) {
      onSymbolsChange([...selectedSymbols, symbol]);
      setInputValue('');
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    onSymbolsChange(selectedSymbols.filter(s => s !== symbol));
  };

  return (
    <div className="glass-card p-6 liquid-glass">
      <h3 className="text-lg font-semibold mb-4">Tracked Symbols</h3>
      
      <form onSubmit={handleAddSymbol} className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add symbol (e.g., AAPL)"
          className="flex-1 px-4 py-2 rounded-lg bg-muted/50 border border-border/50 focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 glass-button rounded-lg flex items-center gap-2"
        >
          <IconPlus size={18} />
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {selectedSymbols.map((symbol) => (
          <div
            key={symbol}
            className="px-3 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-2 group"
          >
            <span className="font-medium">{symbol}</span>
            <button
              onClick={() => handleRemoveSymbol(symbol)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}