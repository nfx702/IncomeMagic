import { AlpacaService } from '@/services/alpacaService';
import { IBTradeParser } from '@/services/xmlParser';
import { Trade } from '@/types/trade';
import fs from 'fs/promises';
import axios from 'axios';

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

describe('Data Integration Tests', () => {
  let alpacaService: AlpacaService;
  let ibParser: IBTradeParser;

  beforeEach(() => {
    // Reset singletons
    (AlpacaService as any).instance = undefined;
    (IBTradeParser as any).instance = undefined;
    
    // Set up environment for testing
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

  describe('End-to-End Data Flow', () => {
    it('should integrate IB trade data with live Alpaca quotes', async () => {
      // Mock IB trade data
      const mockTrades = createMockTrades();
      
      // Mock Alpaca quote responses
      const mockAaplQuote = {
        data: {
          quote: {
            bp: 190.50,
            ap: 190.75,
            bs: 100,
            as: 200,
            t: '2025-01-15T15:30:00Z'
          }
        }
      };

      const mockTslaQuote = {
        data: {
          quote: {
            bp: 245.25,
            ap: 245.50,
            bs: 150,
            as: 175,
            t: '2025-01-15T15:30:00Z'
          }
        }
      };

      // Setup IB parser mocks
      mockedFs.readdir.mockResolvedValue(['trades.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockIBTradeData);
      });

      // Setup Alpaca service mocks
      mockedAxios.get
        .mockResolvedValueOnce(mockAaplQuote)
        .mockResolvedValueOnce(mockTslaQuote);

      // Execute integration flow
      const trades = await ibParser.parseReportsDirectory('/test/reports');
      const uniqueSymbols = [...new Set(trades.map(t => t.symbol))];
      
      const quotes = await Promise.all(
        uniqueSymbols.map(symbol => alpacaService.getQuote(symbol))
      );

      // Verify integration
      expect(trades.length).toBe(2);
      expect(quotes.length).toBe(2);
      
      // Verify AAPL data
      const aaplTrade = trades.find(t => t.symbol === 'AAPL');
      const aaplQuote = quotes.find(q => q.symbol === 'AAPL');
      
      expect(aaplTrade).toBeDefined();
      expect(aaplQuote).toBeDefined();
      expect(aaplQuote!.bidPrice).toBe(190.50);
      expect(aaplQuote!.askPrice).toBe(190.75);
      
      // Verify TSLA data
      const tslaTrade = trades.find(t => t.symbol === 'TSLA');
      const tslaQuote = quotes.find(q => q.symbol === 'TSLA');
      
      expect(tslaTrade).toBeDefined();
      expect(tslaQuote).toBeDefined();
      expect(tslaQuote!.bidPrice).toBe(245.25);
      expect(tslaQuote!.askPrice).toBe(245.50);
    });

    it('should handle mixed asset types correctly', async () => {
      const mockMixedTrades = createMockMixedAssetTrades();
      
      mockedFs.readdir.mockResolvedValue(['mixed_trades.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockMixedTradeData);
      });

      // Mock quotes for underlying symbols
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('AAPL')) {
          return Promise.resolve({
            data: { quote: { bp: 190, ap: 190.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
          });
        }
        if (url.includes('TSLA')) {
          return Promise.resolve({
            data: { quote: { bp: 245, ap: 245.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
          });
        }
        return Promise.reject(new Error('Unknown symbol'));
      });

      const trades = await ibParser.parseReportsDirectory('/test/reports');
      
      // Extract underlying symbols for options
      const symbols = trades.map(trade => {
        if (trade.assetCategory === 'OPT' && trade.underlyingSymbol) {
          return trade.underlyingSymbol;
        }
        return trade.symbol;
      });
      
      const uniqueSymbols = [...new Set(symbols)];
      const quotes = await Promise.all(
        uniqueSymbols.map(symbol => alpacaService.getQuote(symbol))
      );

      expect(trades.length).toBe(3); // Stock, put, call
      expect(uniqueSymbols.length).toBe(2); // AAPL, TSLA
      expect(quotes.length).toBe(2);

      // Verify options have underlying symbols
      const optionTrades = trades.filter(t => t.assetCategory === 'OPT');
      expect(optionTrades.length).toBe(2);
      expect(optionTrades.every(t => t.underlyingSymbol)).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should efficiently handle large datasets with caching', async () => {
      const largeMockData = createLargeTradeDataset(100);
      
      mockedFs.readdir.mockResolvedValue(['large_dataset.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, largeMockData);
      });

      // Mock single Alpaca response (others should be cached)
      mockedAxios.get.mockResolvedValue({
        data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
      });

      const startTime = Date.now();
      
      const trades = await ibParser.parseReportsDirectory('/test/reports');
      const symbols = [...new Set(trades.map(t => t.symbol))].slice(0, 10); // Test first 10 symbols
      
      // First batch of quotes (should make API calls)
      await Promise.all(symbols.map(symbol => alpacaService.getQuote(symbol)));
      
      // Second batch of same quotes (should use cache)
      await Promise.all(symbols.map(symbol => alpacaService.getQuote(symbol)));
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(trades.length).toBe(100);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockedAxios.get).toHaveBeenCalledTimes(symbols.length); // No duplicate API calls
    });

    it('should handle concurrent requests efficiently', async () => {
      mockedFs.readdir.mockResolvedValue(['concurrent_test.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockIBTradeData);
      });

      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
          }), 100)
        )
      );

      const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];
      
      const startTime = Date.now();
      
      // Concurrent requests
      const quotes = await Promise.all(
        symbols.map(symbol => alpacaService.getQuote(symbol))
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(quotes.length).toBe(5);
      expect(executionTime).toBeLessThan(1000); // Should handle concurrency efficiently
      expect(executionTime).toBeGreaterThan(100); // But respect rate limiting
    });
  });

  describe('Error Resilience Integration', () => {
    it('should gracefully handle partial data failures', async () => {
      // Setup partial IB data success
      mockedFs.readdir.mockResolvedValue(['trades.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockIBTradeData);
      });

      // Setup mixed Alpaca responses (some succeed, some fail)
      mockedAxios.get
        .mockResolvedValueOnce({ data: { quote: { bp: 190, ap: 190.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } } })
        .mockRejectedValueOnce(new Error('Network error'));

      const trades = await ibParser.parseReportsDirectory('/test/reports');
      const symbols = [...new Set(trades.map(t => t.symbol))];
      
      // Should not throw, should return mix of real and mock data
      const quotes = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            return await alpacaService.getQuote(symbol);
          } catch (error) {
            return await alpacaService.getQuote(symbol); // Should return mock data
          }
        })
      );

      expect(trades.length).toBeGreaterThan(0);
      expect(quotes.length).toBe(symbols.length);
      expect(quotes.every(q => q.symbol && q.bidPrice > 0)).toBe(true);
    });

    it('should maintain data consistency during failures', async () => {
      // Test IB parser failure recovery
      mockedFs.readdir.mockResolvedValue(['corrupted.xml', 'valid.xml'] as any);
      mockedFs.readFile
        .mockRejectedValueOnce(new Error('File read error'))
        .mockResolvedValueOnce(mockXmlContent);
      
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockIBTradeData);
      });

      mockedAxios.get.mockResolvedValue({
        data: { quote: { bp: 100, ap: 100.25, bs: 100, as: 100, t: '2025-01-15T15:30:00Z' } }
      });

      // Should recover from first file failure and process second file
      const trades = await ibParser.parseReportsDirectory('/test/reports');
      
      expect(trades.length).toBeGreaterThan(0);
      
      const symbols = [...new Set(trades.map(t => t.symbol))];
      const quotes = await Promise.all(
        symbols.map(symbol => alpacaService.getQuote(symbol))
      );

      expect(quotes.length).toBe(symbols.length);
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate data consistency between IB and Alpaca', async () => {
      mockedFs.readdir.mockResolvedValue(['validation_test.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockIBTradeData);
      });

      // Return quotes with realistic data
      mockedAxios.get.mockImplementation((url) => {
        const symbol = url.split('/').slice(-2, -1)[0];
        return Promise.resolve({
          data: {
            quote: {
              bp: 100,
              ap: 100.25,
              bs: Math.floor(Math.random() * 1000) + 100,
              as: Math.floor(Math.random() * 1000) + 100,
              t: '2025-01-15T15:30:00Z'
            }
          }
        });
      });

      const trades = await ibParser.parseReportsDirectory('/test/reports');
      const symbols = [...new Set(trades.map(t => t.symbol))];
      const quotes = await Promise.all(
        symbols.map(symbol => alpacaService.getQuote(symbol))
      );

      // Validate data structure consistency
      trades.forEach(trade => {
        expect(trade.id).toBeDefined();
        expect(trade.symbol).toBeDefined();
        expect(typeof trade.quantity).toBe('number');
        expect(typeof trade.tradePrice).toBe('number');
        expect(trade.dateTime).toBeInstanceOf(Date);
      });

      quotes.forEach(quote => {
        expect(quote.symbol).toBeDefined();
        expect(typeof quote.bidPrice).toBe('number');
        expect(typeof quote.askPrice).toBe('number');
        expect(quote.bidPrice > 0).toBe(true);
        expect(quote.askPrice >= quote.bidPrice).toBe(true);
        expect(quote.timestamp).toBeInstanceOf(Date);
      });

      // Ensure symbols match
      const tradeSymbols = new Set(trades.map(t => t.symbol));
      const quoteSymbols = new Set(quotes.map(q => q.symbol));
      expect([...tradeSymbols].every(s => quoteSymbols.has(s))).toBe(true);
    });
  });

  describe('Development Mode Integration', () => {
    it('should work in development mode without API credentials', async () => {
      // Reset to development mode
      delete process.env.ALPACA_API_KEY_ID;
      delete process.env.ALPACA_API_SECRET_KEY;
      process.env.NEXT_PUBLIC_DEVELOPMENT_MODE = 'true';

      (AlpacaService as any).instance = undefined;
      const devAlpacaService = AlpacaService.getInstance();

      mockedFs.readdir.mockResolvedValue(['dev_test.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockIBTradeData);
      });

      const trades = await ibParser.parseReportsDirectory('/test/reports');
      const symbols = [...new Set(trades.map(t => t.symbol))];
      
      // Should return mock data without API calls
      const quotes = await Promise.all(
        symbols.map(symbol => devAlpacaService.getQuote(symbol))
      );

      expect(trades.length).toBeGreaterThan(0);
      expect(quotes.length).toBe(symbols.length);
      expect(quotes.every(q => q.bidPrice > 0)).toBe(true);
      expect(mockedAxios.get).not.toHaveBeenCalled(); // No API calls in dev mode
    });
  });
});

// Mock data creators
function createMockTrades(): Trade[] {
  return [
    {
      id: 'TRADE001',
      tradeId: 'TRADE001',
      dateTime: new Date('2025-01-15T14:30:00Z'),
      symbol: 'AAPL',
      assetCategory: 'STK',
      currency: 'USD',
      quantity: 100,
      tradePrice: 190.25,
      tradeMoney: 19025,
      proceeds: 19025,
      commissionAndTax: 1,
      netCash: 19026,
      orderTime: new Date('2025-01-15T14:30:00Z'),
      openDateTime: new Date('2025-01-15T14:30:00Z'),
      reportDate: new Date('2025-01-15'),
      tradeDate: new Date('2025-01-15'),
      buy_sell: 'BUY',
      transactionId: 'TXN001',
      orderReference: 'ORD001',
      exchange: 'NASDAQ'
    },
    {
      id: 'TRADE002',
      tradeId: 'TRADE002',
      dateTime: new Date('2025-01-15T15:00:00Z'),
      symbol: 'TSLA',
      assetCategory: 'STK',
      currency: 'USD',
      quantity: 50,
      tradePrice: 245.50,
      tradeMoney: 12275,
      proceeds: 12275,
      commissionAndTax: 1,
      netCash: 12276,
      orderTime: new Date('2025-01-15T15:00:00Z'),
      openDateTime: new Date('2025-01-15T15:00:00Z'),
      reportDate: new Date('2025-01-15'),
      tradeDate: new Date('2025-01-15'),
      buy_sell: 'BUY',
      transactionId: 'TXN002',
      orderReference: 'ORD002',
      exchange: 'NASDAQ'
    }
  ];
}

function createMockMixedAssetTrades() {
  return [
    // Stock trade
    {
      id: 'STK001',
      symbol: 'AAPL',
      assetCategory: 'STK',
    },
    // Put option
    {
      id: 'OPT001',
      symbol: 'AAPL  250417P00190000',
      assetCategory: 'OPT',
      underlyingSymbol: 'AAPL',
      putCall: 'P',
      strike: 190,
    },
    // Call option
    {
      id: 'OPT002',
      symbol: 'TSLA  250117C00250000',
      assetCategory: 'OPT',
      underlyingSymbol: 'TSLA',
      putCall: 'C',
      strike: 250,
    }
  ];
}

function createLargeTradeDataset(count: number) {
  const trades = [];
  const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD', 'INTC', 'NFLX'];
  
  for (let i = 0; i < count; i++) {
    const symbol = symbols[i % symbols.length];
    trades.push({
      $: {
        tradeID: `LARGE${i.toString().padStart(3, '0')}`,
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

// Mock XML data
const mockXmlContent = '<?xml version="1.0"?><FlexQueryResponse></FlexQueryResponse>';

const mockIBTradeData = {
  FlexQueryResponse: {
    FlexStatements: [{
      FlexStatement: [{
        TradeConfirms: [{
          TradeConfirm: [
            {
              $: {
                tradeID: 'TRADE001',
                symbol: 'AAPL',
                assetCategory: 'STK',
                currency: 'USD',
                quantity: '100',
                price: '190.25',
                amount: '19025.00',
                commission: '1.00',
                netCash: '19026.00',
                tradeDate: '20250115',
                orderTime: '20250115;143000',
                buySell: 'BUY',
                transactionID: 'TXN001',
                orderReference: 'ORD001',
                exchange: 'NASDAQ'
              }
            },
            {
              $: {
                tradeID: 'TRADE002',
                symbol: 'TSLA',
                assetCategory: 'STK',
                currency: 'USD',
                quantity: '50',
                price: '245.50',
                amount: '12275.00',
                commission: '1.00',
                netCash: '12276.00',
                tradeDate: '20250115',
                orderTime: '20250115;150000',
                buySell: 'BUY',
                transactionID: 'TXN002',
                orderReference: 'ORD002',
                exchange: 'NASDAQ'
              }
            }
          ]
        }]
      }]
    }]
  }
};

const mockMixedTradeData = {
  FlexQueryResponse: {
    FlexStatements: [{
      FlexStatement: [{
        TradeConfirms: [{
          TradeConfirm: [
            {
              $: {
                tradeID: 'STK001',
                symbol: 'AAPL',
                assetCategory: 'STK',
                currency: 'USD',
                quantity: '100',
                price: '190.25',
                amount: '19025.00',
                commission: '1.00',
                netCash: '19026.00',
                tradeDate: '20250115',
                buySell: 'BUY',
                exchange: 'NASDAQ',
                transactionID: 'TXN001',
                orderReference: 'ORD001'
              }
            },
            {
              $: {
                tradeID: 'OPT001',
                symbol: 'AAPL  250417P00190000',
                assetCategory: 'OPT',
                currency: 'USD',
                quantity: '1',
                price: '5.50',
                amount: '550.00',
                commission: '1.00',
                netCash: '549.00',
                tradeDate: '20250115',
                buySell: 'SELL',
                putCall: 'P',
                strike: '190',
                expiry: '20250417',
                exchange: 'CBOE',
                transactionID: 'TXN002',
                orderReference: 'ORD002'
              }
            },
            {
              $: {
                tradeID: 'OPT002',
                symbol: 'TSLA  250117C00250000',
                assetCategory: 'OPT',
                currency: 'USD',
                quantity: '1',
                price: '8.25',
                amount: '825.00',
                commission: '1.00',
                netCash: '824.00',
                tradeDate: '20250115',
                buySell: 'SELL',
                putCall: 'C',
                strike: '250',
                expiry: '20250117',
                exchange: 'CBOE',
                transactionID: 'TXN003',
                orderReference: 'ORD003'
              }
            }
          ]
        }]
      }]
    }]
  }
};