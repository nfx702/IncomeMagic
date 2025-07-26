'use client';

import { Position } from '@/types/trade';
import { IconAlertCircle } from '@tabler/icons-react';

interface ActivePositionsProps {
  positions: Map<string, Position>;
}

export function ActivePositions({ positions }: ActivePositionsProps) {
  const activePositions = Array.from(positions.values())
    .filter(p => p.quantity > 0)
    .map(p => {
      const activeCycle = p.activeCycles[0];
      return {
        ...p,
        safeStrike: activeCycle?.safeStrikePrice || 0,
        daysInCycle: activeCycle ? 
          Math.floor((Date.now() - activeCycle.startDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          0
      };
    });

  return (
    <div className="glass-card p-6 liquid-glass">
      <h3 className="text-lg font-semibold mb-4">Active Positions</h3>
      
      {activePositions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <IconAlertCircle size={48} className="mx-auto mb-3 opacity-50" />
          <p>No active positions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activePositions.map((position) => (
            <div key={position.symbol} className="p-4 rounded-lg bg-muted/20 border border-border/50">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg">{position.symbol}</h4>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                  {position.daysInCycle} days
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Shares</p>
                  <p className="font-medium">{position.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Cost</p>
                  <p className="font-medium">${(position.averageCost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Safe Strike</p>
                  <p className="font-medium text-green-500">
                    ${(position.safeStrike || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Realized P&L</p>
                  <p className={`font-medium ${position.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${(position.realizedPnL || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}