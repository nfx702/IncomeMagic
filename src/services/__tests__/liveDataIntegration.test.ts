/**
 * Comprehensive Integration Tests for Live Data Services
 * Tests the complete data flow from Yahoo Finance to recommendations
 */

import { YahooFinanceService } from '../yahooFinanceService';
import { MarketDataService } from '../marketDataService';
import { EnhancedRecommendationEngine } from '../enhancedRecommendationEngine';
import { RiskManagementService } from '../riskManagement';
import { MonitoringService } from '../monitoringService';
import { Trade } from '@/types/trade';

describe('Live Data Integration Tests', () => {
  let yahooService: YahooFinanceService;
  let marketDataService: MarketDataService;
  let recommendationEngine: EnhancedRecommendationEngine;
  let riskService: RiskManagementService;
  let monitoringService: MonitoringService;

  beforeEach(() => {
    yahooService = YahooFinanceService.getInstance();
    marketDataService = MarketDataService.getInstance();
    recommendationEngine = EnhancedRecommendationEngine.getInstance();
    riskService = RiskManagementService.getInstance();
    monitoringService = MonitoringService.getInstance();
  });

  afterEach(async () => {
    await marketDataService.stopStreaming();
    monitoringService.stopMonitoring();
  });

  describe('Yahoo Finance Service Integration', () => {
    test('should fetch real-time quote successfully', async () => {
      const quote = await yahooService.getRealTimeQuote('AAPL');
      
      expect(quote).toBeTruthy();
      expect(quote?.symbol).toBe('AAPL');
      expect(quote?.price).toBeGreaterThan(0);
      expect(quote?.timestamp).toBeInstanceOf(Date);
      expect(quote?.bid).toBeGreaterThanOrEqual(0);
      expect(quote?.ask).toBeGreaterThanOrEqual(0);
    }, 10000);

    test('should fetch multiple quotes with proper data structure', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const quotes = await yahooService.getMultipleQuotes(symbols);
      
      expect(quotes.size).toBeGreaterThan(0);
      
      for (const [symbol, quote] of quotes) {
        expect(symbols).toContain(symbol);
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.volume).toBeGreaterThanOrEqual(0);
        expect(quote.timestamp).toBeInstanceOf(Date);
      }
    }, 15000);

    test('should fetch options chain with valid data', async () => {
      const optionsChain = await yahooService.getOptionsChain('AAPL');
      
      expect(optionsChain).toBeTruthy();
      expect(optionsChain.length).toBeGreaterThan(0);
      
      const firstChain = optionsChain[0];
      expect(firstChain.symbol).toBe('AAPL');
      expect(firstChain.underlyingPrice).toBeGreaterThan(0);
      expect(firstChain.calls.length).toBeGreaterThan(0);
      expect(firstChain.puts.length).toBeGreaterThan(0);
      
      // Validate option contracts
      const firstCall = firstChain.calls[0];
      expect(firstCall.strike).toBeGreaterThan(0);
      expect(firstCall.bid).toBeGreaterThanOrEqual(0);
      expect(firstCall.ask).toBeGreaterThanOrEqual(0);
      expect(firstCall.impliedVolatility).toBeGreaterThanOrEqual(0);
    }, 20000);

    test('should handle rate limiting gracefully', async () => {
      const startTime = Date.now();
      
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(yahooService.getRealTimeQuote('AAPL'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // Should take at least 400ms due to rate limiting (100ms between requests)
      expect(endTime - startTime).toBeGreaterThan(400);
      
      // All requests should succeed
      for (const quote of results) {
        expect(quote).toBeTruthy();
        expect(quote?.price).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe('Market Data Service Integration', () => {
    test('should start and stop streaming successfully', async () => {
      await marketDataService.startStreaming();
      expect(marketDataService.getStats().isStreaming).toBe(true);
      
      await marketDataService.stopStreaming();
      expect(marketDataService.getStats().isStreaming).toBe(false);
    });

    test('should handle subscriptions correctly', async () => {
      const subscription = {
        symbols: ['AAPL', 'MSFT'],
        interval: 5000,
        includeOptions: true,
        includeGreeks: true
      };
      
      await marketDataService.startStreaming();
      await marketDataService.subscribe('test_subscription', subscription);
      
      const stats = marketDataService.getStats();
      expect(stats.activeSubscriptions).toBe(1);
      
      // Wait for data updates
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Check if quotes were cached
      const aaplQuote = marketDataService.getCurrentQuote('AAPL');
      expect(aaplQuote).toBeTruthy();
      expect(aaplQuote?.sources.length).toBeGreaterThan(0);
      
      await marketDataService.unsubscribe('test_subscription');
      expect(marketDataService.getStats().activeSubscriptions).toBe(0);
    }, 30000);

    test('should aggregate data from multiple sources', async () => {
      const quote = await marketDataService.getCurrentQuote('AAPL');
      
      if (quote) {
        expect(quote.sources).toContain('yahoo');
        expect(quote.confidence).toBeGreaterThan(0);
        expect(quote.confidence).toBeLessThanOrEqual(1);
        expect(quote.lastUpdated).toBeInstanceOf(Date);
      }
    });

    test('should provide market indicators', async () => {
      const indicators = await marketDataService.getMarketIndicators();
      
      expect(indicators.vix).toBeGreaterThan(0);
      expect(indicators.spyPrice).toBeGreaterThan(0);
      expect(indicators.marketSentiment).toMatch(/bullish|bearish|neutral/);
      expect(indicators.fearGreedIndex).toBeGreaterThanOrEqual(0);
      expect(indicators.fearGreedIndex).toBeLessThanOrEqual(100);
    }, 15000);
  });

  describe('Enhanced Recommendation Engine Integration', () => {
    const mockTrades: Trade[] = [
      {
        tradeId: 'test_1',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150,
        assetCategory: 'STK',
        netCash: -15000,
        dateTime: new Date(),
        orderTime: new Date(),
        openDateTime: new Date(),
        reportDate: new Date(),
        tradeDate: new Date(),
        settleDate: new Date()
      }
    ];

    test('should generate enhanced recommendations with live data', async () => {
      const recommendations = await recommendationEngine.generateEnhancedRecommendations(
        mockTrades,
        100000,
        'moderate'
      );
      
      expect(recommendations).toBeTruthy();
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec.symbol).toBeTruthy();
        expect(rec.strike).toBeGreaterThan(0);
        expect(rec.premium).toBeGreaterThan(0);
        expect(rec.probability).toBeGreaterThan(0);
        expect(rec.probability).toBeLessThanOrEqual(1);
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
        expect(rec.currentPrice).toBeGreaterThan(0);
        expect(rec.timestamp).toBeInstanceOf(Date);
        expect(rec.dataFreshness).toBeGreaterThanOrEqual(0);
        expect(rec.reasoning).toBeTruthy();
        expect(Array.isArray(rec.reasoning)).toBe(true);
      }
    }, 30000);

    test('should calculate proper risk metrics', async () => {
      const recommendations = await recommendationEngine.generateEnhancedRecommendations(
        mockTrades,
        100000,
        'moderate'
      );
      
      for (const rec of recommendations) {
        expect(rec.technicalScore).toBeGreaterThanOrEqual(0);
        expect(rec.technicalScore).toBeLessThanOrEqual(1);
        expect(rec.fundamentalScore).toBeGreaterThanOrEqual(0);
        expect(rec.fundamentalScore).toBeLessThanOrEqual(1);
        expect(rec.liquidityScore).toBeGreaterThanOrEqual(0);
        expect(rec.liquidityScore).toBeLessThanOrEqual(1);
        expect(rec.blackSwanRisk).toBeGreaterThanOrEqual(0);
        expect(rec.blackSwanRisk).toBeLessThanOrEqual(1);
        expect(rec.correlationRisk).toBeGreaterThanOrEqual(0);
        expect(rec.correlationRisk).toBeLessThanOrEqual(1);
        expect(rec.earningsRisk).toBeGreaterThanOrEqual(0);
        expect(rec.earningsRisk).toBeLessThanOrEqual(1);
      }
    }, 30000);

    test('should filter recommendations by risk tolerance', async () => {
      const conservativeRecs = await recommendationEngine.generateEnhancedRecommendations(
        mockTrades,
        100000,
        'conservative'
      );
      
      const aggressiveRecs = await recommendationEngine.generateEnhancedRecommendations(
        mockTrades,
        100000,
        'aggressive'
      );
      
      // Conservative should have higher confidence requirements
      for (const rec of conservativeRecs) {
        expect(rec.confidence).toBeGreaterThan(0.7);
        expect(rec.blackSwanRisk).toBeLessThan(0.4);
      }
      
      // Aggressive may have lower confidence but higher returns
      expect(aggressiveRecs.length).toBeGreaterThanOrEqual(conservativeRecs.length);
    }, 45000);
  });

  describe('Risk Management Integration', () => {
    test('should validate recommendations against risk limits', () => {
      const mockRecommendation = {
        symbol: 'AAPL',
        strategy: 'cash_secured_put' as const,
        action: 'sell_put' as const,
        strike: 150,
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        premium: 5,
        probability: 0.8,
        expectedReturn: 0.15,
        maxLoss: 14500,
        confidence: 0.75,
        riskReward: 0.034,
        currentPrice: 155,
        impliedVolatility: 0.3,
        delta: -0.25,
        gamma: 0.02,
        theta: -0.05,
        vega: 0.1,
        technicalScore: 0.7,
        fundamentalScore: 0.8,
        marketSentimentScore: 0.6,
        liquidityScore: 0.75,
        volatilityScore: 0.6,
        blackSwanRisk: 0.2,
        correlationRisk: 0.3,
        earningsRisk: 0.1,
        reasoning: ['Good risk-reward ratio'],
        warnings: [],
        timestamp: new Date(),
        dataFreshness: 2
      };
      
      const validation = riskService.validateRecommendation(
        mockRecommendation,
        100000,
        []
      );
      
      expect(validation.isValid).toBeTruthy();
      expect(validation.confidence).toBe(0.75);
      expect(validation.staleness).toBe(2);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    test('should assess portfolio risk correctly', async () => {
      const mockPositions: Trade[] = [
        {
          tradeId: 'pos_1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150,
          assetCategory: 'STK',
          netCash: -15000,
          dateTime: new Date(),
          orderTime: new Date(),
          openDateTime: new Date(),
          reportDate: new Date(),
          tradeDate: new Date(),
          settleDate: new Date()
        }
      ];
      
      const marketIndicators = await marketDataService.getMarketIndicators();
      const portfolioRisk = riskService.assessPortfolioRisk(
        mockPositions,
        [],
        100000,
        marketIndicators
      );
      
      expect(portfolioRisk.totalRisk).toBeGreaterThanOrEqual(0);
      expect(portfolioRisk.totalRisk).toBeLessThanOrEqual(1);
      expect(portfolioRisk.concentrationRisk).toBeGreaterThanOrEqual(0);
      expect(portfolioRisk.liquidityRisk).toBeGreaterThanOrEqual(0);
      expect(portfolioRisk.volatilityRisk).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(portfolioRisk.alerts)).toBe(true);
      expect(portfolioRisk.riskBudgetUsed).toBeGreaterThanOrEqual(0);
      expect(portfolioRisk.riskBudgetUsed).toBeLessThanOrEqual(100);
    }, 15000);
  });

  describe('Monitoring Service Integration', () => {
    test('should start and stop monitoring', () => {
      monitoringService.startMonitoring();
      expect(monitoringService.getStats().systemUptime).toBeGreaterThan(0);
      
      monitoringService.stopMonitoring();
    });

    test('should track system metrics', () => {
      const metrics = monitoringService.getMetrics();
      
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeLessThanOrEqual(1);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
    });

    test('should create and manage alerts', () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        type: 'price' as const,
        condition: 'greater_than' as const,
        threshold: 200,
        symbol: 'AAPL',
        enabled: true,
        cooldownMinutes: 5
      };
      
      monitoringService.addAlertRule(rule);
      
      const rules = monitoringService.getAlertRules();
      expect(rules.some(r => r.id === 'test_rule')).toBe(true);
      
      const removed = monitoringService.removeAlertRule('test_rule');
      expect(removed).toBe(true);
    });
  });

  describe('End-to-End Integration Flow', () => {
    test('should complete full recommendation workflow', async () => {
      // Start services
      await marketDataService.startStreaming();
      monitoringService.startMonitoring();
      
      // Subscribe to market data
      await marketDataService.subscribe('e2e_test', {
        symbols: ['AAPL'],
        interval: 10000,
        includeOptions: true,
        includeGreeks: true
      });
      
      // Wait for data
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      // Generate recommendations
      const recommendations = await recommendationEngine.generateEnhancedRecommendations(
        [],
        100000,
        'moderate'
      );
      
      // Validate recommendations
      for (const rec of recommendations.slice(0, 3)) {
        const validation = riskService.validateRecommendation(rec, 100000, []);
        expect(validation.isValid).toBeTruthy();
      }
      
      // Check monitoring metrics
      const stats = monitoringService.getStats();
      expect(stats.totalAlerts).toBeGreaterThanOrEqual(0);
      
      // Cleanup
      await marketDataService.unsubscribe('e2e_test');
      
      console.log('E2E test completed successfully');
    }, 60000);
  });

  describe('Error Handling and Resilience', () => {
    test('should handle API failures gracefully', async () => {
      // Test with invalid symbol
      const quote = await yahooService.getRealTimeQuote('INVALID_SYMBOL_XYZ');
      expect(quote).toBeNull();
    });

    test('should handle network timeouts', async () => {
      // This would require mocking network delays
      // For now, just ensure the service doesn't crash
      const startTime = Date.now();
      const quotes = await yahooService.getMultipleQuotes(['AAPL']);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(30000); // Should not hang
    }, 35000);

    test('should maintain data consistency during failures', async () => {
      const initialStats = marketDataService.getStats();
      
      // Attempt operations that might fail
      try {
        await marketDataService.subscribe('fail_test', {
          symbols: ['INVALID'],
          interval: 1000,
          includeOptions: true,
          includeGreeks: true
        });
      } catch (error) {
        // Expected to potentially fail
      }
      
      const finalStats = marketDataService.getStats();
      
      // Service should still be operational
      expect(finalStats.isStreaming).toBe(initialStats.isStreaming);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      const quote = await yahooService.getRealTimeQuote('AAPL');
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 second SLA
      expect(quote).toBeTruthy();
    }, 10000);

    test('should handle concurrent requests efficiently', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      const startTime = Date.now();
      
      const promises = symbols.map(symbol => 
        yahooService.getRealTimeQuote(symbol)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Should complete all 5 requests in reasonable time
      expect(totalTime).toBeLessThan(15000);
      expect(results.filter(r => r !== null)).toHaveLength(5);
    }, 20000);
  });
});