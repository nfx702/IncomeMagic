import { IBTradeParser } from '@/services/xmlParser';
import { Trade } from '@/types/trade';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock xml2js
jest.mock('xml2js', () => ({
  parseString: jest.fn()
}));

import { parseString } from 'xml2js';
const mockedParseString = parseString as jest.MockedFunction<typeof parseString>;

describe('IBTradeParser', () => {
  let parser: IBTradeParser;

  beforeEach(() => {
    // Reset singleton instance
    (IBTradeParser as any).instance = undefined;
    parser = IBTradeParser.getInstance();
    parser.clearCache();
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = IBTradeParser.getInstance();
      const instance2 = IBTradeParser.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across calls', async () => {
      // Mock successful file operations
      mockedFs.readdir.mockResolvedValue(['test1.xml', 'test2.xml', 'not-xml.txt'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockValidTradeData);
      });

      await parser.parseReportsDirectory('/test/dir');
      
      // Get another instance and verify it has the same data
      const anotherParser = IBTradeParser.getInstance();
      const trades = await anotherParser.parseReportsDirectory('/test/dir');
      
      expect(trades.length).toBeGreaterThan(0);
    });
  });

  describe('parseReportsDirectory', () => {
    it('should parse all XML files in directory', async () => {
      const mockFiles = ['trade1.xml', 'trade2.xml', 'document.txt', 'trade3.xml'];
      mockedFs.readdir.mockResolvedValue(mockFiles as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockValidTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test/reports');

      expect(mockedFs.readdir).toHaveBeenCalledWith('/test/reports');
      expect(mockedFs.readFile).toHaveBeenCalledTimes(3); // Only XML files
      expect(trades.length).toBeGreaterThan(0);
    });

    it('should handle directory read errors gracefully', async () => {
      mockedFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(parser.parseReportsDirectory('/invalid/path')).rejects.toThrow('Directory not found');
    });

    it('should skip non-XML files', async () => {
      const mockFiles = ['data.txt', 'readme.md', 'config.json'];
      mockedFs.readdir.mockResolvedValue(mockFiles as any);

      const trades = await parser.parseReportsDirectory('/test/reports');

      expect(mockedFs.readFile).not.toHaveBeenCalled();
      expect(trades).toEqual([]);
    });
  });

  describe('XML Parsing', () => {
    it('should parse valid IB XML structure correctly', async () => {
      mockedFs.readdir.mockResolvedValue(['valid.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockValidTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toHaveLength(1);
      expect(trades[0]).toMatchObject({
        id: 'TEST001',
        symbol: 'AAPL',
        assetCategory: 'STK',
        quantity: 100,
        tradePrice: 150.25
      });
    });

    it('should handle malformed XML gracefully', async () => {
      mockedFs.readdir.mockResolvedValue(['malformed.xml'] as any);
      mockedFs.readFile.mockResolvedValue('<invalid>xml</wrong>');
      mockedParseString.mockImplementation((xml, callback) => {
        callback(new Error('XML parse error'), null);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toEqual([]);
    });

    it('should handle empty XML files', async () => {
      mockedFs.readdir.mockResolvedValue(['empty.xml'] as any);
      mockedFs.readFile.mockResolvedValue('');
      mockedParseString.mockImplementation((xml, callback) => {
        callback(new Error('Empty XML'), null);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toEqual([]);
    });

    it('should handle XML with no trade data', async () => {
      mockedFs.readdir.mockResolvedValue(['no-trades.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockEmptyFlexQuery);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toEqual([]);
    });
  });

  describe('Trade Deduplication', () => {
    it('should prevent duplicate trades by tradeId', async () => {
      const duplicateTradeData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [
                  { $: mockStockTradeAttributes },
                  { $: mockStockTradeAttributes } // Same trade twice
                ]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['duplicate.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, duplicateTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toHaveLength(1); // Should only have one trade despite two in XML
    });

    it('should handle multiple files with overlapping trades', async () => {
      mockedFs.readdir.mockResolvedValue(['file1.xml', 'file2.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockValidTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toHaveLength(1); // Should deduplicate across files
      expect(mockedFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Stock Trade Parsing', () => {
    it('should parse stock trades correctly', async () => {
      const stockTradeData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{ $: mockStockTradeAttributes }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['stock.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, stockTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toHaveLength(1);
      const trade = trades[0];
      expect(trade.assetCategory).toBe('STK');
      expect(trade.symbol).toBe('AAPL');
      expect(trade.quantity).toBe(100);
      expect(trade.tradePrice).toBe(150.25);
      expect(trade.buy_sell).toBe('BUY');
      expect(trade.putCall).toBeUndefined();
      expect(trade.strike).toBeUndefined();
      expect(trade.expiry).toBeUndefined();
    });

    it('should handle negative quantities for SELL trades', async () => {
      const sellTradeAttributes = {
        ...mockStockTradeAttributes,
        quantity: '-100',
        buySell: 'SELL'
      };

      const sellTradeData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{ $: sellTradeAttributes }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['sell.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, sellTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades[0].quantity).toBe(-100);
      expect(trades[0].buy_sell).toBe('SELL');
    });
  });

  describe('Options Trade Parsing', () => {
    it('should parse option trades correctly', async () => {
      const optionTradeData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{ $: mockOptionTradeAttributes }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['option.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, optionTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toHaveLength(1);
      const trade = trades[0];
      expect(trade.assetCategory).toBe('OPT');
      expect(trade.symbol).toBe('AAPL  250417P00190000');
      expect(trade.underlyingSymbol).toBe('AAPL');
      expect(trade.putCall).toBe('P');
      expect(trade.strike).toBe(190);
      expect(trade.multiplier).toBe(100);
      expect(trade.expiry).toEqual(new Date(2025, 3, 17)); // April 17, 2025
    });

    it('should parse call options correctly', async () => {
      const callOptionAttributes = {
        ...mockOptionTradeAttributes,
        symbol: 'TSLA  250117C00250000',
        putCall: 'C',
        strike: '250',
        expiry: '20250117'
      };

      const callTradeData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{ $: callOptionAttributes }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['call.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, callTradeData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      const trade = trades[0];
      expect(trade.underlyingSymbol).toBe('TSLA');
      expect(trade.putCall).toBe('C');
      expect(trade.strike).toBe(250);
    });

    it('should extract underlying symbol from option symbol correctly', async () => {
      const testCases = [
        { symbol: 'AAPL  250417P00190000', expected: 'AAPL' },
        { symbol: 'TSLA  250117C00250000', expected: 'TSLA' },
        { symbol: 'MSFT  250314P00420000', expected: 'MSFT' },
        { symbol: 'GOOGL  250221C01750000', expected: 'GOOGL' }
      ];

      for (const testCase of testCases) {
        const optionData = {
          FlexQueryResponse: {
            FlexStatements: [{
              FlexStatement: [{
                TradeConfirms: [{
                  TradeConfirm: [{
                    $: {
                      ...mockOptionTradeAttributes,
                      symbol: testCase.symbol,
                      tradeID: `TEST_${testCase.expected}`
                    }
                  }]
                }]
              }]
            }]
          }
        };

        parser.clearCache();
        mockedFs.readdir.mockResolvedValue([`${testCase.expected}.xml`] as any);
        mockedFs.readFile.mockResolvedValue(mockXmlContent);
        mockedParseString.mockImplementation((xml, callback) => {
          callback(null, optionData);
        });

        const trades = await parser.parseReportsDirectory('/test');
        expect(trades[0].underlyingSymbol).toBe(testCase.expected);
      }
    });
  });

  describe('Date Parsing', () => {
    it('should parse IB date format YYYYMMDD correctly', async () => {
      const dateTestData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{
                  $: {
                    ...mockStockTradeAttributes,
                    tradeDate: '20250115',
                    orderTime: '20250115'
                  }
                }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['date-test.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, dateTestData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      const trade = trades[0];
      expect(trade.tradeDate).toEqual(new Date(2025, 0, 15)); // January 15, 2025
      expect(trade.orderTime).toEqual(new Date(2025, 0, 15));
    });

    it('should parse IB timestamp format YYYYMMDD;HHMMSS correctly', async () => {
      const timestampTestData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{
                  $: {
                    ...mockStockTradeAttributes,
                    orderTime: '20250115;143052' // 2:30:52 PM
                  }
                }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['timestamp-test.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, timestampTestData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      const trade = trades[0];
      expect(trade.orderTime).toEqual(new Date(2025, 0, 15, 14, 30, 52));
    });

    it('should handle invalid date formats gracefully', async () => {
      const invalidDateData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{
                  $: {
                    ...mockStockTradeAttributes,
                    tradeDate: 'invalid-date',
                    orderTime: ''
                  }
                }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['invalid-date.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, invalidDateData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      const trade = trades[0];
      expect(trade.tradeDate).toBeInstanceOf(Date);
      expect(trade.orderTime).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted trade data gracefully', async () => {
      const corruptedData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{
                  $: {
                    // Missing required fields
                    symbol: 'AAPL',
                    // No tradeID, price, etc.
                  }
                }]
              }]
            }]
          }]
        }
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockedFs.readdir.mockResolvedValue(['corrupted.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, corruptedData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle mixed valid and invalid trades', async () => {
      const mixedData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [
                  { $: mockStockTradeAttributes }, // Valid
                  { $: { symbol: 'INVALID' } }, // Invalid - missing required fields
                  { $: { ...mockStockTradeAttributes, tradeID: 'VALID002' } } // Valid
                ]
              }]
            }]
          }]
        }
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockedFs.readdir.mockResolvedValue(['mixed.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mixedData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      expect(trades).toHaveLength(2); // Should only include valid trades
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // One error for invalid trade

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache when requested', async () => {
      mockedFs.readdir.mockResolvedValue(['test.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, mockValidTradeData);
      });

      // Parse some data
      await parser.parseReportsDirectory('/test');
      const tradesBeforeClear = await parser.parseReportsDirectory('/test');

      // Clear cache
      parser.clearCache();

      // Parse again - should reprocess
      const tradesAfterClear = await parser.parseReportsDirectory('/test');

      expect(tradesBeforeClear).toEqual(tradesAfterClear);
      expect(mockedFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Type Validation', () => {
    it('should convert string numbers to proper types', async () => {
      const numericTestData = {
        FlexQueryResponse: {
          FlexStatements: [{
            FlexStatement: [{
              TradeConfirms: [{
                TradeConfirm: [{
                  $: {
                    ...mockStockTradeAttributes,
                    quantity: '100.5',
                    price: '150.25',
                    amount: '-15025.50',
                    commission: '1.50'
                  }
                }]
              }]
            }]
          }]
        }
      };

      mockedFs.readdir.mockResolvedValue(['numeric.xml'] as any);
      mockedFs.readFile.mockResolvedValue(mockXmlContent);
      mockedParseString.mockImplementation((xml, callback) => {
        callback(null, numericTestData);
      });

      const trades = await parser.parseReportsDirectory('/test');

      const trade = trades[0];
      expect(typeof trade.quantity).toBe('number');
      expect(typeof trade.tradePrice).toBe('number');
      expect(typeof trade.tradeMoney).toBe('number');
      expect(typeof trade.commissionAndTax).toBe('number');
      expect(trade.quantity).toBe(100.5);
      expect(trade.tradePrice).toBe(150.25);
      expect(trade.commissionAndTax).toBe(1.50);
    });
  });
});

// Mock data for tests
const mockXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<FlexQueryResponse>
  <FlexStatements>
    <FlexStatement>
      <TradeConfirms>
        <TradeConfirm />
      </TradeConfirms>
    </FlexStatement>
  </FlexStatements>
</FlexQueryResponse>`;

const mockStockTradeAttributes = {
  tradeID: 'TEST001',
  symbol: 'AAPL',
  assetCategory: 'STK',
  currency: 'USD',
  quantity: '100',
  price: '150.25',
  amount: '15025.00',
  commission: '1.00',
  netCash: '15026.00',
  tradeDate: '20250115',
  orderTime: '20250115;143000',
  buySell: 'BUY',
  transactionID: 'TXN001',
  orderReference: 'ORD001',
  exchange: 'NASDAQ',
  notes: 'Test trade'
};

const mockOptionTradeAttributes = {
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
  orderTime: '20250115;143000',
  buySell: 'SELL',
  putCall: 'P',
  strike: '190',
  expiry: '20250417',
  transactionID: 'TXN002',
  orderReference: 'ORD002',
  exchange: 'CBOE'
};

const mockValidTradeData = {
  FlexQueryResponse: {
    FlexStatements: [{
      FlexStatement: [{
        TradeConfirms: [{
          TradeConfirm: [{ $: mockStockTradeAttributes }]
        }]
      }]
    }]
  }
};

const mockEmptyFlexQuery = {
  FlexQueryResponse: {
    FlexStatements: [{
      FlexStatement: [{}]
    }]
  }
};