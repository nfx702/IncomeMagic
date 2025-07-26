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

describe('Error Handling and Fallback Tests', () => {
  let alpacaService: AlpacaService;
  let ibParser: IBTradeParser;

  beforeEach(() => {
    // Reset singletons
    (AlpacaService as any).instance = undefined;
    (IBTradeParser as any).instance = undefined;
    
    // Default environment setup
    process.env.ALPACA_API_KEY_ID = 'test_key';
    process.env.ALPACA_API_SECRET_KEY = 'test_secret';
    process.env.NEXT_PUBLIC_DEVELOPMENT_MODE = 'false';
    process.env.NEXT_PUBLIC_SUPPRESS_API_ERRORS = 'false';
    
    alpacaService = AlpacaService.getInstance();
    ibParser = IBTradeParser.getInstance();
    
    alpacaService.clearCache();
    ibParser.clearCache();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.ALPACA_API_KEY_ID;
    delete process.env.ALPACA_API_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_DEVELOPMENT_MODE;
    delete process.env.NEXT_PUBLIC_SUPPRESS_API_ERRORS;
  });

  describe('Alpaca Service Error Handling', () => {
    describe('Network Errors', () => {
      it('should fall back to mock data on network timeout', async () => {
        mockedAxios.get.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout' });

        const result = await alpacaService.getQuote('AAPL');

        expect(result).toMatchObject({
          symbol: 'AAPL',
          bidPrice: expect.any(Number),
          askPrice: expect.any(Number),
          lastPrice: expect.any(Number)
        });
        expect(result.bidPrice).toBeGreaterThan(0);
        expect(result.askPrice).toBeGreaterThan(result.bidPrice);
      });

      it('should handle DNS resolution failures', async () => {
        mockedAxios.get.mockRejectedValue({ code: 'ENOTFOUND', message: 'DNS lookup failed' });

        const result = await alpacaService.getQuote('TSLA');

        expect(result.symbol).toBe('TSLA');
        expect(result.lastPrice).toBeGreaterThan(0);
      });

      it('should handle connection refused errors', async () => {
        mockedAxios.get.mockRejectedValue({ code: 'ECONNREFUSED', message: 'Connection refused' });

        const result = await alpacaService.getQuote('MSFT');

        expect(result.symbol).toBe('MSFT');
        expect(result.bidPrice).toBeGreaterThan(0);
      });
    });

    describe('HTTP Error Responses', () => {
      it('should handle 401 Unauthorized gracefully', async () => {
        mockedAxios.get.mockRejectedValue({
          response: { status: 401, statusText: 'Unauthorized', data: { message: 'Invalid credentials' } }
        });

        const result = await alpacaService.getQuote('AAPL');

        expect(result.symbol).toBe('AAPL');
        expect(result.lastPrice).toBeGreaterThan(0);
      });

      it('should handle 403 Forbidden responses', async () => {
        mockedAxios.get.mockRejectedValue({
          response: { status: 403, statusText: 'Forbidden', data: { message: 'Access denied' } }
        });

        const result = await alpacaService.getQuote('GOOGL');

        expect(result.symbol).toBe('GOOGL');
        expect(result.bidPrice).toBeGreaterThan(0);
      });

      it('should handle 429 Rate Limited responses with retry logic', async () => {
        let callCount = 0;
        mockedAxios.get.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject({
              response: { status: 429, statusText: 'Too Many Requests', headers: { 'retry-after': '1' } }
            });
          }
          return Promise.resolve({
            data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
          });
        });

        const result = await alpacaService.getQuote('AMZN');

        expect(result.symbol).toBe('AMZN');
        expect(result.bidPrice).toBe(100);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should fall back, not retry
      });

      it('should handle 500 Internal Server Error', async () => {
        mockedAxios.get.mockRejectedValue({
          response: { status: 500, statusText: 'Internal Server Error' }
        });

        const result = await alpacaService.getQuote('NFLX');

        expect(result.symbol).toBe('NFLX');
        expect(result.lastPrice).toBeGreaterThan(0);
      });

      it('should handle 503 Service Unavailable', async () => {
        mockedAxios.get.mockRejectedValue({
          response: { status: 503, statusText: 'Service Unavailable' }
        });

        const result = await alpacaService.getQuote('META');

        expect(result.symbol).toBe('META');
        expect(result.bidPrice).toBeGreaterThan(0);
      });
    });

    describe('Malformed Response Handling', () => {
      it('should handle missing quote data', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {} // Empty response
        });

        const result = await alpacaService.getQuote('AAPL');

        expect(result.symbol).toBe('AAPL');
        expect(result.bidPrice).toBe(0);
        expect(result.askPrice).toBe(0);
      });

      it('should handle null/undefined quote values', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            quote: {
              bp: null,
              ap: undefined,
              bs: 'invalid',
              as: NaN,
              t: 'invalid-date'
            }
          }
        });

        const result = await alpacaService.getQuote('TEST');

        expect(result.symbol).toBe('TEST');
        expect(result.bidPrice).toBe(0);
        expect(result.askPrice).toBe(0);
        expect(result.bidSize).toBe(0);
        expect(result.askSize).toBe(0);
      });

      it('should handle corrupted JSON responses', async () => {
        mockedAxios.get.mockResolvedValue({
          data: 'corrupted-json-data'
        });

        const result = await alpacaService.getQuote('CORRUPT');

        expect(result.symbol).toBe('CORRUPT');
        expect(result.lastPrice).toBeGreaterThan(0);
      });
    });

    describe('Market Status Error Handling', () => {
      it('should handle market status API failures gracefully', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Market API down'));

        const result = await alpacaService.getMarketStatus();

        expect(result).toHaveProperty('isOpen');
        expect(typeof result.isOpen).toBe('boolean');
        expect(result.nextOpen).toBeInstanceOf(Date);
      });

      it('should handle malformed market status responses', async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            is_open: 'not-a-boolean',
            next_open: 'invalid-date'
          }
        });

        const result = await alpacaService.getMarketStatus();

        expect(typeof result.isOpen).toBe('boolean');
        expect(result.nextOpen).toBeInstanceOf(Date);
      });
    });
  });

  describe('IB Parser Error Handling', () => {
    describe('File System Errors', () => {
      it('should handle directory access denied', async () => {
        mockedFs.readdir.mockRejectedValue({
          code: 'EACCES',
          message: 'Permission denied'
        });

        await expect(ibParser.parseReportsDirectory('/forbidden')).rejects.toThrow('Permission denied');
      });

      it('should handle non-existent directory', async () => {
        mockedFs.readdir.mockRejectedValue({
          code: 'ENOENT',
          message: 'Directory not found'
        });

        await expect(ibParser.parseReportsDirectory('/nonexistent')).rejects.toThrow('Directory not found');
      });

      it('should handle file read permission errors', async () => {
        mockedFs.readdir.mockResolvedValue(['protected.xml'] as any);
        mockedFs.readFile.mockRejectedValue({
          code: 'EACCES',
          message: 'File access denied'
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });

      it('should handle corrupted file content', async () => {
        mockedFs.readdir.mockResolvedValue(['corrupted.xml'] as any);
        mockedFs.readFile.mockResolvedValue('�������corrupted binary data�������');
        mockedParseString.mockImplementation((xml, callback) => {
          callback(new Error('Invalid XML: unexpected character'), null);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });
    });

    describe('XML Parsing Errors', () => {
      it('should handle malformed XML structure', async () => {
        mockedFs.readdir.mockResolvedValue(['malformed.xml'] as any);
        mockedFs.readFile.mockResolvedValue('<invalid><xml>structure</wrong></xml>');
        mockedParseString.mockImplementation((xml, callback) => {
          callback(new Error('XML parse error: mismatched tags'), null);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });

      it('should handle empty XML files', async () => {
        mockedFs.readdir.mockResolvedValue(['empty.xml'] as any);
        mockedFs.readFile.mockResolvedValue('');
        mockedParseString.mockImplementation((xml, callback) => {
          callback(new Error('XML parse error: empty content'), null);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });

      it('should handle unexpected XML schema', async () => {
        mockedFs.readdir.mockResolvedValue(['unexpected.xml'] as any);
        mockedFs.readFile.mockResolvedValue('<UnexpectedRoot><Data>test</Data></UnexpectedRoot>');
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, {
            UnexpectedRoot: {
              Data: ['test']
            }
          });
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });
    });

    describe('Trade Data Validation Errors', () => {
      it('should handle trades with missing required fields', async () => {
        const invalidTradeData = {
          FlexQueryResponse: {
            FlexStatements: [{
              FlexStatement: [{
                TradeConfirms: [{
                  TradeConfirm: [
                    { $: { symbol: 'AAPL' } }, // Missing tradeID, price, etc.
                    { $: { tradeID: 'VALID001', symbol: 'TSLA', price: '100', quantity: '10', buySell: 'BUY' } } // Valid
                  ]
                }]
              }]
            }]
          }
        };

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockedFs.readdir.mockResolvedValue(['mixed-validity.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, invalidTradeData);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toHaveLength(1); // Only valid trade should be included
        expect(trades[0].id).toBe('VALID001');
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it('should handle invalid numeric values', async () => {
        const invalidNumericData = {
          FlexQueryResponse: {
            FlexStatements: [{
              FlexStatement: [{
                TradeConfirms: [{
                  TradeConfirm: [{
                    $: {
                      tradeID: 'INVALID_NUMS',
                      symbol: 'TEST',
                      assetCategory: 'STK',
                      quantity: 'not-a-number',
                      price: 'invalid-price',
                      amount: '∞',
                      commission: 'free',
                      buySell: 'BUY',
                      tradeDate: '20250115',
                      currency: 'USD',
                      exchange: 'TEST',
                      transactionID: 'TXN001',
                      orderReference: 'ORD001',
                      netCash: '0'
                    }
                  }]
                }]
              }]
            }]
          }
        };

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockedFs.readdir.mockResolvedValue(['invalid-numbers.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, invalidNumericData);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it('should handle invalid date formats', async () => {
        const invalidDateData = {
          FlexQueryResponse: {
            FlexStatements: [{
              FlexStatement: [{
                TradeConfirms: [{
                  TradeConfirm: [{
                    $: {
                      tradeID: 'INVALID_DATE',
                      symbol: 'TEST',
                      assetCategory: 'STK',
                      quantity: '100',
                      price: '100',
                      amount: '10000',
                      commission: '1',
                      netCash: '10001',
                      buySell: 'BUY',
                      tradeDate: 'invalid-date-format',
                      orderTime: '2025-13-45', // Invalid month/day
                      currency: 'USD',
                      exchange: 'TEST',
                      transactionID: 'TXN001',
                      orderReference: 'ORD001'
                    }
                  }]
                }]
              }]
            }]
          }
        };

        mockedFs.readdir.mockResolvedValue(['invalid-dates.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, invalidDateData);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toHaveLength(1);
        expect(trades[0].tradeDate).toBeInstanceOf(Date);
        expect(trades[0].orderTime).toBeInstanceOf(Date);
      });
    });

    describe('Memory and Performance Error Handling', () => {
      it('should handle extremely large XML files', async () => {
        const largeXmlContent = '<FlexQueryResponse>' + 'x'.repeat(100 * 1024 * 1024) + '</FlexQueryResponse>';
        
        mockedFs.readdir.mockResolvedValue(['huge.xml'] as any);
        mockedFs.readFile.mockResolvedValue(largeXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          // Simulate memory error
          callback(new Error('JavaScript heap out of memory'), null);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });

      it('should handle processing timeout scenarios', async () => {
        mockedFs.readdir.mockResolvedValue(['slow.xml'] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          // Simulate very slow parsing
          setTimeout(() => {
            callback(new Error('Processing timeout'), null);
          }, 10);
        });

        const trades = await ibParser.parseReportsDirectory('/test');

        expect(trades).toEqual([]);
      });
    });
  });

  describe('Development Mode Error Suppression', () => {
    it('should suppress errors in development mode', async () => {
      process.env.NEXT_PUBLIC_DEVELOPMENT_MODE = 'true';
      process.env.NEXT_PUBLIC_SUPPRESS_API_ERRORS = 'true';
      
      (AlpacaService as any).instance = undefined;
      const devService = AlpacaService.getInstance();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await devService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.lastPrice).toBeGreaterThan(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should still log errors when suppression is disabled', async () => {
      process.env.NEXT_PUBLIC_DEVELOPMENT_MODE = 'true';
      process.env.NEXT_PUBLIC_SUPPRESS_API_ERRORS = 'false';
      
      (AlpacaService as any).instance = undefined;
      const devService = AlpacaService.getInstance();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      const result = await devService.getQuote('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Recovery and Resilience', () => {
    it('should recover from temporary API failures', async () => {
      let failureCount = 0;
      mockedAxios.get.mockImplementation(() => {
        failureCount++;
        if (failureCount <= 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
        });
      });

      // Clear cache to ensure fresh requests
      alpacaService.clearCache();

      // First two calls should return mock data due to failures
      const result1 = await alpacaService.getQuote('RECOVERY1');
      const result2 = await alpacaService.getQuote('RECOVERY2');
      const result3 = await alpacaService.getQuote('RECOVERY3');

      expect(result1.symbol).toBe('RECOVERY1');
      expect(result2.symbol).toBe('RECOVERY2');
      expect(result3.symbol).toBe('RECOVERY3');
      expect(result3.bidPrice).toBe(100); // Should get real data on third try
    });

    it('should maintain service availability during cascading failures', async () => {
      // Simulate various types of failures
      const failures = [
        new Error('Network timeout'),
        { response: { status: 403 } },
        { response: { status: 500 } },
        { code: 'ECONNREFUSED' },
        new Error('Rate limit exceeded')
      ];

      let failureIndex = 0;
      mockedAxios.get.mockImplementation(() => {
        const failure = failures[failureIndex % failures.length];
        failureIndex++;
        return Promise.reject(failure);
      });

      const symbols = ['FAIL1', 'FAIL2', 'FAIL3', 'FAIL4', 'FAIL5'];
      
      // All should return mock data despite different failure types
      const results = await Promise.all(
        symbols.map(symbol => alpacaService.getQuote(symbol))
      );

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.symbol).toBe(symbols[index]);
        expect(result.lastPrice).toBeGreaterThan(0);
      });
    });

    it('should handle mixed success/failure scenarios in batch operations', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('SUCCESS')) {
          return Promise.resolve({
            data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
          });
        } else {
          return Promise.reject(new Error('API failure'));
        }
      });

      const mixedSymbols = ['SUCCESS1', 'FAIL1', 'SUCCESS2', 'FAIL2'];
      
      const results = await Promise.all(
        mixedSymbols.map(symbol => alpacaService.getQuote(symbol))
      );

      expect(results).toHaveLength(4);
      
      // Success cases should return real data
      expect(results[0].bidPrice).toBe(100);
      expect(results[2].bidPrice).toBe(100);
      
      // Failure cases should return mock data
      expect(results[1].bidPrice).toBeGreaterThan(0);
      expect(results[3].bidPrice).toBeGreaterThan(0);
      
      // All should have correct symbols
      results.forEach((result, index) => {
        expect(result.symbol).toBe(mixedSymbols[index]);
      });
    });
  });
});

const mockXmlContent = '<?xml version="1.0"?><FlexQueryResponse></FlexQueryResponse>';