import { PortfolioService } from '../portfolioService';
import { Position } from '@/types/trade';

describe('PortfolioService', () => {
  let portfolioService: PortfolioService;

  beforeEach(() => {
    portfolioService = PortfolioService.getInstance();
  });

  describe('calculatePortfolioValue', () => {
    it('should calculate portfolio value correctly', async () => {
      const positions = new Map<string, Position>([
        ['AAPL', {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150,
          realizedPnL: 500,
          activeCycles: [],
          completedCycles: []
        }],
        ['MSFT', {
          symbol: 'MSFT',
          quantity: 50,
          averageCost: 300,
          realizedPnL: 200,
          activeCycles: [],
          completedCycles: []
        }]
      ]);

      const trades = [
        {
          symbol: 'AAPL',
          assetCategory: 'STK' as const,
          netCash: -15000,
          dateTime: new Date(),
          orderTime: new Date(),
          openDateTime: new Date(),
          reportDate: new Date(),
          tradeDate: new Date(),
          quantity: 100,
          tradePrice: 150,
          buy_sell: 'BUY' as const,
          commissionAndTax: 1,
          description: 'AAPL',
          transactionID: '1',
          orderID: '1',
          fifoPnl: 0,
          mtmPnl: 0,
          underlyingSymbol: 'AAPL'
        }
      ];

      const currentPrices = new Map([
        ['AAPL', 160],
        ['MSFT', 320]
      ]);

      const portfolioValue = await portfolioService.calculatePortfolioValue(
        positions,
        trades,
        currentPrices
      );

      expect(portfolioValue.positionsValue).toBe(100 * 160 + 50 * 320); // 32000
      expect(portfolioValue.totalValue).toBe(portfolioValue.cashBalance + portfolioValue.positionsValue);
      expect(portfolioValue.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle empty positions', async () => {
      const positions = new Map<string, Position>();
      const trades: any[] = [];
      const currentPrices = new Map<string, number>();

      const portfolioValue = await portfolioService.calculatePortfolioValue(
        positions,
        trades,
        currentPrices
      );

      expect(portfolioValue.positionsValue).toBe(0);
      expect(portfolioValue.totalValue).toBe(0);
      expect(portfolioValue.dayChange).toBe(0);
      expect(portfolioValue.dayChangePercent).toBe(0);
    });
  });

  describe('getPortfolioAllocation', () => {
    it('should calculate allocation percentages correctly', async () => {
      const positions = new Map<string, Position>([
        ['AAPL', {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150,
          realizedPnL: 0,
          activeCycles: [],
          completedCycles: []
        }]
      ]);

      const currentPrices = new Map([['AAPL', 150]]);

      await portfolioService.calculatePortfolioValue(positions, [], currentPrices);
      const allocation = portfolioService.getPortfolioAllocation();

      expect(allocation.get('AAPL')).toBeCloseTo(100, 1); // 100% in AAPL
      expect(allocation.get('CASH')).toBeCloseTo(0, 1); // 0% cash
    });
  });

  describe('calculatePortfolioBeta', () => {
    it('should calculate weighted portfolio beta', () => {
      const beta = portfolioService.calculatePortfolioBeta();
      expect(beta).toBeGreaterThanOrEqual(0);
      expect(beta).toBeLessThanOrEqual(3);
    });
  });

  describe('fetchPortfolioFromIB', () => {
    it('should return mock portfolio value', async () => {
      const mockValue = await portfolioService.fetchPortfolioFromIB();
      
      expect(mockValue.totalValue).toBe(125430.50);
      expect(mockValue.cashBalance).toBe(25430.50);
      expect(mockValue.positionsValue).toBe(100000.00);
      expect(mockValue.dayChange).toBe(1250.30);
      expect(mockValue.dayChangePercent).toBe(1.01);
    });
  });
});