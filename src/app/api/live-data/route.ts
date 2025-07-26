/**
 * Live Data API Route
 * Exposes real-time market data and enhanced recommendations to the frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { MarketDataService } from '@/services/marketDataService';
import { EnhancedRecommendationEngine } from '@/services/enhancedRecommendationEngine';
import { RiskManagementService } from '@/services/riskManagement';
import { MonitoringService } from '@/services/monitoringService';
import { Trade } from '@/types/trade';

const marketDataService = MarketDataService.getInstance();
const recommendationEngine = EnhancedRecommendationEngine.getInstance();
const riskService = RiskManagementService.getInstance();
const monitoringService = MonitoringService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || [];
    const action = searchParams.get('action') || 'quotes';

    switch (action) {
      case 'quotes':
        return await handleQuotes(symbols);
        
      case 'indicators':
        return await handleMarketIndicators();
        
      case 'candidates':
        const portfolioValue = parseFloat(searchParams.get('portfolioValue') || '100000');
        const riskTolerance = (searchParams.get('riskTolerance') || 'medium') as 'low' | 'medium' | 'high';
        return await handleWheelCandidates(portfolioValue, riskTolerance);
        
      case 'monitoring':
        return await handleMonitoringStats();
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Live data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'subscribe':
        return await handleSubscription(data);
        
      case 'recommendations':
        return await handleRecommendations(data);
        
      case 'risk-assessment':
        return await handleRiskAssessment(data);
        
      case 'start-monitoring':
        return await handleStartMonitoring();
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Live data API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleQuotes(symbols: string[]) {
  if (symbols.length === 0) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }

  const quotes = new Map();
  for (const symbol of symbols) {
    const quote = marketDataService.getCurrentQuote(symbol);
    if (quote) {
      quotes.set(symbol, quote);
    }
  }

  return NextResponse.json({
    quotes: Object.fromEntries(quotes),
    timestamp: new Date().toISOString()
  });
}

async function handleMarketIndicators() {
  const indicators = await marketDataService.getMarketIndicators();
  return NextResponse.json({
    indicators,
    timestamp: new Date().toISOString()
  });
}

async function handleWheelCandidates(portfolioValue: number, riskTolerance: 'low' | 'medium' | 'high') {
  const candidates = await marketDataService.getWheelCandidates(portfolioValue, riskTolerance);
  return NextResponse.json({
    candidates,
    portfolioValue,
    riskTolerance,
    timestamp: new Date().toISOString()
  });
}

async function handleMonitoringStats() {
  const stats = monitoringService.getStats();
  const metrics = monitoringService.getMetrics();
  const alerts = monitoringService.getAlerts({ acknowledged: false });

  return NextResponse.json({
    stats,
    metrics,
    unacknowledgedAlerts: alerts.length,
    recentAlerts: alerts.slice(0, 5),
    timestamp: new Date().toISOString()
  });
}

async function handleSubscription(data: any) {
  const { subscriptionId, symbols, interval = 10000, includeOptions = true } = data;

  if (!subscriptionId || !symbols || !Array.isArray(symbols)) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
  }

  await marketDataService.subscribe(subscriptionId, {
    symbols,
    interval,
    includeOptions,
    includeGreeks: true
  });

  return NextResponse.json({
    success: true,
    subscriptionId,
    symbols,
    interval,
    timestamp: new Date().toISOString()
  });
}

async function handleRecommendations(data: any) {
  const { 
    trades = [], 
    portfolioValue = 100000, 
    riskTolerance = 'moderate' 
  } = data;

  // Validate trades data
  const validatedTrades: Trade[] = Array.isArray(trades) ? trades : [];

  const recommendations = await recommendationEngine.generateEnhancedRecommendations(
    validatedTrades,
    portfolioValue,
    riskTolerance as 'conservative' | 'moderate' | 'aggressive'
  );

  // Validate recommendations with risk management
  const validatedRecommendations = [];
  for (const rec of recommendations) {
    const validation = riskService.validateRecommendation(rec, portfolioValue, validatedTrades);
    if (validation.isValid) {
      validatedRecommendations.push({
        ...rec,
        validation
      });
    }
  }

  return NextResponse.json({
    recommendations: validatedRecommendations,
    totalCount: recommendations.length,
    validatedCount: validatedRecommendations.length,
    portfolioValue,
    riskTolerance,
    timestamp: new Date().toISOString()
  });
}

async function handleRiskAssessment(data: any) {
  const { 
    positions = [], 
    recommendations = [], 
    portfolioValue = 100000 
  } = data;

  const marketIndicators = await marketDataService.getMarketIndicators();
  const portfolioRisk = riskService.assessPortfolioRisk(
    positions,
    recommendations,
    portfolioValue,
    marketIndicators
  );

  return NextResponse.json({
    portfolioRisk,
    marketIndicators,
    timestamp: new Date().toISOString()
  });
}

async function handleStartMonitoring() {
  // Start services if not already running
  if (!marketDataService.getStats().isStreaming) {
    await marketDataService.startStreaming();
  }
  
  monitoringService.startMonitoring();

  return NextResponse.json({
    success: true,
    services: {
      marketData: marketDataService.getStats(),
      monitoring: monitoringService.getStats()
    },
    timestamp: new Date().toISOString()
  });
}