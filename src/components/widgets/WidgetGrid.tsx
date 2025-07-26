'use client';

import { CircularProgress } from './CircularProgress';
import { DigitalClock } from './DigitalClock';
import { AnalogWatch } from './AnalogWatch';
import { AnimatedCounter } from './AnimatedCounter';
import { EnhancedMarketStatus } from './EnhancedMarketStatus';
import { IconTrendingUp, IconTarget, IconCash, IconCalendar } from '@tabler/icons-react';

interface WidgetGridProps {
  totalIncome: number;
  winRate: number;
  activeCycles: number;
  weeklyTarget: number;
  className?: string;
}

export function WidgetGrid({ 
  totalIncome, 
  winRate, 
  activeCycles, 
  weeklyTarget,
  className = '' 
}: WidgetGridProps) {
  const weeklyActual = 1847; // This would come from analytics
  const weeklyProgress = Math.min((weeklyActual / weeklyTarget) * 100, 100);

  return (
    <div className={`dashboard-grid ${className}`}>
      {/* Analog Watch Widget */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <div className="glass-card p-4 h-full flex items-center justify-center">
          <AnalogWatch 
            size={160}
            showSeconds={true}
            showDate={false}
            className="h-full"
          />
        </div>
      </div>

      {/* Win Rate Progress */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <div className="glass-card p-6">
          <CircularProgress
            value={winRate}
            max={100}
            size={100}
            strokeWidth={6}
            color="var(--accent-success)"
            label="Win Rate"
            animated={true}
            duration={1500}
          />
          <div className="mt-3 text-center">
            <div className="metric-label">
              Profitable Cycles
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Target Progress */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <div className="glass-card p-6">
          <CircularProgress
            value={weeklyActual}
            max={weeklyTarget}
            size={100}
            strokeWidth={6}
            color="var(--accent-primary)"
            label="Weekly"
            animated={true}
            duration={2000}
          />
          <div className="mt-3 text-center">
            <div className="text-sm text-secondary">
              <AnimatedCounter 
                value={weeklyProgress} 
                suffix="%" 
                decimals={1}
                duration={2000}
                className="font-semibold"
              /> of target
            </div>
          </div>
        </div>
      </div>

      {/* Total Income Counter */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-btn">
              <IconCash size={24} strokeWidth={1.5} />
            </div>
            <div className="metric-label">
              Total Income
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="metric-value">
              $<AnimatedCounter 
                value={totalIncome} 
                decimals={0}
                separator=","
                duration={2500}
              />
            </div>
            <div className="text-xs text-tertiary">
              Year to Date
            </div>
          </div>
        </div>
      </div>

      {/* Active Cycles Indicator */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-btn">
              <IconTarget size={24} strokeWidth={1.5} />
            </div>
            <div className="metric-label">
              Active Cycles
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="metric-value">
              <AnimatedCounter 
                value={activeCycles}
                duration={1000}
              />
            </div>
            <div className="text-xs text-tertiary">
              Currently Running
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Performance */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-btn">
              <IconTrendingUp size={24} strokeWidth={1.5} />
            </div>
            <div className="metric-label">
              This Week
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="metric-value">
              $<AnimatedCounter 
                value={weeklyActual}
                decimals={0}
                separator=","
                duration={2000}
              />
            </div>
            <div className="text-xs text-tertiary">
              vs ${weeklyTarget.toLocaleString()} target
            </div>
          </div>
        </div>
      </div>

      {/* Market Status */}
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <EnhancedMarketStatus />
      </div>
    </div>
  );
}