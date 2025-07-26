/**
 * Enhanced Recommendation Engine with Live Market Data Integration
 * Combines historical IB data with real-time market data for superior recommendations
 */

import { MarketDataService, AggregatedQuote, MarketIndicators } from './marketDataService';
import { YahooFinanceService, OptionsChainData, OptionContract } from './yahooFinanceService';
import { Trade } from '@/types/trade';

export interface EnhancedRecommendation {
  symbol: string;
  strategy: 'cash_secured_put' | 'covered_call' | 'wheel_entry' | 'wheel_exit';
  action: 'sell_put' | 'sell_call' | 'buy_shares' | 'sell_shares';
  strike: number;
  expiry: Date;
  premium: number;
  probability: number;
  expectedReturn: number;
  maxLoss: number;
  confidence: number;
  riskReward: number;
  
  // Market context
  currentPrice: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  
  // Analysis factors
  technicalScore: number;
  fundamentalScore: number;
  marketSentimentScore: number;
  liquidityScore: number;
  volatilityScore: number;
  
  // Risk metrics
  blackSwanRisk: number;
  correlationRisk: number;
  earningsRisk: number;
  
  // Reasoning
  reasoning: string[];
  warnings: string[];
  
  // Live data timestamp
  timestamp: Date;
  dataFreshness: number; // minutes since last update
}

export interface PortfolioAnalysis {
  totalValue: number;
  availableCash: number;
  marginUsed: number;
  concentrationRisk: Map<string, number>;
  sectorExposure: Map<string, number>;
  portfolioBeta: number;
  portfolioTheta: number;
  portfolioDelta: number;
  portfolioVega: number;
  maxDrawdownRisk: number;
}

export interface MarketRegime {
  type: 'bull_market' | 'bear_market' | 'sideways' | 'high_volatility' | 'low_volatility';
  confidence: number;
  duration: number; // days in current regime
  expectedDuration: number; // estimated days remaining
  characteristics: string[];
}

export class EnhancedRecommendationEngine {
  private static instance: EnhancedRecommendationEngine;
  private marketDataService: MarketDataService;
  private yahooService: YahooFinanceService;
  
  private portfolioAnalysis: PortfolioAnalysis | null = null;
  private marketRegime: MarketRegime | null = null;
  private lastAnalysisTime: Date | null = null;
  
  // Configuration
  private config = {
    maxPositionSize: 0.1, // 10% of portfolio per position
    targetAnnualReturn: 0.15, // 15%
    maxDrawdown: 0.05, // 5%
    minLiquidity: 1000, // minimum daily volume
    minProbability: 0.7, // minimum success probability
    maxConcentration: 0.2, // max 20% in any sector
  };

  private constructor() {
    this.marketDataService = MarketDataService.getInstance();
    this.yahooService = YahooFinanceService.getInstance();
  }

  static getInstance(): EnhancedRecommendationEngine {
    if (!EnhancedRecommendationEngine.instance) {
      EnhancedRecommendationEngine.instance = new EnhancedRecommendationEngine();
    }
    return EnhancedRecommendationEngine.instance;
  }

  async generateEnhancedRecommendations(
    trades: Trade[],
    portfolioValue: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<EnhancedRecommendation[]> {
    
    // Update portfolio analysis
    await this.updatePortfolioAnalysis(trades, portfolioValue);
    
    // Analyze current market regime
    await this.analyzeMarketRegime();
    
    // Get wheel candidates
    const candidates = await this.marketDataService.getWheelCandidates(
      portfolioValue,
      this.mapRiskTolerance(riskTolerance)
    );
    
    const recommendations: EnhancedRecommendation[] = [];
    
    // Generate recommendations for each candidate
    for (const symbol of candidates.slice(0, 10)) { // Limit to top 10 for performance
      const quote = this.marketDataService.getCurrentQuote(symbol);
      if (!quote) continue;
      
      const optionsChain = this.marketDataService.getOptionsChain(symbol);
      if (optionsChain.length === 0) continue;
      
      // Generate strategy-specific recommendations
      const putRecommendations = await this.generatePutRecommendations(
        symbol, quote, optionsChain, trades, riskTolerance
      );
      
      const callRecommendations = await this.generateCallRecommendations(
        symbol, quote, optionsChain, trades, riskTolerance
      );
      
      recommendations.push(...putRecommendations, ...callRecommendations);
    }
    
    // Sort by expected return and filter by confidence
    return recommendations
      .filter(rec => rec.confidence >= this.config.minProbability)
      .sort((a, b) => b.expectedReturn - a.expectedReturn)
      .slice(0, 15); // Return top 15 recommendations
  }

  private async generatePutRecommendations(
    symbol: string,
    quote: AggregatedQuote,
    optionsChains: OptionsChainData[],
    trades: Trade[],
    riskTolerance: string
  ): Promise<EnhancedRecommendation[]> {
    const recommendations: EnhancedRecommendation[] = [];
    
    // Check if we already have a position
    const existingPosition = this.findExistingPosition(symbol, trades);
    if (existingPosition) return recommendations; // Skip if already have shares
    
    for (const chain of optionsChains) {
      const daysToExpiry = Math.ceil((chain.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Focus on 15-45 DTE for cash-secured puts
      if (daysToExpiry < 15 || daysToExpiry > 45) continue;
      
      for (const put of chain.puts) {
        // Focus on 15-30 delta puts
        if (Math.abs(put.delta) < 0.15 || Math.abs(put.delta) > 0.30) continue;
        
        const recommendation = await this.analyzePutOption(
          symbol, quote, put, chain, daysToExpiry, riskTolerance
        );
        
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }
    
    return recommendations;
  }

  private async generateCallRecommendations(
    symbol: string,
    quote: AggregatedQuote,
    optionsChains: OptionsChainData[],
    trades: Trade[],
    riskTolerance: string
  ): Promise<EnhancedRecommendation[]> {
    const recommendations: EnhancedRecommendation[] = [];
    
    // Check if we own shares
    const position = this.findExistingPosition(symbol, trades);
    if (!position || position.quantity < 100) return recommendations;
    
    for (const chain of optionsChains) {
      const daysToExpiry = Math.ceil((chain.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      // Focus on 15-45 DTE for covered calls
      if (daysToExpiry < 15 || daysToExpiry > 45) continue;
      
      for (const call of chain.calls) {
        // Focus on 15-30 delta calls
        if (call.delta < 0.15 || call.delta > 0.30) continue;
        
        const recommendation = await this.analyzeCallOption(
          symbol, quote, call, chain, daysToExpiry, position, riskTolerance
        );
        
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }
    
    return recommendations;
  }

  private async analyzePutOption(
    symbol: string,
    quote: AggregatedQuote,
    put: OptionContract,
    chain: OptionsChainData,
    daysToExpiry: number,
    riskTolerance: string
  ): Promise<EnhancedRecommendation | null> {
    
    // Calculate key metrics
    const premium = (put.bid + put.ask) / 2;
    const maxLoss = put.strike * 100 - premium * 100; // Cash secured put
    const maxGain = premium * 100;
    const probability = this.calculateAssignmentProbability(put.delta);
    
    // Annualized return calculation
    const returnOnRisk = premium / put.strike;
    const annualizedReturn = (returnOnRisk * 365) / daysToExpiry;
    
    // Risk-adjusted probability
    const riskAdjustment = this.getRiskAdjustment(riskTolerance);
    const adjustedProbability = probability * riskAdjustment;
    
    // Market context analysis
    const marketIndicators = await this.marketDataService.getMarketIndicators();
    const technicalScore = this.calculateTechnicalScore(quote, marketIndicators);
    const fundamentalScore = this.calculateFundamentalScore(quote);
    const liquidityScore = this.calculateLiquidityScore(put, quote);
    
    // Risk assessments
    const earningsRisk = await this.assessEarningsRisk(symbol, chain.expiry);
    const blackSwanRisk = this.assessBlackSwanRisk(quote, marketIndicators);
    
    // Generate reasoning
    const reasoning = this.generatePutReasoning(
      symbol, put, quote, annualizedReturn, probability, marketIndicators
    );
    
    const warnings = this.generateWarnings(
      put, quote, earningsRisk, blackSwanRisk, liquidityScore
    );
    
    // Calculate confidence score
    const confidence = this.calculateConfidence([
      technicalScore,
      fundamentalScore,
      liquidityScore,
      adjustedProbability,
      1 - earningsRisk,
      1 - blackSwanRisk
    ]);
    
    if (confidence < 0.5 || annualizedReturn < 0.1) {
      return null; // Skip low-confidence or low-return opportunities
    }
    
    return {
      symbol,
      strategy: 'cash_secured_put',
      action: 'sell_put',
      strike: put.strike,
      expiry: chain.expiry,
      premium,
      probability: adjustedProbability,
      expectedReturn: annualizedReturn,
      maxLoss,
      confidence,
      riskReward: maxGain / maxLoss,
      
      currentPrice: quote.price,
      impliedVolatility: put.impliedVolatility,
      delta: put.delta,
      gamma: put.gamma,
      theta: put.theta,
      vega: put.vega,
      
      technicalScore,
      fundamentalScore,
      marketSentimentScore: this.getMarketSentimentScore(marketIndicators),
      liquidityScore,
      volatilityScore: Math.min(1, put.impliedVolatility / 0.5),
      
      blackSwanRisk,
      correlationRisk: this.calculateCorrelationRisk(symbol),
      earningsRisk,
      
      reasoning,
      warnings,
      
      timestamp: new Date(),
      dataFreshness: this.calculateDataFreshness(quote.lastUpdated)
    };
  }

  private async analyzeCallOption(
    symbol: string,
    quote: AggregatedQuote,
    call: OptionContract,
    chain: OptionsChainData,
    daysToExpiry: number,
    position: any,
    riskTolerance: string
  ): Promise<EnhancedRecommendation | null> {
    
    const premium = (call.bid + call.ask) / 2;
    const assignmentProbability = this.calculateAssignmentProbability(call.delta);
    
    // Calculate potential outcomes
    const maxGain = premium * 100; // Keep premium if not assigned
    const maxLoss = (quote.price - call.strike) * 100 + premium * 100; // If assigned above current price
    
    // Annualized return
    const returnOnShares = premium / quote.price;
    const annualizedReturn = (returnOnShares * 365) / daysToExpiry;
    
    const marketIndicators = await this.marketDataService.getMarketIndicators();
    const technicalScore = this.calculateTechnicalScore(quote, marketIndicators);
    const liquidityScore = this.calculateLiquidityScore(call, quote);
    
    const reasoning = this.generateCallReasoning(
      symbol, call, quote, annualizedReturn, assignmentProbability
    );
    
    const confidence = this.calculateConfidence([
      technicalScore,
      liquidityScore,
      1 - assignmentProbability, // Want low assignment probability for covered calls
      Math.min(1, annualizedReturn / 0.2) // Prefer >20% annualized return
    ]);
    
    if (confidence < 0.5 || annualizedReturn < 0.15) {
      return null;
    }
    
    return {
      symbol,
      strategy: 'covered_call',
      action: 'sell_call',
      strike: call.strike,
      expiry: chain.expiry,
      premium,
      probability: 1 - assignmentProbability, // Probability of keeping premium
      expectedReturn: annualizedReturn,
      maxLoss: maxLoss,
      confidence,
      riskReward: maxGain / Math.max(1, maxLoss),
      
      currentPrice: quote.price,
      impliedVolatility: call.impliedVolatility,
      delta: call.delta,
      gamma: call.gamma,
      theta: call.theta,
      vega: call.vega,
      
      technicalScore,
      fundamentalScore: this.calculateFundamentalScore(quote),
      marketSentimentScore: this.getMarketSentimentScore(marketIndicators),
      liquidityScore,
      volatilityScore: Math.min(1, call.impliedVolatility / 0.5),
      
      blackSwanRisk: this.assessBlackSwanRisk(quote, marketIndicators),
      correlationRisk: this.calculateCorrelationRisk(symbol),
      earningsRisk: await this.assessEarningsRisk(symbol, chain.expiry),
      
      reasoning,
      warnings: [],
      
      timestamp: new Date(),
      dataFreshness: this.calculateDataFreshness(quote.lastUpdated)
    };
  }

  // Helper methods
  private calculateAssignmentProbability(delta: number): number {
    // Approximate probability of assignment based on delta
    // Delta represents hedge ratio, roughly correlates to probability
    return Math.abs(delta);
  }

  private calculateTechnicalScore(quote: AggregatedQuote, indicators: MarketIndicators): number {
    let score = 0.5; // Neutral starting point
    
    // Price momentum
    if (quote.changePercent > 0) score += 0.1;
    if (quote.changePercent > 2) score += 0.1;
    
    // Volume analysis
    if (quote.volume > quote.avgVolume * 1.2) score += 0.1;
    
    // Market sentiment
    if (indicators.marketSentiment === 'bullish') score += 0.2;
    else if (indicators.marketSentiment === 'bearish') score -= 0.2;
    
    // VIX consideration
    if (indicators.vix < 20) score += 0.1; // Low volatility is good for selling options
    else if (indicators.vix > 30) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateFundamentalScore(quote: AggregatedQuote): number {
    let score = 0.5;
    
    // P/E ratio analysis
    if (quote.peRatio > 0 && quote.peRatio < 25) score += 0.2;
    else if (quote.peRatio > 40) score -= 0.2;
    
    // Market cap consideration (prefer large caps for wheel strategy)
    if (quote.marketCap > 100000000000) score += 0.2; // >$100B
    else if (quote.marketCap > 10000000000) score += 0.1; // >$10B
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateLiquidityScore(option: OptionContract, quote: AggregatedQuote): number {
    let score = 0;
    
    // Volume score
    if (option.volume > 100) score += 0.3;
    else if (option.volume > 50) score += 0.2;
    else if (option.volume > 10) score += 0.1;
    
    // Open interest score
    if (option.openInterest > 1000) score += 0.3;
    else if (option.openInterest > 500) score += 0.2;
    else if (option.openInterest > 100) score += 0.1;
    
    // Bid-ask spread score
    const spread = (option.ask - option.bid) / option.lastPrice;
    if (spread < 0.05) score += 0.4;
    else if (spread < 0.10) score += 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private async assessEarningsRisk(symbol: string, expiry: Date): Promise<number> {
    try {
      const earnings = await this.yahooService.getEarningsCalendar([symbol]);
      const earningsData = earnings.get(symbol);
      
      if (!earningsData) return 0;
      
      const daysToEarnings = (earningsData.earningsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      const daysToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      
      // High risk if earnings are before expiry
      if (daysToEarnings > 0 && daysToEarnings < daysToExpiry) {
        return 0.8; // High earnings risk
      }
      
      return 0.1; // Low earnings risk
    } catch (error) {
      return 0.3; // Medium risk if we can't determine
    }
  }

  private assessBlackSwanRisk(quote: AggregatedQuote, indicators: MarketIndicators): number {
    let risk = 0.1; // Base risk
    
    // High VIX increases black swan risk
    if (indicators.vix > 30) risk += 0.3;
    else if (indicators.vix > 25) risk += 0.2;
    
    // Market sentiment
    if (indicators.marketSentiment === 'bearish') risk += 0.2;
    
    // Price volatility
    if (Math.abs(quote.changePercent) > 5) risk += 0.2;
    
    return Math.min(0.8, risk);
  }

  private calculateCorrelationRisk(symbol: string): number {
    // Simplified correlation risk based on symbol
    const highCorrelationSymbols = ['SPY', 'QQQ', 'IWM'];
    if (highCorrelationSymbols.includes(symbol)) return 0.6;
    
    const techSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
    if (techSymbols.includes(symbol)) return 0.4;
    
    return 0.2; // Low correlation for other symbols
  }

  private generatePutReasoning(
    symbol: string,
    put: OptionContract,
    quote: AggregatedQuote,
    annualizedReturn: number,
    probability: number,
    indicators: MarketIndicators
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`${(annualizedReturn * 100).toFixed(1)}% annualized return potential`);
    reasoning.push(`${(probability * 100).toFixed(1)}% probability of keeping full premium`);
    reasoning.push(`${((quote.price - put.strike) / quote.price * 100).toFixed(1)}% downside protection`);
    
    if (indicators.vix < 20) {
      reasoning.push('Low volatility environment favors option selling');
    }
    
    if (quote.volume > quote.avgVolume * 1.2) {
      reasoning.push('Above-average volume indicates strong interest');
    }
    
    if (put.openInterest > 500) {
      reasoning.push('High open interest provides good liquidity');
    }
    
    return reasoning;
  }

  private generateCallReasoning(
    symbol: string,
    call: OptionContract,
    quote: AggregatedQuote,
    annualizedReturn: number,
    assignmentProbability: number
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`${(annualizedReturn * 100).toFixed(1)}% annualized return on shares`);
    reasoning.push(`${((1 - assignmentProbability) * 100).toFixed(1)}% chance of keeping shares`);
    
    const upside = (call.strike - quote.price) / quote.price * 100;
    reasoning.push(`${upside.toFixed(1)}% upside captured if assigned`);
    
    return reasoning;
  }

  private generateWarnings(
    option: OptionContract,
    quote: AggregatedQuote,
    earningsRisk: number,
    blackSwanRisk: number,
    liquidityScore: number
  ): string[] {
    const warnings: string[] = [];
    
    if (earningsRisk > 0.5) {
      warnings.push('Earnings announcement may occur before expiration');
    }
    
    if (blackSwanRisk > 0.5) {
      warnings.push('High market volatility increases black swan risk');
    }
    
    if (liquidityScore < 0.3) {
      warnings.push('Low liquidity may make it difficult to close position');
    }
    
    if (Math.abs(option.delta) > 0.25) {
      warnings.push('High delta increases assignment risk');
    }
    
    return warnings;
  }

  private calculateConfidence(scores: number[]): number {
    // Weighted average of all scores
    const weights = scores.map(() => 1 / scores.length);
    return scores.reduce((sum, score, index) => sum + score * weights[index], 0);
  }

  private getMarketSentimentScore(indicators: MarketIndicators): number {
    if (indicators.marketSentiment === 'bullish') return 0.8;
    if (indicators.marketSentiment === 'bearish') return 0.2;
    return 0.5;
  }

  private calculateDataFreshness(lastUpdated: Date): number {
    return (Date.now() - lastUpdated.getTime()) / (1000 * 60); // minutes
  }

  private getRiskAdjustment(riskTolerance: string): number {
    switch (riskTolerance) {
      case 'conservative': return 0.8;
      case 'aggressive': return 1.2;
      default: return 1.0;
    }
  }

  private mapRiskTolerance(tolerance: string): 'low' | 'medium' | 'high' {
    switch (tolerance) {
      case 'conservative': return 'low';
      case 'aggressive': return 'high';
      default: return 'medium';
    }
  }

  private findExistingPosition(symbol: string, trades: Trade[]): any {
    // Find current position in symbol
    let position = { quantity: 0, averagePrice: 0 };
    
    for (const trade of trades) {
      if (trade.symbol === symbol && trade.assetCategory === 'STK') {
        if (trade.buy_sell === 'BUY') {
          position.quantity += trade.quantity;
        } else if (trade.buy_sell === 'SELL') {
          position.quantity -= trade.quantity;
        }
      }
    }
    
    return position.quantity > 0 ? position : null;
  }

  private async updatePortfolioAnalysis(trades: Trade[], portfolioValue: number): Promise<void> {
    // Implementation would analyze current portfolio
    // For now, create a basic analysis
    this.portfolioAnalysis = {
      totalValue: portfolioValue,
      availableCash: portfolioValue * 0.3, // Assume 30% cash
      marginUsed: 0,
      concentrationRisk: new Map(),
      sectorExposure: new Map(),
      portfolioBeta: 1.0,
      portfolioTheta: 0,
      portfolioDelta: 0,
      portfolioVega: 0,
      maxDrawdownRisk: 0.05
    };
  }

  private async analyzeMarketRegime(): Promise<void> {
    const indicators = await this.marketDataService.getMarketIndicators();
    
    // Simplified market regime analysis
    let regimeType: MarketRegime['type'] = 'sideways';
    
    if (indicators.vix > 25) {
      regimeType = 'high_volatility';
    } else if (indicators.vix < 15) {
      regimeType = 'low_volatility';
    } else if (indicators.marketSentiment === 'bullish') {
      regimeType = 'bull_market';
    } else if (indicators.marketSentiment === 'bearish') {
      regimeType = 'bear_market';
    }
    
    this.marketRegime = {
      type: regimeType,
      confidence: 0.7,
      duration: 30, // Placeholder
      expectedDuration: 60, // Placeholder
      characteristics: [`VIX at ${indicators.vix}`, `Market sentiment: ${indicators.marketSentiment}`]
    };
  }
}