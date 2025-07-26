'use client';

import { useState } from 'react';
import { IconChartLine, IconChartBar, IconTrendingUp } from '@tabler/icons-react';
import { Trade, WheelCycle } from '@/types/trade';
import { IncomeChart as EnhancedIncomeChart } from '@/components/charts/IncomeChart';

interface IncomeChartProps {
  trades: Trade[];
  cycles: Map<string, WheelCycle[]>;
}

export function IncomeChart({ trades, cycles }: IncomeChartProps) {
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');

  return (
    <div className="glass-card p-6">
      {/* Enhanced Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-glass-bg backdrop-blur-sm border border-glass-border">
            <button
              onClick={() => setChartType('area')}
              className={`icon-btn ${
                chartType === 'area' 
                  ? 'bg-glow-primary' 
                  : ''
              }`}
              title="Area Chart"
            >
              <IconTrendingUp size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`icon-btn ${
                chartType === 'line' 
                  ? 'bg-glow-primary' 
                  : ''
              }`}
              title="Line Chart"
            >
              <IconChartLine size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`icon-btn ${
                chartType === 'bar' 
                  ? 'bg-glow-primary' 
                  : ''
              }`}
              title="Bar Chart"
            >
              <IconChartBar size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-glass-bg backdrop-blur-sm border border-glass-border">
            <button
              onClick={() => setTimeframe('weekly')}
              className={`btn-pill text-sm ${
                timeframe === 'weekly' 
                  ? 'bg-glow-primary text-accent-primary' 
                  : ''
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe('monthly')}
              className={`btn-pill text-sm ${
                timeframe === 'monthly' 
                  ? 'bg-glow-primary text-accent-primary' 
                  : ''
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-success)' }}></div>
            <span className="text-sm text-secondary">Net Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-primary)' }}></div>
            <span className="text-sm text-secondary">Gross Income</span>
          </div>
        </div>
      </div>

      {/* Enhanced Chart */}
      <div className="relative rounded-xl overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
        <EnhancedIncomeChart 
          trades={trades} 
          cycles={cycles} 
          type={chartType}
          timeframe={timeframe}
          height={320}
        />
      </div>
    </div>
  );
}