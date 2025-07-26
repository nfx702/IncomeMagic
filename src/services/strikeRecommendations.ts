/**
 * Intelligent Strike Price Recommendations Service
 * Combines max pain analysis with ML predictions for optimal trade selection
 */

import { MaxPainCalculator, MaxPainResult, ExpirationWeek } from './maxPainCalculator';
import { predict14Days, getModelConfidence, getDetailedPredictions } from './mlPredictions';
import { Trade, RecommendedTrade } from '@/types/trade';
import { addDays, nextFriday, addWeeks } from 'date-fns';

export interface StrikeAnalysisResult {
  strike: number;
  score: number;
  maxPainDistance: number;
  mlConfidence: number;
  premiumPotential: number;
  probabilityOfProfit: number;
  assignmentRisk: number;
  exerciseRisk: number;
  reasoning: string[];
}

export interface StrategyRecommendation {
  strategy: 'cash_secured_put' | 'covered_call' | 'iron_condor';
  symbol: string;
  strikes: number[];
  expiry: Date;
  totalPremium: number;
  maxRisk: number;
  probabilityOfProfit: number;
  maxPainAlignment: number;
  mlPredictionAlignment: number;
  overallScore: number;
  reasoning: string;
  visualIndicators: {
    strikeZones: Array<{
      strike: number;
      zone: 'optimal' | 'good' | 'acceptable' | 'risky';
      confidence: number;
    }>;
    maxPainLevel: number;
    mlPredictionRange: [number, number];
  };
}

export interface MarketConditions {
  impliedVolatility: number;
  timeDecay: number;
  earningsDate?: Date;
  hasEvents: boolean;
  trendDirection: 'bullish' | 'bearish' | 'neutral';
  volatilityRegime: 'low' | 'normal' | 'high';
}

export class StrikeRecommendationEngine {
  private maxPainCalculator: MaxPainCalculator;
  
  constructor() {
    this.maxPainCalculator = new MaxPainCalculator();
  }

  /**
   * Generate comprehensive strike recommendations for a symbol
   */
  async generateStrikeRecommendations(
    symbol: string,
    currentPrice: number,
    trades: Trade[],
    options?: {
      strategies?: ('cash_secured_put' | 'covered_call' | 'iron_condor')[];
      minPremium?: number;
      maxRisk?: number;
      targetProbability?: number;
    }
  ): Promise<StrategyRecommendation[]> {
    try {
      // Get max pain analysis for current and next week
      const currentWeekMaxPain = this.maxPainCalculator.getMaxPainForSymbol(
        trades, symbol, undefined, ExpirationWeek.CURRENT
      );
      const nextWeekMaxPain = this.maxPainCalculator.getMaxPainForSymbol(
        trades, symbol, undefined, ExpirationWeek.NEXT
      );

      // Get ML predictions
      const mlPredictions = await predict14Days(symbol);
      const mlConfidence = getModelConfidence(symbol);
      const detailedPredictions = await getDetailedPredictions(symbol);

      // Analyze market conditions
      const marketConditions = this.analyzeMarketConditions(symbol, currentPrice, trades);

      // Generate strike analysis for different strategies
      const recommendations: StrategyRecommendation[] = [];
      const strategies = options?.strategies || ['cash_secured_put', 'covered_call', 'iron_condor'];

      for (const strategy of strategies) {
        const recommendation = await this.generateStrategyRecommendation(
          strategy,
          symbol,
          currentPrice,
          currentWeekMaxPain,
          nextWeekMaxPain,
          mlPredictions,
          mlConfidence,
          marketConditions,
          options
        );

        if (recommendation) {
          recommendations.push(recommendation);
        }
      }

      // Sort by overall score
      return recommendations.sort((a, b) => b.overallScore - a.overallScore);

    } catch (error) {
      console.error(`Error generating strike recommendations for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Generate recommendation for a specific strategy
   */
  private async generateStrategyRecommendation(
    strategy: 'cash_secured_put' | 'covered_call' | 'iron_condor',
    symbol: string,
    currentPrice: number,
    currentWeekMaxPain: MaxPainResult | null,
    nextWeekMaxPain: MaxPainResult | null,
    mlPredictions: number[],
    mlConfidence: number,
    marketConditions: MarketConditions,
    options?: any
  ): Promise<StrategyRecommendation | null> {
    
    const maxPainPrice = currentWeekMaxPain?.maxPainPrice || currentPrice;
    const mlPredictionEnd = mlPredictions[6]; // 7-day prediction
    
    switch (strategy) {
      case 'cash_secured_put':
        return this.generatePutRecommendation(
          symbol, currentPrice, maxPainPrice, mlPredictionEnd, mlConfidence, marketConditions, options
        );
      
      case 'covered_call':
        return this.generateCallRecommendation(
          symbol, currentPrice, maxPainPrice, mlPredictionEnd, mlConfidence, marketConditions, options
        );
      
      case 'iron_condor':
        return this.generateIronCondorRecommendation(
          symbol, currentPrice, maxPainPrice, mlPredictions, mlConfidence, marketConditions, options
        );
      
      default:
        return null;
    }
  }

  /**
   * Generate cash-secured put recommendation
   */
  private generatePutRecommendation(
    symbol: string,
    currentPrice: number,
    maxPainPrice: number,
    mlPrediction: number,
    mlConfidence: number,
    marketConditions: MarketConditions,
    options?: any
  ): StrategyRecommendation {
    
    // Strike below max pain for assignment safety
    const maxPainBuffer = Math.min(maxPainPrice * 0.95, currentPrice * 0.95);
    const mlBuffer = Math.min(mlPrediction * 0.90, currentPrice * 0.90);
    
    // Choose more conservative of the two
    const baseStrike = Math.min(maxPainBuffer, mlBuffer);
    const strike = Math.floor(baseStrike / 5) * 5; // Round to nearest $5
    
    // Calculate metrics
    const premium = this.calculateEstimatedPremium(currentPrice, strike, 'PUT', marketConditions);
    const assignmentRisk = this.calculateAssignmentRisk(currentPrice, strike, mlPrediction, mlConfidence);
    const probabilityOfProfit = this.calculateProbabilityOfProfit(currentPrice, strike, 'PUT', mlPrediction);
    
    // Max pain alignment score
    const maxPainDistance = Math.abs(strike - maxPainPrice) / currentPrice;
    const maxPainAlignment = Math.max(0, 1 - maxPainDistance * 5); // Penalize distance from max pain
    
    // ML prediction alignment
    const mlAlignment = strike < mlPrediction ? 0.9 : 0.6; // Favor strikes below ML prediction
    
    // Overall score calculation
    const overallScore = this.calculateOverallScore({
      premium,
      assignmentRisk,
      probabilityOfProfit,
      maxPainAlignment,
      mlAlignment: mlAlignment * mlConfidence,
      marketConditions
    });

    const visualIndicators = this.generateStrikeZones(currentPrice, maxPainPrice, [mlPrediction], 'PUT');

    return {
      strategy: 'cash_secured_put',
      symbol,
      strikes: [strike],
      expiry: nextFriday(new Date()),
      totalPremium: premium,
      maxRisk: (currentPrice - strike) * 100, // Maximum loss if assigned
      probabilityOfProfit,
      maxPainAlignment,
      mlPredictionAlignment: mlAlignment,
      overallScore,
      reasoning: this.generatePutReasoning(
        symbol, currentPrice, strike, maxPainPrice, mlPrediction, premium, assignmentRisk
      ),
      visualIndicators
    };
  }

  /**
   * Generate covered call recommendation
   */
  private generateCallRecommendation(
    symbol: string,
    currentPrice: number,
    maxPainPrice: number,
    mlPrediction: number,
    mlConfidence: number,
    marketConditions: MarketConditions,
    options?: any
  ): StrategyRecommendation {
    
    // Strike above max pain for profit maximization
    const maxPainBuffer = Math.max(maxPainPrice * 1.05, currentPrice * 1.05);
    const mlBuffer = Math.max(mlPrediction * 1.10, currentPrice * 1.10);
    
    // Choose more aggressive of the two (higher strike)
    const baseStrike = Math.max(maxPainBuffer, mlBuffer);
    const strike = Math.ceil(baseStrike / 5) * 5; // Round to nearest $5
    
    // Calculate metrics
    const premium = this.calculateEstimatedPremium(currentPrice, strike, 'CALL', marketConditions);
    const exerciseRisk = this.calculateExerciseRisk(currentPrice, strike, mlPrediction, mlConfidence);
    const probabilityOfProfit = this.calculateProbabilityOfProfit(currentPrice, strike, 'CALL', mlPrediction);
    
    // Max pain alignment score
    const maxPainDistance = Math.abs(strike - maxPainPrice) / currentPrice;
    const maxPainAlignment = Math.max(0, 1 - maxPainDistance * 3);
    
    // ML prediction alignment
    const mlAlignment = strike > mlPrediction ? 0.9 : 0.6; // Favor strikes above ML prediction
    
    // Overall score calculation
    const overallScore = this.calculateOverallScore({
      premium,
      assignmentRisk: exerciseRisk,
      probabilityOfProfit,
      maxPainAlignment,
      mlAlignment: mlAlignment * mlConfidence,
      marketConditions
    });

    const visualIndicators = this.generateStrikeZones(currentPrice, maxPainPrice, [mlPrediction], 'CALL');

    return {
      strategy: 'covered_call',
      symbol,
      strikes: [strike],
      expiry: nextFriday(new Date()),
      totalPremium: premium,
      maxRisk: (strike - currentPrice) * 100, // Opportunity cost if called away
      probabilityOfProfit,
      maxPainAlignment,
      mlPredictionAlignment: mlAlignment,
      overallScore,
      reasoning: this.generateCallReasoning(
        symbol, currentPrice, strike, maxPainPrice, mlPrediction, premium, exerciseRisk
      ),
      visualIndicators
    };
  }

  /**
   * Generate iron condor recommendation
   */
  private generateIronCondorRecommendation(
    symbol: string,
    currentPrice: number,
    maxPainPrice: number,
    mlPredictions: number[],
    mlConfidence: number,
    marketConditions: MarketConditions,
    options?: any
  ): StrategyRecommendation {
    
    // Use max pain as center point
    const centerPoint = maxPainPrice;
    const mlRange = Math.max(...mlPredictions.slice(0, 7)) - Math.min(...mlPredictions.slice(0, 7));
    
    // Wing spread based on expected price range
    const wingSpread = Math.max(mlRange * 1.5, currentPrice * 0.08); // At least 8% width
    
    const putStrike = Math.floor((centerPoint - wingSpread) / 5) * 5;
    const callStrike = Math.ceil((centerPoint + wingSpread) / 5) * 5;
    const putSpread = 10; // $10 spread
    const callSpread = 10; // $10 spread
    
    const strikes = [
      putStrike - putSpread, // Short put
      putStrike,             // Long put
      callStrike,            // Long call
      callStrike + callSpread // Short call
    ];
    
    // Calculate total premium (net credit)
    const shortPutPremium = this.calculateEstimatedPremium(currentPrice, putStrike, 'PUT', marketConditions);
    const longPutPremium = this.calculateEstimatedPremium(currentPrice, putStrike - putSpread, 'PUT', marketConditions);
    const shortCallPremium = this.calculateEstimatedPremium(currentPrice, callStrike, 'CALL', marketConditions);
    const longCallPremium = this.calculateEstimatedPremium(currentPrice, callStrike + callSpread, 'CALL', marketConditions);
    
    const totalPremium = shortPutPremium + shortCallPremium - longPutPremium - longCallPremium;
    const maxRisk = Math.max(putSpread, callSpread) * 100 - totalPremium;
    
    // Probability of profit (price stays between short strikes)
    const probabilityOfProfit = this.calculateCondorProbability(
      currentPrice, putStrike, callStrike, mlPredictions[6]
    );
    
    const maxPainAlignment = 1 - Math.abs(centerPoint - maxPainPrice) / currentPrice;
    const mlAlignment = mlConfidence * 0.8; // Iron condors benefit from range-bound predictions
    
    const overallScore = this.calculateOverallScore({
      premium: totalPremium,
      assignmentRisk: 0.3, // Moderate risk for iron condors
      probabilityOfProfit,
      maxPainAlignment,
      mlAlignment,
      marketConditions
    });

    const visualIndicators = this.generateStrikeZones(currentPrice, maxPainPrice, mlPredictions.slice(0, 7), 'CONDOR');

    return {
      strategy: 'iron_condor',
      symbol,
      strikes,
      expiry: nextFriday(new Date()),
      totalPremium,
      maxRisk,
      probabilityOfProfit,
      maxPainAlignment,
      mlPredictionAlignment: mlAlignment,
      overallScore,
      reasoning: this.generateCondorReasoning(
        symbol, currentPrice, strikes, maxPainPrice, mlPredictions[6], totalPremium
      ),
      visualIndicators
    };
  }

  /**
   * Analyze current market conditions
   */
  private analyzeMarketConditions(symbol: string, currentPrice: number, trades: Trade[]): MarketConditions {
    // Simplified market condition analysis
    const recentTrades = trades
      .filter(t => t.symbol === symbol || t.underlyingSymbol === symbol)
      .slice(-20);
    
    const priceChanges = recentTrades.map((t, i) => 
      i > 0 ? (t.tradePrice - recentTrades[i-1].tradePrice) / recentTrades[i-1].tradePrice : 0
    ).filter(change => change !== 0);
    
    const avgVolatility = priceChanges.length > 0 
      ? Math.sqrt(priceChanges.reduce((sum, change) => sum + change * change, 0) / priceChanges.length)
      : 0.25;
    
    const trendDirection = priceChanges.length > 0
      ? priceChanges.reduce((sum, change) => sum + change, 0) > 0 ? 'bullish' : 'bearish'
      : 'neutral';
    
    const volatilityRegime = avgVolatility > 0.4 ? 'high' : avgVolatility > 0.2 ? 'normal' : 'low';
    
    return {
      impliedVolatility: avgVolatility * 100,
      timeDecay: 0.05, // Simplified time decay factor
      hasEvents: false, // Would check earnings calendar in production
      trendDirection,
      volatilityRegime
    };
  }

  /**
   * Calculate estimated option premium
   */
  private calculateEstimatedPremium(
    currentPrice: number,
    strike: number,
    optionType: 'PUT' | 'CALL',
    marketConditions: MarketConditions
  ): number {
    const moneyness = optionType === 'PUT' 
      ? (currentPrice - strike) / currentPrice 
      : (strike - currentPrice) / currentPrice;
    
    const volatility = marketConditions.impliedVolatility / 100;
    const timeToExpiry = 7 / 365; // Weekly options
    
    // Intrinsic value
    const intrinsicValue = optionType === 'PUT'
      ? Math.max(strike - currentPrice, 0)
      : Math.max(currentPrice - strike, 0);
    
    // Time value with volatility adjustment
    const timeValue = currentPrice * volatility * Math.sqrt(timeToExpiry) * 0.4;
    const otmAdjustment = Math.max(0.1, 1 - Math.abs(moneyness) * 8);
    
    const basePremium = (intrinsicValue + timeValue * otmAdjustment) * 100;
    
    // Market condition adjustments
    let conditionMultiplier = 1.0;
    if (marketConditions.volatilityRegime === 'high') conditionMultiplier *= 1.3;
    if (marketConditions.volatilityRegime === 'low') conditionMultiplier *= 0.8;
    if (marketConditions.hasEvents) conditionMultiplier *= 1.2;
    
    return Math.max(25, basePremium * conditionMultiplier);
  }

  /**
   * Calculate assignment risk for puts
   */
  private calculateAssignmentRisk(
    currentPrice: number,
    strike: number,
    mlPrediction: number,
    mlConfidence: number
  ): number {
    const buffer = (currentPrice - strike) / currentPrice;
    const mlRisk = mlPrediction < strike ? (strike - mlPrediction) / strike : 0;
    return Math.min(0.95, (1 - buffer) * 0.5 + mlRisk * mlConfidence);
  }

  /**
   * Calculate exercise risk for calls
   */
  private calculateExerciseRisk(
    currentPrice: number,
    strike: number,
    mlPrediction: number,
    mlConfidence: number
  ): number {
    const buffer = (strike - currentPrice) / currentPrice;
    const mlRisk = mlPrediction > strike ? (mlPrediction - strike) / strike : 0;
    return Math.min(0.95, (1 - buffer) * 0.5 + mlRisk * mlConfidence);
  }

  /**
   * Calculate probability of profit
   */
  private calculateProbabilityOfProfit(
    currentPrice: number,
    strike: number,
    optionType: 'PUT' | 'CALL',
    mlPrediction: number
  ): number {
    if (optionType === 'PUT') {
      return mlPrediction > strike ? 0.8 : 0.4;
    } else {
      return mlPrediction < strike ? 0.8 : 0.4;
    }
  }

  /**
   * Calculate iron condor probability of profit
   */
  private calculateCondorProbability(
    currentPrice: number,
    putStrike: number,
    callStrike: number,
    mlPrediction: number
  ): number {
    const inRange = mlPrediction > putStrike && mlPrediction < callStrike;
    const rangeWidth = callStrike - putStrike;
    const distanceFromCenter = Math.abs(mlPrediction - (putStrike + callStrike) / 2);
    
    if (inRange) {
      return 0.7 + (1 - distanceFromCenter / (rangeWidth / 2)) * 0.2;
    } else {
      return 0.3 - Math.min(distanceFromCenter / currentPrice, 0.2);
    }
  }

  /**
   * Calculate overall recommendation score
   */
  private calculateOverallScore(factors: {
    premium: number;
    assignmentRisk: number;
    probabilityOfProfit: number;
    maxPainAlignment: number;
    mlAlignment: number;
    marketConditions: MarketConditions;
  }): number {
    const premiumScore = Math.min(factors.premium / 500, 1); // Normalize premium
    const riskScore = 1 - factors.assignmentRisk;
    const profitScore = factors.probabilityOfProfit;
    const alignmentScore = (factors.maxPainAlignment + factors.mlAlignment) / 2;
    
    // Market condition bonus/penalty
    let conditionBonus = 0;
    if (factors.marketConditions.volatilityRegime === 'normal') conditionBonus = 0.1;
    if (factors.marketConditions.volatilityRegime === 'low') conditionBonus = -0.1;
    
    const baseScore = (premiumScore * 0.3 + riskScore * 0.25 + profitScore * 0.25 + alignmentScore * 0.2);
    return Math.max(0, Math.min(1, baseScore + conditionBonus));
  }

  /**
   * Generate visual strike zone indicators
   */
  private generateStrikeZones(
    currentPrice: number,
    maxPainPrice: number,
    mlPredictions: number[],
    strategy: 'PUT' | 'CALL' | 'CONDOR'
  ): any {
    const mlRange = [Math.min(...mlPredictions), Math.max(...mlPredictions)];
    const strikeZones = [];
    
    // Generate zones around current price
    for (let i = -4; i <= 4; i++) {
      const strike = Math.round((currentPrice * (1 + i * 0.05)) / 5) * 5;
      let zone: 'optimal' | 'good' | 'acceptable' | 'risky';
      let confidence: number;
      
      const distanceFromMaxPain = Math.abs(strike - maxPainPrice) / currentPrice;
      const inMLRange = strike >= mlRange[0] && strike <= mlRange[1];
      
      if (strategy === 'PUT') {
        if (strike < maxPainPrice && strike < mlRange[0]) {
          zone = 'optimal';
          confidence = 0.9;
        } else if (strike < currentPrice * 0.95) {
          zone = 'good';
          confidence = 0.7;
        } else if (strike < currentPrice * 0.98) {
          zone = 'acceptable';
          confidence = 0.5;
        } else {
          zone = 'risky';
          confidence = 0.3;
        }
      } else if (strategy === 'CALL') {
        if (strike > maxPainPrice && strike > mlRange[1]) {
          zone = 'optimal';
          confidence = 0.9;
        } else if (strike > currentPrice * 1.05) {
          zone = 'good';
          confidence = 0.7;
        } else if (strike > currentPrice * 1.02) {
          zone = 'acceptable';
          confidence = 0.5;
        } else {
          zone = 'risky';
          confidence = 0.3;
        }
      } else { // CONDOR
        const centerDistance = Math.abs(strike - maxPainPrice) / currentPrice;
        if (centerDistance < 0.03) {
          zone = 'optimal';
          confidence = 0.9;
        } else if (centerDistance < 0.06) {
          zone = 'good';
          confidence = 0.7;
        } else if (centerDistance < 0.10) {
          zone = 'acceptable';
          confidence = 0.5;
        } else {
          zone = 'risky';
          confidence = 0.3;
        }
      }
      
      strikeZones.push({ strike, zone, confidence });
    }
    
    return {
      strikeZones: strikeZones.sort((a, b) => a.strike - b.strike),
      maxPainLevel: maxPainPrice,
      mlPredictionRange: mlRange
    };
  }

  /**
   * Generate reasoning for put recommendations
   */
  private generatePutReasoning(
    symbol: string,
    currentPrice: number,
    strike: number,
    maxPainPrice: number,
    mlPrediction: number,
    premium: number,
    assignmentRisk: number
  ): string {
    const buffer = ((currentPrice - strike) / currentPrice * 100).toFixed(1);
    const maxPainAlignment = strike < maxPainPrice ? 'favorable' : 'neutral';
    const mlAlignment = strike < mlPrediction ? 'supportive' : 'cautious';
    
    return `${symbol} PUT at $${strike} provides ${buffer}% downside buffer with $${premium.toFixed(0)} premium. ` +
           `Max pain analysis is ${maxPainAlignment} (max pain: $${maxPainPrice.toFixed(2)}). ` +
           `ML predictions are ${mlAlignment} (predicted: $${mlPrediction.toFixed(2)}). ` +
           `Assignment risk: ${(assignmentRisk * 100).toFixed(0)}%.`;
  }

  /**
   * Generate reasoning for call recommendations
   */
  private generateCallReasoning(
    symbol: string,
    currentPrice: number,
    strike: number,
    maxPainPrice: number,
    mlPrediction: number,
    premium: number,
    exerciseRisk: number
  ): string {
    const buffer = ((strike - currentPrice) / currentPrice * 100).toFixed(1);
    const maxPainAlignment = strike > maxPainPrice ? 'favorable' : 'neutral';
    const mlAlignment = strike > mlPrediction ? 'supportive' : 'cautious';
    
    return `${symbol} CALL at $${strike} allows ${buffer}% upside capture with $${premium.toFixed(0)} premium. ` +
           `Max pain analysis is ${maxPainAlignment} (max pain: $${maxPainPrice.toFixed(2)}). ` +
           `ML predictions are ${mlAlignment} (predicted: $${mlPrediction.toFixed(2)}). ` +
           `Exercise risk: ${(exerciseRisk * 100).toFixed(0)}%.`;
  }

  /**
   * Generate reasoning for iron condor recommendations
   */
  private generateCondorReasoning(
    symbol: string,
    currentPrice: number,
    strikes: number[],
    maxPainPrice: number,
    mlPrediction: number,
    premium: number
  ): string {
    const range = `$${strikes[1]} - $${strikes[2]}`;
    const centerAlignment = Math.abs(maxPainPrice - (strikes[1] + strikes[2]) / 2) < currentPrice * 0.02 ? 'excellent' : 'good';
    
    return `${symbol} Iron Condor with profit range ${range} and $${premium.toFixed(0)} net credit. ` +
           `Max pain alignment is ${centerAlignment} (center: $${maxPainPrice.toFixed(2)}). ` +
           `ML prediction ($${mlPrediction.toFixed(2)}) supports range-bound movement.`;
  }

  /**
   * Get educational tooltip content for strike selection
   */
  getStrikeSelectionEducation(strategy: string): string {
    const education = {
      cash_secured_put: "Cash-secured puts work best when strikes are below max pain levels and ML predictions, providing safety margin for assignment while collecting premium.",
      covered_call: "Covered calls should have strikes above max pain and ML predictions to maximize profit potential while minimizing early exercise risk.",
      iron_condor: "Iron condors use max pain as the center point, with wings sized based on ML prediction volatility to capture range-bound movement."
    };
    
    return education[strategy as keyof typeof education] || "Strike selection combines technical analysis with quantitative models for optimal risk-adjusted returns.";
  }

  /**
   * Dynamically adjust recommendations based on market conditions
   */
  async adjustForMarketConditions(
    recommendations: StrategyRecommendation[],
    marketData: any
  ): Promise<StrategyRecommendation[]> {
    // In a real implementation, this would adjust recommendations based on:
    // - VIX levels
    // - Market trend changes
    // - Earnings announcements
    // - Economic events
    // - Sector rotation
    
    return recommendations.map(rec => ({
      ...rec,
      overallScore: rec.overallScore * this.getMarketConditionMultiplier(marketData)
    }));
  }

  private getMarketConditionMultiplier(marketData: any): number {
    // Simplified market condition adjustment
    // In production, this would analyze comprehensive market data
    return 1.0;
  }
}

// Export singleton instance
export const strikeRecommendationEngine = new StrikeRecommendationEngine();