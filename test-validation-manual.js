// Manual test to check PYPL position calculation

const fetch = require('node-fetch');

async function testPositions() {
  try {
    console.log('Fetching positions data...');
    const response = await fetch('http://localhost:3001/api/trades');
    const data = await response.json();
    
    if (data.error) {
      console.error('Error:', data.error);
      return;
    }
    
    console.log('\n📊 Position Summary:');
    console.log('==================');
    
    Object.entries(data.positions).forEach(([symbol, position]) => {
      console.log(`\n${symbol}:`);
      console.log(`  Quantity: ${position.quantity} shares`);
      console.log(`  Average Cost: $${position.averageCost?.toFixed(2) || 'N/A'}`);
      console.log(`  Realized P&L: $${position.realizedPnL?.toFixed(2) || 0}`);
      console.log(`  Active Cycles: ${position.activeCycles.length}`);
      console.log(`  Completed Cycles: ${position.completedCycles.length}`);
    });
    
    // Check PYPL specifically
    const pyplPosition = data.positions.PYPL;
    if (pyplPosition) {
      console.log('\n🔍 PYPL Position Details:');
      console.log('========================');
      console.log(`Calculated Quantity: ${pyplPosition.quantity} shares`);
      console.log(`Expected Quantity: 35 shares (235 bought - 200 sold)`);
      
      if (pyplPosition.quantity === 35) {
        console.log('✅ PYPL position calculation is CORRECT!');
      } else {
        console.log('❌ PYPL position calculation is INCORRECT!');
        console.log(`   Found ${pyplPosition.quantity} shares instead of 35`);
      }
    } else {
      console.log('\n❌ No PYPL position found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPositions();