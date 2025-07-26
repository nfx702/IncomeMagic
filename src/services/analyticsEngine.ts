import { Trade, WheelCycle, AnalyticsData } from '@/types/trade';
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, isWithinInterval } from 'date-fns';

export interface TimeSeriesData {
  date: Date;
  income: number;
  fees: number;
  netIncome: number;
  trades: Trade[];
  cycles: WheelCycle[];
}

export interface SymbolAnalytics extends AnalyticsData {
  weeklyBreakdown: TimeSeriesData[];
  monthlyBreakdown: TimeSeriesData[];
  cycleBreakdown: WheelCycle[];
}

export class AnalyticsEngine {
  private trades: Trade[];
  private cycles: Map<string, WheelCycle[]>;

  constructor(trades: Trade[], cycles: Map<string, WheelCycle[]>) {
    this.trades = trades;
    this.cycles = cycles;
  }

  getSymbolAnalytics(symbol: string): SymbolAnalytics {
    const symbolCycles = this.cycles.get(symbol) || [];
    const symbolTrades = this.trades.filter(t => 
      (t.underlyingSymbol || t.symbol) === symbol
    );

    const analytics = this.calculateSymbolMetrics(symbol, symbolCycles);
    const weeklyBreakdown = this.getWeeklyBreakdown(symbolTrades, symbolCycles);
    const monthlyBreakdown = this.getMonthlyBreakdown(symbolTrades, symbolCycles);

    return {
      ...analytics,
      weeklyBreakdown,
      monthlyBreakdown,
      cycleBreakdown: symbolCycles
    };
  }

  getWeeklyAnalytics(): Map<string, TimeSeriesData[]> {
    const weeklyData = new Map<string, TimeSeriesData[]>();
    
    for (const [symbol] of this.cycles) {
      const symbolAnalytics = this.getSymbolAnalytics(symbol);
      weeklyData.set(symbol, symbolAnalytics.weeklyBreakdown);
    }

    return weeklyData;
  }

  getMonthlyAnalytics(): Map<string, TimeSeriesData[]> {
    const monthlyData = new Map<string, TimeSeriesData[]>();
    
    for (const [symbol] of this.cycles) {
      const symbolAnalytics = this.getSymbolAnalytics(symbol);
      monthlyData.set(symbol, symbolAnalytics.monthlyBreakdown);
    }

    return monthlyData;
  }

  getTotalIncome(): { total: number; bySymbol: Map<string, number> } {
    const bySymbol = new Map<string, number>();
    let total = 0;

    // Calculate income directly from all option trades, not just cycles
    const symbolTrades = new Map<string, Trade[]>();
    
    // Group all option trades by underlying symbol
    for (const trade of this.trades) {
      if (trade.assetCategory === 'OPT') {
        const symbol = trade.underlyingSymbol || trade.symbol;
        if (!symbolTrades.has(symbol)) {
          symbolTrades.set(symbol, []);
        }
        symbolTrades.get(symbol)!.push(trade);
      }
    }

    // Calculate net income per symbol: SELL premiums minus BUY costs
    for (const [symbol, trades] of symbolTrades) {
      let symbolIncome = 0;
      
      for (const trade of trades) {
        if (trade.buy_sell === 'SELL') {
          // SELL trades add premium income
          symbolIncome += Math.abs(trade.netCash);
        } else if (trade.buy_sell === 'BUY') {
          // BUY trades subtract cost (buying back options)
          symbolIncome -= Math.abs(trade.netCash);
        }
        // Subtract fees for all option trades
        symbolIncome -= Math.abs(trade.commissionAndTax);
      }
      
      bySymbol.set(symbol, symbolIncome);
      total += symbolIncome;
    }

    return { total, bySymbol };
  }

  private calculateSymbolMetrics(symbol: string, cycles: WheelCycle[]): AnalyticsData {
    const completedCycles = cycles.filter(c => c.status === 'completed');
    const activeCycles = cycles.filter(c => c.status === 'active');
    
    const totalPremiumCollected = cycles.reduce((sum, c) => sum + c.totalPremiumCollected, 0);
    const totalFees = cycles.reduce((sum, c) => sum + c.totalFees, 0);
    const netIncome = totalPremiumCollected - totalFees; // Premium income only, not stock P&L
    
    const winningCycles = completedCycles.filter(c => c.netProfit > 0);
    const winRate = completedCycles.length > 0 
      ? (winningCycles.length / completedCycles.length) * 100 
      : 0;
    
    const totalTrades = cycles.reduce((sum, c) => sum + c.trades.length, 0);
    const averagePremiumPerTrade = totalTrades > 0 
      ? totalPremiumCollected / totalTrades 
      : 0;

    return {
      symbol,
      totalPremiumCollected,
      totalFees,
      netIncome,
      winRate,
      averagePremiumPerTrade,
      activeCycles: activeCycles.length,
      completedCycles: completedCycles.length
    };
  }

  private getWeeklyBreakdown(trades: Trade[], cycles: WheelCycle[]): TimeSeriesData[] {
    const weeklyMap = new Map<string, TimeSeriesData>();

    // Initialize weeks and calculate income directly from trades (no cycles)
    for (const trade of trades) {
      const weekStart = startOfWeek(trade.dateTime, { weekStartsOn: 1 });
      const weekKey = weekStart.toISOString();

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          date: weekStart,
          income: 0,
          fees: 0,
          netIncome: 0,
          trades: [],
          cycles: []
        });
      }

      const weekData = weeklyMap.get(weekKey)!;
      weekData.trades.push(trade);

      // Process option trades directly: SELL adds income, BUY subtracts cost
      if (trade.assetCategory === 'OPT') {
        const isSell = trade.buy_sell === 'SELL';
        const isBuy = trade.buy_sell === 'BUY';
        
        if (isSell) {
          // SELL trades add premium income
          const premium = Math.abs(trade.netCash);
          const fee = Math.abs(trade.commissionAndTax);
          weekData.income += premium;
          weekData.fees += fee;
          weekData.netIncome += premium - fee;
        } else if (isBuy) {
          // BUY trades subtract cost (buying back options)
          const cost = Math.abs(trade.netCash);
          const fee = Math.abs(trade.commissionAndTax);
          weekData.income -= cost;
          weekData.fees += fee;
          weekData.netIncome -= cost + fee;
        }
      }
    }

    // Add cycles information for reference (without affecting income calculation)
    for (const cycle of cycles) {
      for (const trade of cycle.trades) {
        const tradeWeekStart = startOfWeek(trade.dateTime, { weekStartsOn: 1 });
        const tradeWeekKey = tradeWeekStart.toISOString();
        
        if (weeklyMap.has(tradeWeekKey)) {
          const tradeWeekData = weeklyMap.get(tradeWeekKey)!;
          // Add cycle to this week if not already added
          if (!tradeWeekData.cycles.find(c => c.id === cycle.id)) {
            tradeWeekData.cycles.push(cycle);
          }
        }
      }
    }

    return Array.from(weeklyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private getMonthlyBreakdown(trades: Trade[], cycles: WheelCycle[]): TimeSeriesData[] {
    const monthlyMap = new Map<string, TimeSeriesData>();

    // Initialize months and calculate income directly from trades (no cycles)
    for (const trade of trades) {
      const monthStart = startOfMonth(trade.dateTime);
      const monthKey = monthStart.toISOString();

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          date: monthStart,
          income: 0,
          fees: 0,
          netIncome: 0,
          trades: [],
          cycles: []
        });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.trades.push(trade);

      // Process option trades directly: SELL adds income, BUY subtracts cost
      if (trade.assetCategory === 'OPT') {
        if (trade.buy_sell === 'SELL') {
          // SELL trades add premium income
          const premium = Math.abs(trade.netCash);
          const fee = Math.abs(trade.commissionAndTax);
          monthData.income += premium;
          monthData.fees += fee;
          monthData.netIncome += premium - fee;
        } else if (trade.buy_sell === 'BUY') {
          // BUY trades subtract cost (buying back options)
          const cost = Math.abs(trade.netCash);
          const fee = Math.abs(trade.commissionAndTax);
          monthData.income -= cost;
          monthData.fees += fee;
          monthData.netIncome -= cost + fee;
        }
      }
    }

    // Add cycles information for reference (without affecting income calculation)
    for (const cycle of cycles) {
      for (const trade of cycle.trades) {
        const tradeMonthStart = startOfMonth(trade.dateTime);
        const tradeMonthKey = tradeMonthStart.toISOString();
        
        if (monthlyMap.has(tradeMonthKey)) {
          const tradeMonthData = monthlyMap.get(tradeMonthKey)!;
          // Add cycle to this month if not already added
          if (!tradeMonthData.cycles.find(c => c.id === cycle.id)) {
            tradeMonthData.cycles.push(cycle);
          }
        }
      }
    }

    return Array.from(monthlyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  getActivePositionsWithSafeStrikes(): Array<{
    symbol: string;
    assignmentPrice: number;
    safeStrike: number;
    currentShares: number;
    premiumsCollected: number;
    cycle: WheelCycle;
  }> {
    const positions = [];

    for (const [symbol, cycles] of this.cycles) {
      const activeCycles = cycles.filter(c => c.status === 'active' && c.assignmentPrice);
      
      for (const cycle of activeCycles) {
        if (cycle.safeStrikePrice) {
          positions.push({
            symbol,
            assignmentPrice: cycle.assignmentPrice!,
            safeStrike: cycle.safeStrikePrice,
            currentShares: cycle.sharesAssigned || 0,
            premiumsCollected: cycle.totalPremiumCollected,
            cycle
          });
        }
      }
    }

    return positions;
  }
}