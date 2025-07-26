import axios, { AxiosError } from 'axios';

// Environment Configuration
const ALPACA_API_KEY = process.env.ALPACA_API_KEY_ID || '';
const ALPACA_SECRET_KEY = process.env.ALPACA_API_SECRET_KEY || '';
const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets/v2';
const ALPACA_DATA_URL = process.env.ALPACA_DATA_URL || 'https://data.alpaca.markets/v2';
const DEVELOPMENT_MODE = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';
const SUPPRESS_API_ERRORS = process.env.NEXT_PUBLIC_SUPPRESS_API_ERRORS === 'true';

interface AlpacaHeaders {
  'APCA-API-KEY-ID': string;
  'APCA-API-SECRET-KEY': string;
  [key: string]: string;
}

export interface EarningsData {
  symbol: string;
  date: Date;
  eps: number;
  epsEstimate: number;
  revenue: number;
  revenueEstimate: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

export class AlpacaService {
  private static instance: AlpacaService;
  private headers: AlpacaHeaders;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private rateLimitDelay = 100; // 100ms between requests
  private lastRequestTime = 0;
  private isConfigured: boolean;

  private constructor() {
    this.isConfigured = !!(ALPACA_API_KEY && ALPACA_SECRET_KEY);
    this.headers = {
      'APCA-API-KEY-ID': ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
    };

    if (DEVELOPMENT_MODE) {
      console.log('🔧 Alpaca Service initialized in development mode');
      console.log(`🔑 API configured: ${this.isConfigured ? 'Yes' : 'No (using mock data)'}`);
    }
  }

  static getInstance(): AlpacaService {
    if (!AlpacaService.instance) {
      AlpacaService.instance = new AlpacaService();
    }
    return AlpacaService.instance;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.expiresIn) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T, expiresInMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs
    });
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private logError(operation: string, error: any, symbol?: string): void {
    if (!SUPPRESS_API_ERRORS) {
      const symbolText = symbol ? ` for ${symbol}` : '';
      console.error(`Alpaca API ${operation}${symbolText}:`, error.response?.status || error.message);
    }
  }

  private generateMockQuote(symbol: string): {
    symbol: string;
    bidPrice: number;
    askPrice: number;
    lastPrice: number;
    bidSize: number;
    askSize: number;
    volume: number;
    timestamp: Date;
  } {
    // Generate realistic mock data based on symbol
    const basePrice = this.getMockBasePrice(symbol);
    const spread = basePrice * 0.001; // 0.1% spread
    const variance = basePrice * 0.02 * (Math.random() - 0.5); // ±1% variance
    const price = basePrice + variance;
    
    return {
      symbol,
      bidPrice: Math.round((price - spread/2) * 100) / 100,
      askPrice: Math.round((price + spread/2) * 100) / 100,
      lastPrice: Math.round(price * 100) / 100,
      bidSize: Math.floor(Math.random() * 500) + 100,
      askSize: Math.floor(Math.random() * 500) + 100,
      volume: Math.floor(Math.random() * 1000000) + 100000,
      timestamp: new Date(),
    };
  }

  private getMockBasePrice(symbol: string): number {
    // Realistic base prices for common symbols
    const mockPrices: { [key: string]: number } = {
      'AAPL': 190, 'MSFT': 380, 'GOOGL': 140, 'AMZN': 145, 'TSLA': 210,
      'NVDA': 480, 'META': 320, 'NFLX': 400, 'SPY': 480, 'QQQ': 390,
      'AMD': 140, 'PYPL': 60, 'V': 270, 'JPM': 150, 'JNJ': 160,
      'SHOP': 70, 'PLTR': 25, 'NET': 80, 'SNOW': 160, 'COIN': 190,
      'GME': 20, 'HOOD': 15, 'SBUX': 95, 'DIS': 95, 'NKE': 95
    };
    return mockPrices[symbol] || 100;
  }

  async getEarningsCalendar(symbols: string[]): Promise<Map<string, EarningsData>> {
    const earnings = new Map<string, EarningsData>();
    
    try {
      // Note: Alpaca doesn't have direct earnings calendar API
      // This would need to be implemented with a different service
      // For now, returning mock data structure
      for (const symbol of symbols) {
        earnings.set(symbol, {
          symbol,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          eps: 0,
          epsEstimate: 0,
          revenue: 0,
          revenueEstimate: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching earnings calendar:', error);
    }

    return earnings;
  }

  async getQuote(symbol: string): Promise<{
    symbol: string;
    bidPrice: number;
    askPrice: number;
    lastPrice: number;
    bidSize: number;
    askSize: number;
    volume: number;
    timestamp: Date;
  }> {
    const cacheKey = `quote_${symbol}`;
    
    // Check cache first (30 seconds for quotes)
    const cached = this.getCachedData<{
      symbol: string;
      bidPrice: number;
      askPrice: number;
      lastPrice: number;
      bidSize: number;
      askSize: number;
      volume: number;
      timestamp: Date;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not configured, return mock data immediately
    if (!this.isConfigured) {
      const mockQuote = this.generateMockQuote(symbol);
      this.setCachedData(cacheKey, mockQuote, 30000); // Cache for 30 seconds
      return mockQuote;
    }

    try {
      await this.rateLimit();
      
      const response = await axios.get(
        `${ALPACA_DATA_URL}/stocks/${symbol}/quotes/latest`,
        { 
          headers: this.headers,
          timeout: 5000 // 5 second timeout
        }
      );

      const quote = response.data.quote;
      const result = {
        symbol,
        bidPrice: quote.bp || 0,
        askPrice: quote.ap || 0,
        lastPrice: (quote.bp + quote.ap) / 2 || 0,
        bidSize: quote.bs || 0,
        askSize: quote.as || 0,
        volume: quote.bs + quote.as || 0,
        timestamp: new Date(quote.t),
      };

      // Cache successful response for 30 seconds
      this.setCachedData(cacheKey, result, 30000);
      return result;

    } catch (error) {
      this.logError('getQuote', error, symbol);
      
      // Return mock data as fallback
      const mockQuote = this.generateMockQuote(symbol);
      this.setCachedData(cacheKey, mockQuote, 30000);
      return mockQuote;
    }
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    const cacheKey = `stock_quote_${symbol}`;
    
    // Check cache first (30 seconds)
    const cached = this.getCachedData<StockQuote>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not configured, return mock data
    if (!this.isConfigured) {
      const mockQuote = this.generateMockQuote(symbol);
      const stockQuote: StockQuote = {
        symbol,
        price: mockQuote.lastPrice,
        change: mockQuote.lastPrice * 0.01 * (Math.random() - 0.5), // ±0.5% change
        changePercent: 0.01 * (Math.random() - 0.5),
        volume: mockQuote.volume,
        timestamp: mockQuote.timestamp,
      };
      this.setCachedData(cacheKey, stockQuote, 30000);
      return stockQuote;
    }

    try {
      await this.rateLimit();
      
      const response = await axios.get(
        `${ALPACA_DATA_URL}/stocks/${symbol}/quotes/latest`,
        { 
          headers: this.headers,
          timeout: 5000
        }
      );

      const quote = response.data.quote;
      const result: StockQuote = {
        symbol,
        price: quote.bp,
        change: 0, // Calculate from previous close if needed
        changePercent: 0,
        volume: quote.bs,
        timestamp: new Date(quote.t),
      };

      this.setCachedData(cacheKey, result, 30000);
      return result;

    } catch (error) {
      this.logError('getStockQuote', error, symbol);
      return null;
    }
  }

  async getHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalData[]> {
    try {
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];

      const response = await axios.get(
        `${ALPACA_DATA_URL}/stocks/${symbol}/bars`,
        {
          headers: this.headers,
          params: {
            start,
            end,
            timeframe: '1Day',
            limit: 1000,
          },
        }
      );

      return response.data.bars.map((bar: any) => ({
        date: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>();
    
    // Alpaca supports batch quotes
    try {
      const symbolsParam = symbols.join(',');
      const response = await axios.get(
        `${ALPACA_DATA_URL}/stocks/quotes/latest`,
        {
          headers: this.headers,
          params: { symbols: symbolsParam },
        }
      );

      for (const [symbol, data] of Object.entries(response.data.quotes)) {
        const quote: any = data;
        quotes.set(symbol, {
          symbol,
          price: quote.bp,
          change: 0,
          changePercent: 0,
          volume: quote.bs,
          timestamp: new Date(quote.t),
        });
      }
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
    }

    return quotes;
  }

  async getMarketStatus(): Promise<{ isOpen: boolean; nextOpen: Date | null }> {
    const cacheKey = 'market_status';
    
    // Check cache first (5 minutes for market status)
    const cached = this.getCachedData<{ isOpen: boolean; nextOpen: Date | null }>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not configured, return mock market status
    if (!this.isConfigured) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      // Mock market hours: Monday-Friday 9:30 AM - 4:00 PM ET
      const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;
      const mockStatus = { isOpen, nextOpen: null };
      this.setCachedData(cacheKey, mockStatus, 300000); // Cache for 5 minutes
      return mockStatus;
    }

    try {
      await this.rateLimit();
      
      const response = await axios.get(
        `${ALPACA_BASE_URL}/clock`,
        { 
          headers: this.headers,
          timeout: 5000
        }
      );

      const result = {
        isOpen: response.data.is_open,
        nextOpen: response.data.next_open ? new Date(response.data.next_open) : null,
      };

      this.setCachedData(cacheKey, result, 300000); // Cache for 5 minutes
      return result;

    } catch (error) {
      this.logError('getMarketStatus', error);
      
      // Fallback to time-based mock
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;
      
      return { isOpen, nextOpen: null };
    }
  }

  // Add utility methods for development
  public clearCache(): void {
    this.cache.clear();
    if (DEVELOPMENT_MODE) {
      console.log('🗑️ Alpaca Service cache cleared');
    }
  }

  public getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  public isApiConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
const alpacaService = AlpacaService.getInstance();
export default alpacaService;

// Class is already exported at declaration (line 50)