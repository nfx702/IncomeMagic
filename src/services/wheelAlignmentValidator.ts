import { TradingViewIdea, TechnicalSetup, VolatilityData } from '@/types/trade';

export interface ValidationResult {
  score: number; // 0-1
  isAligned: boolean;
  reasons: string[];
  warnings: string[];
  recommendations: string[];
}

export class WheelAlignmentValidator {
  
  /**
   * Validate if a trading idea aligns with conservative wheel strategy principles
   */
  validateIdea(idea: TradingViewIdea): ValidationResult {
    const validations = [
      this.validateCategory(idea),
      this.validateTechnicalSetup(idea.technicalSetup),
      this.validateVolatility(idea.volatilityData),
      this.validateRiskReward(idea),
      this.validateTimeHorizon(idea.timeHorizon),
      this.validateDifficulty(idea.difficulty),
      this.validatePremiumPotential(idea)
    ];

    const totalScore = validations.reduce((sum, v) => sum + v.score, 0) / validations.length;
    const allReasons = validations.flatMap(v => v.reasons);
    const allWarnings = validations.flatMap(v => v.warnings);
    const allRecommendations = validations.flatMap(v => v.recommendations);

    // Additional wheel-specific validations
    const wheelSpecific = this.validateWheelSpecificCriteria(idea);
    
    const finalScore = (totalScore + wheelSpecific.score) / 2;
    
    return {
      score: Math.round(finalScore * 100) / 100,
      isAligned: finalScore >= 0.6, // 60% threshold for wheel alignment
      reasons: [...allReasons, ...wheelSpecific.reasons],
      warnings: [...allWarnings, ...wheelSpecific.warnings],
      recommendations: [...allRecommendations, ...wheelSpecific.recommendations]
    };
  }

  /**
   * Validate idea category alignment with wheel strategy
   */
  private validateCategory(idea: TradingViewIdea): ValidationResult {
    const categoryScores: Record<string, number> = {
      income: 1.0,      // Perfect alignment
      technical: 0.8,   // Good alignment with proper setup
      volatility: 0.7,  // Can be good for premium selling
      momentum: 0.5,    // Moderate alignment, requires caution
      earnings: 0.6,    // Can work but requires experience
      value: 0.65       // Value investing can complement wheel strategy
    };

    const score = categoryScores[idea.category] || 0.3;
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (idea.category === 'income') {
      reasons.push('Income-focused strategy aligns perfectly with wheel objectives');
    } else if (idea.category === 'technical') {
      reasons.push('Technical analysis provides good foundation for wheel entries');
      recommendations.push('Focus on support/resistance levels for optimal put entry points');
    } else if (idea.category === 'volatility') {
      reasons.push('Volatility awareness important for premium collection');
      warnings.push('High volatility can lead to increased assignment risk');
    } else if (idea.category === 'momentum') {
      warnings.push('Momentum plays can be risky for conservative wheel strategy');
      recommendations.push('Consider waiting for momentum to stabilize before entering positions');
    } else if (idea.category === 'earnings') {
      warnings.push('Earnings plays increase volatility and assignment risk');
      recommendations.push('Only suitable for experienced wheel traders with adequate capital');
    }

    return { score, isAligned: score >= 0.6, reasons, warnings, recommendations };
  }

  /**
   * Validate technical setup for wheel compatibility
   */
  private validateTechnicalSetup(setup: TechnicalSetup): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0.5; // Base score

    // Setup type scoring
    const setupScores: Record<string, number> = {
      'support_resistance': 0.9,  // Ideal for wheel
      'consolidation': 0.8,       // Good for wheel
      'reversal': 0.7,           // Can work with caution
      'continuation': 0.6,        // Moderate alignment
      'breakout': 0.5            // Less ideal for conservative wheel
    };

    const setupScore = setupScores[setup.type] || 0.3;
    score = (score + setupScore) / 2;

    if (setup.type === 'support_resistance') {
      reasons.push('Support/resistance levels provide excellent wheel entry/exit points');
      recommendations.push('Sell puts near support levels and calls near resistance');
    } else if (setup.type === 'consolidation') {
      reasons.push('Consolidation patterns offer stable premium collection opportunities');
    } else if (setup.type === 'breakout') {
      warnings.push('Breakout patterns can lead to rapid price movements');
      recommendations.push('Wait for breakout confirmation and consider wider strikes');
    }

    // Strength assessment
    if (setup.strength >= 0.8) {
      reasons.push('High setup strength increases probability of success');
      score += 0.1;
    } else if (setup.strength < 0.6) {
      warnings.push('Lower setup strength increases uncertainty');
      score -= 0.1;
    }

    // Timeframe assessment
    const timeframeScores: Record<string, number> = {
      '1D': 0.5,   // Too short for wheel
      '1W': 0.7,   // Decent for wheel
      '1M': 0.9,   // Ideal for wheel
      '3M': 0.8    // Good for wheel
    };

    const timeframeScore = timeframeScores[setup.timeframe] || 0.5;
    score = (score + timeframeScore) / 2;

    if (setup.timeframe === '1M' || setup.timeframe === '3M') {
      reasons.push('Longer timeframes align well with wheel strategy patience');
    } else if (setup.timeframe === '1D') {
      warnings.push('Daily timeframes may be too short for wheel strategy');
      recommendations.push('Consider longer timeframes for better wheel alignment');
    }

    return { 
      score: Math.min(1, Math.max(0, score)), 
      isAligned: score >= 0.6, 
      reasons, 
      warnings, 
      recommendations 
    };
  }

  /**
   * Validate volatility data for wheel strategy
   */
  private validateVolatility(volatilityData: VolatilityData): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0.5;

    // IV Rank assessment (sweet spot for wheel is 40-80%)
    if (volatilityData.ivRank >= 40 && volatilityData.ivRank <= 80) {
      reasons.push('IV rank in optimal range for premium selling');
      score += 0.2;
    } else if (volatilityData.ivRank > 80) {
      warnings.push('Very high IV may indicate elevated risk');
      recommendations.push('Consider smaller position sizes due to high volatility');
      score += 0.1; // Still beneficial for premium selling
    } else if (volatilityData.ivRank < 30) {
      warnings.push('Low IV provides lower premium collection opportunities');
      score -= 0.1;
    }

    // Volatility trend assessment
    if (volatilityData.trend === 'contracting') {
      warnings.push('Contracting volatility may lead to lower premiums');
    } else if (volatilityData.trend === 'expanding') {
      reasons.push('Expanding volatility can provide higher premiums');
      score += 0.1;
    } else {
      reasons.push('Stable volatility provides predictable premium environment');
    }

    // IV vs HV comparison
    const ivHvRatio = volatilityData.impliedVolatility / volatilityData.historicalVolatility;
    if (ivHvRatio > 1.2) {
      reasons.push('IV higher than HV suggests good premium selling opportunity');
      score += 0.1;
    } else if (ivHvRatio < 0.8) {
      warnings.push('IV lower than HV may indicate limited premium opportunities');
      score -= 0.1;
    }

    return { 
      score: Math.min(1, Math.max(0, score)), 
      isAligned: score >= 0.5, 
      reasons, 
      warnings, 
      recommendations 
    };
  }

  /**
   * Validate risk/reward characteristics
   */
  private validateRiskReward(idea: TradingViewIdea): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0.5;

    // Risk/Reward ratio assessment (wheel prefers 2:1 to 5:1)
    if (idea.riskRewardRatio >= 2 && idea.riskRewardRatio <= 5) {
      reasons.push('Risk/reward ratio appropriate for wheel strategy');
      score += 0.2;
    } else if (idea.riskRewardRatio > 5) {
      warnings.push('Very high R/R ratio may indicate unrealistic expectations');
      score -= 0.1;
    } else if (idea.riskRewardRatio < 2) {
      warnings.push('Low R/R ratio may not justify the risk for wheel strategy');
      score -= 0.2;
    }

    // Maximum risk assessment (should be reasonable relative to expected return)
    const riskReturnRatio = idea.maxRisk / idea.expectedReturn;
    if (riskReturnRatio <= 0.3) {
      reasons.push('Maximum risk is well-controlled relative to expected return');
      score += 0.1;
    } else if (riskReturnRatio > 0.5) {
      warnings.push('Risk appears high relative to expected return');
      score -= 0.1;
    }

    return { 
      score: Math.min(1, Math.max(0, score)), 
      isAligned: score >= 0.4, 
      reasons, 
      warnings, 
      recommendations 
    };
  }

  /**
   * Validate time horizon for wheel compatibility
   */
  private validateTimeHorizon(timeHorizon: string): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const horizonScores: Record<string, number> = {
      '1-7 days': 0.3,      // Too short for wheel
      '1-2 weeks': 0.6,     // Minimum for wheel
      '2-4 weeks': 0.9,     // Ideal for wheel
      '1-3 months': 0.8     // Good for wheel
    };

    const score = horizonScores[timeHorizon] || 0.5;

    if (timeHorizon === '2-4 weeks') {
      reasons.push('2-4 week timeframe ideal for wheel option cycles');
    } else if (timeHorizon === '1-3 months') {
      reasons.push('Longer timeframes allow for multiple wheel cycles');
    } else if (timeHorizon === '1-7 days') {
      warnings.push('Very short timeframes not suitable for wheel strategy');
      recommendations.push('Consider extending timeframe to at least 2-4 weeks');
    } else if (timeHorizon === '1-2 weeks') {
      warnings.push('Short timeframe provides limited wheel flexibility');
    }

    return { score, isAligned: score >= 0.6, reasons, warnings, recommendations };
  }

  /**
   * Validate difficulty level appropriateness
   */
  private validateDifficulty(difficulty: string): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const difficultyScores: Record<string, number> = {
      'beginner': 0.9,      // Perfect for conservative wheel
      'intermediate': 0.7,   // Good for wheel
      'advanced': 0.5       // Requires experience
    };

    const score = difficultyScores[difficulty] || 0.5;

    if (difficulty === 'beginner') {
      reasons.push('Beginner-friendly strategies align with conservative wheel approach');
    } else if (difficulty === 'intermediate') {
      reasons.push('Intermediate complexity appropriate for wheel strategy');
    } else if (difficulty === 'advanced') {
      warnings.push('Advanced strategies require significant experience');
      recommendations.push('Ensure adequate knowledge and capital before attempting');
    }

    return { score, isAligned: score >= 0.5, reasons, warnings, recommendations };
  }

  /**
   * Validate potential for premium collection
   */
  private validatePremiumPotential(idea: TradingViewIdea): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = 0.5;

    // Expected return as percentage of max risk (wheel targets 10-30% per cycle)
    const returnPercentage = (idea.expectedReturn / idea.maxRisk) * 100;
    
    if (returnPercentage >= 10 && returnPercentage <= 30) {
      reasons.push('Expected return percentage aligns with wheel strategy targets');
      score += 0.2;
    } else if (returnPercentage > 30) {
      warnings.push('Very high return expectations may indicate elevated risk');
      score += 0.1; // Still positive but with caution
    } else if (returnPercentage < 10) {
      warnings.push('Low return percentage may not justify wheel strategy deployment');
      score -= 0.1;
    }

    // Consider if idea mentions premium collection
    if (idea.tags.includes('premium-selling') || 
        idea.tags.includes('cash-secured-puts') || 
        idea.tags.includes('covered-calls')) {
      reasons.push('Explicitly focuses on premium collection strategies');
      score += 0.1;
    }

    return { 
      score: Math.min(1, Math.max(0, score)), 
      isAligned: score >= 0.4, 
      reasons, 
      warnings, 
      recommendations 
    };
  }

  /**
   * Validate wheel-specific criteria
   */
  private validateWheelSpecificCriteria(idea: TradingViewIdea): ValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let score = idea.wheelAlignment; // Start with the idea's self-assessed alignment

    // Check for wheel-friendly tags
    const wheelTags = ['wheel-strategy', 'cash-secured-puts', 'covered-calls', 'income', 'premium-selling'];
    const hasWheelTags = idea.tags.some(tag => wheelTags.includes(tag));
    
    if (hasWheelTags) {
      reasons.push('Explicitly mentions wheel strategy concepts');
      score += 0.1;
    }

    // Confidence level should be reasonable (not too high to be unrealistic)
    if (idea.confidence > 0.9) {
      warnings.push('Very high confidence may indicate overoptimism');
      score -= 0.05;
    } else if (idea.confidence < 0.6) {
      warnings.push('Low confidence may not justify wheel strategy risk');
      score -= 0.1;
    }

    // Check for proper risk warnings and educational content
    if (idea.riskWarning.length > 50) {
      reasons.push('Includes comprehensive risk warning');
      score += 0.05;
    }

    if (idea.educationalNote.length > 50) {
      reasons.push('Provides educational context for decision making');
      score += 0.05;
    }

    // Penalty for unsuitable categories in wheel context
    if (idea.category === 'momentum' && idea.timeHorizon === '1-7 days') {
      warnings.push('Short-term momentum plays conflict with wheel strategy principles');
      score -= 0.2;
    }

    return { 
      score: Math.min(1, Math.max(0, score)), 
      isAligned: score >= 0.6, 
      reasons, 
      warnings, 
      recommendations 
    };
  }

  /**
   * Get validation summary for multiple ideas
   */
  validateIdeas(ideas: TradingViewIdea[]): {
    totalIdeas: number;
    alignedIdeas: number;
    averageScore: number;
    topIdeas: TradingViewIdea[];
    flaggedIdeas: Array<{ idea: TradingViewIdea; validation: ValidationResult }>;
  } {
    const validations = ideas.map(idea => ({
      idea,
      validation: this.validateIdea(idea)
    }));

    const alignedIdeas = validations.filter(v => v.validation.isAligned).length;
    const averageScore = validations.reduce((sum, v) => sum + v.validation.score, 0) / validations.length;
    
    // Top ideas (aligned and high scoring)
    const topIdeas = validations
      .filter(v => v.validation.isAligned && v.validation.score >= 0.8)
      .sort((a, b) => b.validation.score - a.validation.score)
      .slice(0, 5)
      .map(v => v.idea);

    // Flagged ideas (not aligned or have significant warnings)
    const flaggedIdeas = validations
      .filter(v => !v.validation.isAligned || v.validation.warnings.length >= 2)
      .sort((a, b) => a.validation.score - b.validation.score);

    return {
      totalIdeas: ideas.length,
      alignedIdeas,
      averageScore: Math.round(averageScore * 100) / 100,
      topIdeas,
      flaggedIdeas
    };
  }
}

// Export singleton instance
export const wheelAlignmentValidator = new WheelAlignmentValidator();