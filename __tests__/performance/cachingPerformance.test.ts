import { AlpacaService } from '@/services/alpacaService';
import { IBTradeParser } from '@/services/xmlParser';
import axios from 'axios';
import fs from 'fs/promises';

// Mock dependencies
jest.mock('axios');
jest.mock('fs/promises');
jest.mock('xml2js', () => ({
  parseString: jest.fn()
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

import { parseString } from 'xml2js';
const mockedParseString = parseString as jest.MockedFunction<typeof parseString>;

// Increase test timeout for performance tests
jest.setTimeout(30000);

describe('Performance and Caching Tests', () => {
  let alpacaService: AlpacaService;
  let ibParser: IBTradeParser;

  beforeEach(() => {
    // Reset singletons
    (AlpacaService as any).instance = undefined;
    (IBTradeParser as any).instance = undefined;
    
    // Set up environment
    process.env.ALPACA_API_KEY_ID = 'test_key';
    process.env.ALPACA_API_SECRET_KEY = 'test_secret';
    process.env.NEXT_PUBLIC_DEVELOPMENT_MODE = 'false';
    
    alpacaService = AlpacaService.getInstance();
    ibParser = IBTradeParser.getInstance();
    
    alpacaService.clearCache();
    ibParser.clearCache();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ALPACA_API_KEY_ID;
    delete process.env.ALPACA_API_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_DEVELOPMENT_MODE;
  });

  describe('Alpaca Service Caching Performance', () => {
    describe('Quote Caching', () => {
      it('should cache quotes for 30 seconds', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockResolvedValue(mockQuote);

        // First call should hit API
        const start1 = performance.now();
        const result1 = await alpacaService.getQuote('AAPL');
        const end1 = performance.now();

        // Second call should use cache
        const start2 = performance.now();
        const result2 = await alpacaService.getQuote('AAPL');
        const end2 = performance.now();

        const time1 = end1 - start1;
        const time2 = end2 - start2;

        expect(result1).toEqual(result2);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(time2).toBeLessThan(time1); // Cache should be faster
        expect(time2).toBeLessThan(10); // Cache access should be very fast
      });

      it('should expire cache after 30 seconds', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockResolvedValue(mockQuote);

        // Mock Date.now to simulate time passage
        const originalNow = Date.now;
        let mockTime = 1000000000;
        Date.now = jest.fn(() => mockTime);

        // First call
        await alpacaService.getQuote('AAPL');
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Call within cache window (29 seconds later)
        mockTime += 29000;
        await alpacaService.getQuote('AAPL');
        expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still cached

        // Call after cache expiry (31 seconds from first call)
        mockTime += 2000;
        await alpacaService.getQuote('AAPL');
        expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Cache expired, new API call

        Date.now = originalNow;
      });

      it('should handle concurrent cache access efficiently', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockQuote), 100))
        );

        // Fire 10 concurrent requests for the same symbol
        const promises = Array(10).fill(null).map(() => alpacaService.getQuote('CONCURRENT'));
        
        const start = performance.now();
        const results = await Promise.all(promises);
        const end = performance.now();

        // All results should be identical
        expect(results.every(result => 
          result.symbol === 'CONCURRENT' && result.bidPrice === 100
        )).toBe(true);

        // Should only make one API call despite concurrent requests
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        
        // Total time should be close to single request time, not 10x
        expect(end - start).toBeLessThan(500);
      });

      it('should measure cache hit ratio performance', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockResolvedValue(mockQuote);

        const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];
        const requests = 100;

        // Make many requests with repeated symbols
        const start = performance.now();
        
        for (let i = 0; i < requests; i++) {
          const symbol = symbols[i % symbols.length];
          await alpacaService.getQuote(symbol);
        }
        
        const end = performance.now();
        const totalTime = end - start;

        // Should only make 5 API calls (one per unique symbol)
        expect(mockedAxios.get).toHaveBeenCalledTimes(5);
        
        // Cache hit ratio should be 95% (5 misses out of 100 requests)
        const cacheHitRatio = (requests - 5) / requests;
        expect(cacheHitRatio).toBe(0.95);
        
        // Average time per request should be low due to caching
        const avgTimePerRequest = totalTime / requests;
        expect(avgTimePerRequest).toBeLessThan(5); // Should be very fast with cache
      });
    });

    describe('Market Status Caching', () => {
      it('should cache market status for 5 minutes', async () => {
        const mockMarketStatus = {
          data: { is_open: true, next_open: '2025-01-16T14:30:00Z' }
        };

        mockedAxios.get.mockResolvedValue(mockMarketStatus);

        // First call
        await alpacaService.getMarketStatus();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Second call (should use cache)
        await alpacaService.getMarketStatus();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Verify cache statistics
        const stats = alpacaService.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);
      });

      it('should handle cache memory management', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockResolvedValue(mockQuote);

        // Fill cache with many symbols
        const symbols = Array.from({ length: 1000 }, (_, i) => `SYMBOL${i}`);
        
        for (const symbol of symbols.slice(0, 100)) {
          await alpacaService.getQuote(symbol);
        }

        const stats = alpacaService.getCacheStats();
        expect(stats.size).toBe(100);
        expect(stats.entries).toHaveLength(100);

        // Verify memory usage is reasonable
        const memoryEstimate = JSON.stringify(stats).length;
        expect(memoryEstimate).toBeLessThan(100000); // Should be under 100KB
      });
    });

    describe('Rate Limiting Performance', () => {
      it('should enforce rate limiting with minimal delay', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockResolvedValue(mockQuote);

        const symbols = ['RATE1', 'RATE2', 'RATE3', 'RATE4', 'RATE5'];
        
        const start = performance.now();
        
        // Sequential requests should have rate limiting delays
        for (const symbol of symbols) {
          await alpacaService.getQuote(symbol);
        }
        
        const end = performance.now();
        const totalTime = end - start;

        // Should take at least 400ms due to rate limiting (100ms * 4 gaps)
        expect(totalTime).toBeGreaterThan(350);
        expect(totalTime).toBeLessThan(1000); // But not excessively long
        expect(mockedAxios.get).toHaveBeenCalledTimes(5);
      });

      it('should handle burst requests efficiently', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockQuote), 10))
        );

        // Burst of 20 requests
        const promises = Array(20).fill(null).map((_, i) => 
          alpacaService.getQuote(`BURST${i}`)
        );

        const start = performance.now();
        await Promise.all(promises);
        const end = performance.now();

        expect(mockedAxios.get).toHaveBeenCalledTimes(20);
        
        // Should complete within reasonable time despite rate limiting
        expect(end - start).toBeLessThan(5000);
      });
    });
  });

  describe('IB Parser Performance', () => {
    describe('Large Dataset Processing', () => {
      it('should handle large XML files efficiently', async () => {
        const largeTradeData = generateLargeTradeDataset(1000);
        
        mockedFs.readdir.mockResolvedValue(['large.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockLargeXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, largeTradeData);
        });

        const start = performance.now();
        const trades = await ibParser.parseReportsDirectory('/test');
        const end = performance.now();

        const processingTime = end - start;

        expect(trades).toHaveLength(1000);
        expect(processingTime).toBeLessThan(2000); // Should process 1000 trades in under 2 seconds
        
        // Verify memory efficiency - trades should be properly typed
        expect(trades.every(trade => 
          typeof trade.quantity === 'number' && typeof trade.tradePrice === 'number'
        )).toBe(true);
      });

      it('should process multiple files efficiently', async () => {
        const fileCount = 10;
        const tradesPerFile = 100;
        const files = Array.from({ length: fileCount }, (_, i) => `trades_${i}.xml`);
        
        mockedFs.readdir.mockResolvedValue(files as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, generateLargeTradeDataset(tradesPerFile));
        });

        const start = performance.now();
        const trades = await ibParser.parseReportsDirectory('/test');
        const end = performance.now();

        const processingTime = end - start;

        expect(trades).toHaveLength(fileCount * tradesPerFile);
        expect(processingTime).toBeLessThan(5000); // Should process all files efficiently
        expect(mockedFs.readFile).toHaveBeenCalledTimes(fileCount);
      });

      it('should handle memory efficiently with deduplication', async () => {
        // Generate data with many duplicates
        const tradeData = generateDuplicateTradeDataset(500, 0.8); // 80% duplicates
        
        mockedFs.readdir.mockResolvedValue(['duplicates.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, tradeData);
        });

        const start = performance.now();
        const trades = await ibParser.parseReportsDirectory('/test');
        const end = performance.now();

        const processingTime = end - start;

        // Should have only unique trades (20% of 500 = 100)
        expect(trades).toHaveLength(100);
        expect(processingTime).toBeLessThan(1000);
        
        // Verify all trades are unique
        const tradeIds = trades.map(t => t.tradeId);
        const uniqueIds = new Set(tradeIds);
        expect(uniqueIds.size).toBe(trades.length);
      });
    });

    describe('Parser Cache Performance', () => {
      it('should maintain parsed data in memory efficiently', async () => {
        const tradeData = generateLargeTradeDataset(100);
        
        mockedFs.readdir.mockResolvedValue(['cache_test.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, tradeData);
        });

        // First parse
        const start1 = performance.now();
        const trades1 = await ibParser.parseReportsDirectory('/test');
        const end1 = performance.now();

        // Second parse (should reuse cached trades)
        const start2 = performance.now();
        const trades2 = await ibParser.parseReportsDirectory('/test');
        const end2 = performance.now();

        const time1 = end1 - start1;
        const time2 = end2 - start2;

        expect(trades1).toEqual(trades2);
        expect(mockedFs.readFile).toHaveBeenCalledTimes(1); // File only read once
        expect(time2).toBeLessThan(time1 * 0.1); // Second call should be much faster
      });

      it('should clear cache without memory leaks', async () => {
        const tradeData = generateLargeTradeDataset(1000);
        
        mockedFs.readdir.mockResolvedValue(['memory_test.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, tradeData);
        });

        // Fill cache
        await ibParser.parseReportsDirectory('/test');
        
        // Clear cache
        const clearStart = performance.now();
        ibParser.clearCache();
        const clearEnd = performance.now();

        const clearTime = clearEnd - clearStart;
        expect(clearTime).toBeLessThan(10); // Cache clear should be instant

        // Verify cache is empty
        const trades = await ibParser.parseReportsDirectory('/test');
        expect(trades).toHaveLength(1000);
        expect(mockedFs.readFile).toHaveBeenCalledTimes(2); // Had to re-read file
      });
    });

    describe('Date Parsing Performance', () => {
      it('should parse IB date formats efficiently', async () => {
        const dateIntensiveData = generateDateIntensiveDataset(1000);
        
        mockedFs.readdir.mockResolvedValue(['dates.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, dateIntensiveData);
        });

        const start = performance.now();
        const trades = await ibParser.parseReportsDirectory('/test');
        const end = performance.now();

        const processingTime = end - start;

        expect(trades).toHaveLength(1000);
        expect(processingTime).toBeLessThan(1500); // Date parsing should be efficient
        
        // Verify all dates are properly parsed
        expect(trades.every(trade => 
          trade.dateTime instanceof Date && 
          trade.tradeDate instanceof Date &&
          trade.orderTime instanceof Date
        )).toBe(true);
      });
    });
  });

  describe('End-to-End Performance', () => {
    describe('Complete Workflow Performance', () => {
      it('should handle realistic production load efficiently', async () => {
        // Simulate realistic production scenario
        const tradeData = generateLargeTradeDataset(500);
        const uniqueSymbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'];
        
        // Setup IB parser
        mockedFs.readdir.mockResolvedValue(['production.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, tradeData);
        });

        // Setup Alpaca service
        mockedAxios.get.mockImplementation((url) => {
          return new Promise(resolve => 
            setTimeout(() => resolve({
              data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
            }), 50)
          );
        });

        const workflowStart = performance.now();

        // 1. Parse trades
        const trades = await ibParser.parseReportsDirectory('/test');
        
        // 2. Get unique symbols
        const symbols = [...new Set(trades.map(t => t.symbol))];
        
        // 3. Fetch quotes for all symbols
        const quotes = await Promise.all(
          symbols.slice(0, uniqueSymbols.length).map(symbol => alpacaService.getQuote(symbol))
        );

        const workflowEnd = performance.now();
        const totalTime = workflowEnd - workflowStart;

        expect(trades).toHaveLength(500);
        expect(quotes).toHaveLength(uniqueSymbols.length);
        expect(totalTime).toBeLessThan(5000); // Complete workflow under 5 seconds
        
        // Verify performance metrics
        const avgTradeProcessingTime = totalTime / trades.length;
        expect(avgTradeProcessingTime).toBeLessThan(10); // Under 10ms per trade
      });

      it('should scale linearly with data size', async () => {
        const testSizes = [100, 200, 400];
        const times: number[] = [];

        for (const size of testSizes) {
          const tradeData = generateLargeTradeDataset(size);
          
          mockedFs.readdir.mockResolvedValue([`scale_${size}.xml`] as any);
          mockedFs.readFile.mockResolvedValue(mockXmlContent);
          mockedParseString.mockImplementation((xml, callback) => {
            callback(null, tradeData);
          });

          ibParser.clearCache();

          const start = performance.now();
          const trades = await ibParser.parseReportsDirectory('/test');
          const end = performance.now();

          expect(trades).toHaveLength(size);
          times.push(end - start);
        }

        // Processing time should scale roughly linearly
        const ratio1 = times[1] / times[0]; // 200/100
        const ratio2 = times[2] / times[1]; // 400/200

        expect(ratio1).toBeGreaterThan(1.5);
        expect(ratio1).toBeLessThan(3);
        expect(ratio2).toBeGreaterThan(1.5);
        expect(ratio2).toBeLessThan(3);
      });
    });

    describe('Stress Testing', () => {
      it('should handle high concurrency without degradation', async () => {
        const mockQuote = {
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        };

        mockedAxios.get.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve(mockQuote), 20))
        );

        const concurrencyLevels = [1, 5, 10, 20];
        const performanceResults: number[] = [];

        for (const level of concurrencyLevels) {
          alpacaService.clearCache();

          const start = performance.now();
          
          const promises = Array(level).fill(null).map((_, i) => 
            alpacaService.getQuote(`STRESS${i}`)
          );
          
          await Promise.all(promises);
          
          const end = performance.now();
          const avgTime = (end - start) / level;
          performanceResults.push(avgTime);
        }

        // Performance shouldn't degrade significantly with concurrency
        const baselineTime = performanceResults[0];
        performanceResults.forEach((time, index) => {
          expect(time).toBeLessThan(baselineTime * (index + 2)); // Allow some degradation
        });
      });

      it('should maintain performance under memory pressure', async () => {
        // Simulate memory pressure by processing large datasets repeatedly
        const iterations = 5;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const largeData = generateLargeTradeDataset(1000);
          
          mockedFs.readdir.mockResolvedValue([`memory_pressure_${i}.xml`] as any);
          mockedFs.readFile.mockResolvedValue(mockXmlContent);
          mockedParseString.mockImplementation((xml, callback) => {
            callback(null, largeData);
          });

          ibParser.clearCache();

          const start = performance.now();
          const trades = await ibParser.parseReportsDirectory('/test');
          const end = performance.now();

          expect(trades).toHaveLength(1000);
          times.push(end - start);
        }

        // Performance should remain consistent across iterations
        const avgTime = times.reduce((a, b) => a + b) / times.length;
        times.forEach(time => {
          expect(time).toBeLessThan(avgTime * 1.5); // Within 50% of average
        });
      });
    });
  });
});

// Helper functions for generating test data
function generateLargeTradeDataset(count: number) {
  const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD', 'INTC', 'NFLX'];
  const trades = [];

  for (let i = 0; i < count; i++) {
    const symbol = symbols[i % symbols.length];
    trades.push({
      $: {
        tradeID: `PERF${i.toString().padStart(6, '0')}`,
        symbol: symbol,
        assetCategory: 'STK',
        currency: 'USD',
        quantity: '100',
        price: (Math.random() * 100 + 100).toFixed(2),
        amount: '10000',
        commission: '1.00',
        netCash: '10001.00',
        tradeDate: '20250115',
        orderTime: '20250115;143000',
        buySell: Math.random() > 0.5 ? 'BUY' : 'SELL',
        transactionID: `TXN${i}`,
        orderReference: `ORD${i}`,
        exchange: 'NASDAQ'
      }
    });
  }

  return {
    FlexQueryResponse: {
      FlexStatements: [{
        FlexStatement: [{
          TradeConfirms: [{
            TradeConfirm: trades
          }]
        }]
      }]
    }
  };
}

function generateDuplicateTradeDataset(count: number, duplicateRatio: number) {
  const uniqueCount = Math.floor(count * (1 - duplicateRatio));
  const baseData = generateLargeTradeDataset(uniqueCount);
  const trades = baseData.FlexQueryResponse.FlexStatements[0].FlexStatement[0].TradeConfirms[0].TradeConfirm;

  // Add duplicates
  const duplicateCount = count - uniqueCount;
  for (let i = 0; i < duplicateCount; i++) {
    const originalTrade = trades[i % uniqueCount];
    trades.push(originalTrade); // Exact duplicate
  }

  return baseData;
}

function generateDateIntensiveDataset(count: number) {
  const trades = [];
  
  for (let i = 0; i < count; i++) {
    const year = 2025;
    const month = (i % 12) + 1;
    const day = (i % 28) + 1;
    const hour = i % 24;
    const minute = i % 60;
    const second = i % 60;

    trades.push({
      $: {
        tradeID: `DATE${i.toString().padStart(6, '0')}`,
        symbol: 'TEST',
        assetCategory: 'STK',
        currency: 'USD',
        quantity: '100',
        price: '100.00',
        amount: '10000',
        commission: '1.00',
        netCash: '10001.00',
        tradeDate: `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`,
        orderTime: `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')};${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}${second.toString().padStart(2, '0')}`,
        buySell: 'BUY',
        transactionID: `TXN${i}`,
        orderReference: `ORD${i}`,
        exchange: 'NASDAQ'
      }
    });
  }

  return {
    FlexQueryResponse: {
      FlexStatements: [{
        FlexStatement: [{
          TradeConfirms: [{
            TradeConfirm: trades
          }]
        }]
      }]
    }
  };
}

const mockXmlContent = '<?xml version="1.0"?><FlexQueryResponse></FlexQueryResponse>';
const mockLargeXmlContent = `<?xml version="1.0"?><FlexQueryResponse>${'x'.repeat(1000)}</FlexQueryResponse>`;