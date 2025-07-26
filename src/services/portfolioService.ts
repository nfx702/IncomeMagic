import { Trade, Position } from '@/types/trade';
import { PositionCalculator } from './positionCalculator';

export interface PortfolioValue {
  totalValue: number;
  cashBalance: number;
  positionsValue: number;
  dayChange: number;
  dayChangePercent: number;
  lastUpdated: Date;
}

export interface PositionValue {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
}

export class PortfolioService {
  private static instance: PortfolioService;
  private portfolioValue: PortfolioValue | null = null;
  private positionValues: Map<string, PositionValue> = new Map();
  
  static getInstance(): PortfolioService {
    if (!this.instance) {
      this.instance = new PortfolioService();
    }
    return this.instance;
  }

  /**
   * Calculate total portfolio value from trades and current prices
   * Uses actual trade data to determine real positions and cash balance
   */
  async calculatePortfolioValue(
    wheelPositions: Map<string, Position>, // Keep for compatibility
    trades: Trade[],
    currentPrices: Map<string, number>
  ): Promise<PortfolioValue> {
    // Use PositionCalculator to get ACTUAL positions from trade data
    const positionCalculator = PositionCalculator.getInstance();
    const actualPositions = positionCalculator.calculatePositions(trades);
    const cashFlow = positionCalculator.calculateCashFlow(trades);
    
    // Calculate cash balance from trade flows
    // In production, start with actual IB account cash balance
    const INITIAL_CASH = 150000; // Estimated based on user's $106k portfolio value
    const cashBalance = INITIAL_CASH + cashFlow.totalCashFlow;
    
    let positionsValue = 0;
    let dayChange = 0;
    
    // Calculate positions value using ACTUAL positions
    this.positionValues.clear();
    
    for (const [symbol, calculatedPos] of actualPositions) {
      const currentPrice = currentPrices.get(symbol) || calculatedPos.averageCost;
      const marketValue = calculatedPos.quantity * currentPrice;
      const unrealizedPnL = (currentPrice - calculatedPos.averageCost) * calculatedPos.quantity;
      const unrealizedPnLPercent = calculatedPos.averageCost > 0 ? (unrealizedPnL / (calculatedPos.averageCost * calculatedPos.quantity)) * 100 : 0;
      
      const positionValue: PositionValue = {
        symbol,
        quantity: calculatedPos.quantity,
        averageCost: calculatedPos.averageCost,
        currentPrice,
        marketValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        realizedPnL: calculatedPos.realizedPnL
      };
      
      this.positionValues.set(symbol, positionValue);
      positionsValue += marketValue;
      
      // Estimate day change (would need previous close prices for accuracy)
      const estimatedPrevClose = currentPrice * 0.99; // Placeholder
      dayChange += (currentPrice - estimatedPrevClose) * calculatedPos.quantity;
    }
    
    const totalValue = cashBalance + positionsValue;
    const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;
    
    this.portfolioValue = {
      totalValue,
      cashBalance,
      positionsValue,
      dayChange,
      dayChangePercent,
      lastUpdated: new Date()
    };
    
    return this.portfolioValue;
  }

  /**
   * Get current portfolio value
   */
  getPortfolioValue(): PortfolioValue | null {
    return this.portfolioValue;
  }

  /**
   * Get individual position values
   */
  getPositionValues(): Map<string, PositionValue> {
    return this.positionValues;
  }

  /**
   * Get portfolio allocation percentages
   */
  getPortfolioAllocation(): Map<string, number> {
    const allocation = new Map<string, number>();
    
    if (!this.portfolioValue || this.portfolioValue.totalValue === 0) {
      return allocation;
    }
    
    // Cash allocation
    const cashPercent = (this.portfolioValue.cashBalance / this.portfolioValue.totalValue) * 100;
    allocation.set('CASH', cashPercent);
    
    // Position allocations
    for (const [symbol, positionValue] of this.positionValues) {
      const percent = (positionValue.marketValue / this.portfolioValue.totalValue) * 100;
      allocation.set(symbol, percent);
    }
    
    return allocation;
  }

  /**
   * Calculate portfolio beta (simplified)
   */
  calculatePortfolioBeta(): number {
    // Simplified beta calculation
    // In production, would use historical data and proper beta calculation
    let weightedBeta = 0;
    
    if (!this.portfolioValue || this.portfolioValue.positionsValue === 0) {
      return 1.0;
    }
    
    // Assume some default betas for common stocks
    const defaultBetas: Record<string, number> = {
      'AAPL': 1.2,
      'MSFT': 0.9,
      'GOOGL': 1.1,
      'AMZN': 1.3,
      'TSLA': 2.0,
      'SPY': 1.0
    };
    
    for (const [symbol, positionValue] of this.positionValues) {
      const weight = positionValue.marketValue / this.portfolioValue.positionsValue;
      const beta = defaultBetas[symbol] || 1.0;
      weightedBeta += weight * beta;
    }
    
    return weightedBeta;
  }

  /**
   * Mock IB API call to get portfolio value
   * In production, this would make actual API calls to Interactive Brokers
   */
  async fetchPortfolioFromIB(): Promise<PortfolioValue> {
    // Simulated IB API response
    const mockPortfolioValue: PortfolioValue = {
      totalValue: 125430.50,
      cashBalance: 25430.50,
      positionsValue: 100000.00,
      dayChange: 1250.30,
      dayChangePercent: 1.01,
      lastUpdated: new Date()
    };
    
    this.portfolioValue = mockPortfolioValue;
    return mockPortfolioValue;
  }
}