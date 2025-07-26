import { 
  TradingViewIdea, 
  TechnicalSetup, 
  VolatilityData, 
  OptionsFlow, 
  SocialSentiment 
} from '@/types/trade';
import { v4 as uuidv4 } from 'uuid';

export class TradingViewIdeasService {
  private ideas: Map<string, TradingViewIdea[]> = new Map();
  private lastUpdate: Map<string, Date> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Generate TradingView-style trade ideas for given symbols
   */
  async generateIdeas(symbols: string[]): Promise<TradingViewIdea[]> {
    const allIdeas: TradingViewIdea[] = [];

    for (const symbol of symbols) {
      // Check cache first
      if (this.isCacheValid(symbol)) {
        const cachedIdeas = this.ideas.get(symbol) || [];
        allIdeas.push(...cachedIdeas);
        continue;
      }

      // Generate fresh ideas for this symbol
      const symbolIdeas = await this.generateSymbolIdeas(symbol);
      this.ideas.set(symbol, symbolIdeas);
      this.lastUpdate.set(symbol, new Date());
      allIdeas.push(...symbolIdeas);
    }

    // Sort by confidence and wheel alignment
    return allIdeas.sort((a, b) => {
      const scoreA = (a.confidence * 0.6) + (a.wheelAlignment * 0.4);
      const scoreB = (b.confidence * 0.6) + (b.wheelAlignment * 0.4);
      return scoreB - scoreA;
    });
  }

  /**
   * Generate ideas for a specific symbol
   */
  private async generateSymbolIdeas(symbol: string): Promise<TradingViewIdea[]> {
    const ideas: TradingViewIdea[] = [];
    const currentPrice = this.generateMockPrice(symbol);
    
    // Generate different types of ideas
    ideas.push(...this.generateTechnicalIdeas(symbol, currentPrice));
    ideas.push(...this.generateVolatilityIdeas(symbol, currentPrice));
    ideas.push(...this.generateEarningsIdeas(symbol, currentPrice));
    ideas.push(...this.generateMomentumIdeas(symbol, currentPrice));
    ideas.push(...this.generateIncomeIdeas(symbol, currentPrice));

    return ideas.filter(idea => idea.wheelAlignment >= 0.5); // Only return wheel-friendly ideas
  }

  /**
   * Generate technical analysis based ideas
   */
  private generateTechnicalIdeas(symbol: string, currentPrice: number): TradingViewIdea[] {
    const ideas: TradingViewIdea[] = [];

    // Support/Resistance Play
    const supportLevel = currentPrice * 0.95;
    const resistanceLevel = currentPrice * 1.05;
    
    ideas.push({
      id: uuidv4(),
      symbol,
      title: `${symbol} - Support Level Bounce Play`,
      category: 'technical',
      description: `${symbol} is approaching a key support level at $${supportLevel.toFixed(2)}. Historical data shows strong buying interest at this level, making it an attractive entry point for cash-secured puts.`,
      technicalSetup: {
        type: 'support_resistance',
        description: `Strong support at $${supportLevel.toFixed(2)} with 3 previous bounces`,
        keyLevels: {
          support: supportLevel,
          resistance: resistanceLevel
        },
        timeframe: '1D',
        strength: 0.75
      },
      volatilityData: this.generateVolatilityData(symbol),
      riskRewardRatio: 3.2,
      maxRisk: currentPrice * 0.05,
      expectedReturn: currentPrice * 0.15,
      timeHorizon: '2-4 weeks',
      difficulty: 'beginner',
      wheelAlignment: 0.85,
      tags: ['support', 'technical-analysis', 'cash-secured-puts', 'income'],
      createdAt: new Date(),
      updatedAt: new Date(),
      confidence: 0.78,
      author: 'AI Analysis',
      riskWarning: 'Support levels can break. Always use proper position sizing and have an exit plan.',
      educationalNote: 'Support levels represent areas where buying interest has historically emerged. This makes them excellent areas to sell cash-secured puts as part of a wheel strategy.'
    });

    // Breakout Setup
    const breakoutLevel = currentPrice * 1.03;
    
    ideas.push({
      id: uuidv4(),
      symbol,
      title: `${symbol} - Consolidation Breakout Setup`,
      category: 'technical',
      description: `${symbol} has been consolidating for several weeks. A breakout above $${breakoutLevel.toFixed(2)} could trigger significant upward momentum, creating opportunities for covered calls.`,
      technicalSetup: {
        type: 'breakout',
        description: `Consolidation pattern with breakout level at $${breakoutLevel.toFixed(2)}`,
        keyLevels: {
          breakoutLevel,
          support: currentPrice * 0.97,
          resistance: breakoutLevel
        },
        timeframe: '1W',
        strength: 0.68
      },
      volatilityData: this.generateVolatilityData(symbol),
      riskRewardRatio: 2.8,
      maxRisk: currentPrice * 0.03,
      expectedReturn: currentPrice * 0.08,
      timeHorizon: '1-2 weeks',
      difficulty: 'intermediate',
      wheelAlignment: 0.72,
      tags: ['breakout', 'consolidation', 'covered-calls', 'momentum'],
      createdAt: new Date(),
      updatedAt: new Date(),
      confidence: 0.72,
      author: 'AI Analysis',
      riskWarning: 'Breakouts can fail. Wait for confirmation and proper volume before entering positions.',
      educationalNote: 'Breakout setups can provide excellent opportunities for covered call writing if you already own the underlying stock, or for selling puts on pullbacks.'
    });

    return ideas;
  }

  /**
   * Generate volatility-based ideas
   */
  private generateVolatilityIdeas(symbol: string, currentPrice: number): TradingViewIdea[] {
    const ideas: TradingViewIdea[] = [];
    const volatilityData = this.generateVolatilityData(symbol);

    if (volatilityData.ivRank > 70) {
      // High IV - sell premium
      ideas.push({
        id: uuidv4(),
        symbol,
        title: `${symbol} - High IV Premium Selling Opportunity`,
        category: 'volatility',
        description: `${symbol} shows elevated implied volatility at ${volatilityData.ivRank}th percentile. This creates attractive premium selling opportunities for both puts and calls.`,
        technicalSetup: {
          type: 'consolidation',
          description: 'High implied volatility environment favoring premium sellers',
          keyLevels: {
            support: currentPrice * 0.92,
            resistance: currentPrice * 1.08
          },
          timeframe: '1M',
          strength: 0.80
        },
        volatilityData,
        riskRewardRatio: 4.1,
        maxRisk: currentPrice * 0.08,
        expectedReturn: currentPrice * 0.32,
        timeHorizon: '1-3 months',
        difficulty: 'intermediate',
        wheelAlignment: 0.92,
        tags: ['high-iv', 'premium-selling', 'volatility', 'wheel-strategy'],
        createdAt: new Date(),
        updatedAt: new Date(),
        confidence: 0.85,
        author: 'AI Analysis',
        riskWarning: 'High volatility can lead to significant price movements. Ensure adequate capital for potential assignment.',
        educationalNote: 'High implied volatility periods are ideal for the wheel strategy as they provide higher premiums for both put and call options.'
      });
    }

    if (volatilityData.trend === 'contracting') {
      // Low IV - buy premium
      ideas.push({
        id: uuidv4(),
        symbol,
        title: `${symbol} - Volatility Expansion Play`,
        category: 'volatility',
        description: `${symbol} shows contracting volatility patterns. Historical analysis suggests potential for volatility expansion, creating opportunities for strategic option positioning.`,
        technicalSetup: {
          type: 'consolidation',
          description: 'Volatility contraction often precedes significant moves',
          keyLevels: {
            support: currentPrice * 0.94,
            resistance: currentPrice * 1.06
          },
          timeframe: '1M',
          strength: 0.65
        },
        volatilityData,
        riskRewardRatio: 2.5,
        maxRisk: currentPrice * 0.06,
        expectedReturn: currentPrice * 0.15,
        timeHorizon: '2-4 weeks',
        difficulty: 'advanced',
        wheelAlignment: 0.68,
        tags: ['volatility-expansion', 'consolidation', 'options-strategy'],
        createdAt: new Date(),
        updatedAt: new Date(),
        confidence: 0.68,
        author: 'AI Analysis',
        riskWarning: 'Volatility timing is difficult. Volatility can remain low longer than expected.',
        educationalNote: 'Volatility patterns can provide insights into future price movements and option premium opportunities.'
      });
    }

    return ideas;
  }

  /**
   * Generate earnings-related ideas
   */
  private generateEarningsIdeas(symbol: string, currentPrice: number): TradingViewIdea[] {
    const ideas: TradingViewIdea[] = [];
    const earningsDate = this.getNextEarningsDate();
    const daysToEarnings = Math.ceil((earningsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysToEarnings > 0 && daysToEarnings <= 30) {
      ideas.push({
        id: uuidv4(),
        symbol,
        title: `${symbol} - Pre-Earnings Premium Collection`,
        category: 'earnings',
        description: `${symbol} reports earnings in ${daysToEarnings} days. Elevated option premiums provide opportunities for income generation through strategic put selling.`,
        technicalSetup: {
          type: 'consolidation',
          description: `Pre-earnings setup with ${daysToEarnings} days until announcement`,
          keyLevels: {
            support: currentPrice * 0.90,
            resistance: currentPrice * 1.10
          },
          timeframe: '1M',
          strength: 0.70
        },
        volatilityData: this.generateVolatilityData(symbol, true), // Higher IV for earnings
        riskRewardRatio: 3.5,
        maxRisk: currentPrice * 0.10,
        expectedReturn: currentPrice * 0.35,
        timeHorizon: '1-2 weeks',
        difficulty: 'intermediate',
        wheelAlignment: 0.78,
        tags: ['earnings', 'premium-collection', 'high-iv', 'income'],
        createdAt: new Date(),
        updatedAt: new Date(),
        confidence: 0.75,
        author: 'AI Analysis',
        riskWarning: 'Earnings can cause significant price volatility. Be prepared for potential assignment and have adequate capital.',
        educationalNote: 'Pre-earnings periods often show elevated option premiums due to uncertainty. This can be advantageous for premium sellers using proper risk management.'
      });
    }

    return ideas;
  }

  /**
   * Generate momentum-based ideas
   */
  private generateMomentumIdeas(symbol: string, currentPrice: number): TradingViewIdea[] {
    const ideas: TradingViewIdea[] = [];
    const socialSentiment = this.generateSocialSentiment(symbol);

    if (socialSentiment.trendingScore > 70) {
      ideas.push({
        id: uuidv4(),
        symbol,
        title: `${symbol} - Social Momentum Opportunity`,
        category: 'momentum',
        description: `${symbol} is trending on social media with ${socialSentiment.mentions} mentions and ${(socialSentiment.positiveRatio * 100).toFixed(0)}% positive sentiment. This momentum can create opportunities for strategic positioning.`,
        technicalSetup: {
          type: 'continuation',
          description: 'Strong social momentum supporting price action',
          keyLevels: {
            support: currentPrice * 0.93,
            resistance: currentPrice * 1.07
          },
          timeframe: '1W',
          strength: 0.72
        },
        volatilityData: this.generateVolatilityData(symbol),
        socialSentiment,
        riskRewardRatio: 2.8,
        maxRisk: currentPrice * 0.07,
        expectedReturn: currentPrice * 0.20,
        timeHorizon: '1-2 weeks',
        difficulty: 'intermediate',
        wheelAlignment: 0.65,
        tags: ['social-momentum', 'trending', 'sentiment', 'short-term'],
        createdAt: new Date(),
        updatedAt: new Date(),
        confidence: 0.70,
        author: 'AI Analysis',
        riskWarning: 'Social momentum can be fleeting and lead to increased volatility. Use appropriate position sizing.',
        educationalNote: 'Social sentiment can influence short-term price movements, but should be combined with technical and fundamental analysis for wheel strategy decisions.'
      });
    }

    return ideas;
  }

  /**
   * Generate income-focused ideas (most aligned with wheel strategy)
   */
  private generateIncomeIdeas(symbol: string, currentPrice: number): TradingViewIdea[] {
    const ideas: TradingViewIdea[] = [];

    // Classic wheel setup
    ideas.push({
      id: uuidv4(),
      symbol,
      title: `${symbol} - Classic Wheel Strategy Setup`,
      category: 'income',
      description: `${symbol} presents an ideal wheel strategy opportunity with strong support levels, reasonable volatility, and attractive option premiums for consistent income generation.`,
      technicalSetup: {
        type: 'support_resistance',
        description: 'Stable price action with clear support/resistance levels',
        keyLevels: {
          support: currentPrice * 0.92,
          resistance: currentPrice * 1.08
        },
        timeframe: '1M',
        strength: 0.82
      },
      volatilityData: this.generateVolatilityData(symbol),
      optionsFlow: this.generateOptionsFlow(symbol),
      riskRewardRatio: 5.2,
      maxRisk: currentPrice * 0.08,
      expectedReturn: currentPrice * 0.42,
      timeHorizon: '1-3 months',
      difficulty: 'beginner',
      wheelAlignment: 0.95,
      tags: ['wheel-strategy', 'income', 'conservative', 'cash-secured-puts'],
      createdAt: new Date(),
      updatedAt: new Date(),
      confidence: 0.88,
      author: 'AI Analysis',
      riskWarning: 'Wheel strategy requires adequate capital for potential stock assignment. Ensure you can hold the underlying if assigned.',
      educationalNote: 'The wheel strategy combines cash-secured puts and covered calls to generate consistent income while potentially acquiring quality stocks at attractive prices.'
    });

    return ideas;
  }

  /**
   * Generate mock volatility data
   */
  private generateVolatilityData(symbol: string, earningsBoost: boolean = false): VolatilityData {
    const baseIV = 0.25 + Math.random() * 0.30;
    const impliedVolatility = earningsBoost ? baseIV * 1.5 : baseIV;
    const historicalVolatility = impliedVolatility * (0.8 + Math.random() * 0.4);
    
    return {
      impliedVolatility,
      historicalVolatility,
      ivRank: Math.floor(Math.random() * 100),
      ivPercentile: Math.floor(Math.random() * 100),
      trend: ['expanding', 'contracting', 'stable'][Math.floor(Math.random() * 3)] as any
    };
  }

  /**
   * Generate mock social sentiment data
   */
  private generateSocialSentiment(symbol: string): SocialSentiment {
    return {
      mentions: Math.floor(Math.random() * 10000) + 500,
      positiveRatio: 0.3 + Math.random() * 0.4, // 30-70% positive
      trendingScore: Math.floor(Math.random() * 100),
      keyTopics: ['earnings', 'technical-analysis', 'options', 'dividend'].slice(0, Math.floor(Math.random() * 3) + 1),
      influencerBuzz: Math.random() > 0.7
    };
  }

  /**
   * Generate mock options flow data
   */
  private generateOptionsFlow(symbol: string): OptionsFlow {
    return {
      unusualActivity: Math.random() > 0.7,
      largeTradeVolume: Math.floor(Math.random() * 100000) + 10000,
      putCallRatio: 0.5 + Math.random() * 1.0, // 0.5 to 1.5
      openInterest: Math.floor(Math.random() * 50000) + 5000,
      sentiment: ['bullish', 'bearish', 'neutral'][Math.floor(Math.random() * 3)] as any,
      flowDescription: 'Large institutional flow detected in weekly options'
    };
  }

  /**
   * Generate mock price for calculations
   */
  private generateMockPrice(symbol: string): number {
    // Hash symbol to get consistent price
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
      const char = symbol.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Generate price between $50-$300 based on symbol hash
    return 50 + Math.abs(hash % 250);
  }

  /**
   * Get next earnings date (mock)
   */
  private getNextEarningsDate(): Date {
    const today = new Date();
    const daysAhead = Math.floor(Math.random() * 45) + 5; // 5-50 days ahead
    return new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  }

  /**
   * Check if cache is valid for symbol
   */
  private isCacheValid(symbol: string): boolean {
    const lastUpdate = this.lastUpdate.get(symbol);
    if (!lastUpdate) return false;
    
    const now = new Date();
    return (now.getTime() - lastUpdate.getTime()) < this.CACHE_DURATION;
  }

  /**
   * Filter ideas by category
   */
  filterByCategory(ideas: TradingViewIdea[], category: string): TradingViewIdea[] {
    if (category === 'all') return ideas;
    return ideas.filter(idea => idea.category === category);
  }

  /**
   * Filter ideas by difficulty
   */
  filterByDifficulty(ideas: TradingViewIdea[], difficulty: string): TradingViewIdea[] {
    if (difficulty === 'all') return ideas;
    return ideas.filter(idea => idea.difficulty === difficulty);
  }

  /**
   * Filter ideas by wheel alignment threshold
   */
  filterByWheelAlignment(ideas: TradingViewIdea[], minAlignment: number = 0.5): TradingViewIdea[] {
    return ideas.filter(idea => idea.wheelAlignment >= minAlignment);
  }

  /**
   * Get top ideas by confidence
   */
  getTopIdeas(ideas: TradingViewIdea[], count: number = 5): TradingViewIdea[] {
    return ideas
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count);
  }

  /**
   * Get ideas by time horizon
   */
  filterByTimeHorizon(ideas: TradingViewIdea[], timeHorizon: string): TradingViewIdea[] {
    if (timeHorizon === 'all') return ideas;
    return ideas.filter(idea => idea.timeHorizon === timeHorizon);
  }
}

// Export singleton instance
export const tradingViewIdeasService = new TradingViewIdeasService();