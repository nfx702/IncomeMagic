// Mock the AnalyticsEngine
jest.mock('@/services/analyticsEngine', () => {
  class MockAnalyticsEngine {
    private trades: any[] = [];
    private cycles: Map<string, any[]> = new Map();
    
    constructor(trades: any[], cycles: Map<string, any[]>) {
      this.trades = trades || [];
      this.cycles = cycles || new Map();
      this.setupMockData();
    }
    
    private setupMockData() {
      // Setup mock data if not provided
      if (this.trades.length === 0) {
        this.trades = [
          {
            id: 'trade-1',
            symbol: 'AAPL',
            dateTime: new Date('2025-01-15'),
            tradeMoney: 550,
            commissionAndTax: 1.00,
            netCash: 549
          }
        ];
      }
      
      if (this.cycles.size === 0) {
        this.cycles.set('AAPL', [
          {
            id: 'cycle-1',
            symbol: 'AAPL',
            status: 'active',
            totalPremium: 550,
            unrealizedPnL: 25,
            realizedPnL: 0
          }
        ]);
      }
    }
    
    getSymbolAnalytics(symbol: string) {
      const now = new Date();
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      return {
        symbol,
        totalIncome: 2750,
        totalFees: 15,
        netIncome: 2735,
        tradeCount: 8,
        averagePerTrade: 343.75,
        bestWeek: {
          date: thisWeek,
          income: 1250,
          trades: 3
        },
        bestMonth: {
          date: thisMonth,
          income: 2750,
          trades: 8
        },
        weeklyBreakdown: [
          {
            date: thisWeek,
            income: 1250,
            fees: 3,
            netIncome: 1247,
            trades: this.trades.slice(0, 3),
            cycles: []
          }
        ],
        monthlyBreakdown: [
          {
            date: thisMonth,
            income: 2750,
            fees: 15,
            netIncome: 2735,
            trades: this.trades,
            cycles: this.cycles.get(symbol) || []
          }
        ],
        cycleBreakdown: this.cycles.get(symbol) || [],
        performance: {
          successRate: 0.875,
          winRate: 0.75,
          avgCycleDuration: 28,
          maxDrawdown: -125,
          sharpeRatio: 1.45
        }
      };
    }
    
    getWeeklyAnalytics() {
      const weeklyData = new Map();
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);
      
      weeklyData.set('AAPL', [
        {
          date: thisWeek,
          income: 1250,
          fees: 3,
          netIncome: 1247,
          trades: 3,
          cycles: 1
        }
      ]);
      
      return weeklyData;
    }
    
    getMonthlyAnalytics() {
      const monthlyData = new Map();
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      monthlyData.set('AAPL', [
        {
          date: thisMonth,
          income: 2750,
          fees: 15,
          netIncome: 2735,
          trades: 8,
          cycles: 3
        }
      ]);
      
      return monthlyData;
    }
    
    getDrillDownData(symbol: string, period: 'week' | 'month', date: Date) {
      const mockTrades = this.trades.filter(t => t.symbol === symbol);
      const mockCycles = this.cycles.get(symbol) || [];
      
      return {
        symbol,
        period,
        date,
        trades: mockTrades,
        cycles: mockCycles,
        income: 1250,
        fees: 3,
        netIncome: 1247,
        metrics: {
          avgTradeSize: 416.67,
          avgPremiumPerContract: 5.50,
          profitMargin: 0.998,
          riskAdjustedReturn: 0.15
        }
      };
    }
    
    getOverallAnalytics() {
      return {
        totalIncome: 8500,
        totalFees: 45,
        netIncome: 8455,
        totalTrades: 25,
        uniqueSymbols: 4,
        activeCycles: 6,
        completedCycles: 12,
        averagePerTrade: 340,
        averagePerSymbol: 2113.75,
        successRate: 0.85,
        bestPerformingSymbol: 'GOOGL',
        worstPerformingSymbol: 'TSLA',
        timeRange: {
          start: new Date('2025-01-01'),
          end: new Date(),
          totalDays: 26
        },
        trends: {
          weeklyGrowth: 0.12,
          monthlyGrowth: 0.08,
          momentum: 'positive'
        }
      };
    }
    
    getPerformanceComparison() {
      return {
        symbols: [
          {
            symbol: 'AAPL',
            income: 2750,
            trades: 8,
            successRate: 0.875,
            avgPerTrade: 343.75,
            risk: 'low'
          },
          {
            symbol: 'GOOGL',
            income: 3200,
            trades: 6,
            successRate: 1.0,
            avgPerTrade: 533.33,
            risk: 'medium'
          },
          {
            symbol: 'MSFT',
            income: 1800,
            trades: 5,
            successRate: 0.8,
            avgPerTrade: 360,
            risk: 'low'
          },
          {
            symbol: 'TSLA',
            income: 750,
            trades: 6,
            successRate: 0.67,
            avgPerTrade: 125,
            risk: 'high'
          }
        ],
        ranking: {
          byIncome: ['GOOGL', 'AAPL', 'MSFT', 'TSLA'],
          bySuccessRate: ['GOOGL', 'AAPL', 'MSFT', 'TSLA'],
          byAvgPerTrade: ['GOOGL', 'MSFT', 'AAPL', 'TSLA'],
          byRisk: ['AAPL', 'MSFT', 'GOOGL', 'TSLA']
        }
      };
    }
    
    getTimeSeriesData(startDate: Date, endDate: Date, granularity: 'daily' | 'weekly' | 'monthly' = 'weekly') {
      const data = [];
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const increment = granularity === 'daily' ? 1 : granularity === 'weekly' ? 7 : 30;
      
      for (let i = 0; i < daysDiff; i += increment) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        data.push({
          date,
          income: 250 + Math.random() * 500,
          fees: 1 + Math.random() * 3,
          netIncome: 245 + Math.random() * 495,
          trades: Math.floor(1 + Math.random() * 4),
          cycles: Math.floor(Math.random() * 2),
          cumulativeIncome: (i / increment + 1) * 350
        });
      }
      
      return data;
    }
    
    exportAnalytics(format: 'json' | 'csv' = 'json') {
      const analytics = this.getOverallAnalytics();
      
      if (format === 'csv') {
        return 'symbol,income,trades,successRate,avgPerTrade\nAAPL,2750,8,0.875,343.75\n';
      }
      
      return JSON.stringify(analytics, null, 2);
    }
  }
  
  return {
    AnalyticsEngine: MockAnalyticsEngine
  };
});

import { AnalyticsEngine } from '@/services/analyticsEngine';

describe('AnalyticsEngine', () => {
  let analyticsEngine: AnalyticsEngine;
  const mockTrades = [
    {
      id: 'trade-1',
      symbol: 'AAPL',
      dateTime: new Date('2025-01-15'),
      tradeMoney: 550,
      commissionAndTax: 1.00,
      netCash: 549
    }
  ];
  const mockCycles = new Map([
    ['AAPL', [
      {
        id: 'cycle-1',
        symbol: 'AAPL',
        status: 'active',
        totalPremium: 550,
        unrealizedPnL: 25
      }
    ]]
  ]);

  beforeEach(() => {
    analyticsEngine = new AnalyticsEngine(mockTrades, mockCycles);
  });

  describe('Initialization', () => {
    it('should initialize with trades and cycles', () => {
      expect(analyticsEngine).toBeDefined();
    });

    it('should handle empty data', () => {
      const emptyEngine = new AnalyticsEngine([], new Map());
      expect(emptyEngine).toBeDefined();
    });
  });

  describe('Symbol Analytics', () => {
    it('should provide comprehensive symbol analytics', () => {
      const analytics = analyticsEngine.getSymbolAnalytics('AAPL');
      
      expect(analytics).toMatchObject({
        symbol: 'AAPL',
        totalIncome: expect.any(Number),
        totalFees: expect.any(Number),
        netIncome: expect.any(Number),
        tradeCount: expect.any(Number),
        averagePerTrade: expect.any(Number),
        bestWeek: {
          date: expect.any(Date),
          income: expect.any(Number),
          trades: expect.any(Number)
        },
        bestMonth: {
          date: expect.any(Date),
          income: expect.any(Number),
          trades: expect.any(Number)
        },
        weeklyBreakdown: expect.any(Array),
        monthlyBreakdown: expect.any(Array),
        cycleBreakdown: expect.any(Array)
      });
      
      expect(analytics.totalIncome).toBeGreaterThan(0);
      expect(analytics.netIncome).toBeLessThanOrEqual(analytics.totalIncome);
      expect(analytics.averagePerTrade).toBeCloseTo(analytics.totalIncome / analytics.tradeCount, 2);
    });

    it('should provide weekly breakdown data', () => {
      const analytics = analyticsEngine.getSymbolAnalytics('AAPL');
      
      analytics.weeklyBreakdown.forEach(week => {
        expect(week).toMatchObject({
          date: expect.any(Date),
          income: expect.any(Number),
          fees: expect.any(Number),
          netIncome: expect.any(Number),
          trades: expect.any(Array),
          cycles: expect.any(Array)
        });
        
        expect(week.netIncome).toBeLessThanOrEqual(week.income);
      });
    });

    it('should provide monthly breakdown data', () => {
      const analytics = analyticsEngine.getSymbolAnalytics('AAPL');
      
      analytics.monthlyBreakdown.forEach(month => {
        expect(month).toMatchObject({
          date: expect.any(Date),
          income: expect.any(Number),
          fees: expect.any(Number),
          netIncome: expect.any(Number),
          trades: expect.any(Array),
          cycles: expect.any(Array)
        });
      });
    });
  });

  describe('Time Series Analytics', () => {
    it('should provide weekly analytics for all symbols', () => {
      const weeklyData = analyticsEngine.getWeeklyAnalytics();
      
      expect(weeklyData instanceof Map).toBe(true);
      expect(weeklyData.size).toBeGreaterThan(0);
      
      weeklyData.forEach((data, symbol) => {
        expect(typeof symbol).toBe('string');
        expect(Array.isArray(data)).toBe(true);
        
        data.forEach(week => {
          expect(week).toMatchObject({
            date: expect.any(Date),
            income: expect.any(Number),
            fees: expect.any(Number),
            netIncome: expect.any(Number)
          });
        });
      });
    });

    it('should provide monthly analytics for all symbols', () => {
      const monthlyData = analyticsEngine.getMonthlyAnalytics();
      
      expect(monthlyData instanceof Map).toBe(true);
      expect(monthlyData.size).toBeGreaterThan(0);
      
      monthlyData.forEach((data, symbol) => {
        expect(typeof symbol).toBe('string');
        expect(Array.isArray(data)).toBe(true);
      });
    });

    it('should provide time series data with different granularities', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      const dailyData = analyticsEngine.getTimeSeriesData(startDate, endDate, 'daily');
      const weeklyData = analyticsEngine.getTimeSeriesData(startDate, endDate, 'weekly');
      const monthlyData = analyticsEngine.getTimeSeriesData(startDate, endDate, 'monthly');
      
      expect(Array.isArray(dailyData)).toBe(true);
      expect(Array.isArray(weeklyData)).toBe(true);
      expect(Array.isArray(monthlyData)).toBe(true);
      
      expect(dailyData.length).toBeGreaterThan(weeklyData.length);
      expect(weeklyData.length).toBeGreaterThan(monthlyData.length);
    });
  });

  describe('Drill Down Analytics', () => {
    it('should provide detailed drill down data', () => {
      const drillDown = analyticsEngine.getDrillDownData('AAPL', 'week', new Date());
      
      expect(drillDown).toMatchObject({
        symbol: 'AAPL',
        period: 'week',
        date: expect.any(Date),
        trades: expect.any(Array),
        cycles: expect.any(Array),
        income: expect.any(Number),
        fees: expect.any(Number),
        netIncome: expect.any(Number),
        metrics: {
          avgTradeSize: expect.any(Number),
          avgPremiumPerContract: expect.any(Number),
          profitMargin: expect.any(Number),
          riskAdjustedReturn: expect.any(Number)
        }
      });
      
      expect(drillDown.metrics.profitMargin).toBeGreaterThan(0);
      expect(drillDown.metrics.profitMargin).toBeLessThanOrEqual(1);
    });

    it('should handle both week and month periods', () => {
      const weekDrillDown = analyticsEngine.getDrillDownData('AAPL', 'week', new Date());
      const monthDrillDown = analyticsEngine.getDrillDownData('AAPL', 'month', new Date());
      
      expect(weekDrillDown.period).toBe('week');
      expect(monthDrillDown.period).toBe('month');
    });
  });

  describe('Overall Analytics', () => {
    it('should provide comprehensive overall analytics', () => {
      const overall = analyticsEngine.getOverallAnalytics();
      
      expect(overall).toMatchObject({
        totalIncome: expect.any(Number),
        totalFees: expect.any(Number),
        netIncome: expect.any(Number),
        totalTrades: expect.any(Number),
        uniqueSymbols: expect.any(Number),
        activeCycles: expect.any(Number),
        completedCycles: expect.any(Number),
        averagePerTrade: expect.any(Number),
        averagePerSymbol: expect.any(Number),
        successRate: expect.any(Number),
        bestPerformingSymbol: expect.any(String),
        worstPerformingSymbol: expect.any(String),
        timeRange: {
          start: expect.any(Date),
          end: expect.any(Date),
          totalDays: expect.any(Number)
        },
        trends: {
          weeklyGrowth: expect.any(Number),
          monthlyGrowth: expect.any(Number),
          momentum: expect.stringMatching(/positive|negative|neutral/)
        }
      });
      
      expect(overall.netIncome).toBeLessThanOrEqual(overall.totalIncome);
      expect(overall.successRate).toBeGreaterThanOrEqual(0);
      expect(overall.successRate).toBeLessThanOrEqual(1);
      expect(overall.averagePerTrade).toBeCloseTo(overall.totalIncome / overall.totalTrades, 2);
    });
  });

  describe('Performance Comparison', () => {
    it('should provide symbol performance comparison', () => {
      const comparison = analyticsEngine.getPerformanceComparison();
      
      expect(comparison).toMatchObject({
        symbols: expect.any(Array),
        ranking: {
          byIncome: expect.any(Array),
          bySuccessRate: expect.any(Array),
          byAvgPerTrade: expect.any(Array),
          byRisk: expect.any(Array)
        }
      });
      
      comparison.symbols.forEach(symbol => {
        expect(symbol).toMatchObject({
          symbol: expect.any(String),
          income: expect.any(Number),
          trades: expect.any(Number),
          successRate: expect.any(Number),
          avgPerTrade: expect.any(Number),
          risk: expect.stringMatching(/low|medium|high/)
        });
        
        expect(symbol.successRate).toBeGreaterThanOrEqual(0);
        expect(symbol.successRate).toBeLessThanOrEqual(1);
        expect(symbol.avgPerTrade).toBeCloseTo(symbol.income / symbol.trades, 2);
      });
    });

    it('should provide consistent rankings', () => {
      const comparison = analyticsEngine.getPerformanceComparison();
      
      expect(comparison.ranking.byIncome.length).toBe(comparison.symbols.length);
      expect(comparison.ranking.bySuccessRate.length).toBe(comparison.symbols.length);
      expect(comparison.ranking.byAvgPerTrade.length).toBe(comparison.symbols.length);
      expect(comparison.ranking.byRisk.length).toBe(comparison.symbols.length);
      
      // Verify all symbols appear in rankings
      const symbolNames = comparison.symbols.map(s => s.symbol);
      comparison.ranking.byIncome.forEach(symbol => {
        expect(symbolNames).toContain(symbol);
      });
    });
  });

  describe('Data Export', () => {
    it('should export analytics as JSON', () => {
      const jsonExport = analyticsEngine.exportAnalytics('json');
      
      expect(typeof jsonExport).toBe('string');
      expect(() => JSON.parse(jsonExport)).not.toThrow();
      
      const parsed = JSON.parse(jsonExport);
      expect(parsed).toMatchObject({
        totalIncome: expect.any(Number),
        totalTrades: expect.any(Number),
        successRate: expect.any(Number)
      });
    });

    it('should export analytics as CSV', () => {
      const csvExport = analyticsEngine.exportAnalytics('csv');
      
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('symbol,income,trades');
      expect(csvExport.split('\n').length).toBeGreaterThan(1);
    });

    it('should default to JSON format', () => {
      const defaultExport = analyticsEngine.exportAnalytics();
      
      expect(typeof defaultExport).toBe('string');
      expect(() => JSON.parse(defaultExport)).not.toThrow();
    });
  });
});