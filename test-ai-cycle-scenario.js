/**
 * Test AI Cycle Scenario
 * Creates test data to demonstrate the AI wheel cycle you mentioned:
 * PUT 27JUN25 → CALL 03JUL25 @ 25.5 strike
 */

const testAITrades = [
  // Sell PUT - Start of cycle (27JUN25)
  {
    tradeId: 'ai_test_1',
    symbol: 'AI    250627P00025500',
    dateTime: new Date('2025-06-27T14:30:00.000Z'),
    assetCategory: 'OPT',
    underlyingSymbol: 'AI',
    putCall: 'P',
    strike: 25.5,
    expiry: new Date('2025-06-27T20:00:00.000Z'),
    quantity: -1,
    buy_sell: 'SELL',
    tradePrice: 1.25,
    netCash: 125,
    commissionAndTax: -1.50,
    multiplier: 100
  },
  
  // PUT Assignment - Buy 100 shares of AI at $25.50
  {
    tradeId: 'ai_test_2',
    symbol: 'AI',
    dateTime: new Date('2025-06-27T20:00:00.000Z'),
    assetCategory: 'STK',
    underlyingSymbol: 'AI',
    quantity: 100,
    buy_sell: 'BUY',
    tradePrice: 25.5,
    netCash: -2550,
    commissionAndTax: -1.00
  },
  
  // Sell CALL - Cover the shares (03JUL25 @ 25.5 strike)
  {
    tradeId: 'ai_test_3',
    symbol: 'AI    250703C00025500',
    dateTime: new Date('2025-07-03T14:30:00.000Z'),
    assetCategory: 'OPT',
    underlyingSymbol: 'AI',
    putCall: 'C',
    strike: 25.5,
    expiry: new Date('2025-07-03T20:00:00.000Z'),
    quantity: -1,
    buy_sell: 'SELL',
    tradePrice: 0.85,
    netCash: 85,
    commissionAndTax: -1.50,
    multiplier: 100
  },
  
  // CALL Assignment - Sell 100 shares at $25.50
  {
    tradeId: 'ai_test_4',
    symbol: 'AI',
    dateTime: new Date('2025-07-03T20:00:00.000Z'),
    assetCategory: 'STK',
    underlyingSymbol: 'AI',
    quantity: -100,
    buy_sell: 'SELL',
    tradePrice: 25.5,
    netCash: 2550,
    commissionAndTax: -1.00
  }
];

console.log('🧪 AI Wheel Cycle Test Scenario:');
console.log('===============================');
console.log('');
console.log('📅 Timeline:');
console.log('1. 27JUN25: Sell PUT @ $25.5 strike → Collect $1.25 premium');
console.log('2. 27JUN25: PUT assigned → Buy 100 shares @ $25.5');
console.log('3. 03JUL25: Sell CALL @ $25.5 strike → Collect $0.85 premium');
console.log('4. 03JUL25: CALL assigned → Sell 100 shares @ $25.5');
console.log('');
console.log('💰 Expected P&L:');
console.log('- Premium collected: $1.25 + $0.85 = $2.10');
console.log('- Stock P&L: $0 (bought and sold at same price)');
console.log('- Fees: ~$5.00');
console.log('- Net Profit: ~$205 per contract');
console.log('');
console.log('🔍 Test Data Structure:');
console.log(JSON.stringify(testAITrades, null, 2));

module.exports = { testAITrades };