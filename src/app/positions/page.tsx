'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Position, WheelCycle } from '@/types/trade';
import { PositionValidation } from '@/components/validation/PositionValidation';
import { 
  IconCurrencyDollar, 
  IconChartLine, 
  IconTarget,
  IconCalendarTime,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowDownRight,
  IconCash,
  IconReceipt,
  IconCalendar
} from '@tabler/icons-react';
import { format } from 'date-fns';

export default function PositionsPage() {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [cycles, setCycles] = useState<Map<string, WheelCycle[]>>(new Map());
  const [activeOptions, setActiveOptions] = useState<any[]>([]);
  const [latestPrices, setLatestPrices] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPositionData();
  }, []);

  const loadPositionData = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
      if (data.error) {
        console.error('Error loading position data:', data.error);
        return;
      }
      
      // Store active options
      if (data.activeOptions) {
        setActiveOptions(data.activeOptions);
      }
      
      // Store latest prices
      if (data.latestPrices) {
        setLatestPrices(data.latestPrices);
      }

      // Connected cycles no longer needed - each PUT starts a new cycle
      
      // Convert and process data
      const positionsMap = new Map();
      Object.entries(data.positions).forEach(([key, position]: [string, any]) => {
        const positionWithDates = {
          ...position,
          activeCycles: position.activeCycles.map((cycle: any) => ({
            ...cycle,
            startDate: new Date(cycle.startDate),
            endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
            trades: cycle.trades.map((trade: any) => ({
              ...trade,
              dateTime: new Date(trade.dateTime),
              orderTime: new Date(trade.orderTime),
              openDateTime: new Date(trade.openDateTime),
              reportDate: new Date(trade.reportDate),
              tradeDate: new Date(trade.tradeDate),
              expiry: trade.expiry ? new Date(trade.expiry) : undefined
            }))
          })),
          completedCycles: position.completedCycles.map((cycle: any) => ({
            ...cycle,
            startDate: new Date(cycle.startDate),
            endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
            trades: cycle.trades.map((trade: any) => ({
              ...trade,
              dateTime: new Date(trade.dateTime),
              orderTime: new Date(trade.orderTime),
              openDateTime: new Date(trade.openDateTime),
              reportDate: new Date(trade.reportDate),
              tradeDate: new Date(trade.tradeDate),
              expiry: trade.expiry ? new Date(trade.expiry) : undefined
            }))
          }))
        };
        positionsMap.set(key, positionWithDates);
      });
      
      const cyclesMap = new Map();
      Object.entries(data.cycles).forEach(([key, cycles]: [string, any]) => {
        const cyclesWithDates = cycles.map((cycle: any) => ({
          ...cycle,
          startDate: new Date(cycle.startDate),
          endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
          trades: cycle.trades.map((trade: any) => ({
            ...trade,
            dateTime: new Date(trade.dateTime),
            orderTime: new Date(trade.orderTime),
            openDateTime: new Date(trade.openDateTime),
            reportDate: new Date(trade.reportDate),
            tradeDate: new Date(trade.tradeDate),
            expiry: trade.expiry ? new Date(trade.expiry) : undefined
          }))
        }));
        cyclesMap.set(key, cyclesWithDates);
      });
      
      setPositions(positionsMap);
      setCycles(cyclesMap);
    } catch (error) {
      console.error('Error loading position data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCycleFlow = (cycleType: string): string => {
    switch (cycleType) {
      case 'put-expired':
        return 'PUT (Expired)';
      case 'put-assigned-call-expired':
        return 'PUT → ASSIGNED';
      case 'put-assigned-call-assigned':
        return 'PUT → ASSIGNED → CALL → SOLD';
      default:
        return cycleType.replace(/-/g, ' ').toUpperCase();
    }
  };

  const allPositions = Array.from(positions.values());
  // Only show stock positions with >= 100 shares
  const activeStockPositions = allPositions.filter(p => p.quantity >= 100);
  const closedPositions = allPositions.filter(p => p.quantity === 0 && p.completedCycles.length > 0);

  // Handle auto-fix from validation
  const handleAutoFix = (fixes: Map<string, number>) => {
    const updatedPositions = new Map(positions);
    
    fixes.forEach((correctQuantity, symbol) => {
      const position = updatedPositions.get(symbol);
      if (position) {
        // Update the position quantity to match IB
        updatedPositions.set(symbol, {
          ...position,
          quantity: correctQuantity
        });
      }
    });
    
    setPositions(updatedPositions);
    
    // TODO: Save the corrected positions to the database
    console.log('Positions auto-fixed:', fixes);
  };

  return (
    <AppLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Positions</h1>
          <p className="text-muted-foreground">Manage your active positions and track cycle performance</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Position Validation Section */}
            <div className="mb-8">
              <PositionValidation 
                positions={positions} 
                onAutoFix={handleAutoFix}
              />
            </div>
            {/* Active Options - Show all 11 */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Active Options ({activeOptions.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOptions.map((option, idx) => {
                  const symbol = option.underlyingSymbol || option.symbol.split(' ')[0];
                  const daysToExpiry = Math.ceil((new Date(option.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={`${option.symbol}-${idx}`} className="glass-card p-5 liquid-glass">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold">{symbol}</h3>
                          <p className="text-sm font-medium">
                            {option.putCall === 'P' ? 'PUT' : 'CALL'} ${option.strike?.toFixed(0)}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          option.quantity > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {option.quantity > 0 ? 'LONG' : 'SHORT'} {Math.abs(option.quantity)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expires</span>
                          <span className="font-medium">{format(new Date(option.expiry), 'MMM dd, yyyy')}</span>
                        </div>
                        {latestPrices[symbol] && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stock Price</span>
                            <span className="font-medium">${latestPrices[symbol].toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Days to Expiry</span>
                          <span className={`font-medium ${daysToExpiry < 7 ? 'text-orange-500' : ''}`}>
                            {daysToExpiry}
                          </span>
                        </div>
                        {latestPrices[symbol] && option.strike && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Moneyness</span>
                            <span className={`font-medium ${
                              option.putCall === 'P' 
                                ? (latestPrices[symbol] < option.strike ? 'text-red-500' : 'text-green-500')
                                : (latestPrices[symbol] > option.strike ? 'text-red-500' : 'text-green-500')
                            }`}>
                              {option.putCall === 'P' 
                                ? (latestPrices[symbol] < option.strike ? 'ITM' : 'OTM')
                                : (latestPrices[symbol] > option.strike ? 'ITM' : 'OTM')
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Stock Positions (100+ shares) */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Stock Positions (100+ shares) ({activeStockPositions.length})</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeStockPositions.map((position) => (
                  <div key={position.symbol} className="glass-card p-6 liquid-glass">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{position.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {position.quantity} shares @ ${(position.averageCost || 0).toFixed(2)}
                        </p>
                      </div>
                      <IconChartLine size={24} className="text-primary" />
                    </div>

                    {position.activeCycles.map((cycle) => (
                      <div key={cycle.id} className="mb-4 p-4 rounded-lg bg-muted/20">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">Active Cycle</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                            {Math.floor((Date.now() - cycle.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Safe Strike</p>
                            <p className="font-bold text-green-500">
                              ${(cycle.safeStrikePrice || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Premiums Collected</p>
                            <p className="font-bold">${(cycle.totalPremiumCollected || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net P&L</p>
                            <p className={`font-bold ${cycle.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${(cycle.netProfit || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="font-medium capitalize">
                              {cycle.cycleType.replace(/-/g, ' ')}
                            </p>
                          </div>
                        </div>

                        {/* Recent trades in this cycle */}
                        <div className="mt-4">
                          <p className="text-xs text-muted-foreground mb-2">Recent Activity</p>
                          <div className="space-y-1">
                            {cycle.trades.slice(-3).map((trade, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{format(trade.dateTime, 'MMM dd')}</span>
                                <span className={trade.buy_sell === 'BUY' ? 'text-green-500' : 'text-red-500'}>
                                  {trade.buy_sell} {trade.assetCategory} {trade.putCall || ''}
                                </span>
                                <span>${Math.abs(trade.netCash).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Realized P&L</span>
                        <span className={`font-bold ${position.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${(position.realizedPnL || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wheel Cycles */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Wheel Cycles</h2>
              
              {/* Active Cycles */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Active Cycles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(positions).map(([symbol, position]) => 
                    position.activeCycles.map((cycle: any) => (
                      <div key={cycle.id} className="glass-card p-4 liquid-glass border-primary/30">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-lg flex items-center gap-2">
                              <IconChartLine size={20} className="text-primary" />
                              {symbol}
                            </h4>
                            <div className="text-sm text-muted-foreground mt-1">
                              Started: {format(cycle.startDate, 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                            ACTIVE
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <IconTrendingUp size={16} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium">{getCycleFlow(cycle.cycleType)}</span>
                          </div>
                          
                          {cycle.assignmentPrice && (
                            <div className="flex items-center gap-2 text-sm">
                              <IconArrowDownRight size={16} className="text-muted-foreground" />
                              <span className="text-muted-foreground">Assigned:</span>
                              <span className="font-medium">${cycle.assignmentPrice.toFixed(2)} × {cycle.sharesAssigned}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm">
                            <IconCash size={16} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Premiums:</span>
                            <span className="font-medium text-green-500">${cycle.totalPremiumCollected.toFixed(2)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <IconReceipt size={16} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Fees:</span>
                            <span className="font-medium text-red-500">-${cycle.totalFees.toFixed(2)}</span>
                          </div>
                          
                          <div className="pt-2 mt-2 border-t border-border/30">
                            <div className={`text-lg font-bold ${cycle.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              Current P&L: ${cycle.netProfit.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Closed Cycles */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Closed Cycles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(positions).map(([symbol, position]) => 
                    position.completedCycles
                      .filter((cycle: any) => cycle.cycleType === 'put-assigned-call-assigned')
                      .map((cycle: any) => (
                        <div key={cycle.id} className="glass-card p-4 liquid-glass opacity-90">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-lg flex items-center gap-2">
                                <IconChartLine size={20} className="text-muted-foreground" />
                                {symbol}
                              </h4>
                              <div className="text-sm text-muted-foreground mt-1">
                                {format(cycle.startDate, 'MMM dd')} - {format(cycle.endDate, 'MMM dd, yyyy')}
                              </div>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">
                              CLOSED
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <IconTrendingUp size={16} className="text-muted-foreground" />
                              <span className="text-muted-foreground">Flow:</span>
                              <span className="font-medium">PUT → ASSIGNED → CALL → SOLD</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <IconArrowDownRight size={16} className="text-muted-foreground" />
                              <span className="text-muted-foreground">Entry:</span>
                              <span className="font-medium">${cycle.assignmentPrice?.toFixed(2) || 'N/A'}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <IconCash size={16} className="text-muted-foreground" />
                              <span className="text-muted-foreground">Premiums:</span>
                              <span className="font-medium text-green-500">${cycle.totalPremiumCollected.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <IconReceipt size={16} className="text-muted-foreground" />
                              <span className="text-muted-foreground">Fees:</span>
                              <span className="font-medium text-red-500">-${cycle.totalFees.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <IconCalendar size={16} className="text-muted-foreground" />
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">
                                {Math.ceil((cycle.endDate.getTime() - cycle.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                              </span>
                            </div>
                            
                            <div className="pt-2 mt-2 border-t border-border/30">
                              <div className={`text-lg font-bold ${cycle.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                Total P&L: ${cycle.netProfit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Closed Positions */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Closed Positions ({closedPositions.length})</h2>
              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Symbol</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cycles</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total Premiums</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Total Fees</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net P&L</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions.map((position) => {
                      const totalPremiums = position.completedCycles.reduce((sum, c) => sum + c.totalPremiumCollected, 0);
                      const totalFees = position.completedCycles.reduce((sum, c) => sum + c.totalFees, 0);
                      const winningCycles = position.completedCycles.filter(c => c.netProfit > 0).length;
                      const winRate = position.completedCycles.length > 0 
                        ? (winningCycles / position.completedCycles.length) * 100 
                        : 0;

                      return (
                        <tr key={position.symbol} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium">{position.symbol}</td>
                          <td className="py-3 px-4 text-sm">{position.completedCycles.length}</td>
                          <td className="py-3 px-4 text-sm text-right">${totalPremiums.toFixed(2)}</td>
                          <td className="py-3 px-4 text-sm text-right text-red-500">-${totalFees.toFixed(2)}</td>
                          <td className="py-3 px-4 text-sm text-right font-bold">
                            <span className={position.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                              ${position.realizedPnL.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span className={`font-medium ${winRate >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                              {winRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}