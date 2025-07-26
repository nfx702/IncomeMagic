/**
 * Unified Market Data Service
 * Orchestrates multiple data sources (Yahoo Finance, Alpaca, IB) 
 * for comprehensive real-time market data
 */

import { YahooFinanceService, RealTimeQuote, OptionsChainData, EarningsData } from './yahooFinanceService';
import { AlpacaService } from './alpacaService';
import { EventEmitter } from 'events';

export interface MarketDataUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  source: 'yahoo' | 'alpaca' | 'ib';
}

export interface OptionsDataUpdate {
  symbol: string;
  optionsChain: OptionsChainData[];
  timestamp: Date;
  source: 'yahoo' | 'ib';
}

export interface MarketDataSubscription {
  symbols: string[];
  interval: number; // milliseconds
  includeOptions: boolean;
  includeGreeks: boolean;
}

export interface AggregatedQuote extends RealTimeQuote {
  sources: string[];
  confidence: number;
  lastUpdated: Date;
}

export interface MarketIndicators {
  vix: number;
  spyPrice: number;
  qqqPrice: number;
  iwmPrice: number;
  dxy: number; // Dollar index
  tenYearYield: number;
  volatilityIndex: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  fearGreedIndex: number;
}

export class MarketDataService extends EventEmitter {
  private static instance: MarketDataService;
  private yahooService: YahooFinanceService;
  private alpacaService: AlpacaService;
  
  private subscriptions: Map<string, MarketDataSubscription> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private quotes: Map<string, AggregatedQuote> = new Map();
  private optionsData: Map<string, OptionsChainData[]> = new Map();
  
  private isStreaming = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  private constructor() {
    super();
    this.yahooService = YahooFinanceService.getInstance();
    this.alpacaService = AlpacaService.getInstance();
    this.setupEventHandlers();
  }

  static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  private setupEventHandlers(): void {
    // Handle errors and reconnection
    this.on('error', (error) => {
      console.error('Market data service error:', error);
      this.handleReconnection();
    });

    // Handle market close/open events
    this.on('marketClosed', () => {
      console.log('Market closed - reducing update frequency');
      this.adjustUpdateFrequencies(false);
    });

    this.on('marketOpened', () => {
      console.log('Market opened - increasing update frequency');
      this.adjustUpdateFrequencies(true);
    });
  }

  async subscribe(subscriptionId: string, subscription: MarketDataSubscription): Promise<void> {
    this.subscriptions.set(subscriptionId, subscription);
    
    // Start streaming for this subscription
    const interval = setInterval(async () => {
      await this.updateSubscriptionData(subscriptionId, subscription);
    }, subscription.interval);
    
    this.intervals.set(subscriptionId, interval);
    
    // Initial data fetch
    await this.updateSubscriptionData(subscriptionId, subscription);
    
    console.log(`Subscribed to market data for: ${subscription.symbols.join(', ')}`);
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const interval = this.intervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(subscriptionId);
    }
    
    this.subscriptions.delete(subscriptionId);
    console.log(`Unsubscribed from market data: ${subscriptionId}`);
  }

  private async updateSubscriptionData(
    subscriptionId: string, 
    subscription: MarketDataSubscription
  ): Promise<void> {
    try {
      // Fetch quotes from multiple sources
      const yahooQuotes = await this.yahooService.getMultipleQuotes(subscription.symbols);
      const alpacaQuotes = await this.alpacaService.getMultipleQuotes(subscription.symbols);
      
      // Aggregate and validate data
      for (const symbol of subscription.symbols) {
        const aggregatedQuote = this.aggregateQuotes(
          symbol,
          yahooQuotes.get(symbol),
          alpacaQuotes.get(symbol)
        );
        
        if (aggregatedQuote) {
          const previousQuote = this.quotes.get(symbol);
          this.quotes.set(symbol, aggregatedQuote);
          
          // Emit update if price changed
          if (!previousQuote || previousQuote.price !== aggregatedQuote.price) {
            this.emit('priceUpdate', {
              symbol,
              price: aggregatedQuote.price,
              change: aggregatedQuote.change,
              changePercent: aggregatedQuote.changePercent,
              volume: aggregatedQuote.volume,
              timestamp: aggregatedQuote.timestamp,
              source: aggregatedQuote.sources[0] as any
            } as MarketDataUpdate);
          }
        }
      }
      
      // Fetch options data if requested
      if (subscription.includeOptions) {
        await this.updateOptionsData(subscription.symbols);
      }
      
      this.resetReconnectAttempts();
    } catch (error) {
      console.error(`Error updating subscription ${subscriptionId}:`, error);
      this.emit('error', error);
    }
  }

  private aggregateQuotes(
    symbol: string,
    yahooQuote?: RealTimeQuote,
    alpacaQuote?: any
  ): AggregatedQuote | null {
    const sources: string[] = [];
    let primaryQuote: RealTimeQuote | null = null;
    
    // Prioritize Yahoo Finance for comprehensive data
    if (yahooQuote && yahooQuote.price > 0) {
      primaryQuote = yahooQuote;
      sources.push('yahoo');
    }
    
    // Use Alpaca as fallback or validation
    if (alpacaQuote && alpacaQuote.price > 0) {
      sources.push('alpaca');
      if (!primaryQuote) {
        primaryQuote = {
          symbol: alpacaQuote.symbol,
          price: alpacaQuote.price,
          change: alpacaQuote.change,
          changePercent: alpacaQuote.changePercent,
          volume: alpacaQuote.volume,
          avgVolume: 0,
          marketCap: 0,
          peRatio: 0,
          timestamp: alpacaQuote.timestamp,
          bid: 0,
          ask: 0,
          bidSize: 0,
          askSize: 0,
          dayHigh: 0,
          dayLow: 0,
          fiftyTwoWeekHigh: 0,
          fiftyTwoWeekLow: 0,
        };
      }
    }
    
    if (!primaryQuote) return null;
    
    // Calculate confidence based on data freshness and source agreement
    let confidence = 0.5;
    if (sources.length > 1) confidence += 0.3;
    if (primaryQuote.timestamp && Date.now() - primaryQuote.timestamp.getTime() < 60000) {
      confidence += 0.2; // Fresh data
    }
    
    return {
      ...primaryQuote,
      sources,
      confidence: Math.min(1, confidence),
      lastUpdated: new Date()
    };
  }

  private async updateOptionsData(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      try {
        const optionsChain = await this.yahooService.getOptionsChain(symbol);
        if (optionsChain.length > 0) {
          this.optionsData.set(symbol, optionsChain);
          this.emit('optionsUpdate', {
            symbol,
            optionsChain,
            timestamp: new Date(),
            source: 'yahoo'
          } as OptionsDataUpdate);
        }
      } catch (error) {
        console.error(`Error fetching options for ${symbol}:`, error);
      }
    }
  }

  async getMarketIndicators(): Promise<MarketIndicators> {
    try {
      const indicators = ['SPY', 'QQQ', 'IWM', '^VIX', 'DXY', '^TNX'];
      const quotes = await this.yahooService.getMultipleQuotes(indicators);
      
      const spy = quotes.get('SPY');
      const qqq = quotes.get('QQQ');
      const iwm = quotes.get('IWM');
      const vix = quotes.get('^VIX');
      const dxy = quotes.get('DXY');
      const tenYear = quotes.get('^TNX');
      
      // Calculate market sentiment based on multiple factors
      let sentimentScore = 0;
      if (spy && spy.changePercent) sentimentScore += spy.changePercent * 0.4;
      if (qqq && qqq.changePercent) sentimentScore += qqq.changePercent * 0.3;
      if (iwm && iwm.changePercent) sentimentScore += iwm.changePercent * 0.2;
      if (vix && vix.changePercent) sentimentScore -= vix.changePercent * 0.1;
      
      let marketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (sentimentScore > 1) marketSentiment = 'bullish';
      else if (sentimentScore < -1) marketSentiment = 'bearish';
      
      // Calculate Fear & Greed Index (simplified)
      const fearGreedIndex = Math.max(0, Math.min(100, 50 + sentimentScore * 10));
      
      return {
        vix: vix?.price || 0,
        spyPrice: spy?.price || 0,
        qqqPrice: qqq?.price || 0,
        iwmPrice: iwm?.price || 0,
        dxy: dxy?.price || 0,
        tenYearYield: tenYear?.price || 0,
        volatilityIndex: vix?.price || 0,
        marketSentiment,
        fearGreedIndex
      };
    } catch (error) {
      console.error('Error fetching market indicators:', error);
      throw error;
    }
  }

  async getWheelCandidates(
    portfolioValue: number,
    riskTolerance: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string[]> {
    try {
      // Popular wheel strategy candidates
      const candidates = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
        'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C',
        'SPY', 'QQQ', 'IWM', 'DIA',
        'XLF', 'XLE', 'XLK', 'XLV', 'XLI',
        'KO', 'PEP', 'JNJ', 'PG', 'WMT', 'HD', 'UNH', 'V', 'MA'
      ];
      
      // Get current quotes
      const quotes = await this.yahooService.getMultipleQuotes(candidates);
      const suitableCandidates: string[] = [];
      
      for (const symbol of candidates) {
        const quote = quotes.get(symbol);
        if (!quote) continue;
        
        // Filter based on portfolio allocation (max 10% per position)
        const maxAllocation = portfolioValue * 0.1;
        const sharesAffordable = Math.floor(maxAllocation / quote.price);
        
        if (sharesAffordable >= 100) { // Need at least 100 shares for covered calls
          // Additional filtering based on risk tolerance
          const isVolatile = quote.changePercent && Math.abs(quote.changePercent) > 3;
          
          if (riskTolerance === 'low' && isVolatile) continue;
          if (riskTolerance === 'high' && !isVolatile) continue;
          
          suitableCandidates.push(symbol);
        }
      }
      
      return suitableCandidates.slice(0, 20); // Return top 20 candidates
    } catch (error) {
      console.error('Error getting wheel candidates:', error);
      return [];
    }
  }

  getCurrentQuote(symbol: string): AggregatedQuote | null {
    return this.quotes.get(symbol) || null;
  }

  getOptionsChain(symbol: string): OptionsChainData[] {
    return this.optionsData.get(symbol) || [];
  }

  private adjustUpdateFrequencies(isMarketOpen: boolean): void {
    const multiplier = isMarketOpen ? 1 : 4; // Slower updates when market closed
    
    for (const [subscriptionId, subscription] of this.subscriptions) {
      const interval = this.intervals.get(subscriptionId);
      if (interval) {
        clearInterval(interval);
        
        const newInterval = setInterval(async () => {
          await this.updateSubscriptionData(subscriptionId, subscription);
        }, subscription.interval * multiplier);
        
        this.intervals.set(subscriptionId, newInterval);
      }
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connectionFailed');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.emit('reconnecting', this.reconnectAttempts);
    }, delay);
  }

  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  async startStreaming(): Promise<void> {
    if (this.isStreaming) return;
    
    this.isStreaming = true;
    console.log('Market data streaming started');
    this.emit('streamingStarted');
  }

  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) return;
    
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.subscriptions.clear();
    
    this.isStreaming = false;
    console.log('Market data streaming stopped');
    this.emit('streamingStopped');
  }

  getStats(): {
    activeSubscriptions: number;
    cachedQuotes: number;
    cachedOptionsChains: number;
    reconnectAttempts: number;
    isStreaming: boolean;
  } {
    return {
      activeSubscriptions: this.subscriptions.size,
      cachedQuotes: this.quotes.size,
      cachedOptionsChains: this.optionsData.size,
      reconnectAttempts: this.reconnectAttempts,
      isStreaming: this.isStreaming
    };
  }
}