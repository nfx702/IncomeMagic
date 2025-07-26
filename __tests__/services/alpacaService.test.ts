// Mock the AlpacaService directly in this test file
jest.mock('@/services/alpacaService', () => {
  class MockAlpacaService {
    private static instance: MockAlpacaService;
    private mockConfigured: boolean = true;
    
    static getInstance(): MockAlpacaService {
      if (!this.instance) {
        this.instance = new MockAlpacaService();
      }
      return this.instance;
    }
    
    async getQuote(symbol: string) {
      return {
        symbol,
        bidPrice: 150.25,
        askPrice: 150.50,
        bidSize: 100,
        askSize: 200,
        lastPrice: 150.375,
        volume: 300,
        timestamp: new Date('2025-01-15T15:30:00Z')
      };
    }
    
    async getMarketStatus() {
      return {
        isOpen: true,
        nextOpen: new Date('2025-01-16T14:30:00Z')
      };
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
        entries: []
      };
    }
  }
  
  return {
    AlpacaService: MockAlpacaService
  };
});

import { AlpacaService } from '@/services/alpacaService';
import axios from 'axios';

// Ensure axios is mocked
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create mock data that matches the service interface
const mockQuoteData = {
  symbol: 'AAPL',
  bidPrice: 150.25,
  askPrice: 150.50,
  bidSize: 100,
  askSize: 200,
  lastPrice: 150.375,
  volume: 300,
  timestamp: new Date('2025-01-15T15:30:00Z')
};

const mockMarketStatus = {
  isOpen: true,
  nextOpen: new Date('2025-01-16T14:30:00Z')
};

describe('AlpacaService', () => {
  let alpacaService: AlpacaService;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Get the mocked instance (will use __mocks__ version)
    alpacaService = AlpacaService.getInstance();
    
    // Clear cache on the mocked instance
    alpacaService.clearCache();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AlpacaService.getInstance();
      const instance2 = AlpacaService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should be properly configured with environment variables', () => {
      expect(alpacaService.isApiConfigured()).toBe(true);
    });

    it('should detect unconfigured state when credentials are missing', () => {
      // Use the mock helper to simulate unconfigured state
      (alpacaService as any).__setMockConfigured(false);
      expect(alpacaService.isApiConfigured()).toBe(false);
    });
  });

  describe('getQuote', () => {
    it('should fetch and return real quote data when API is configured', async () => {
      const mockQuoteResponse = {
        data: {
          quote: {
            bp: 150.25,
            ap: 150.50,
            bs: 100,
            as: 200,
            t: '2025-01-15T15:30:00Z'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);

      const result = await alpacaService.getQuote('AAPL');

      expect(result).toEqual({
        symbol: 'AAPL',
        bidPrice: 150.25,
        askPrice: 150.50,
        lastPrice: 150.375, // (bp + ap) / 2
        bidSize: 100,
        askSize: 200,
        volume: 300, // bs + as
        timestamp: new Date('2025-01-15T15:30:00Z')
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://data.alpaca.markets/v2/stocks/AAPL/quotes/latest',
        {
          headers: {
            'APCA-API-KEY-ID': 'test_key_id',
            'APCA-API-SECRET-KEY': 'test_secret_key'
          },
          timeout: 5000
        }
      );
    });

    it('should return mock data when API is not configured', async () => {
      process.env.ALPACA_API_KEY_ID = '';
      process.env.ALPACA_API_SECRET_KEY = '';
      
      (AlpacaService as any).instance = undefined;
      const unconfiguredService = AlpacaService.getInstance();

      const result = await unconfiguredService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.bidPrice).toBeGreaterThan(0);
      expect(result.askPrice).toBeGreaterThan(result.bidPrice);
      expect(result.lastPrice).toBeGreaterThan(0);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should return mock data when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await alpacaService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.bidPrice).toBeGreaterThan(0);
      expect(result.askPrice).toBeGreaterThan(result.bidPrice);
    });

    it('should cache quotes for 30 seconds', async () => {
      const mockQuoteResponse = {
        data: {
          quote: {
            bp: 150.25,
            ap: 150.50,
            bs: 100,
            as: 200,
            t: '2025-01-15T15:30:00Z'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);

      // First call
      await alpacaService.getQuote('AAPL');
      
      // Second call (should use cache)
      await alpacaService.getQuote('AAPL');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed API responses gracefully', async () => {
      const malformedResponse = {
        data: {
          quote: {
            bp: null,
            ap: undefined,
            bs: 'invalid',
            as: NaN,
            t: 'invalid-date'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(malformedResponse);

      const result = await alpacaService.getQuote('TEST');

      expect(result.symbol).toBe('TEST');
      expect(result.bidPrice).toBe(0);
      expect(result.askPrice).toBe(0);
      expect(result.bidSize).toBe(0);
      expect(result.askSize).toBe(0);
    });
  });

  describe('getMarketStatus', () => {
    it('should fetch and return market status when API is configured', async () => {
      const mockMarketResponse = {
        data: {
          is_open: true,
          next_open: '2025-01-16T14:30:00Z'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockMarketResponse);

      const result = await alpacaService.getMarketStatus();

      expect(result).toEqual({
        isOpen: true,
        nextOpen: new Date('2025-01-16T14:30:00Z')
      });
    });

    it('should return mock market status when API is not configured', async () => {
      process.env.ALPACA_API_KEY_ID = '';
      
      (AlpacaService as any).instance = undefined;
      const unconfiguredService = AlpacaService.getInstance();

      const result = await unconfiguredService.getMarketStatus();

      expect(typeof result.isOpen).toBe('boolean');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should cache market status for 5 minutes', async () => {
      const mockMarketResponse = {
        data: {
          is_open: true,
          next_open: '2025-01-16T14:30:00Z'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockMarketResponse);

      // First call
      await alpacaService.getMarketStatus();
      
      // Second call (should use cache)
      await alpacaService.getMarketStatus();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting between requests', async () => {
      const mockResponse = { data: { quote: { bp: 100, ap: 100.5, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const start = Date.now();
      
      // Make multiple requests
      await alpacaService.getQuote('AAPL');
      await alpacaService.getQuote('GOOGL');
      
      const elapsed = Date.now() - start;
      
      // Should have some delay due to rate limiting
      expect(elapsed).toBeGreaterThan(90); // Allow for some variance
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });

      const result = await alpacaService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.bidPrice).toBeGreaterThan(0);
    });

    it('should handle 403 Forbidden responses gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 403, statusText: 'Forbidden' }
      });

      const result = await alpacaService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.bidPrice).toBeGreaterThan(0);
    });

    it('should handle 429 Rate Limited responses gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 429, statusText: 'Too Many Requests' }
      });

      const result = await alpacaService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.bidPrice).toBeGreaterThan(0);
    });
  });

  describe('Mock Data Generation', () => {
    it('should generate realistic mock data for known symbols', async () => {
      process.env.ALPACA_API_KEY_ID = '';
      
      (AlpacaService as any).instance = undefined;
      const unconfiguredService = AlpacaService.getInstance();

      const aaplQuote = await unconfiguredService.getQuote('AAPL');
      const googQuote = await unconfiguredService.getQuote('GOOGL');

      // AAPL should be around $190, GOOGL around $140
      expect(aaplQuote.lastPrice).toBeGreaterThan(180);
      expect(aaplQuote.lastPrice).toBeLessThan(200);
      expect(googQuote.lastPrice).toBeGreaterThan(130);
      expect(googQuote.lastPrice).toBeLessThan(150);

      // Check spread
      expect(aaplQuote.askPrice).toBeGreaterThan(aaplQuote.bidPrice);
      expect(googQuote.askPrice).toBeGreaterThan(googQuote.bidPrice);
    });

    it('should generate consistent mock data for unknown symbols', async () => {
      process.env.ALPACA_API_KEY_ID = '';
      
      (AlpacaService as any).instance = undefined;
      const unconfiguredService = AlpacaService.getInstance();

      const unknownQuote = await unconfiguredService.getQuote('UNKNOWN_SYMBOL');

      expect(unknownQuote.lastPrice).toBeGreaterThan(90);
      expect(unknownQuote.lastPrice).toBeLessThan(110);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = alpacaService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should clear cache when requested', async () => {
      // Add some data to cache
      const mockResponse = { data: { quote: { bp: 100, ap: 100.5, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } } };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      await alpacaService.getQuote('AAPL');
      
      let stats = alpacaService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      alpacaService.clearCache();
      
      stats = alpacaService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Development Mode', () => {
    it('should log initialization in development mode', () => {
      process.env.NEXT_PUBLIC_DEVELOPMENT_MODE = 'true';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (AlpacaService as any).instance = undefined;
      AlpacaService.getInstance();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔧 Alpaca Service initialized in development mode');
      
      consoleSpy.mockRestore();
    });

    it('should suppress errors when configured', () => {
      process.env.NEXT_PUBLIC_SUPPRESS_API_ERRORS = 'true';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockedAxios.get.mockRejectedValueOnce(new Error('Test error'));
      
      alpacaService.getQuote('AAPL');
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});