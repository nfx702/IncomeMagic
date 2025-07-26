/**
 * Sentiment Analysis Service for Market Sentiment Analysis
 * Provides comprehensive sentiment analysis from multiple sources to complement technical and ML analysis
 */

export interface SentimentSource {
  name: string;
  score: number; // -1 (very bearish) to +1 (very bullish)
  confidence: number; // 0 to 1
  details: string;
  lastUpdated: Date;
}

export interface MarketSentiment {
  symbol: string;
  overallScore: number; // -1 to +1
  overallConfidence: number; // 0 to 1
  sentiment: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  sources: {
    news: SentimentSource;
    socialMedia: SentimentSource;
    technical: SentimentSource;
    optionsFlow: SentimentSource;
  };
  lastAnalyzed: Date;
}

/**
 * News Sentiment Analyzer
 * Simulates sentiment analysis from financial news sources
 */
class NewsSentimentAnalyzer {
  private newsDatabase: Map<string, Array<{ headline: string; sentiment: number; source: string; date: Date }>> = new Map();

  constructor() {
    this.initializeMockNews();
  }

  private initializeMockNews(): void {
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ'];
    
    symbols.forEach(symbol => {
      const articles = this.generateMockNews(symbol);
      this.newsDatabase.set(symbol, articles);
    });
  }

  private generateMockNews(symbol: string): Array<{ headline: string; sentiment: number; source: string; date: Date }> {
    const newsTemplates = [
      { template: "{symbol} reports strong quarterly earnings, beating expectations", sentiment: 0.7 },
      { template: "{symbol} announces new product launch with innovative features", sentiment: 0.6 },
      { template: "Analysts upgrade {symbol} price target amid positive outlook", sentiment: 0.8 },
      { template: "{symbol} faces regulatory scrutiny over new policies", sentiment: -0.4 },
      { template: "Market volatility impacts {symbol} trading as investors remain cautious", sentiment: -0.3 },
      { template: "{symbol} CEO discusses expansion plans in recent interview", sentiment: 0.5 },
      { template: "Institutional investors increase {symbol} holdings in Q3", sentiment: 0.6 },
      { template: "{symbol} stock experiences profit-taking after recent rally", sentiment: -0.2 },
      { template: "Technical analysis suggests {symbol} forming bullish pattern", sentiment: 0.4 },
      { template: "{symbol} dividend announcement pleases income-focused investors", sentiment: 0.5 },
    ];

    const sources = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance', 'Financial Times'];
    const articles = [];

    for (let i = 0; i < 8; i++) {
      const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const daysAgo = Math.floor(Math.random() * 7);
      
      articles.push({
        headline: template.template.replace('{symbol}', symbol),
        sentiment: template.sentiment + (Math.random() - 0.5) * 0.3, // Add some variance
        source,
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      });
    }

    return articles;
  }

  async analyzeNewsSentiment(symbol: string): Promise<SentimentSource> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const articles = this.newsDatabase.get(symbol) || [];
    
    if (articles.length === 0) {
      return {
        name: 'News Sentiment',
        score: 0,
        confidence: 0.3,
        details: 'Limited news coverage available',
        lastUpdated: new Date()
      };
    }

    // Weight recent news more heavily
    const now = Date.now();
    let weightedScore = 0;
    let totalWeight = 0;

    articles.forEach(article => {
      const daysOld = (now - article.date.getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-daysOld / 3); // Exponential decay over 3 days
      
      weightedScore += article.sentiment * weight;
      totalWeight += weight;
    });

    const avgSentiment = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const confidence = Math.min(0.9, 0.4 + (articles.length / 20)); // More articles = higher confidence

    // Get most relevant recent headlines
    const recentArticles = articles
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);
    
    const details = `Recent headlines: ${recentArticles.map(a => `"${a.headline}" (${a.source})`).join('; ')}`;

    return {
      name: 'News Sentiment',
      score: Math.max(-1, Math.min(1, avgSentiment)),
      confidence,
      details,
      lastUpdated: new Date()
    };
  }
}

/**
 * Social Media Sentiment Analyzer
 * Simulates sentiment analysis from Twitter, Reddit, and other social platforms
 */
class SocialMediaSentimentAnalyzer {
  private socialData: Map<string, Array<{ platform: string; mentions: number; sentiment: number; engagement: number }>> = new Map();

  constructor() {
    this.initializeMockSocialData();
  }

  private initializeMockSocialData(): void {
    const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ'];
    
    symbols.forEach(symbol => {
      const platforms = [
        { name: 'Twitter', baseVolume: 1000, volatility: 0.8 },
        { name: 'Reddit', baseVolume: 500, volatility: 0.6 },
        { name: 'StockTwits', baseVolume: 300, volatility: 0.9 },
        { name: 'Discord', baseVolume: 200, volatility: 0.4 }
      ];

      const data = platforms.map(platform => ({
        platform: platform.name,
        mentions: Math.floor(platform.baseVolume * (0.5 + Math.random())),
        sentiment: (Math.random() - 0.5) * 2 * platform.volatility,
        engagement: Math.random() * 100
      }));

      this.socialData.set(symbol, data);
    });
  }

  async analyzeSocialSentiment(symbol: string): Promise<SentimentSource> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    const platformData = this.socialData.get(symbol) || [];
    
    if (platformData.length === 0) {
      return {
        name: 'Social Media Sentiment',
        score: 0,
        confidence: 0.2,
        details: 'Limited social media data available',
        lastUpdated: new Date()
      };
    }

    // Weight by engagement and mention volume
    let weightedScore = 0;
    let totalWeight = 0;
    let totalMentions = 0;

    platformData.forEach(data => {
      const weight = Math.sqrt(data.mentions) * (1 + data.engagement / 100);
      weightedScore += data.sentiment * weight;
      totalWeight += weight;
      totalMentions += data.mentions;
    });

    const avgSentiment = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    // Confidence based on volume and engagement
    const volumeConfidence = Math.min(0.8, totalMentions / 2000);
    const engagementConfidence = platformData.reduce((sum, d) => sum + d.engagement, 0) / (platformData.length * 100);
    const confidence = Math.max(0.3, (volumeConfidence + engagementConfidence) / 2);

    const topPlatforms = platformData
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 2);
    
    const details = `${totalMentions} mentions across platforms. Top sources: ${topPlatforms.map(p => `${p.platform} (${p.mentions} mentions, ${(p.sentiment > 0 ? '+' : '')}${(p.sentiment * 100).toFixed(0)}% sentiment)`).join(', ')}`;

    return {
      name: 'Social Media Sentiment',
      score: Math.max(-1, Math.min(1, avgSentiment)),
      confidence,
      details,
      lastUpdated: new Date()
    };
  }
}

/**
 * Technical Analysis Sentiment Analyzer
 * Analyzes technical indicators to determine market sentiment
 */
class TechnicalSentimentAnalyzer {
  private generateMockTechnicalData(symbol: string) {
    // Simulate technical indicators
    const rsi = 30 + Math.random() * 40; // RSI between 30-70
    const macdSignal = (Math.random() - 0.5) * 2; // MACD signal
    const sma20 = 100 + Math.random() * 50;
    const sma50 = sma20 + (Math.random() - 0.5) * 10;
    const currentPrice = sma20 + (Math.random() - 0.5) * 20;
    const volume = Math.random() * 2; // Volume relative to average
    
    return {
      rsi,
      macdSignal,
      sma20,
      sma50,
      currentPrice,
      relativeVolume: volume,
      bollingerPosition: Math.random() // Position within Bollinger Bands (0-1)
    };
  }

  async analyzeTechnicalSentiment(symbol: string): Promise<SentimentSource> {
    // Simulate calculation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const indicators = this.generateMockTechnicalData(symbol);
    
    let sentimentScore = 0;
    let signalCount = 0;
    const signals: string[] = [];

    // RSI Analysis
    if (indicators.rsi < 30) {
      sentimentScore += 0.6; // Oversold, bullish
      signals.push(`RSI oversold (${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 70) {
      sentimentScore -= 0.6; // Overbought, bearish
      signals.push(`RSI overbought (${indicators.rsi.toFixed(1)})`);
    } else {
      sentimentScore += (50 - indicators.rsi) / 50 * 0.3; // Neutral zone
      signals.push(`RSI neutral (${indicators.rsi.toFixed(1)})`);
    }
    signalCount++;

    // MACD Analysis
    if (indicators.macdSignal > 0.5) {
      sentimentScore += 0.4;
      signals.push('MACD bullish crossover');
    } else if (indicators.macdSignal < -0.5) {
      sentimentScore -= 0.4;
      signals.push('MACD bearish crossover');
    } else {
      signals.push('MACD neutral');
    }
    signalCount++;

    // Moving Average Analysis
    if (indicators.currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
      sentimentScore += 0.5;
      signals.push('Price above rising MAs');
    } else if (indicators.currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
      sentimentScore -= 0.5;
      signals.push('Price below falling MAs');
    } else {
      signals.push('Mixed MA signals');
    }
    signalCount++;

    // Volume Analysis
    if (indicators.relativeVolume > 1.5) {
      sentimentScore += sentimentScore > 0 ? 0.2 : -0.2; // Amplify existing sentiment
      signals.push(`High volume (${(indicators.relativeVolume * 100).toFixed(0)}% of avg)`);
    } else if (indicators.relativeVolume < 0.7) {
      sentimentScore *= 0.8; // Reduce confidence on low volume
      signals.push('Low volume');
    }

    // Bollinger Bands
    if (indicators.bollingerPosition < 0.2) {
      sentimentScore += 0.3;
      signals.push('Near lower Bollinger Band');
    } else if (indicators.bollingerPosition > 0.8) {
      sentimentScore -= 0.3;
      signals.push('Near upper Bollinger Band');
    }

    const avgSentiment = sentimentScore / signalCount;
    const confidence = 0.6 + (indicators.relativeVolume > 1 ? 0.2 : 0); // Higher confidence with volume

    return {
      name: 'Technical Analysis',
      score: Math.max(-1, Math.min(1, avgSentiment)),
      confidence: Math.min(0.9, confidence),
      details: `Technical signals: ${signals.join(', ')}`,
      lastUpdated: new Date()
    };
  }
}

/**
 * Options Flow Sentiment Analyzer
 * Analyzes options activity to gauge market sentiment
 */
class OptionsFlowSentimentAnalyzer {
  private generateMockOptionsData(symbol: string) {
    const putVolume = Math.floor(1000 + Math.random() * 5000);
    const callVolume = Math.floor(1000 + Math.random() * 5000);
    const putCallRatio = putVolume / callVolume;
    
    const unusualActivity = Math.random() > 0.7;
    const largeBlockTrades = Math.floor(Math.random() * 20);
    
    // Options Greeks simulation
    const avgCallDelta = 0.3 + Math.random() * 0.4;
    const avgPutDelta = -(0.3 + Math.random() * 0.4);
    const impliedVolatility = 0.15 + Math.random() * 0.25;
    
    return {
      putVolume,
      callVolume,
      putCallRatio,
      unusualActivity,
      largeBlockTrades,
      avgCallDelta,
      avgPutDelta,
      impliedVolatility,
      netGamma: (Math.random() - 0.5) * 1000,
      darkPoolActivity: Math.random() * 0.4 // Percentage of total volume
    };
  }

  async analyzeOptionsFlow(symbol: string): Promise<SentimentSource> {
    // Simulate options data processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const options = this.generateMockOptionsData(symbol);
    
    let sentimentScore = 0;
    const signals: string[] = [];

    // Put/Call Ratio Analysis
    if (options.putCallRatio > 1.2) {
      sentimentScore -= 0.6; // High put/call ratio is bearish
      signals.push(`High put/call ratio (${options.putCallRatio.toFixed(2)})`);
    } else if (options.putCallRatio < 0.8) {
      sentimentScore += 0.5; // Low put/call ratio is bullish
      signals.push(`Low put/call ratio (${options.putCallRatio.toFixed(2)})`);
    } else {
      signals.push(`Neutral put/call ratio (${options.putCallRatio.toFixed(2)})`);
    }

    // Unusual Activity
    if (options.unusualActivity) {
      sentimentScore += sentimentScore > 0 ? 0.3 : -0.3; // Amplify existing sentiment
      signals.push('Unusual options activity detected');
    }

    // Large Block Trades
    if (options.largeBlockTrades > 10) {
      sentimentScore += 0.2;
      signals.push(`${options.largeBlockTrades} large block trades`);
    }

    // Implied Volatility
    if (options.impliedVolatility > 0.35) {
      sentimentScore -= 0.2; // High IV suggests fear
      signals.push(`High implied volatility (${(options.impliedVolatility * 100).toFixed(1)}%)`);
    } else if (options.impliedVolatility < 0.2) {
      sentimentScore += 0.2; // Low IV suggests complacency
      signals.push(`Low implied volatility (${(options.impliedVolatility * 100).toFixed(1)}%)`);
    }

    // Gamma Analysis
    if (Math.abs(options.netGamma) > 500) {
      const gammaDirection = options.netGamma > 0 ? 'positive' : 'negative';
      signals.push(`Strong ${gammaDirection} gamma exposure`);
      sentimentScore += options.netGamma > 0 ? 0.2 : -0.2;
    }

    // Dark Pool Activity
    if (options.darkPoolActivity > 0.3) {
      signals.push(`High dark pool activity (${(options.darkPoolActivity * 100).toFixed(1)}%)`);
      sentimentScore -= 0.1; // Dark pool activity can be bearish
    }

    const totalVolume = options.putVolume + options.callVolume;
    const confidence = Math.min(0.85, 0.4 + Math.sqrt(totalVolume) / 200);

    const details = `Options flow: ${totalVolume.toLocaleString()} contracts. ${signals.join(', ')}`;

    return {
      name: 'Options Flow',
      score: Math.max(-1, Math.min(1, sentimentScore)),
      confidence,
      details,
      lastUpdated: new Date()
    };
  }
}

/**
 * Main Sentiment Analysis Service
 */
export class SentimentAnalysisService {
  private newsAnalyzer: NewsSentimentAnalyzer;
  private socialAnalyzer: SocialMediaSentimentAnalyzer;
  private technicalAnalyzer: TechnicalSentimentAnalyzer;
  private optionsAnalyzer: OptionsFlowSentimentAnalyzer;
  private sentimentCache: Map<string, { sentiment: MarketSentiment; expiry: number }> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.newsAnalyzer = new NewsSentimentAnalyzer();
    this.socialAnalyzer = new SocialMediaSentimentAnalyzer();
    this.technicalAnalyzer = new TechnicalSentimentAnalyzer();
    this.optionsAnalyzer = new OptionsFlowSentimentAnalyzer();
  }

  /**
   * Analyze comprehensive market sentiment for a symbol
   */
  async analyzeSentiment(symbol: string): Promise<MarketSentiment> {
    // Check cache first
    const cached = this.sentimentCache.get(symbol);
    if (cached && cached.expiry > Date.now()) {
      console.log(`Returning cached sentiment for ${symbol}`);
      return cached.sentiment;
    }

    console.log(`Starting comprehensive sentiment analysis for ${symbol}...`);

    // Run all analyses in parallel
    const [news, social, technical, options] = await Promise.all([
      this.newsAnalyzer.analyzeNewsSentiment(symbol),
      this.socialAnalyzer.analyzeSocialSentiment(symbol),
      this.technicalAnalyzer.analyzeTechnicalSentiment(symbol),
      this.optionsAnalyzer.analyzeOptionsFlow(symbol)
    ]);

    // Calculate weighted overall sentiment
    const sources = { news, socialMedia: social, technical, optionsFlow: options };
    const weights = {
      news: 0.25,
      socialMedia: 0.20,
      technical: 0.35,
      optionsFlow: 0.20
    };

    let weightedScore = 0;
    let totalConfidenceWeight = 0;

    Object.entries(sources).forEach(([key, source]) => {
      const weight = weights[key as keyof typeof weights];
      const confidenceWeight = weight * source.confidence;
      
      weightedScore += source.score * confidenceWeight;
      totalConfidenceWeight += confidenceWeight;
    });

    const overallScore = totalConfidenceWeight > 0 ? weightedScore / totalConfidenceWeight : 0;
    const overallConfidence = totalConfidenceWeight / Object.values(weights).reduce((sum, w) => sum + w, 0);

    // Determine sentiment category
    let sentiment: MarketSentiment['sentiment'];
    if (overallScore >= 0.5) sentiment = 'very_bullish';
    else if (overallScore >= 0.2) sentiment = 'bullish';
    else if (overallScore <= -0.5) sentiment = 'very_bearish';
    else if (overallScore <= -0.2) sentiment = 'bearish';
    else sentiment = 'neutral';

    const marketSentiment: MarketSentiment = {
      symbol,
      overallScore,
      overallConfidence,
      sentiment,
      sources,
      lastAnalyzed: new Date()
    };

    // Cache the result
    this.sentimentCache.set(symbol, {
      sentiment: marketSentiment,
      expiry: Date.now() + this.CACHE_DURATION
    });

    console.log(`Sentiment analysis completed for ${symbol}: ${sentiment} (${(overallScore * 100).toFixed(1)}%)`);

    return marketSentiment;
  }

  /**
   * Get sentiment for multiple symbols
   */
  async analyzeBatchSentiment(symbols: string[]): Promise<Map<string, MarketSentiment>> {
    console.log(`Analyzing sentiment for ${symbols.length} symbols...`);
    
    const results = new Map<string, MarketSentiment>();
    
    // Process in batches to avoid overwhelming APIs
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => this.analyzeSentiment(symbol));
      const batchResults = await Promise.all(batchPromises);
      
      batch.forEach((symbol, index) => {
        results.set(symbol, batchResults[index]);
      });
      
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Get market-wide sentiment overview
   */
  async getMarketOverview(symbols: string[] = ['SPY', 'QQQ', 'IWM']): Promise<{
    overallSentiment: number;
    sentimentDistribution: Record<MarketSentiment['sentiment'], number>;
    topBullish: { symbol: string; score: number }[];
    topBearish: { symbol: string; score: number }[];
  }> {
    const sentiments = await this.analyzeBatchSentiment(symbols);
    
    let totalScore = 0;
    const distribution: Record<MarketSentiment['sentiment'], number> = {
      very_bearish: 0,
      bearish: 0,
      neutral: 0,
      bullish: 0,
      very_bullish: 0
    };

    const scores: { symbol: string; score: number }[] = [];

    sentiments.forEach((sentiment, symbol) => {
      totalScore += sentiment.overallScore;
      distribution[sentiment.sentiment]++;
      scores.push({ symbol, score: sentiment.overallScore });
    });

    const overallSentiment = totalScore / sentiments.size;
    
    scores.sort((a, b) => b.score - a.score);
    const topBullish = scores.slice(0, Math.min(5, scores.length));
    const topBearish = scores.slice(-Math.min(5, scores.length)).reverse();

    return {
      overallSentiment,
      sentimentDistribution: distribution,
      topBullish,
      topBearish
    };
  }

  /**
   * Clear sentiment cache
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.sentimentCache.delete(symbol);
    } else {
      this.sentimentCache.clear();
    }
  }

  /**
   * Get sentiment classification from score
   */
  static getSentimentLabel(score: number): MarketSentiment['sentiment'] {
    if (score >= 0.5) return 'very_bullish';
    if (score >= 0.2) return 'bullish';
    if (score <= -0.5) return 'very_bearish';
    if (score <= -0.2) return 'bearish';
    return 'neutral';
  }

  /**
   * Get sentiment color for UI
   */
  static getSentimentColor(sentiment: MarketSentiment['sentiment']): string {
    const colors = {
      very_bullish: '#10B981', // Green
      bullish: '#34D399',      // Light Green
      neutral: '#6B7280',      // Gray
      bearish: '#F87171',      // Light Red
      very_bearish: '#EF4444'  // Red
    };
    return colors[sentiment];
  }
}

// Export singleton instance
export const sentimentService = new SentimentAnalysisService();