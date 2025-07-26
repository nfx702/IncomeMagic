/**
 * Risk Management and Data Validation Service
 * Ensures data integrity and implements comprehensive risk controls
 */

import { EnhancedRecommendation } from './enhancedRecommendationEngine';
import { AggregatedQuote, MarketIndicators } from './marketDataService';
import { Trade } from '@/types/trade';

export interface RiskLimits {
  maxPositionSize: number; // Percentage of portfolio
  maxSectorConcentration: number; // Percentage of portfolio
  maxDailyLoss: number; // Percentage of portfolio
  maxDrawdown: number; // Percentage of portfolio
  minLiquidity: number; // Minimum daily volume
  maxVegaExposure: number; // Maximum vega per $1000 of portfolio
  maxCorrelation: number; // Maximum correlation between positions
  maxLeverage: number; // Maximum leverage ratio
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
  staleness: number; // minutes since last update
}

export interface RiskAlert {
  level: 'info' | 'warning' | 'critical';
  type: 'position_size' | 'concentration' | 'liquidity' | 'volatility' | 'correlation' | 'drawdown';
  message: string;
  recommendation: string;
  timestamp: Date;
  affectedSymbols: string[];
}

export interface PortfolioRisk {
  totalRisk: number; // 0-1 scale
  concentrationRisk: number;
  liquidityRisk: number;
  volatilityRisk: number;
  correlationRisk: number;
  leverageRisk: number;
  blackSwanRisk: number;
  alerts: RiskAlert[];
  riskBudgetUsed: number; // Percentage of total risk budget
}

export class RiskManagementService {
  private static instance: RiskManagementService;
  
  private defaultLimits: RiskLimits = {
    maxPositionSize: 0.10, // 10%
    maxSectorConcentration: 0.25, // 25%
    maxDailyLoss: 0.02, // 2%
    maxDrawdown: 0.05, // 5%
    minLiquidity: 1000, // 1000 daily volume
    maxVegaExposure: 0.1, // 10% per $1000
    maxCorrelation: 0.7, // 70% correlation
    maxLeverage: 2.0 // 2:1 leverage
  };

  private riskLimits: RiskLimits;
  private alertHistory: RiskAlert[] = [];
  
  private constructor() {
    this.riskLimits = { ...this.defaultLimits };
  }

  static getInstance(): RiskManagementService {
    if (!RiskManagementService.instance) {
      RiskManagementService.instance = new RiskManagementService();
    }
    return RiskManagementService.instance;
  }

  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    console.log('Risk limits updated:', this.riskLimits);
  }

  validateRecommendation(
    recommendation: EnhancedRecommendation,
    portfolioValue: number,
    currentPositions: Trade[]
  ): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic data validation
    if (!recommendation.symbol || recommendation.symbol.length === 0) {
      errors.push('Invalid symbol');
    }
    
    if (recommendation.strike <= 0) {
      errors.push('Invalid strike price');
    }
    
    if (recommendation.premium <= 0) {
      errors.push('Invalid premium');
    }
    
    if (recommendation.expiry <= new Date()) {
      errors.push('Expiry date is in the past');
    }
    
    // Risk validation
    const positionSize = this.calculatePositionSize(recommendation, portfolioValue);
    if (positionSize > this.riskLimits.maxPositionSize) {
      errors.push(`Position size ${(positionSize * 100).toFixed(1)}% exceeds limit of ${(this.riskLimits.maxPositionSize * 100).toFixed(1)}%`);
    }
    
    // Liquidity validation
    if (recommendation.liquidityScore < 0.3) {
      warnings.push('Low liquidity may impact execution');
    }
    
    // Volatility validation
    if (recommendation.impliedVolatility > 1.0) {
      warnings.push('Extremely high implied volatility detected');
    }
    
    // Concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(
      recommendation.symbol, 
      currentPositions, 
      portfolioValue
    );
    
    if (concentrationRisk > this.riskLimits.maxSectorConcentration) {
      warnings.push(`Adding position would exceed sector concentration limit`);
    }
    
    // Data freshness
    const dataAge = (Date.now() - recommendation.timestamp.getTime()) / (1000 * 60);
    if (dataAge > 5) {
      warnings.push(`Data is ${dataAge.toFixed(1)} minutes old`);
    }
    
    // Confidence validation
    if (recommendation.confidence < 0.6) {
      warnings.push('Low confidence recommendation');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: recommendation.confidence,
      staleness: dataAge
    };
  }

  validateMarketData(quote: AggregatedQuote): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Price validation
    if (quote.price <= 0) {
      errors.push('Invalid price data');
    }
    
    if (Math.abs(quote.changePercent) > 20) {
      warnings.push('Extreme price movement detected');
    }
    
    // Volume validation
    if (quote.volume <= 0) {
      warnings.push('No volume data available');
    } else if (quote.volume < quote.avgVolume * 0.1) {
      warnings.push('Unusually low volume');
    } else if (quote.volume > quote.avgVolume * 10) {
      warnings.push('Unusually high volume');
    }
    
    // Bid-ask spread validation
    if (quote.ask > 0 && quote.bid > 0) {
      const spread = (quote.ask - quote.bid) / quote.price;
      if (spread > 0.05) {
        warnings.push('Wide bid-ask spread detected');
      }
    }
    
    // Data freshness
    const dataAge = (Date.now() - quote.lastUpdated.getTime()) / (1000 * 60);
    if (dataAge > 10) {
      warnings.push('Stale market data');
    }
    
    // Source confidence
    if (quote.confidence < 0.7) {
      warnings.push('Low data source confidence');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: quote.confidence,
      staleness: dataAge
    };
  }

  assessPortfolioRisk(
    positions: Trade[],
    recommendations: EnhancedRecommendation[],
    portfolioValue: number,
    marketIndicators: MarketIndicators
  ): PortfolioRisk {
    const alerts: RiskAlert[] = [];
    
    // Calculate various risk metrics
    const concentrationRisk = this.assessConcentrationRisk(positions, portfolioValue);
    const liquidityRisk = this.assessLiquidityRisk(positions, recommendations);
    const volatilityRisk = this.assessVolatilityRisk(recommendations, marketIndicators);
    const correlationRisk = this.assessCorrelationRisk(positions);
    const leverageRisk = this.assessLeverageRisk(positions, portfolioValue);
    const blackSwanRisk = this.assessBlackSwanRisk(marketIndicators);
    
    // Generate alerts
    if (concentrationRisk > 0.7) {
      alerts.push({
        level: 'warning',
        type: 'concentration',
        message: 'High concentration risk detected',
        recommendation: 'Diversify positions across more symbols and sectors',
        timestamp: new Date(),
        affectedSymbols: this.getConcentratedSymbols(positions)
      });
    }
    
    if (volatilityRisk > 0.8) {
      alerts.push({
        level: 'critical',
        type: 'volatility',
        message: 'Extreme volatility environment',
        recommendation: 'Reduce position sizes and increase cash allocation',
        timestamp: new Date(),
        affectedSymbols: []
      });
    }
    
    if (blackSwanRisk > 0.6) {
      alerts.push({
        level: 'warning',
        type: 'volatility',
        message: 'Elevated black swan risk',
        recommendation: 'Consider hedging strategies or reducing exposure',
        timestamp: new Date(),
        affectedSymbols: []
      });
    }
    
    // Calculate total risk score
    const riskComponents = [
      concentrationRisk,
      liquidityRisk,
      volatilityRisk,
      correlationRisk,
      leverageRisk,
      blackSwanRisk
    ];
    
    const totalRisk = riskComponents.reduce((sum, risk) => sum + risk, 0) / riskComponents.length;
    const riskBudgetUsed = Math.min(100, totalRisk * 100);
    
    // Store alerts in history
    this.alertHistory.push(...alerts);
    
    return {
      totalRisk,
      concentrationRisk,
      liquidityRisk,
      volatilityRisk,
      correlationRisk,
      leverageRisk,
      blackSwanRisk,
      alerts,
      riskBudgetUsed
    };
  }

  filterRecommendationsByRisk(
    recommendations: EnhancedRecommendation[],
    portfolioValue: number,
    currentPositions: Trade[],
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): EnhancedRecommendation[] {
    const riskThresholds = this.getRiskThresholds(riskTolerance);
    
    return recommendations.filter(rec => {
      // Position size check
      const positionSize = this.calculatePositionSize(rec, portfolioValue);
      if (positionSize > riskThresholds.maxPosition) return false;
      
      // Confidence check
      if (rec.confidence < riskThresholds.minConfidence) return false;
      
      // Liquidity check
      if (rec.liquidityScore < riskThresholds.minLiquidity) return false;
      
      // Volatility check
      if (rec.volatilityScore > riskThresholds.maxVolatility) return false;
      
      // Black swan risk check
      if (rec.blackSwanRisk > riskThresholds.maxBlackSwan) return false;
      
      return true;
    });
  }

  // Private helper methods
  private calculatePositionSize(
    recommendation: EnhancedRecommendation,
    portfolioValue: number
  ): number {
    if (recommendation.strategy === 'cash_secured_put') {
      const requiredCash = recommendation.strike * 100;
      return requiredCash / portfolioValue;
    } else if (recommendation.strategy === 'covered_call') {
      const shareValue = recommendation.currentPrice * 100;
      return shareValue / portfolioValue;
    }
    return 0;
  }

  private calculateConcentrationRisk(
    symbol: string,
    positions: Trade[],
    portfolioValue: number
  ): number {
    // Calculate current allocation to symbol
    let symbolValue = 0;
    
    for (const position of positions) {
      if (position.symbol === symbol) {
        symbolValue += Math.abs(position.netCash);
      }
    }
    
    return symbolValue / portfolioValue;
  }

  private assessConcentrationRisk(positions: Trade[], portfolioValue: number): number {
    const symbolAllocations = new Map<string, number>();
    
    for (const position of positions) {
      const current = symbolAllocations.get(position.symbol) || 0;
      symbolAllocations.set(position.symbol, current + Math.abs(position.netCash));
    }
    
    let maxConcentration = 0;
    for (const allocation of symbolAllocations.values()) {
      const percentage = allocation / portfolioValue;
      maxConcentration = Math.max(maxConcentration, percentage);
    }
    
    return Math.min(1, maxConcentration / this.riskLimits.maxPositionSize);
  }

  private assessLiquidityRisk(
    positions: Trade[],
    recommendations: EnhancedRecommendation[]
  ): number {
    let totalLiquidityScore = 0;
    let count = 0;
    
    for (const rec of recommendations) {
      totalLiquidityScore += rec.liquidityScore;
      count++;
    }
    
    if (count === 0) return 0;
    
    const avgLiquidity = totalLiquidityScore / count;
    return 1 - avgLiquidity; // Higher score means lower risk
  }

  private assessVolatilityRisk(
    recommendations: EnhancedRecommendation[],
    marketIndicators: MarketIndicators
  ): number {
    let risk = 0;
    
    // Market volatility
    if (marketIndicators.vix > 30) risk += 0.4;
    else if (marketIndicators.vix > 25) risk += 0.3;
    else if (marketIndicators.vix > 20) risk += 0.2;
    
    // Average implied volatility of recommendations
    if (recommendations.length > 0) {
      const avgIV = recommendations.reduce((sum, rec) => sum + rec.impliedVolatility, 0) / recommendations.length;
      if (avgIV > 0.8) risk += 0.3;
      else if (avgIV > 0.6) risk += 0.2;
      else if (avgIV > 0.4) risk += 0.1;
    }
    
    return Math.min(1, risk);
  }

  private assessCorrelationRisk(positions: Trade[]): number {
    // Simplified correlation assessment based on symbol categories
    const sectors = new Map<string, number>();
    
    for (const position of positions) {
      const sector = this.getSector(position.symbol);
      sectors.set(sector, (sectors.get(sector) || 0) + 1);
    }
    
    let maxSectorCount = 0;
    for (const count of sectors.values()) {
      maxSectorCount = Math.max(maxSectorCount, count);
    }
    
    const totalPositions = positions.length;
    if (totalPositions === 0) return 0;
    
    return Math.min(1, maxSectorCount / totalPositions);
  }

  private assessLeverageRisk(positions: Trade[], portfolioValue: number): number {
    // Calculate total exposure vs portfolio value
    let totalExposure = 0;
    
    for (const position of positions) {
      if (position.assetCategory === 'STK') {
        totalExposure += Math.abs(position.netCash);
      }
    }
    
    const leverage = totalExposure / portfolioValue;
    return Math.min(1, leverage / this.riskLimits.maxLeverage);
  }

  private assessBlackSwanRisk(marketIndicators: MarketIndicators): number {
    let risk = 0;
    
    // VIX level
    if (marketIndicators.vix > 40) risk += 0.5;
    else if (marketIndicators.vix > 30) risk += 0.3;
    else if (marketIndicators.vix > 25) risk += 0.2;
    
    // Market sentiment
    if (marketIndicators.marketSentiment === 'bearish') risk += 0.2;
    
    // Fear & Greed Index
    if (marketIndicators.fearGreedIndex < 20) risk += 0.2; // Extreme fear
    else if (marketIndicators.fearGreedIndex > 80) risk += 0.1; // Extreme greed
    
    return Math.min(1, risk);
  }

  private getSector(symbol: string): string {
    // Simplified sector mapping
    const techSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];
    const financeSymbols = ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C'];
    const etfSymbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'XLV', 'XLI'];
    
    if (techSymbols.includes(symbol)) return 'Technology';
    if (financeSymbols.includes(symbol)) return 'Finance';
    if (etfSymbols.includes(symbol)) return 'ETF';
    
    return 'Other';
  }

  private getConcentratedSymbols(positions: Trade[]): string[] {
    const symbolCounts = new Map<string, number>();
    
    for (const position of positions) {
      symbolCounts.set(position.symbol, (symbolCounts.get(position.symbol) || 0) + 1);
    }
    
    return Array.from(symbolCounts.entries())
      .filter(([_, count]) => count > 3)
      .map(([symbol]) => symbol);
  }

  private getRiskThresholds(riskTolerance: string) {
    switch (riskTolerance) {
      case 'conservative':
        return {
          maxPosition: 0.05,
          minConfidence: 0.8,
          minLiquidity: 0.7,
          maxVolatility: 0.6,
          maxBlackSwan: 0.3
        };
      case 'aggressive':
        return {
          maxPosition: 0.15,
          minConfidence: 0.6,
          minLiquidity: 0.4,
          maxVolatility: 0.9,
          maxBlackSwan: 0.7
        };
      default: // moderate
        return {
          maxPosition: 0.10,
          minConfidence: 0.7,
          minLiquidity: 0.5,
          maxVolatility: 0.75,
          maxBlackSwan: 0.5
        };
    }
  }

  // Public utility methods
  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  getAlertHistory(): RiskAlert[] {
    return [...this.alertHistory];
  }

  clearAlertHistory(): void {
    this.alertHistory = [];
  }

  generateRiskReport(portfolioRisk: PortfolioRisk): string {
    const report = [
      `Portfolio Risk Assessment`,
      `========================`,
      `Total Risk Score: ${(portfolioRisk.totalRisk * 100).toFixed(1)}%`,
      `Risk Budget Used: ${portfolioRisk.riskBudgetUsed.toFixed(1)}%`,
      ``,
      `Risk Breakdown:`,
      `- Concentration Risk: ${(portfolioRisk.concentrationRisk * 100).toFixed(1)}%`,
      `- Liquidity Risk: ${(portfolioRisk.liquidityRisk * 100).toFixed(1)}%`,
      `- Volatility Risk: ${(portfolioRisk.volatilityRisk * 100).toFixed(1)}%`,
      `- Correlation Risk: ${(portfolioRisk.correlationRisk * 100).toFixed(1)}%`,
      `- Leverage Risk: ${(portfolioRisk.leverageRisk * 100).toFixed(1)}%`,
      `- Black Swan Risk: ${(portfolioRisk.blackSwanRisk * 100).toFixed(1)}%`,
      ``
    ];

    if (portfolioRisk.alerts.length > 0) {
      report.push(`Active Alerts:`);
      for (const alert of portfolioRisk.alerts) {
        report.push(`- [${alert.level.toUpperCase()}] ${alert.message}`);
        report.push(`  Recommendation: ${alert.recommendation}`);
      }
    } else {
      report.push(`No active risk alerts.`);
    }

    return report.join('\n');
  }
}