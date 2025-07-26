/**
 * Standalone Live Data Test Script
 * Test the live data services directly without the full Next.js app
 */

const { YahooFinanceService } = require('./src/services/yahooFinanceService');
const { MarketDataService } = require('./src/services/marketDataService');
const { EnhancedRecommendationEngine } = require('./src/services/enhancedRecommendationEngine');

async function testLiveDataServices() {
  console.log('🚀 Testing Live Data Integration...\n');

  try {
    // Test Yahoo Finance Service
    console.log('1. Testing Yahoo Finance Service');
    const yahooService = YahooFinanceService.getInstance();
    
    console.log('   Fetching AAPL quote...');
    const aaplQuote = await yahooService.getRealTimeQuote('AAPL');
    if (aaplQuote) {
      console.log(`   ✅ AAPL: $${aaplQuote.price} (${aaplQuote.changePercent >= 0 ? '+' : ''}${aaplQuote.changePercent.toFixed(2)}%)`);
    } else {
      console.log('   ❌ Failed to fetch AAPL quote');
    }

    // Test Market Data Service
    console.log('\n2. Testing Market Data Service');
    const marketService = MarketDataService.getInstance();
    
    console.log('   Fetching market indicators...');
    const indicators = await marketService.getMarketIndicators();
    console.log(`   ✅ VIX: ${indicators.vix.toFixed(2)}`);
    console.log(`   ✅ SPY: $${indicators.spyPrice.toFixed(2)}`);
    console.log(`   ✅ Market Sentiment: ${indicators.marketSentiment}`);

    // Test Wheel Candidates
    console.log('\n3. Testing Wheel Candidates');
    const candidates = await marketService.getWheelCandidates(100000, 'medium');
    console.log(`   ✅ Found ${candidates.length} wheel candidates: ${candidates.slice(0, 5).join(', ')}...`);

    // Test Enhanced Recommendations
    console.log('\n4. Testing Enhanced Recommendations');
    const recommendationEngine = EnhancedRecommendationEngine.getInstance();
    
    const mockTrades = []; // Empty trades for testing
    const recommendations = await recommendationEngine.generateEnhancedRecommendations(
      mockTrades,
      100000,
      'moderate'
    );
    
    console.log(`   ✅ Generated ${recommendations.length} recommendations`);
    if (recommendations.length > 0) {
      const topRec = recommendations[0];
      console.log(`   📊 Top recommendation: ${topRec.symbol} ${topRec.strategy}`);
      console.log(`       Strike: $${topRec.strike}, Premium: $${topRec.premium.toFixed(2)}`);
      console.log(`       Expected Return: ${(topRec.expectedReturn * 100).toFixed(1)}% annual`);
      console.log(`       Confidence: ${(topRec.confidence * 100).toFixed(1)}%`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Visit: http://localhost:3000/test/live-data');
    console.log('   3. Test API endpoints: http://localhost:3000/api/live-data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check internet connection');
    console.log('   2. Verify Yahoo Finance API is accessible');
    console.log('   3. Check for rate limiting');
  }
}

// Run the test
testLiveDataServices();