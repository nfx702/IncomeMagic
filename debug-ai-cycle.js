/**
 * Debug AI Wheel Cycle Detection
 * Tests the wheel strategy analyzer with the AI cycle scenario
 */

const { testAITrades } = require('./test-ai-cycle-scenario.js');

// Mock the Trade type structure based on the analyzer
function createMockTrade(tradeData) {
  return {
    ...tradeData,
    dateTime: new Date(tradeData.dateTime),
    expiry: tradeData.expiry ? new Date(tradeData.expiry) : undefined
  };
}

// Convert test data to proper format
const mockAITrades = testAITrades.map(createMockTrade);

console.log('🔬 Debugging AI Wheel Cycle Detection');
console.log('=====================================\n');

console.log('📋 Input Trade Data:');
mockAITrades.forEach((trade, index) => {
  console.log(`${index + 1}. ${trade.dateTime.toISOString().split('T')[0]} - ${trade.assetCategory} ${trade.symbol} ${trade.buy_sell} ${trade.quantity} @ $${trade.tradePrice}`);
  if (trade.assetCategory === 'OPT') {
    console.log(`   Option: ${trade.putCall} strike $${trade.strike} exp ${trade.expiry?.toISOString().split('T')[0]}`);
  }
  console.log(`   Net Cash: $${trade.netCash}, Fees: $${trade.commissionAndTax}`);
  console.log('');
});

// Simulate the wheel strategy analyzer logic
console.log('🔍 Simulating Cycle Detection Logic:');
console.log('====================================\n');

let currentCycle = null;
let cycles = [];
let stockPosition = 0;

for (const trade of mockAITrades) {
  console.log(`Processing: ${trade.dateTime.toISOString().split('T')[0]} - ${trade.assetCategory} ${trade.symbol} ${trade.buy_sell}`);
  
  // Start new cycle with a sold PUT
  if (trade.assetCategory === 'OPT' && trade.putCall === 'P' && trade.buy_sell === 'SELL') {
    console.log('  🔄 Starting new PUT cycle');
    if (currentCycle) {
      console.log('  ⚠️  Closing previous cycle first');
      cycles.push(currentCycle);
    }
    
    const premium = trade.netCash > 0 ? trade.netCash : Math.abs(trade.netCash);
    currentCycle = {
      id: 'ai_cycle_1',
      symbol: 'AI',
      startDate: trade.dateTime,
      status: 'active',
      trades: [trade],
      totalPremiumCollected: premium,
      totalFees: Math.abs(trade.commissionAndTax),
      netProfit: premium - Math.abs(trade.commissionAndTax),
      cycleType: 'put-expired'
    };
    console.log(`  ✅ Created cycle with $${premium} premium, $${Math.abs(trade.commissionAndTax)} fees`);
  }
  // Handle PUT assignment (buying stock)
  else if (currentCycle && trade.assetCategory === 'STK' && trade.buy_sell === 'BUY') {
    console.log('  📦 PUT assignment - buying stock');
    currentCycle.trades.push(trade);
    currentCycle.assignmentPrice = trade.tradePrice;
    currentCycle.sharesAssigned = Math.abs(trade.quantity);
    currentCycle.totalFees += Math.abs(trade.commissionAndTax);
    currentCycle.netProfit -= Math.abs(trade.commissionAndTax); // Only subtract commission
    currentCycle.cycleType = 'put-assigned-call-expired';
    stockPosition += Math.abs(trade.quantity);
    console.log(`  ✅ Assigned ${currentCycle.sharesAssigned} shares @ $${currentCycle.assignmentPrice}`);
    console.log(`  💰 Net profit now: $${currentCycle.netProfit.toFixed(2)}`);
  }
  // Handle selling CALLs on assigned stock
  else if (currentCycle && trade.assetCategory === 'OPT' && trade.putCall === 'C' && trade.buy_sell === 'SELL') {
    console.log('  📞 Selling CALL on assigned stock');
    currentCycle.trades.push(trade);
    const premium = trade.netCash > 0 ? trade.netCash : Math.abs(trade.netCash);
    currentCycle.totalPremiumCollected += premium;
    currentCycle.totalFees += Math.abs(trade.commissionAndTax);
    currentCycle.netProfit += premium - Math.abs(trade.commissionAndTax);
    console.log(`  ✅ Collected additional $${premium} premium`);
    console.log(`  💰 Total premium collected: $${currentCycle.totalPremiumCollected}`);
  }
  // Handle CALL assignment (selling stock)
  else if (currentCycle && trade.assetCategory === 'STK' && trade.buy_sell === 'SELL') {
    console.log('  🎯 CALL assignment - selling stock');
    currentCycle.trades.push(trade);
    currentCycle.totalFees += Math.abs(trade.commissionAndTax);
    
    // Calculate actual P&L when stock is sold
    if (currentCycle.assignmentPrice && currentCycle.sharesAssigned) {
      const salePrice = trade.tradePrice;
      const purchasePrice = currentCycle.assignmentPrice;
      const shares = Math.abs(trade.quantity);
      const stockPnL = (salePrice - purchasePrice) * shares;
      
      // Net profit = stock P&L + all premiums collected - all fees
      currentCycle.netProfit = stockPnL + currentCycle.totalPremiumCollected - currentCycle.totalFees;
      
      console.log(`  📊 Stock P&L: ($${purchasePrice} → $${salePrice}) × ${shares} = $${stockPnL}`);
      console.log(`  📊 Total premiums: $${currentCycle.totalPremiumCollected}`);
      console.log(`  📊 Total fees: $${currentCycle.totalFees}`);
      console.log(`  💰 Final net profit: $${currentCycle.netProfit.toFixed(2)}`);
    }
    
    currentCycle.cycleType = 'put-assigned-call-assigned';
    currentCycle.endDate = trade.dateTime;
    currentCycle.status = 'completed';
    stockPosition -= Math.abs(trade.quantity);
    
    console.log('  🏁 Cycle completed and marked as finished');
    cycles.push(currentCycle);
    currentCycle = null;
  }
  
  console.log(`  Stock position: ${stockPosition} shares\n`);
}

// Handle open cycles
if (currentCycle) {
  cycles.push(currentCycle);
  console.log('⚠️  Added open cycle to results\n');
}

console.log('📊 Final Results:');
console.log('=================\n');

console.log(`Total cycles detected: ${cycles.length}`);
cycles.forEach((cycle, index) => {
  console.log(`\nCycle ${index + 1}:`);
  console.log(`  Status: ${cycle.status}`);
  console.log(`  Type: ${cycle.cycleType}`);
  console.log(`  Start: ${cycle.startDate.toISOString().split('T')[0]}`);
  console.log(`  End: ${cycle.endDate?.toISOString().split('T')[0] || 'N/A'}`);
  console.log(`  Trades: ${cycle.trades.length}`);
  console.log(`  Premium collected: $${cycle.totalPremiumCollected}`);
  console.log(`  Total fees: $${cycle.totalFees}`);
  console.log(`  Net profit: $${cycle.netProfit.toFixed(2)}`);
  console.log(`  Assignment price: $${cycle.assignmentPrice || 'N/A'}`);
  console.log(`  Shares assigned: ${cycle.sharesAssigned || 'N/A'}`);
});

// Test the validation logic that's causing issues
console.log('\n🔍 Testing Validation Logic:');
console.log('============================\n');

const activeCycles = cycles.filter(c => c.status === 'active');
const completedCycles = cycles.filter(c => c.status === 'completed');

console.log(`Active cycles: ${activeCycles.length}`);
console.log(`Completed cycles: ${completedCycles.length}`);

// Apply the same validation that's in the analyzer
const validActiveCycles = cycles.filter(c => 
  c.status === 'active' && 
  c.trades && 
  c.trades.length > 0 &&
  c.totalPremiumCollected > 0
);

const validCompletedCycles = cycles.filter(c => 
  c.status === 'completed' &&
  c.trades &&
  c.trades.length > 0
);

console.log(`Valid active cycles: ${validActiveCycles.length}`);
console.log(`Valid completed cycles: ${validCompletedCycles.length}`);

// Check why cycles might be showing as empty
console.log('\n🚨 Potential Issues:');
console.log('===================\n');

if (validCompletedCycles.length === 0 && completedCycles.length > 0) {
  console.log('❌ ISSUE: Completed cycles exist but none pass validation');
  completedCycles.forEach((cycle, index) => {
    console.log(`   Cycle ${index + 1} validation:`);
    console.log(`     - status === 'completed': ${cycle.status === 'completed'}`);
    console.log(`     - trades exist: ${!!(cycle.trades)}`);
    console.log(`     - trades.length > 0: ${cycle.trades && cycle.trades.length > 0}`);
  });
} else {
  console.log('✅ Completed cycles validation looks good');
}

if (validActiveCycles.length === 0 && activeCycles.length > 0) {
  console.log('❌ ISSUE: Active cycles exist but none pass validation');
  activeCycles.forEach((cycle, index) => {
    console.log(`   Cycle ${index + 1} validation:`);
    console.log(`     - status === 'active': ${cycle.status === 'active'}`);
    console.log(`     - trades exist: ${!!(cycle.trades)}`);
    console.log(`     - trades.length > 0: ${cycle.trades && cycle.trades.length > 0}`);
    console.log(`     - totalPremiumCollected > 0: ${cycle.totalPremiumCollected > 0}`);
  });
} else {
  console.log('✅ Active cycles validation looks good');
}

console.log('\n🎯 Conclusion:');
console.log('==============');
if (validCompletedCycles.length > 0) {
  console.log('✅ AI wheel cycle detection is working correctly');
  console.log('✅ The cycle should appear in completed cycles list');
} else {
  console.log('❌ AI wheel cycle detection has issues');
  console.log('❌ Need to fix the cycle detection logic');
}