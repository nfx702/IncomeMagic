import { Trade, Position } from '@/types/trade';

export interface CalculatedPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  realizedPnL: number;
  trades: Trade[];
}

export interface CashFlow {
  totalCashFlow: number;
  stockPurchases: number;
  stockSales: number;
  optionPremiumsReceived: number;
  optionPremiumsPaid: number;
  commissionsFees: number;
}

/**
 * Calculates actual positions and cash flows from raw trade data
 * This provides the true portfolio state independent of wheel strategy analysis
 */
export class PositionCalculator {
  private static instance: PositionCalculator;
  
  static getInstance(): PositionCalculator {
    if (!this.instance) {
      this.instance = new PositionCalculator();
    }
    return this.instance;
  }

  /**
   * Calculate all current positions from trade history
   */
  calculatePositions(trades: Trade[]): Map<string, CalculatedPosition> {
    const positions = new Map<string, CalculatedPosition>();
    
    // Group trades by symbol
    const tradesBySymbol = this.groupTradesBySymbol(trades);
    
    for (const [symbol, symbolTrades] of tradesBySymbol) {
      const position = this.calculateSymbolPosition(symbol, symbolTrades);
      if (position.quantity > 0) {
        positions.set(symbol, position);
      }
    }
    
    return positions;
  }

  /**
   * Calculate cash flows from all trades
   */
  calculateCashFlow(trades: Trade[]): CashFlow {
    let totalCashFlow = 0;
    let stockPurchases = 0;
    let stockSales = 0;
    let optionPremiumsReceived = 0;
    let optionPremiumsPaid = 0;
    let commissionsFees = 0;

    for (const trade of trades) {
      totalCashFlow += trade.netCash;
      commissionsFees += Math.abs(trade.commissionAndTax);

      if (trade.assetCategory === 'STK') {
        if (trade.buy_sell === 'BUY') {
          stockPurchases += Math.abs(trade.netCash);
        } else {
          stockSales += Math.abs(trade.netCash);
        }
      } else if (trade.assetCategory === 'OPT') {
        if (trade.buy_sell === 'SELL') {
          optionPremiumsReceived += Math.abs(trade.netCash);
        } else {
          optionPremiumsPaid += Math.abs(trade.netCash);
        }
      }
    }

    return {
      totalCashFlow,
      stockPurchases,
      stockSales,
      optionPremiumsReceived,
      optionPremiumsPaid,
      commissionsFees
    };
  }

  /**
   * Calculate position for a specific symbol
   */
  private calculateSymbolPosition(symbol: string, trades: Trade[]): CalculatedPosition {
    // Sort trades by date to process chronologically
    const sortedTrades = trades.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    
    let netQuantity = 0;
    let totalCost = 0;
    let realizedPnL = 0;
    const positionTrades: Trade[] = [];
    
    // Track all purchases for FIFO cost basis calculation
    const purchases: Array<{ quantity: number; price: number; remaining: number }> = [];
    
    for (const trade of sortedTrades) {
      // Only process stock trades for position calculation
      if (trade.assetCategory !== 'STK') {
        continue;
      }
      
      const tradeQuantity = Math.abs(trade.quantity);
      const tradePrice = trade.tradePrice;
      
      if (trade.buy_sell === 'BUY') {
        // Add to position
        netQuantity += tradeQuantity;
        totalCost += tradeQuantity * tradePrice;
        purchases.push({
          quantity: tradeQuantity,
          price: tradePrice,
          remaining: tradeQuantity
        });
        positionTrades.push(trade);
        
      } else { // SELL
        // Reduce position using FIFO
        let remainingToSell = tradeQuantity;
        let saleProceeds = tradeQuantity * tradePrice;
        let costBasis = 0;
        
        while (remainingToSell > 0 && purchases.length > 0) {
          const oldestPurchase = purchases[0];
          const sellFromThis = Math.min(remainingToSell, oldestPurchase.remaining);
          
          costBasis += sellFromThis * oldestPurchase.price;
          oldestPurchase.remaining -= sellFromThis;
          remainingToSell -= sellFromThis;
          
          if (oldestPurchase.remaining === 0) {
            purchases.shift();
          }
        }
        
        netQuantity -= tradeQuantity;
        totalCost -= costBasis;
        realizedPnL += (saleProceeds - costBasis);
        positionTrades.push(trade);
      }
    }
    
    const averageCost = netQuantity > 0 ? totalCost / netQuantity : 0;
    
    return {
      symbol,
      quantity: Math.max(netQuantity, 0),
      averageCost,
      totalCost,
      realizedPnL,
      trades: positionTrades
    };
  }

  /**
   * Group trades by underlying symbol (handles options)
   */
  private groupTradesBySymbol(trades: Trade[]): Map<string, Trade[]> {
    const groups = new Map<string, Trade[]>();
    
    for (const trade of trades) {
      let symbol = trade.symbol;
      
      // For options, use the underlying symbol
      if (trade.assetCategory === 'OPT' && trade.underlyingSymbol) {
        symbol = trade.underlyingSymbol;
      }
      
      if (!groups.has(symbol)) {
        groups.set(symbol, []);
      }
      groups.get(symbol)!.push(trade);
    }
    
    return groups;
  }

  /**
   * Convert CalculatedPosition to Position format
   */
  convertToPositions(calculatedPositions: Map<string, CalculatedPosition>): Map<string, Position> {
    const positions = new Map<string, Position>();
    
    for (const [symbol, calc] of calculatedPositions) {
      const position: Position = {
        symbol,
        quantity: calc.quantity,
        averageCost: calc.averageCost,
        realizedPnL: calc.realizedPnL,
        activeCycles: [], // These will be populated by wheel analyzer
        completedCycles: []
      };
      
      positions.set(symbol, position);
    }
    
    return positions;
  }

  /**
   * Get detailed position breakdown for debugging
   */
  getPositionBreakdown(symbol: string, trades: Trade[]): {
    symbol: string;
    stockTrades: Trade[];
    totalBuys: number;
    totalSells: number;
    netPosition: number;
    totalCost: number;
    averageCost: number;
    realizedPnL: number;
  } {
    const symbolTrades = trades.filter(t => 
      t.symbol === symbol || 
      (t.assetCategory === 'OPT' && t.underlyingSymbol === symbol)
    );
    
    const stockTrades = symbolTrades.filter(t => t.assetCategory === 'STK');
    
    let totalBuys = 0;
    let totalSells = 0;
    let totalCost = 0;
    let realizedPnL = 0;
    
    for (const trade of stockTrades) {
      const quantity = Math.abs(trade.quantity);
      if (trade.buy_sell === 'BUY') {
        totalBuys += quantity;
        totalCost += quantity * trade.tradePrice;
      } else {
        totalSells += quantity;
        realizedPnL += Math.abs(trade.netCash);
      }
    }
    
    const netPosition = totalBuys - totalSells;
    const averageCost = netPosition > 0 ? totalCost / netPosition : 0;
    
    return {
      symbol,
      stockTrades,
      totalBuys,
      totalSells,
      netPosition,
      totalCost,
      averageCost,
      realizedPnL
    };
  }
}