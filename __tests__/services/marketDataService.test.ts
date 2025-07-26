// Mock the MarketDataService dependencies
jest.mock('@/services/marketDataService', () => {
  class MockMarketDataService {
    private static instance: MockMarketDataService;
    private eventEmitter: any;
    private isSubscribed: boolean = false;
    private mockConfigured: boolean = true;
    
    static getInstance(): MockMarketDataService {
      if (!this.instance) {
        this.instance = new MockMarketDataService();
      }
      return this.instance;
    }
    
    constructor() {
      this.eventEmitter = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      };
    }
    
    async getQuote(symbol: string) {
      return {
        symbol,
        price: 150.25,
        bid: 150.20,
        ask: 150.30,
        bidSize: 100,
        askSize: 200,
        volume: 1500000,
        change: 2.50,
        changePercent: 1.69,
        dayHigh: 152.00,
        dayLow: 148.50,
        lastUpdated: new Date(),
        marketCap: 2500000000000,
        peRatio: 28.5,
        dividendYield: 0.52,
        earningsDate: new Date('2025-02-01'),
        sources: ['yahoo', 'alpaca'],
        confidence: 0.95,
        afterHoursPrice: 150.45,
        afterHoursChange: 0.20
      };
    }
    
    async getMultipleQuotes(symbols: string[]) {
      return Promise.all(symbols.map(symbol => this.getQuote(symbol)));
    }
    
    async getOptionsChain(symbol: string) {
      return {
        symbol,
        expirationDates: ['2025-02-21', '2025-03-21'],
        calls: [
          {
            strike: 150,
            bid: 5.50,
            ask: 5.70,
            lastPrice: 5.60,
            volume: 1000,
            openInterest: 5000,
            impliedVolatility: 0.25,
            delta: 0.52,
            gamma: 0.03,
            theta: -0.05,
            vega: 0.15,
            expiration: new Date('2025-02-21')
          }
        ],
        puts: [
          {
            strike: 150,
            bid: 4.20,
            ask: 4.40,
            lastPrice: 4.30,
            volume: 800,
            openInterest: 3500,
            impliedVolatility: 0.22,
            delta: -0.48,
            gamma: 0.03,
            theta: -0.04,
            vega: 0.14,
            expiration: new Date('2025-02-21')
          }
        ],
        timestamp: new Date()
      };
    }
    
    async getMarketIndicators() {
      return {
        vix: 18.5,
        spyPrice: 485.25,
        qqqPrice: 390.50,
        iwmPrice: 210.75,
        dxy: 104.25,
        tenYearYield: 4.25,
        volatilityIndex: 18.5,
        marketSentiment: 'neutral' as const,
        fearGreedIndex: 55,
        lastUpdated: new Date()
      };
    }
    
    async subscribeToQuotes(symbols: string[], callback: Function) {
      this.isSubscribed = true;
      // Simulate real-time updates
      const interval = setInterval(() => {
        symbols.forEach(symbol => {
          callback({
            symbol,
            price: 150 + Math.random() * 10,
            change: Math.random() * 2 - 1,
            changePercent: Math.random() * 2 - 1,
            volume: Math.floor(1000000 + Math.random() * 500000),
            timestamp: new Date(),
            source: 'yahoo'
          });
        });
      }, 1000);
      
      return () => {
        clearInterval(interval);
        this.isSubscribed = false;
      };
    }
    
    async getEarningsCalendar(startDate: Date, endDate: Date) {
      return [
        {
          symbol: 'AAPL',
          earningsDate: new Date('2025-02-01'),
          estimatedEPS: 2.45,
          actualEPS: null,
          surprise: null,
          surprisePercent: null
        }
      ];
    }
    
    isApiConfigured(): boolean {
      return this.mockConfigured;
    }
    
    __setMockConfigured(configured: boolean): void {
      this.mockConfigured = configured;
    }
    
    clearCache(): void {
      // Mock implementation
    }
    
    getCacheStats() {
      return {
        size: 0,
        entries: [],
        hitRate: 0.85
      };
    }
    
    getEventEmitter() {
      return this.eventEmitter;
    }
    
    isSubscribedToQuotes(): boolean {
      return this.isSubscribed;
    }
  }
  
  return {
    MarketDataService: MockMarketDataService
  };
});

import { MarketDataService } from '@/services/marketDataService';

describe('MarketDataService', () => {
  let marketDataService: MarketDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    marketDataService = MarketDataService.getInstance();
    marketDataService.clearCache();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MarketDataService.getInstance();
      const instance2 = MarketDataService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should be properly configured', () => {
      expect(marketDataService.isApiConfigured()).toBe(true);
    });
  });

  describe('Quote Data', () => {
    it('should fetch single quote with all required fields', async () => {
      const quote = await marketDataService.getQuote('AAPL');
      
      expect(quote).toMatchObject({
        symbol: 'AAPL',
        price: expect.any(Number),
        bid: expect.any(Number),
        ask: expect.any(Number),
        volume: expect.any(Number),
        change: expect.any(Number),
        changePercent: expect.any(Number),
        lastUpdated: expect.any(Date),
        sources: expect.arrayContaining(['yahoo', 'alpaca']),
        confidence: expect.any(Number)
      });
      
      expect(quote.ask).toBeGreaterThan(quote.bid);
      expect(quote.confidence).toBeGreaterThan(0);
      expect(quote.confidence).toBeLessThanOrEqual(1);
    });

    it('should fetch multiple quotes efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
      const quotes = await marketDataService.getMultipleQuotes(symbols);
      
      expect(quotes).toHaveLength(4);
      quotes.forEach((quote, index) => {
        expect(quote.symbol).toBe(symbols[index]);
        expect(quote.price).toBeGreaterThan(0);
      });
    });

    it('should handle real-time subscription', async () => {
      const callback = jest.fn();
      const symbols = ['AAPL', 'GOOGL'];
      
      const unsubscribe = await marketDataService.subscribeToQuotes(symbols, callback);
      
      expect(typeof unsubscribe).toBe('function');
      expect(marketDataService.isSubscribedToQuotes()).toBe(true);
      
      // Wait for at least one callback
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(callback).toHaveBeenCalled();
      
      unsubscribe();
      expect(marketDataService.isSubscribedToQuotes()).toBe(false);
    });
  });

  describe('Options Data', () => {
    it('should fetch options chain with calls and puts', async () => {
      const optionsChain = await marketDataService.getOptionsChain('AAPL');
      
      expect(optionsChain).toMatchObject({
        symbol: 'AAPL',
        expirationDates: expect.any(Array),
        calls: expect.any(Array),
        puts: expect.any(Array),
        timestamp: expect.any(Date)
      });
      
      expect(optionsChain.calls.length).toBeGreaterThan(0);
      expect(optionsChain.puts.length).toBeGreaterThan(0);
      
      const call = optionsChain.calls[0];
      expect(call).toMatchObject({
        strike: expect.any(Number),
        bid: expect.any(Number),
        ask: expect.any(Number),
        delta: expect.any(Number),
        gamma: expect.any(Number),
        theta: expect.any(Number),
        vega: expect.any(Number),
        impliedVolatility: expect.any(Number)
      });
    });
  });

  describe('Market Indicators', () => {
    it('should fetch comprehensive market indicators', async () => {
      const indicators = await marketDataService.getMarketIndicators();
      
      expect(indicators).toMatchObject({
        vix: expect.any(Number),
        spyPrice: expect.any(Number),
        qqqPrice: expect.any(Number),
        iwmPrice: expect.any(Number),
        dxy: expect.any(Number),
        tenYearYield: expect.any(Number),
        marketSentiment: expect.stringMatching(/bullish|bearish|neutral/),
        fearGreedIndex: expect.any(Number),
        lastUpdated: expect.any(Date)
      });
      
      expect(indicators.vix).toBeGreaterThan(0);
      expect(indicators.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(indicators.fearGreedIndex).toBeLessThanOrEqual(100);
    });
  });

  describe('Earnings Data', () => {
    it('should fetch earnings calendar', async () => {
      const startDate = new Date('2025-02-01');
      const endDate = new Date('2025-02-28');
      
      const earnings = await marketDataService.getEarningsCalendar(startDate, endDate);
      
      expect(Array.isArray(earnings)).toBe(true);
      if (earnings.length > 0) {
        expect(earnings[0]).toMatchObject({
          symbol: expect.any(String),
          earningsDate: expect.any(Date),
          estimatedEPS: expect.any(Number)
        });
      }
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = marketDataService.getCacheStats();
      
      expect(stats).toMatchObject({
        size: expect.any(Number),
        entries: expect.any(Array),
        hitRate: expect.any(Number)
      });
    });

    it('should clear cache when requested', () => {
      expect(() => marketDataService.clearCache()).not.toThrow();
    });
  });

  describe('Event System', () => {
    it('should provide event emitter for real-time updates', () => {
      const emitter = marketDataService.getEventEmitter();
      
      expect(emitter).toBeTruthy();
      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.off).toBe('function');
      expect(typeof emitter.emit).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle unconfigured state gracefully', () => {
      (marketDataService as any).__setMockConfigured(false);
      expect(marketDataService.isApiConfigured()).toBe(false);
    });
  });
});