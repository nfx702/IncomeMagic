/**
 * Mock setup for AlpacaService tests
 * Provides comprehensive mocking to prevent real API calls
 */

import { AlpacaService } from '@/services/alpacaService';

// Mock data for consistent test results
export const mockQuoteData = {
  symbol: 'AAPL',
  bidPrice: 150.25,
  askPrice: 150.50,
  bidSize: 100,
  askSize: 200,
  lastPrice: 150.375,
  volume: 300,
  timestamp: new Date('2025-01-15T15:30:00Z')
};

export const mockMarketStatus = {
  isOpen: true,
  nextOpen: new Date('2025-01-16T14:30:00Z')
};

export const mockHistoricalData = [
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
export class MockAlpacaService {
  private static instance: MockAlpacaService;
  private cache = new Map();
  
  public static getInstance(): MockAlpacaService {
    if (!MockAlpacaService.instance) {
      MockAlpacaService.instance = new MockAlpacaService();
    }
    return MockAlpacaService.instance;
  }

  public async getQuote(symbol: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return {
      ...mockQuoteData,
      symbol
    };
  }

  public async getMarketStatus() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return mockMarketStatus;
  }

  public async getHistoricalData(symbol: string, timeframe: string, limit: number) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return mockHistoricalData;
  }

  public isApiConfigured(): boolean {
    return true;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Mock the entire module
export const setupAlpacaMocks = () => {
  // Mock the AlpacaService module
  jest.mock('@/services/alpacaService', () => {
    const mockInstance = MockAlpacaService.getInstance();
    
    return {
      __esModule: true,
      default: mockInstance,
      AlpacaService: jest.fn().mockImplementation(() => mockInstance)
    };
  });

  // Mock axios to prevent any real HTTP calls
  jest.mock('axios', () => ({
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    })),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }));
};

// Reset function for between tests
export const resetAlpacaMocks = () => {
  jest.clearAllMocks();
  MockAlpacaService.getInstance().clearCache();
};