import { Trade, WheelCycle, Position } from '@/types/trade';
import { v4 as uuidv4 } from 'uuid';

export class WheelStrategyAnalyzer {
  private trades: Trade[] = [];
  private cycles: Map<string, WheelCycle[]> = new Map();
  private positions: Map<string, Position> = new Map();

  constructor(trades: Trade[]) {
    this.trades = trades.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    this.analyzeCycles();
  }

  private analyzeCycles(): void {
    const symbolTrades = new Map<string, Trade[]>();
    
    // Group trades by underlying symbol
    for (const trade of this.trades) {
      const symbol = trade.underlyingSymbol || trade.symbol;
      if (!symbolTrades.has(symbol)) {
        symbolTrades.set(symbol, []);
      }
      symbolTrades.get(symbol)!.push(trade);
    }

    // Analyze cycles for each symbol
    for (const [symbol, trades] of symbolTrades) {
      const cycles = this.detectCycles(symbol, trades);
      this.cycles.set(symbol, cycles);
      this.updatePosition(symbol, cycles);
    }
  }

  private detectCycles(symbol: string, trades: Trade[]): WheelCycle[] {
    const cycles: WheelCycle[] = [];
    let currentCycle: WheelCycle | null = null;
    let stockPosition = 0;

    for (const trade of trades) {
      // Start new cycle with a sold PUT - ALWAYS start a new cycle for any sold PUT
      if (trade.assetCategory === 'OPT' && trade.putCall === 'P' && trade.buy_sell === 'SELL') {
        // If there's an active cycle, close it first
        if (currentCycle) {
          cycles.push(currentCycle);
        }
        // For SELL options, netCash is positive (income)
        const premium = trade.netCash > 0 ? trade.netCash : Math.abs(trade.netCash);
        currentCycle = {
          id: uuidv4(),
          symbol,
          startDate: trade.dateTime,
          status: 'active',
          trades: [trade],
          totalPremiumCollected: premium,
          totalFees: Math.abs(trade.commissionAndTax),
          netProfit: premium,
          cycleType: 'put-expired'
        };
      }
      // Handle PUT assignment (buying stock)
      else if (currentCycle && trade.assetCategory === 'STK' && trade.buy_sell === 'BUY') {
        currentCycle.trades.push(trade);
        currentCycle.assignmentPrice = trade.tradePrice;
        currentCycle.sharesAssigned = Math.abs(trade.quantity);
        currentCycle.totalFees += Math.abs(trade.commissionAndTax);
        // Don't subtract stock purchase from P&L - it's not a loss, just converting cash to stock
        // Only subtract the commission
        currentCycle.netProfit -= Math.abs(trade.commissionAndTax);
        currentCycle.cycleType = 'put-assigned-call-expired';
        stockPosition += Math.abs(trade.quantity);
      }
      // Handle selling CALLs on assigned stock
      else if (currentCycle && trade.assetCategory === 'OPT' && trade.putCall === 'C' && trade.buy_sell === 'SELL') {
        currentCycle.trades.push(trade);
        const premium = trade.netCash > 0 ? trade.netCash : Math.abs(trade.netCash);
        currentCycle.totalPremiumCollected += premium;
        currentCycle.totalFees += Math.abs(trade.commissionAndTax);
        currentCycle.netProfit += premium;
      }
      // Handle buying back CALLs
      else if (currentCycle && trade.assetCategory === 'OPT' && trade.putCall === 'C' && trade.buy_sell === 'BUY') {
        currentCycle.trades.push(trade);
        currentCycle.totalFees += Math.abs(trade.commissionAndTax);
        currentCycle.netProfit -= Math.abs(trade.netCash) + Math.abs(trade.commissionAndTax);
      }
      // Handle CALL assignment (selling stock)
      else if (currentCycle && trade.assetCategory === 'STK' && trade.buy_sell === 'SELL') {
        currentCycle.trades.push(trade);
        currentCycle.totalFees += Math.abs(trade.commissionAndTax);
        
        // Calculate actual P&L when stock is sold
        if (currentCycle.assignmentPrice && currentCycle.sharesAssigned) {
          const salePrice = trade.tradePrice;
          const purchasePrice = currentCycle.assignmentPrice;
          const shares = Math.abs(trade.quantity);
          const stockPnL = (salePrice - purchasePrice) * shares;
          
          // Net profit = stock P&L + all premiums collected - all fees
          currentCycle.netProfit = stockPnL + currentCycle.totalPremiumCollected - currentCycle.totalFees;
        }
        
        currentCycle.cycleType = 'put-assigned-call-assigned';
        currentCycle.endDate = trade.dateTime;
        currentCycle.status = 'completed';
        stockPosition -= Math.abs(trade.quantity);
        
        // Calculate safe strike price if assigned
        if (currentCycle.assignmentPrice && currentCycle.sharesAssigned) {
          currentCycle.safeStrikePrice = this.calculateSafeStrikePrice(currentCycle);
        }
        
        cycles.push(currentCycle);
        currentCycle = null;
      }
      // Handle new PUT being sold (starts a new cycle)
      else if (currentCycle && trade.assetCategory === 'OPT' && trade.putCall === 'P' && trade.buy_sell === 'SELL') {
        // Close current cycle and start new one
        cycles.push(currentCycle);
        
        const premium = trade.netCash > 0 ? trade.netCash : Math.abs(trade.netCash);
        currentCycle = {
          id: uuidv4(),
          symbol,
          startDate: trade.dateTime,
          status: 'active',
          trades: [trade],
          totalPremiumCollected: premium,
          totalFees: Math.abs(trade.commissionAndTax),
          netProfit: premium,
          cycleType: 'put-expired'
        };
      }
    }

    // Handle open cycles
    if (currentCycle) {
      cycles.push(currentCycle);
    }

    // Check for expired options to close cycles
    for (const cycle of cycles) {
      if (cycle.status === 'active') {
        // Get all open option positions (SELL minus BUY)
        const optionPositions = new Map<string, {
          netQuantity: number,
          lastTrade: Trade,
          expiry: Date | null
        }>();
        
        for (const trade of cycle.trades) {
          if (trade.assetCategory === 'OPT') {
            const key = `${trade.symbol}_${trade.strike}_${trade.putCall}`;
            const existing = optionPositions.get(key) || { netQuantity: 0, lastTrade: trade, expiry: trade.expiry || null };
            
            if (trade.buy_sell === 'SELL') {
              existing.netQuantity -= Math.abs(trade.quantity);
            } else {
              existing.netQuantity += Math.abs(trade.quantity);
            }
            
            optionPositions.set(key, existing);
          }
        }
        
        // Check if cycle should be closed
        let shouldClose = false;
        let closeReason = '';
        let closeDate: Date | null = null;
        
        // Case 1: Only PUT trades and PUT expired
        const onlyPuts = Array.from(optionPositions.values()).every(pos => 
          cycle.trades.find(t => t.symbol.includes(pos.lastTrade.putCall || ''))?.putCall === 'P'
        );
        
        if (onlyPuts && cycle.trades.length === 1) {
          const putTrade = cycle.trades[0];
          if (putTrade.expiry && new Date() > putTrade.expiry) {
            shouldClose = true;
            closeReason = 'put-expired';
            closeDate = putTrade.expiry;
          }
        }
        
        // Case 2: All open option positions have expired
        const allExpired = Array.from(optionPositions.values()).every(pos => 
          pos.netQuantity === 0 || (pos.expiry && new Date() > pos.expiry)
        );
        
        if (allExpired && Array.from(optionPositions.values()).some(pos => pos.netQuantity !== 0)) {
          shouldClose = true;
          closeDate = Array.from(optionPositions.values())
            .filter(pos => pos.expiry)
            .reduce((latest, pos) => 
              !latest || (pos.expiry && pos.expiry > latest) ? pos.expiry : latest, 
              null as Date | null
            );
          
          // Determine close reason based on cycle state
          const hasStockTrades = cycle.trades.some(t => t.assetCategory === 'STK');
          const hasCallSale = cycle.trades.some(t => 
            t.assetCategory === 'OPT' && t.putCall === 'C' && t.buy_sell === 'SELL'
          );
          const hasStockSale = cycle.trades.some(t => 
            t.assetCategory === 'STK' && t.buy_sell === 'SELL'
          );
          
          if (hasStockTrades && hasCallSale && hasStockSale) {
            closeReason = 'put-assigned-call-assigned';
          } else if (hasStockTrades && hasCallSale) {
            closeReason = 'put-assigned-call-expired';
          } else if (hasStockTrades) {
            closeReason = 'put-assigned-call-expired';
          } else {
            closeReason = 'put-expired';
          }
        }
        
        if (shouldClose && closeDate) {
          cycle.endDate = closeDate;
          cycle.status = 'completed';
          cycle.cycleType = closeReason as any;
        }
      }
    }

    return cycles;
  }

  private calculateSafeStrikePrice(cycle: WheelCycle): number {
    if (!cycle.assignmentPrice || !cycle.sharesAssigned) return 0;

    const totalPremiums = cycle.trades
      .filter(t => t.assetCategory === 'OPT' && t.buy_sell === 'SELL')
      .reduce((sum, t) => sum + Math.abs(t.netCash), 0);

    const totalFees = cycle.totalFees;
    const netPremiums = totalPremiums - totalFees;
    const perSharePremium = netPremiums / cycle.sharesAssigned;

    return cycle.assignmentPrice - perSharePremium;
  }

  private updatePosition(symbol: string, cycles: WheelCycle[]): void {
    // Filter out invalid cycles (cycles with no trades or no premium collected)
    const validActiveCycles = cycles.filter(c => 
      c.status === 'active' && 
      c.trades && 
      c.trades.length > 0 &&
      c.totalPremiumCollected > 0
    ).sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    
    const validCompletedCycles = cycles.filter(c => 
      c.status === 'completed' &&
      c.trades &&
      c.trades.length > 0
    ).sort((a, b) => {
      const aEndDate = a.endDate?.getTime() || 0;
      const bEndDate = b.endDate?.getTime() || 0;
      return bEndDate - aEndDate;
    });

    // Calculate ACTUAL position quantity from ALL stock trades
    // Get ALL trades from this symbol (not just from cycles)
    const symbolTrades = this.trades.filter(t => {
      const sym = t.underlyingSymbol || t.symbol;
      return sym === symbol && t.assetCategory === 'STK';
    });
    
    // Calculate net stock position from ALL stock trades
    let netQuantity = 0;
    let totalCost = 0;
    let shareCount = 0;
    
    for (const trade of symbolTrades) {
      const quantity = trade.buy_sell === 'BUY' ? Math.abs(trade.quantity) : -Math.abs(trade.quantity);
      netQuantity += quantity;
      
      if (trade.buy_sell === 'BUY') {
        totalCost += Math.abs(trade.quantity) * trade.tradePrice;
        shareCount += Math.abs(trade.quantity);
      }
    }
    
    // DON'T double-count assigned shares - they're already in the stock trades above!
    
    const averageCost = shareCount > 0 ? totalCost / shareCount : 0;

    // Only create position if we have actual shares
    if (netQuantity > 0 || validActiveCycles.length > 0 || validCompletedCycles.length > 0) {
      const realizedPnL = validCompletedCycles.reduce((sum, c) => sum + c.netProfit, 0);

      this.positions.set(symbol, {
        symbol,
        quantity: Math.max(netQuantity, 0), // Ensure non-negative quantity
        averageCost,
        realizedPnL,
        activeCycles: validActiveCycles,
        completedCycles: validCompletedCycles
      });
    }
  }

  getCycles(): Map<string, WheelCycle[]> {
    return this.cycles;
  }

  getPositions(): Map<string, Position> {
    return this.positions;
  }

  getActiveCycles(): WheelCycle[] {
    const allCycles: WheelCycle[] = [];
    for (const cycles of this.cycles.values()) {
      // Only include active cycles that have actual trades
      const validActiveCycles = cycles.filter(c => 
        c.status === 'active' && 
        c.trades && 
        c.trades.length > 0 &&
        c.totalPremiumCollected > 0
      );
      allCycles.push(...validActiveCycles);
    }
    // Sort by start date descending (most recent first)
    return allCycles.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  getCompletedCycles(): WheelCycle[] {
    const allCycles: WheelCycle[] = [];
    for (const cycles of this.cycles.values()) {
      allCycles.push(...cycles.filter(c => c.status === 'completed'));
    }
    // Sort by end date descending (most recent first)
    return allCycles.sort((a, b) => {
      const aEndDate = a.endDate?.getTime() || 0;
      const bEndDate = b.endDate?.getTime() || 0;
      return bEndDate - aEndDate;
    });
  }

  getActiveOptions(): Trade[] {
    // Get all option trades
    const optionTrades = this.trades.filter(t => 
      t.assetCategory === 'OPT' && 
      t.expiry && 
      new Date(t.expiry) > new Date() // Not expired yet
    );

    // Group by symbol and expiry to find net positions
    const optionPositions = new Map<string, Trade[]>();
    
    for (const trade of optionTrades) {
      const key = `${trade.underlyingSymbol || trade.symbol}_${trade.expiry?.toISOString()}_${trade.strike}_${trade.putCall}`;
      if (!optionPositions.has(key)) {
        optionPositions.set(key, []);
      }
      optionPositions.get(key)!.push(trade);
    }

    // Calculate net positions and return only active ones
    const activeOptions: Trade[] = [];
    for (const [key, trades] of optionPositions) {
      const netQuantity = trades.reduce((sum, t) => {
        return sum + (t.buy_sell === 'BUY' ? t.quantity : -t.quantity);
      }, 0);
      
      if (netQuantity !== 0) {
        // Find the most recent trade for this option
        const mostRecentTrade = trades.sort((a, b) => 
          b.dateTime.getTime() - a.dateTime.getTime()
        )[0];
        
        // Create a summary trade representing the position
        activeOptions.push({
          ...mostRecentTrade,
          quantity: netQuantity
        });
      }
    }

    return activeOptions;
  }

  getLatestPrices(): Map<string, number> {
    const latestPrices = new Map<string, number>();
    
    // Sort trades by date descending
    const sortedTrades = [...this.trades].sort((a, b) => 
      b.dateTime.getTime() - a.dateTime.getTime()
    );
    
    // Get the latest trade price for each symbol
    for (const trade of sortedTrades) {
      const symbol = trade.underlyingSymbol || trade.symbol;
      if (!latestPrices.has(symbol) && trade.tradePrice > 0) {
        latestPrices.set(symbol, trade.tradePrice);
      }
    }
    
    return latestPrices;
  }

  // Connected cycles are no longer needed - each PUT starts a new cycle




}