/**
 * Dividend Tracking Service
 * Tracks dividend income from stock positions
 * Note: This is a placeholder implementation. Real dividend data would come from IB FlexQuery CashReport section
 */

import { Trade } from '@/types/trade';

export interface DividendPayment {
  symbol: string;
  paymentDate: Date;
  exDividendDate: Date;
  amount: number;
  shares: number;
  perShareAmount: number;
  currency: string;
  taxWithheld: number;
  netAmount: number;
}

export interface DividendAnalytics {
  totalDividends: number;
  bySymbol: Map<string, {
    total: number;
    payments: DividendPayment[];
    averageYield: number;
  }>;
  byMonth: Map<string, number>;
  byQuarter: Map<string, number>;
  yearToDate: number;
  projectedAnnual: number;
  topPayers: Array<{
    symbol: string;
    total: number;
    percentage: number;
  }>;
}

export class DividendTracker {
  private dividends: DividendPayment[] = [];
  private stockPositions: Map<string, number> = new Map();
  
  constructor(private trades: Trade[]) {
    this.calculateStockPositions();
    this.generateMockDividends(); // Remove this when real data is available
  }

  /**
   * Calculate current stock positions from trades
   */
  private calculateStockPositions(): void {
    for (const trade of this.trades) {
      if (trade.assetCategory === 'STK') {
        const current = this.stockPositions.get(trade.symbol) || 0;
        this.stockPositions.set(trade.symbol, current + trade.quantity);
      }
    }
    
    // Remove positions with 0 shares
    for (const [symbol, shares] of this.stockPositions) {
      if (shares === 0) {
        this.stockPositions.delete(symbol);
      }
    }
  }

  /**
   * Mock dividend generation - Replace with real IB data parsing
   * This simulates quarterly dividends for stocks we hold
   */
  private generateMockDividends(): void {
    const dividendYields: { [key: string]: number } = {
      'AAPL': 0.0044,  // 0.44% quarterly
      'O': 0.015,      // 1.5% quarterly (REIT)
      'ARCC': 0.025,   // 2.5% quarterly (BDC)
      'KO': 0.0075,    // 0.75% quarterly
      'JNJ': 0.006,    // 0.6% quarterly
      'PG': 0.0055,    // 0.55% quarterly
      'JPM': 0.01,     // 1% quarterly
      'XOM': 0.008,    // 0.8% quarterly
      'CVX': 0.009,    // 0.9% quarterly
      'ABBV': 0.012,   // 1.2% quarterly
      'PFE': 0.011,    // 1.1% quarterly
      'MRK': 0.0065,   // 0.65% quarterly
      'T': 0.02,       // 2% quarterly
      'VZ': 0.015,     // 1.5% quarterly
      'INTC': 0.003,   // 0.3% quarterly
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Generate dividends for the past year
    for (const [symbol, shares] of this.stockPositions) {
      if (shares > 0 && dividendYields[symbol]) {
        // Get approximate stock price from trades
        const stockTrades = this.trades.filter(t => t.symbol === symbol && t.assetCategory === 'STK');
        const avgPrice = stockTrades.length > 0 
          ? stockTrades.reduce((sum, t) => sum + t.tradePrice, 0) / stockTrades.length
          : 100; // Default price if no trades
        
        const quarterlyYield = dividendYields[symbol];
        const quarterlyDividend = avgPrice * quarterlyYield;
        
        // Generate quarterly dividends for the current year
        for (let quarter = 1; quarter <= 4; quarter++) {
          const month = quarter * 3 - 2; // 1, 4, 7, 10
          const paymentDate = new Date(currentYear, month - 1, 15);
          
          if (paymentDate <= now) {
            const exDivDate = new Date(paymentDate);
            exDivDate.setDate(exDivDate.getDate() - 30); // Ex-div usually ~30 days before payment
            
            const grossAmount = quarterlyDividend * shares;
            const taxWithheld = grossAmount * 0.15; // Assume 15% tax withholding
            
            this.dividends.push({
              symbol,
              paymentDate,
              exDividendDate: exDivDate,
              amount: grossAmount,
              shares,
              perShareAmount: quarterlyDividend,
              currency: 'USD',
              taxWithheld,
              netAmount: grossAmount - taxWithheld
            });
          }
        }
      }
    }
    
    // Sort by payment date
    this.dividends.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
  }

  /**
   * Parse dividend data from IB CashReport XML
   * @param xmlData - The CashReport section of IB FlexQuery
   */
  public parseDividendsFromXML(xmlData: string): void {
    // TODO: Implement when CashReport data is available
    // The CashReport section would contain dividend payments with:
    // - dateTime: payment date
    // - symbol: stock symbol
    // - amount: dividend amount
    // - currency: payment currency
    // - description: usually contains "DIV" or "DIVIDEND"
    console.log('Dividend XML parsing not yet implemented');
  }

  /**
   * Get all dividend payments
   */
  public getDividends(): DividendPayment[] {
    return [...this.dividends];
  }

  /**
   * Get dividend analytics
   */
  public getAnalytics(): DividendAnalytics {
    const totalDividends = this.dividends.reduce((sum, d) => sum + d.netAmount, 0);
    
    // Group by symbol
    const bySymbol = new Map<string, {
      total: number;
      payments: DividendPayment[];
      averageYield: number;
    }>();
    
    for (const dividend of this.dividends) {
      const existing = bySymbol.get(dividend.symbol) || {
        total: 0,
        payments: [],
        averageYield: 0
      };
      
      existing.total += dividend.netAmount;
      existing.payments.push(dividend);
      
      bySymbol.set(dividend.symbol, existing);
    }
    
    // Calculate average yields
    for (const [symbol, data] of bySymbol) {
      const stockTrades = this.trades.filter(t => t.symbol === symbol && t.assetCategory === 'STK');
      const avgPrice = stockTrades.length > 0
        ? stockTrades.reduce((sum, t) => sum + t.tradePrice, 0) / stockTrades.length
        : 100;
      
      const shares = this.stockPositions.get(symbol) || 0;
      const annualDividend = data.total * (12 / data.payments.length); // Annualize
      const avgYield = shares > 0 ? (annualDividend / (avgPrice * shares)) * 100 : 0;
      
      data.averageYield = avgYield;
    }
    
    // Group by month
    const byMonth = new Map<string, number>();
    for (const dividend of this.dividends) {
      const monthKey = `${dividend.paymentDate.getFullYear()}-${String(dividend.paymentDate.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + dividend.netAmount);
    }
    
    // Group by quarter
    const byQuarter = new Map<string, number>();
    for (const dividend of this.dividends) {
      const quarter = Math.floor(dividend.paymentDate.getMonth() / 3) + 1;
      const quarterKey = `${dividend.paymentDate.getFullYear()}-Q${quarter}`;
      byQuarter.set(quarterKey, (byQuarter.get(quarterKey) || 0) + dividend.netAmount);
    }
    
    // Calculate YTD
    const currentYear = new Date().getFullYear();
    const yearToDate = this.dividends
      .filter(d => d.paymentDate.getFullYear() === currentYear)
      .reduce((sum, d) => sum + d.netAmount, 0);
    
    // Project annual (based on YTD)
    const monthsElapsed = new Date().getMonth() + 1;
    const projectedAnnual = monthsElapsed > 0 ? (yearToDate / monthsElapsed) * 12 : 0;
    
    // Top payers
    const sortedSymbols = Array.from(bySymbol.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
    
    const topPayers = sortedSymbols.map(([symbol, data]) => ({
      symbol,
      total: data.total,
      percentage: totalDividends > 0 ? (data.total / totalDividends) * 100 : 0
    }));
    
    return {
      totalDividends,
      bySymbol,
      byMonth,
      byQuarter,
      yearToDate,
      projectedAnnual,
      topPayers
    };
  }

  /**
   * Get dividend income for a specific period
   */
  public getDividendsForPeriod(startDate: Date, endDate: Date): DividendPayment[] {
    return this.dividends.filter(d => 
      d.paymentDate >= startDate && d.paymentDate <= endDate
    );
  }

  /**
   * Get upcoming dividends (estimated based on historical patterns)
   */
  public getUpcomingDividends(): Array<{
    symbol: string;
    estimatedPaymentDate: Date;
    estimatedAmount: number;
    shares: number;
  }> {
    const upcoming: Array<{
      symbol: string;
      estimatedPaymentDate: Date;
      estimatedAmount: number;
      shares: number;
    }> = [];
    
    const now = new Date();
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    // For each symbol with dividend history, project next payment
    for (const [symbol, data] of this.getAnalytics().bySymbol) {
      if (data.payments.length > 0) {
        const lastPayment = data.payments[data.payments.length - 1];
        const shares = this.stockPositions.get(symbol) || 0;
        
        if (shares > 0) {
          // Assume quarterly payments
          const nextPaymentDate = new Date(lastPayment.paymentDate);
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
          
          if (nextPaymentDate > now && nextPaymentDate <= threeMonthsFromNow) {
            // Estimate based on average of last payments
            const avgPayment = data.payments
              .slice(-4) // Last 4 payments
              .reduce((sum, p) => sum + p.perShareAmount, 0) / Math.min(4, data.payments.length);
            
            upcoming.push({
              symbol,
              estimatedPaymentDate: nextPaymentDate,
              estimatedAmount: avgPayment * shares * 0.85, // After tax
              shares
            });
          }
        }
      }
    }
    
    return upcoming.sort((a, b) => a.estimatedPaymentDate.getTime() - b.estimatedPaymentDate.getTime());
  }
}