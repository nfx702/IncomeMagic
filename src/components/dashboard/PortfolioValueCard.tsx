'use client';

import { useState, useEffect } from 'react';
import { IconWallet, IconTrendingUp, IconTrendingDown, IconRefresh } from '@tabler/icons-react';
import { formatCurrency, formatPercentage } from '@/utils/formatting';
import { PortfolioValue } from '@/services/portfolioService';

interface PortfolioValueCardProps {
  portfolioValue: PortfolioValue | null;
  onRefresh?: () => void;
  loading?: boolean;
}

export function PortfolioValueCard({ portfolioValue, onRefresh, loading = false }: PortfolioValueCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    if (portfolioValue) {
      // Animate the total value
      const target = portfolioValue.totalValue;
      const duration = 1000; // 1 second
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setAnimatedValue(current);
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [portfolioValue?.totalValue]);

  const isPositive = portfolioValue ? portfolioValue.dayChange >= 0 : true;
  const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown;
  const trendColor = isPositive ? 'text-success' : 'text-danger';

  return (
    <div className="glass-card p-6 col-span-12 md:col-span-6 lg:col-span-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-btn">
            <IconWallet size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Portfolio Value</h3>
            <p className="text-sm text-secondary">Total account value</p>
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`icon-btn ${loading ? 'animate-spin' : ''}`}
            title="Refresh portfolio value"
          >
            <IconRefresh size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-8 bg-glass-bg rounded-lg animate-pulse" />
          <div className="h-6 bg-glass-bg rounded-lg animate-pulse w-3/4" />
        </div>
      ) : portfolioValue ? (
        <>
          <div className="mb-4">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(animatedValue)}
            </div>
            <div className={`flex items-center gap-2 mt-2 ${trendColor}`}>
              <TrendIcon size={20} strokeWidth={2} />
              <span className="font-semibold">
                {formatCurrency(Math.abs(portfolioValue.dayChange))}
              </span>
              <span className="text-sm">
                ({formatPercentage(Math.abs(portfolioValue.dayChangePercent) / 100)})
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-glass-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary">Cash Balance</span>
              <span className="text-sm font-medium">
                {formatCurrency(portfolioValue.cashBalance)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary">Positions Value</span>
              <span className="text-sm font-medium">
                {formatCurrency(portfolioValue.positionsValue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-secondary">Last Updated</span>
              <span className="text-xs text-tertiary">
                {new Date(portfolioValue.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-secondary text-sm">
            Portfolio value unavailable
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-pill mt-4 text-sm"
            >
              Load Portfolio
            </button>
          )}
        </div>
      )}
    </div>
  );
}