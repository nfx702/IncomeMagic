/**
 * Test file for ML Predictions
 * Demonstrates usage of the prediction models
 */

import { 
  trainModel, 
  predict14Days, 
  getModelConfidence, 
  getDetailedPredictions,
  clearModels,
  getTrainedSymbols
} from './mlPredictions';

async function testMLPredictions() {
  console.log('=== ML Predictions Test Suite ===\n');

  // Test 1: Train model with default mock data
  console.log('Test 1: Training model for AAPL with mock data...');
  await trainModel('AAPL');
  console.log('✓ Training completed\n');

  // Test 2: Get 14-day predictions
  console.log('Test 2: Getting 14-day predictions for AAPL...');
  const predictions = await predict14Days('AAPL');
  console.log('14-day predictions:', predictions.map(p => p.toFixed(2)));
  console.log(`✓ Generated ${predictions.length} predictions\n`);

  // Test 3: Get model confidence
  console.log('Test 3: Getting model confidence...');
  const confidence = getModelConfidence('AAPL');
  console.log(`Model confidence for AAPL: ${(confidence * 100).toFixed(1)}%`);
  console.log('✓ Confidence calculated\n');

  // Test 4: Train with custom historical data
  console.log('Test 4: Training model with custom historical data for MSFT...');
  const customData = Array.from({ length: 30 }, (_, i) => 300 + Math.sin(i / 5) * 10 + Math.random() * 5);
  await trainModel('MSFT', customData);
  console.log('✓ Training completed with custom data\n');

  // Test 5: Get detailed predictions from all models
  console.log('Test 5: Getting detailed predictions from all models for MSFT...');
  const detailed = await getDetailedPredictions('MSFT');
  
  console.log('Ensemble predictions:', detailed.ensemble.slice(0, 5).map(p => p.toFixed(2)), '...');
  console.log('\nIndividual model predictions (first 5 days):');
  console.log(`- Linear Regression (${(detailed.models.linear.confidence * 100).toFixed(1)}% confidence):`, 
    detailed.models.linear.prices.slice(0, 5).map(p => p.toFixed(2)));
  console.log(`- Moving Average (${(detailed.models.movingAverage.confidence * 100).toFixed(1)}% confidence):`, 
    detailed.models.movingAverage.prices.slice(0, 5).map(p => p.toFixed(2)));
  console.log(`- ARIMA (${(detailed.models.arima.confidence * 100).toFixed(1)}% confidence):`, 
    detailed.models.arima.prices.slice(0, 5).map(p => p.toFixed(2)));
  console.log(`- Neural Network (${(detailed.models.neuralNetwork.confidence * 100).toFixed(1)}% confidence):`, 
    detailed.models.neuralNetwork.prices.slice(0, 5).map(p => p.toFixed(2)));
  console.log('✓ Detailed predictions retrieved\n');

  // Test 6: Get overall model confidence
  console.log('Test 6: Getting overall model confidence across all symbols...');
  const overallConfidence = getModelConfidence();
  console.log(`Overall model confidence: ${(overallConfidence * 100).toFixed(1)}%`);
  console.log('✓ Overall confidence calculated\n');

  // Test 7: List trained symbols
  console.log('Test 7: Getting list of trained symbols...');
  const trainedSymbols = getTrainedSymbols();
  console.log('Trained symbols:', trainedSymbols);
  console.log('✓ Retrieved trained symbols\n');

  // Test 8: Predict without training (should auto-train)
  console.log('Test 8: Predicting for new symbol GOOGL (should auto-train)...');
  const googlPredictions = await predict14Days('GOOGL');
  console.log('First 5 predictions:', googlPredictions.slice(0, 5).map(p => p.toFixed(2)));
  console.log('✓ Auto-training and prediction completed\n');

  // Test 9: Clear models
  console.log('Test 9: Clearing models...');
  clearModels('AAPL');
  console.log('Cleared AAPL model');
  
  const remainingSymbols = getTrainedSymbols();
  console.log('Remaining symbols:', remainingSymbols);
  
  clearModels(); // Clear all
  console.log('Cleared all models');
  console.log('✓ Model clearing completed\n');

  console.log('=== All tests completed successfully! ===');
}

// Example usage in an application
async function exampleUsage() {
  console.log('\n=== Example Usage in Application ===\n');

  // Scenario: User wants predictions for their portfolio
  const portfolio = ['AAPL', 'TSLA', 'NVDA'];
  
  console.log('Generating predictions for portfolio:', portfolio);
  
  for (const symbol of portfolio) {
    console.log(`\n${symbol}:`);
    
    // Train and predict
    await trainModel(symbol);
    const predictions = await predict14Days(symbol);
    const confidence = getModelConfidence(symbol);
    
    // Show summary
    const currentPrice = predictions[0];
    const finalPrice = predictions[13];
    const change = ((finalPrice - currentPrice) / currentPrice) * 100;
    
    console.log(`- Current price: $${currentPrice.toFixed(2)}`);
    console.log(`- 14-day prediction: $${finalPrice.toFixed(2)}`);
    console.log(`- Expected change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
    console.log(`- Confidence: ${(confidence * 100).toFixed(1)}%`);
    
    // Show trend
    const trend = predictions.slice(0, 7).map((p, i) => 
      `Day ${i + 1}: $${p.toFixed(2)}`
    ).join(', ');
    console.log(`- 7-day trend: ${trend}`);
  }
  
  console.log('\n✓ Portfolio predictions completed');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testMLPredictions()
    .then(() => exampleUsage())
    .catch(console.error);
}

export { testMLPredictions, exampleUsage };