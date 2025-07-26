/**
 * Yahoo Finance Live Data Service
 * Provides real-time market data, options chains, and fundamental data
 * for enhanced trading recommendations
 */

import axios from 'axios';

// Yahoo Finance API endpoints
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_OPTIONS_API = 'https://query2.finance.yahoo.com/v7/finance/options';
const YAHOO_QUOTE_API = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_FUNDAMENTALS_API = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary';

export interface RealTimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio: number;
  timestamp: Date;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  impliedVolatility?: number;
}

export interface OptionsChainData {
  symbol: string;
  expiry: Date;
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
  timestamp: Date;
}

export interface OptionContract {
  strike: number;
  bid: number;
  ask: number;
  lastPrice: number;
  change: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  intrinsicValue: number;
  timeValue: number;
  contractSymbol: string;
}

export interface EarningsData {
  symbol: string;
  earningsDate: Date;
  epsEstimate: number;
  revenueEstimate: number;
  earningsTime: 'bmo' | 'amc' | 'dmh'; // before market open, after market close, during market hours
  surprisePercent?: number;
}

export interface DividendData {
  symbol: string;
  exDate: Date;
  payDate: Date;
  amount: number;
  yield: number;
  frequency: 'quarterly' | 'monthly' | 'annual' | 'special';
}

export interface MarketSentiment {
  symbol: string;
  analystRating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  targetPrice: number;
  upgrades: number;
  downgrades: number;
  newsVolume: number;
  sentimentScore: number; // -1 to 1
  socialVolume: number;
}

export class YahooFinanceService {
  private static instance: YahooFinanceService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private rateLimitDelay = 100; // ms between requests
  private lastRequestTime = 0;

  private constructor() {}

  static getInstance(): YahooFinanceService {
    if (!YahooFinanceService.instance) {
      YahooFinanceService.instance = new YahooFinanceService();
    }
    return YahooFinanceService.instance;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  async getRealTimeQuote(symbol: string): Promise<RealTimeQuote | null> {
    const cacheKey = this.getCacheKey('quote', { symbol });
    const cached = this.getFromCache<RealTimeQuote>(cacheKey);
    if (cached) return cached;

    await this.rateLimit();

    try {
      const response = await axios.get(`${YAHOO_QUOTE_API}?symbols=${symbol}`);
      const quoteData = response.data.quoteResponse.result[0];

      if (!quoteData) return null;

      const quote: RealTimeQuote = {
        symbol: quoteData.symbol,
        price: quoteData.regularMarketPrice || 0,
        change: quoteData.regularMarketChange || 0,
        changePercent: quoteData.regularMarketChangePercent || 0,
        volume: quoteData.regularMarketVolume || 0,
        avgVolume: quoteData.averageDailyVolume3Month || 0,
        marketCap: quoteData.marketCap || 0,
        peRatio: quoteData.trailingPE || 0,
        timestamp: new Date(quoteData.regularMarketTime * 1000),
        bid: quoteData.bid || 0,
        ask: quoteData.ask || 0,
        bidSize: quoteData.bidSize || 0,
        askSize: quoteData.askSize || 0,
        dayHigh: quoteData.regularMarketDayHigh || 0,
        dayLow: quoteData.regularMarketDayLow || 0,
        fiftyTwoWeekHigh: quoteData.fiftyTwoWeekHigh || 0,
        fiftyTwoWeekLow: quoteData.fiftyTwoWeekLow || 0,
      };

      this.setCache(cacheKey, quote, 30000); // 30 second cache
      return quote;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<Map<string, RealTimeQuote>> {
    const quotes = new Map<string, RealTimeQuote>();
    const symbolsToFetch: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cacheKey = this.getCacheKey('quote', { symbol });
      const cached = this.getFromCache<RealTimeQuote>(cacheKey);
      if (cached) {
        quotes.set(symbol, cached);
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    if (symbolsToFetch.length === 0) return quotes;

    await this.rateLimit();

    try {
      const symbolsParam = symbolsToFetch.join(',');
      const response = await axios.get(`${YAHOO_QUOTE_API}?symbols=${symbolsParam}`);
      const quotesData = response.data.quoteResponse.result || [];

      for (const quoteData of quotesData) {
        const quote: RealTimeQuote = {
          symbol: quoteData.symbol,
          price: quoteData.regularMarketPrice || 0,
          change: quoteData.regularMarketChange || 0,
          changePercent: quoteData.regularMarketChangePercent || 0,
          volume: quoteData.regularMarketVolume || 0,
          avgVolume: quoteData.averageDailyVolume3Month || 0,
          marketCap: quoteData.marketCap || 0,
          peRatio: quoteData.trailingPE || 0,
          timestamp: new Date(quoteData.regularMarketTime * 1000),
          bid: quoteData.bid || 0,
          ask: quoteData.ask || 0,
          bidSize: quoteData.bidSize || 0,
          askSize: quoteData.askSize || 0,
          dayHigh: quoteData.regularMarketDayHigh || 0,
          dayLow: quoteData.regularMarketDayLow || 0,
          fiftyTwoWeekHigh: quoteData.fiftyTwoWeekHigh || 0,
          fiftyTwoWeekLow: quoteData.fiftyTwoWeekLow || 0,
        };

        quotes.set(quote.symbol, quote);
        const cacheKey = this.getCacheKey('quote', { symbol: quote.symbol });
        this.setCache(cacheKey, quote, 30000);
      }
    } catch (error) {
      console.error('Error fetching multiple quotes:', error);
    }

    return quotes;
  }

  async getOptionsChain(symbol: string, expiry?: Date): Promise<OptionsChainData[]> {
    const cacheKey = this.getCacheKey('options', { symbol, expiry });
    const cached = this.getFromCache<OptionsChainData[]>(cacheKey);
    if (cached) return cached;

    await this.rateLimit();

    try {
      let url = `${YAHOO_OPTIONS_API}/${symbol}`;
      if (expiry) {
        const expiryTimestamp = Math.floor(expiry.getTime() / 1000);
        url += `?date=${expiryTimestamp}`;
      }

      const response = await axios.get(url);
      const optionsData = response.data.optionChain.result[0];

      if (!optionsData) return [];

      const chains: OptionsChainData[] = [];
      const underlyingPrice = optionsData.quote.regularMarketPrice;

      for (const expiration of optionsData.expirationDates) {
        const expiryDate = new Date(expiration * 1000);
        const calls: OptionContract[] = [];
        const puts: OptionContract[] = [];

        // Process calls
        if (optionsData.options[0]?.calls) {
          for (const call of optionsData.options[0].calls) {
            calls.push({
              strike: call.strike,
              bid: call.bid || 0,
              ask: call.ask || 0,
              lastPrice: call.lastPrice || 0,
              change: call.change || 0,
              volume: call.volume || 0,
              openInterest: call.openInterest || 0,
              impliedVolatility: call.impliedVolatility || 0,
              delta: this.calculateDelta(call, underlyingPrice, 'call'),
              gamma: this.calculateGamma(call, underlyingPrice),
              theta: this.calculateTheta(call, expiration),
              vega: this.calculateVega(call, underlyingPrice),
              intrinsicValue: Math.max(0, underlyingPrice - call.strike),
              timeValue: (call.lastPrice || 0) - Math.max(0, underlyingPrice - call.strike),
              contractSymbol: call.contractSymbol
            });
          }
        }

        // Process puts
        if (optionsData.options[0]?.puts) {
          for (const put of optionsData.options[0].puts) {
            puts.push({
              strike: put.strike,
              bid: put.bid || 0,
              ask: put.ask || 0,
              lastPrice: put.lastPrice || 0,
              change: put.change || 0,
              volume: put.volume || 0,
              openInterest: put.openInterest || 0,
              impliedVolatility: put.impliedVolatility || 0,
              delta: this.calculateDelta(put, underlyingPrice, 'put'),
              gamma: this.calculateGamma(put, underlyingPrice),
              theta: this.calculateTheta(put, expiration),
              vega: this.calculateVega(put, underlyingPrice),
              intrinsicValue: Math.max(0, put.strike - underlyingPrice),
              timeValue: (put.lastPrice || 0) - Math.max(0, put.strike - underlyingPrice),
              contractSymbol: put.contractSymbol
            });
          }
        }

        chains.push({
          symbol,
          expiry: expiryDate,
          calls,
          puts,
          underlyingPrice,
          timestamp: new Date()
        });
      }

      this.setCache(cacheKey, chains, 300000); // 5 minute cache
      return chains;
    } catch (error) {
      console.error(`Error fetching options chain for ${symbol}:`, error);
      return [];
    }
  }

  async getEarningsCalendar(symbols: string[]): Promise<Map<string, EarningsData>> {
    const earnings = new Map<string, EarningsData>();

    for (const symbol of symbols) {
      const cacheKey = this.getCacheKey('earnings', { symbol });
      const cached = this.getFromCache<EarningsData>(cacheKey);
      if (cached) {
        earnings.set(symbol, cached);
        continue;
      }

      await this.rateLimit();

      try {
        const response = await axios.get(
          `${YAHOO_FUNDAMENTALS_API}/${symbol}?modules=earnings,calendarEvents`
        );

        const data = response.data.quoteSummary.result[0];
        if (data?.calendarEvents?.earnings) {
          const earningsEvent = data.calendarEvents.earnings.earningsDate[0];
          
          const earningsData: EarningsData = {
            symbol,
            earningsDate: new Date(earningsEvent.raw * 1000),
            epsEstimate: data.earnings?.earningsChart?.quarterly?.[0]?.estimate || 0,
            revenueEstimate: 0, // Would need additional API call
            earningsTime: 'bmo', // Default, would need to parse from additional data
          };

          earnings.set(symbol, earningsData);
          this.setCache(cacheKey, earningsData, 86400000); // 24 hour cache
        }
      } catch (error) {
        console.error(`Error fetching earnings for ${symbol}:`, error);
      }
    }

    return earnings;
  }

  async getDividendData(symbols: string[]): Promise<Map<string, DividendData>> {
    const dividends = new Map<string, DividendData>();

    for (const symbol of symbols) {
      const cacheKey = this.getCacheKey('dividends', { symbol });
      const cached = this.getFromCache<DividendData>(cacheKey);
      if (cached) {
        dividends.set(symbol, cached);
        continue;
      }

      await this.rateLimit();

      try {
        const response = await axios.get(
          `${YAHOO_FUNDAMENTALS_API}/${symbol}?modules=summaryDetail,calendarEvents`
        );

        const data = response.data.quoteSummary.result[0];
        if (data?.summaryDetail) {
          const dividendData: DividendData = {
            symbol,
            exDate: data.calendarEvents?.exDividendDate ? 
              new Date(data.calendarEvents.exDividendDate.raw * 1000) : new Date(),
            payDate: data.calendarEvents?.dividendDate ? 
              new Date(data.calendarEvents.dividendDate.raw * 1000) : new Date(),
            amount: data.summaryDetail.dividendRate?.raw || 0,
            yield: data.summaryDetail.dividendYield?.raw || 0,
            frequency: 'quarterly' // Default, would need additional parsing
          };

          dividends.set(symbol, dividendData);
          this.setCache(cacheKey, dividendData, 86400000); // 24 hour cache
        }
      } catch (error) {
        console.error(`Error fetching dividend data for ${symbol}:`, error);
      }
    }

    return dividends;
  }

  // Black-Scholes Greeks calculations (simplified)
  private calculateDelta(option: any, spotPrice: number, type: 'call' | 'put'): number {
    // Simplified delta calculation - in production, use proper Black-Scholes
    const moneyness = spotPrice / option.strike;
    if (type === 'call') {
      return Math.max(0, Math.min(1, moneyness));
    } else {
      return Math.max(-1, Math.min(0, moneyness - 1));
    }
  }

  private calculateGamma(option: any, spotPrice: number): number {
    // Simplified gamma calculation
    const moneyness = spotPrice / option.strike;
    return Math.exp(-Math.pow(moneyness - 1, 2)) * 0.1;
  }

  private calculateTheta(option: any, expiration: number): number {
    const daysToExpiry = (expiration * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
    return -(option.lastPrice || 0) / Math.max(1, daysToExpiry);
  }

  private calculateVega(option: any, spotPrice: number): number {
    // Simplified vega calculation
    return (option.lastPrice || 0) * 0.01;
  }

  async getMarketStatus(): Promise<{ isOpen: boolean; nextOpen: Date | null }> {
    try {
      // Yahoo Finance doesn't have a direct market status endpoint
      // We'll determine based on current time and market hours
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const hour = easternTime.getHours();
      const minute = easternTime.getMinutes();
      const dayOfWeek = easternTime.getDay();
      
      // Market hours: Monday-Friday 9:30 AM - 4:00 PM ET
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isMarketHours = (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
      
      const isOpen = isWeekday && isMarketHours;
      
      // Calculate next open (simplified)
      let nextOpen: Date | null = null;
      if (!isOpen) {
        const tomorrow = new Date(easternTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 30, 0, 0);
        nextOpen = tomorrow;
      }

      return { isOpen, nextOpen };
    } catch (error) {
      console.error('Error determining market status:', error);
      return { isOpen: false, nextOpen: null };
    }
  }

  // Utility method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}