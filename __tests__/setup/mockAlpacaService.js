/**
 * Mock setup for AlpacaService tests (CommonJS version for jest.setup.js)
 */

// Mock data for consistent test results
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

const mockHistoricalData = [
  {
    date: new Date('2025-01-15'),
    open: 149.50,
    high: 151.00,
    low: 149.00,
    close: 150.75,
    volume: 1000000
  }
];

// Create mock class that implements the same interface
class MockAlpacaService {
  constructor() {
    this.cache = new Map();
  }

  static getInstance() {
    if (!MockAlpacaService.instance) {
      MockAlpacaService.instance = new MockAlpacaService();
    }
    return MockAlpacaService.instance;
  }

  async getQuote(symbol) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      ...mockQuoteData,
      symbol
    };
  }

  async getMarketStatus() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return mockMarketStatus;
  }

  async getHistoricalData(symbol, timeframe, limit) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return mockHistoricalData;
  }

  isApiConfigured() {
    return true;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

module.exports = {
  MockAlpacaService,
  mockQuoteData,
  mockMarketStatus,
  mockHistoricalData
};