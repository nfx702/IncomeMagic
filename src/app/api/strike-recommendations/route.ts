import { NextResponse } from 'next/server';
import { strikeRecommendationEngine } from '@/services/strikeRecommendations';
import { AlpacaService } from '@/services/alpacaService';

export async function POST(request: Request) {
  try {
    const { symbol, trades = [], strategies = ['cash_secured_put', 'covered_call'], options = {} } = await request.json();
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Mock price data for demonstration
    const mockPrices: { [key: string]: number } = {
      'AAPL': 195.50,
      'MSFT': 423.80,
      'GOOGL': 178.25,
      'AMZN': 189.75,
      'TSLA': 245.30,
      'NVDA': 173.15,
      'META': 515.60,
      'SPY': 485.20,
      'QQQ': 481.90,
      'IWM': 208.40,
      'AMD': 165.30,
      'NFLX': 675.80,
      'DIS': 92.45,
      'COST': 838.90,
      'CRM': 302.15,
      'ADBE': 559.30,
      'IBM': 265.80
    };

    // Get current price (try Alpaca API first, fall back to mock)
    let currentPrice = mockPrices[symbol] || 100;
    
    try {
      const alpaca = AlpacaService.getInstance();
      const quote = await alpaca.getStockQuote(symbol);
      if (quote && quote.price > 0) {
        currentPrice = quote.price;
      }
    } catch (apiError) {
      console.log(`Using mock price for ${symbol}: $${currentPrice}`);
    }

    // Generate intelligent strike recommendations
    const recommendations = await strikeRecommendationEngine.generateStrikeRecommendations(
      symbol,
      currentPrice,
      trades,
      {
        strategies,
        minPremium: options.minPremium || 100,
        maxRisk: options.maxRisk || 10000,
        targetProbability: options.targetProbability || 0.7
      }
    );

    // Add educational content
    const educationalContent = {
      maxPainExplanation: "Max pain theory suggests that option prices tend to gravitate toward the price level that causes maximum financial loss to option holders at expiration. We use this as a key reference point for strike selection.",
      mlPredictionExplanation: "Our ML models analyze historical price patterns, volatility, and market conditions to predict likely price movements over the next 7-14 days, helping optimize strike placement.",
      strikeSelectionTips: recommendations.map(rec => ({
        strategy: rec.strategy,
        tip: strikeRecommendationEngine.getStrikeSelectionEducation(rec.strategy)
      }))
    };

    return NextResponse.json({
      symbol,
      currentPrice,
      recommendations,
      education: educationalContent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating strike recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate strike recommendations' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  // Generate sample recommendations for GET requests
  return POST(new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      symbol,
      trades: [],
      strategies: ['cash_secured_put', 'covered_call', 'iron_condor']
    })
  }));
}