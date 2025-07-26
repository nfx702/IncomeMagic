'use client';

import { 
  IconCurrencyDollar, 
  IconRefresh, 
  IconTrendingUp,
  IconPercentage,
  IconArrowUp,
  IconArrowDown,
  IconMinus,
  IconSparkles,
  IconChartLine
} from '@tabler/icons-react';

interface StatsCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  percentage: number;
  icon: 'dollar' | 'cycle' | 'premium' | 'percentage' | 'forecast';
  subtitle?: string;
  change?: string;
}

export function StatsCard({ title, value, trend, percentage, icon, subtitle, change }: StatsCardProps) {
  const icons = {
    dollar: IconCurrencyDollar,
    cycle: IconRefresh,
    premium: IconTrendingUp,
    percentage: IconPercentage,
    forecast: IconChartLine,
  };

  const Icon = icons[icon];

  const trendIcons = {
    up: IconArrowUp,
    down: IconArrowDown,
    neutral: IconMinus,
  };

  const TrendIcon = trendIcons[trend];

  const trendColors = {
    up: 'text-success',
    down: 'text-danger',
    neutral: 'text-secondary',
  };

  return (
    <div className="metric-card animate-slideInUp group">
      {/* Enhanced Icon Circle */}
      <div className="metric-icon-circle animate-float">
        <Icon size={24} strokeWidth={1.5} />
      </div>

      <div className="space-y-3">
        {/* Title and Subtitle */}
        <div>
          <p className="metric-label mb-1" style={{ letterSpacing: 'var(--letter-spacing-normal)' }}>
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-tertiary" style={{ letterSpacing: 'var(--letter-spacing-wide)' }}>
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Main Value */}
        <div className="metric-value text-gradient">
          {value}
        </div>
        
        {/* Trend and Change Information */}
        {(percentage !== 0 || change) && (
          <div className="flex items-center justify-between">
            {percentage !== 0 && (
              <div className={`flex items-center gap-1.5 text-sm ${trendColors[trend]} animate-scaleIn`}>
                <TrendIcon size={16} strokeWidth={2} />
                <span className="font-semibold">
                  {Math.abs(percentage)}%
                </span>
              </div>
            )}
            
            {change && (
              <div className="text-right">
                <p className={`text-sm font-medium ${trendColors[trend]}`}>
                  {change}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}