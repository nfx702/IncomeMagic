import { NextResponse } from 'next/server';
import { RecommendedTrade } from '@/types/trade';
import { AlpacaService } from '@/services/alpacaService';
import { sentimentService } from '@/services/sentimentAnalysis';
import { strikeRecommendationEngine } from '@/services/strikeRecommendations';
import { addDays, nextFriday } from 'date-fns';

// Enhanced types for sophisticated recommendation engine
interface PortfolioConstraints {
  maxPositionsPerSymbol: number;
  maxSectorExposure: number;
  minCashReserve: number;
  maxMarginUtilization: number;
  correlationThreshold: number;
}

interface PremiumTarget {
  weeklyTarget: number;
  minimumPerTrade: number;
  maximumPerTrade: number;
  riskAdjustmentFactor: number;
}

interface TradeCandidate {
  symbol: string;
  strategy: 'PUT' | 'CALL' | 'IRON_CONDOR' | 'STRANGLE' | 'SPREAD';
  strikes: number[];
  premium: number;
  riskScore: number;
  premiumScore: number;
  contracts: number;
  marginRequirement: number;
  sector: string;
  correlation: number;
  confidence: number;
  reasoning: string;
}

interface MarketConditions {
  vix: number;
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH';
  marketSentiment: number;
}

export async function POST(request: Request) {
  try {
    const { symbols, portfolioValue = 100000, existingPositions = [], trades = [] } = await request.json();
    
    // Enhanced portfolio constraints and premium targets
    const constraints: PortfolioConstraints = {
      maxPositionsPerSymbol: 3,
      maxSectorExposure: 0.4, // 40% max in any sector
      minCashReserve: 0.15, // 15% cash reserve
      maxMarginUtilization: 0.7, // 70% max margin usage
      correlationThreshold: 0.6 // Max correlation between positions
    };

    const premiumTarget: PremiumTarget = {
      weeklyTarget: 1500,
      minimumPerTrade: 150,
      maximumPerTrade: 500,
      riskAdjustmentFactor: 0.85 // Conservative adjustment
    };

    // Enhanced market data with sector mapping
    const mockPrices: { [key: string]: { price: number; sector: string; volatility: number } } = {
      'AAPL': { price: 195.50, sector: 'Technology', volatility: 0.28 },
      'MSFT': { price: 423.80, sector: 'Technology', volatility: 0.25 },
      'GOOGL': { price: 178.25, sector: 'Technology', volatility: 0.30 },
      'AMZN': { price: 189.75, sector: 'Consumer Discretionary', volatility: 0.32 },
      'TSLA': { price: 245.30, sector: 'Consumer Discretionary', volatility: 0.45 },
      'NVDA': { price: 173.15, sector: 'Technology', volatility: 0.40 },
      'META': { price: 515.60, sector: 'Technology', volatility: 0.35 },
      'SPY': { price: 485.20, sector: 'Index', volatility: 0.18 },
      'QQQ': { price: 481.90, sector: 'Index', volatility: 0.22 },
      'IWM': { price: 208.40, sector: 'Index', volatility: 0.28 },
      'AMD': { price: 165.30, sector: 'Technology', volatility: 0.42 },
      'NFLX': { price: 675.80, sector: 'Consumer Discretionary', volatility: 0.38 },
      'DIS': { price: 92.45, sector: 'Consumer Discretionary', volatility: 0.33 },
      'COST': { price: 838.90, sector: 'Consumer Staples', volatility: 0.24 },
      'CRM': { price: 302.15, sector: 'Technology', volatility: 0.31 },
      'ADBE': { price: 559.30, sector: 'Technology', volatility: 0.29 },
      'PYPL': { price: 71.85, sector: 'Financial Services', volatility: 0.36 },
      'SQ': { price: 81.20, sector: 'Financial Services', volatility: 0.44 },
      'SHOP': { price: 87.65, sector: 'Technology', volatility: 0.41 },
      'UBER': { price: 72.40, sector: 'Consumer Discretionary', volatility: 0.39 },
      'IBM': { price: 265.80, sector: 'Technology', volatility: 0.26 }
    };

    // Assess current market conditions
    const marketConditions: MarketConditions = await assessMarketConditions();
    
    // Get enhanced sentiment analysis
    const sentimentResults = await sentimentService.analyzeBatchSentiment(symbols);
    
    // Generate trade candidates using sophisticated algorithms
    const tradeCandidates: TradeCandidate[] = [];
    const availableCash = portfolioValue * (1 - constraints.minCashReserve);
    
    for (const symbol of symbols) {
      const marketData = mockPrices[symbol];
      if (!marketData) continue;
      
      const { price: currentPrice, sector, volatility } = marketData;
      const sentiment = sentimentResults.get(symbol);
      
      // Generate multiple strategy candidates for each symbol
      const candidates = await generateStrategyCandidates(
        symbol, 
        currentPrice, 
        sector, 
        volatility, 
        sentiment, 
        marketConditions,
        premiumTarget
      );
      
      tradeCandidates.push(...candidates);
    }
    
    // Portfolio optimization engine
    const optimizedTrades = optimizePortfolio(
      tradeCandidates,
      constraints,
      premiumTarget,
      availableCash,
      existingPositions
    );
    
    // Convert to RecommendedTrade format
    const recommendations: RecommendedTrade[] = optimizedTrades.map(candidate => ({
      symbol: candidate.symbol,
      optionType: candidate.strategy as 'PUT' | 'CALL', // Simplified for current interface
      strike: candidate.strikes[0],
      expiry: nextFriday(new Date()),
      premium: candidate.premium,
      maxPain: calculateMaxPain(candidate.symbol, mockPrices[candidate.symbol]?.price || 0),
      confidence: candidate.confidence,
      reasoning: candidate.reasoning,
      sentimentScore: sentimentResults.get(candidate.symbol)?.overallScore,
      sentimentLabel: sentimentResults.get(candidate.symbol)?.sentiment,
      sentimentConfidence: sentimentResults.get(candidate.symbol)?.overallConfidence
    }));

    // Calculate total premium and provide fallback if needed
    const totalPremium = recommendations.reduce((sum, rec) => sum + rec.premium, 0);
    const premiumGap = premiumTarget.weeklyTarget - totalPremium;
    
    if (premiumGap > 100) {
      // Implement fallback strategies
      const fallbackTrades = await generateFallbackStrategies(
        premiumGap,
        mockPrices,
        sentimentResults,
        constraints
      );
      recommendations.push(...fallbackTrades);
    }

    // Final sort by risk-adjusted premium score
    recommendations.sort((a, b) => (b.premium * b.confidence) - (a.premium * a.confidence));
    
    // Limit to top recommendations that fit within constraints
    const finalRecommendations = recommendations.slice(0, 8);
    const finalTotalPremium = finalRecommendations.reduce((sum, rec) => sum + rec.premium, 0);
    
    console.log(`Generated ${finalRecommendations.length} recommendations targeting $${finalTotalPremium.toFixed(2)} weekly premium`);
    
    return NextResponse.json({ 
      recommendations: finalRecommendations,
      targetAchieved: finalTotalPremium >= premiumTarget.weeklyTarget * 0.9,
      totalPremium: finalTotalPremium,
      premiumTarget: premiumTarget.weeklyTarget,
      marketConditions
    });
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

// SOPHISTICATED HELPER FUNCTIONS FOR PREMIUM OPTIMIZATION ENGINE

// Market conditions assessment using multiple indicators
async function assessMarketConditions(): Promise<MarketConditions> {
  // In production, this would integrate with real market data APIs
  const mockVix = 18 + Math.random() * 10; // VIX between 18-28
  const trendDirection = mockVix > 25 ? 'BEARISH' : mockVix < 20 ? 'BULLISH' : 'NEUTRAL';
  const volatilityRegime = mockVix > 25 ? 'HIGH' : mockVix < 18 ? 'LOW' : 'NORMAL';
  const marketSentiment = (28 - mockVix) / 10; // Convert VIX to sentiment score
  
  return {
    vix: mockVix,
    trendDirection,
    volatilityRegime,
    marketSentiment
  };
}

// Advanced strategy candidate generation
async function generateStrategyCandidates(
  symbol: string,
  currentPrice: number,
  sector: string,
  volatility: number,
  sentiment: any,
  marketConditions: MarketConditions,
  premiumTarget: PremiumTarget
): Promise<TradeCandidate[]> {
  const candidates: TradeCandidate[] = [];
  const sentimentAdjustment = sentiment?.overallScore || 0;
  
  // 1. Enhanced PUT strategies
  const putCandidates = generatePutStrategies(symbol, currentPrice, sector, volatility, sentimentAdjustment, marketConditions);
  candidates.push(...putCandidates);
  
  // 2. Enhanced CALL strategies
  const callCandidates = generateCallStrategies(symbol, currentPrice, sector, volatility, sentimentAdjustment, marketConditions);
  candidates.push(...callCandidates);
  
  // 3. Multi-leg strategies for higher premiums
  if (volatility > 0.25) { // Only for higher volatility stocks
    const multiLegCandidates = generateMultiLegStrategies(symbol, currentPrice, sector, volatility, marketConditions);
    candidates.push(...multiLegCandidates);
  }
  
  return candidates.filter(candidate => 
    candidate.premium >= premiumTarget.minimumPerTrade &&
    candidate.premium <= premiumTarget.maximumPerTrade
  );
}

// Generate optimized PUT strategies with dynamic strike selection
function generatePutStrategies(
  symbol: string,
  currentPrice: number,
  sector: string,
  volatility: number,
  sentimentAdjustment: number,
  marketConditions: MarketConditions
): TradeCandidate[] {
  const candidates: TradeCandidate[] = [];
  
  // Dynamic strike selection based on volatility and market conditions
  const baseDiscounts = [0.93, 0.95, 0.97]; // Different risk levels
  
  for (const baseDiscount of baseDiscounts) {
    const adjustedDiscount = baseDiscount - (sentimentAdjustment * 0.02) - (volatility * 0.05);
    const strike = Math.floor(currentPrice * adjustedDiscount / 5) * 5;
    const premium = calculateAdvancedPremium(currentPrice, strike, 'PUT', volatility, 7);
    
    // Contract quantity optimization
    const contracts = optimizeContractQuantity(premium, currentPrice, strike, 'PUT');
    const marginRequirement = calculateMarginRequirement(strike, contracts, 'PUT');
    
    // Risk scoring
    const riskScore = calculateRiskScore(currentPrice, strike, 'PUT', volatility, sector);
    const premiumScore = calculatePremiumScore(premium, riskScore, marketConditions);
    
    candidates.push({
      symbol,
      strategy: 'PUT',
      strikes: [strike],
      premium: premium * contracts,
      riskScore,
      premiumScore,
      contracts,
      marginRequirement,
      sector,
      correlation: calculateCorrelation(symbol, sector),
      confidence: calculateConfidence(riskScore, premiumScore, volatility, marketConditions),
      reasoning: generateReasoning('PUT', symbol, currentPrice, strike, premium, volatility, sentimentAdjustment)
    });
  }
  
  return candidates;
}

// Generate optimized CALL strategies
function generateCallStrategies(
  symbol: string,
  currentPrice: number,
  sector: string,
  volatility: number,
  sentimentAdjustment: number,
  marketConditions: MarketConditions
): TradeCandidate[] {
  const candidates: TradeCandidate[] = [];
  
  const basePremiums = [1.03, 1.05, 1.08]; // Different risk levels
  
  for (const basePremium of basePremiums) {
    const adjustedPremium = basePremium + (sentimentAdjustment * 0.02) + (volatility * 0.03);
    const strike = Math.ceil(currentPrice * adjustedPremium / 5) * 5;
    const premium = calculateAdvancedPremium(currentPrice, strike, 'CALL', volatility, 7);
    
    const contracts = optimizeContractQuantity(premium, currentPrice, strike, 'CALL');
    const marginRequirement = 0; // Covered calls don't require margin
    const riskScore = calculateRiskScore(currentPrice, strike, 'CALL', volatility, sector);
    const premiumScore = calculatePremiumScore(premium, riskScore, marketConditions);
    
    candidates.push({
      symbol,
      strategy: 'CALL',
      strikes: [strike],
      premium: premium * contracts,
      riskScore,
      premiumScore,
      contracts,
      marginRequirement,
      sector,
      correlation: calculateCorrelation(symbol, sector),
      confidence: calculateConfidence(riskScore, premiumScore, volatility, marketConditions),
      reasoning: generateReasoning('CALL', symbol, currentPrice, strike, premium, volatility, sentimentAdjustment)
    });
  }
  
  return candidates;
}

// Generate multi-leg strategies for higher premiums
function generateMultiLegStrategies(
  symbol: string,
  currentPrice: number,
  sector: string,
  volatility: number,
  marketConditions: MarketConditions
): TradeCandidate[] {
  const candidates: TradeCandidate[] = [];
  
  // Iron Condor strategy
  const ironCondor = generateIronCondor(symbol, currentPrice, sector, volatility, marketConditions);
  if (ironCondor) candidates.push(ironCondor);
  
  // Strangle strategy
  const strangle = generateStrangle(symbol, currentPrice, sector, volatility, marketConditions);
  if (strangle) candidates.push(strangle);
  
  return candidates;
}

// Iron Condor generation for neutral market outlook
function generateIronCondor(
  symbol: string,
  currentPrice: number,
  sector: string,
  volatility: number,
  marketConditions: MarketConditions
): TradeCandidate | null {
  if (marketConditions.volatilityRegime !== 'HIGH') return null;
  
  const putSpread = currentPrice * 0.10; // 10% spread
  const callSpread = currentPrice * 0.10;
  
  const shortPutStrike = Math.floor(currentPrice * 0.95 / 5) * 5;
  const longPutStrike = Math.floor((currentPrice * 0.95 - putSpread) / 5) * 5;
  const shortCallStrike = Math.ceil(currentPrice * 1.05 / 5) * 5;
  const longCallStrike = Math.ceil((currentPrice * 1.05 + callSpread) / 5) * 5;
  
  const putCredit = calculateAdvancedPremium(currentPrice, shortPutStrike, 'PUT', volatility, 7) -
                   calculateAdvancedPremium(currentPrice, longPutStrike, 'PUT', volatility, 7);
  const callCredit = calculateAdvancedPremium(currentPrice, shortCallStrike, 'CALL', volatility, 7) -
                    calculateAdvancedPremium(currentPrice, longCallStrike, 'CALL', volatility, 7);
  
  const totalPremium = (putCredit + callCredit) * 2; // 2 contracts
  const marginRequirement = Math.max(putSpread, callSpread) * 100 * 2; // Max risk
  
  return {
    symbol,
    strategy: 'IRON_CONDOR',
    strikes: [longPutStrike, shortPutStrike, shortCallStrike, longCallStrike],
    premium: totalPremium,
    riskScore: 0.6, // Moderate risk
    premiumScore: totalPremium / marginRequirement,
    contracts: 2,
    marginRequirement,
    sector,
    correlation: calculateCorrelation(symbol, sector),
    confidence: 0.75,
    reasoning: `Iron Condor on ${symbol}: High volatility environment ideal for range-bound premium collection. Profit range: $${shortPutStrike}-$${shortCallStrike}`
  };
}

// Strangle generation for high volatility
function generateStrangle(
  symbol: string,
  currentPrice: number,
  sector: string,
  volatility: number,
  marketConditions: MarketConditions
): TradeCandidate | null {
  if (volatility < 0.30) return null;
  
  const putStrike = Math.floor(currentPrice * 0.92 / 5) * 5;
  const callStrike = Math.ceil(currentPrice * 1.08 / 5) * 5;
  
  const putPremium = calculateAdvancedPremium(currentPrice, putStrike, 'PUT', volatility, 7);
  const callPremium = calculateAdvancedPremium(currentPrice, callStrike, 'CALL', volatility, 7);
  const totalPremium = (putPremium + callPremium) * 2;
  
  return {
    symbol,
    strategy: 'STRANGLE',
    strikes: [putStrike, callStrike],
    premium: totalPremium,
    riskScore: 0.7, // Higher risk
    premiumScore: totalPremium / (currentPrice * 0.16 * 100), // Risk-adjusted
    contracts: 2,
    marginRequirement: currentPrice * 0.20 * 100 * 2, // 20% margin requirement
    sector,
    correlation: calculateCorrelation(symbol, sector),
    confidence: 0.68,
    reasoning: `Short Strangle on ${symbol}: High volatility (${(volatility*100).toFixed(0)}%) creates premium opportunity. Profit if price stays between $${putStrike}-$${callStrike}`
  };
}

// Portfolio optimization engine with constraints
function optimizePortfolio(
  candidates: TradeCandidate[],
  constraints: PortfolioConstraints,
  premiumTarget: PremiumTarget,
  availableCash: number,
  existingPositions: any[]
): TradeCandidate[] {
  // Sort candidates by risk-adjusted premium score
  candidates.sort((a, b) => (b.premiumScore * b.confidence) - (a.premiumScore * a.confidence));
  
  const selectedTrades: TradeCandidate[] = [];
  const sectorExposure: { [sector: string]: number } = {};
  const symbolCounts: { [symbol: string]: number } = {};
  let totalMarginUsed = 0;
  let totalPremium = 0;
  
  for (const candidate of candidates) {
    // Check constraints
    if (symbolCounts[candidate.symbol] >= constraints.maxPositionsPerSymbol) continue;
    if (totalMarginUsed + candidate.marginRequirement > availableCash * constraints.maxMarginUtilization) continue;
    if (totalPremium >= premiumTarget.weeklyTarget) break;
    
    // Check sector exposure
    const currentSectorExposure = sectorExposure[candidate.sector] || 0;
    const newExposure = currentSectorExposure + candidate.marginRequirement;
    if (newExposure > availableCash * constraints.maxSectorExposure) continue;
    
    // Check correlation (simplified)
    if (selectedTrades.some(trade => 
      trade.sector === candidate.sector && 
      candidate.correlation > constraints.correlationThreshold
    )) continue;
    
    // Add to portfolio
    selectedTrades.push(candidate);
    symbolCounts[candidate.symbol] = (symbolCounts[candidate.symbol] || 0) + 1;
    sectorExposure[candidate.sector] = newExposure;
    totalMarginUsed += candidate.marginRequirement;
    totalPremium += candidate.premium;
  }
  
  return selectedTrades;
}

// Advanced premium calculation with Greeks consideration
function calculateAdvancedPremium(
  currentPrice: number,
  strike: number,
  optionType: 'PUT' | 'CALL',
  volatility: number,
  daysToExpiry: number
): number {
  const timeToExpiry = daysToExpiry / 365;
  const riskFreeRate = 0.05; // 5% risk-free rate
  
  // Simplified Black-Scholes components
  const d1 = (Math.log(currentPrice / strike) + (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry) / 
            (volatility * Math.sqrt(timeToExpiry));
  const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
  
  // Normal CDF approximation
  const normalCDF = (x: number) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
  
  let premium: number;
  if (optionType === 'CALL') {
    premium = currentPrice * normalCDF(d1) - strike * Math.exp(-riskFreeRate * timeToExpiry) * normalCDF(d2);
  } else {
    premium = strike * Math.exp(-riskFreeRate * timeToExpiry) * normalCDF(-d2) - currentPrice * normalCDF(-d1);
  }
  
  return Math.max(0.01, premium) * 100; // Convert to premium per share * 100
}

// Contract quantity optimization
function optimizeContractQuantity(premium: number, currentPrice: number, strike: number, optionType: 'PUT' | 'CALL'): number {
  // Target premium per trade between $200-$400
  const targetPremium = 300;
  const baseContracts = Math.round(targetPremium / premium);
  
  // Risk-based adjustments
  const moneyness = Math.abs(currentPrice - strike) / currentPrice;
  const riskAdjustment = moneyness < 0.05 ? 0.5 : moneyness < 0.10 ? 0.8 : 1.0;
  
  return Math.max(1, Math.min(10, Math.round(baseContracts * riskAdjustment)));
}

// Margin requirement calculation
function calculateMarginRequirement(strike: number, contracts: number, optionType: 'PUT' | 'CALL'): number {
  // Simplified margin calculation
  if (optionType === 'CALL') return 0; // Assume covered calls
  return strike * 100 * contracts * 0.20; // 20% of PUT strike value
}

// Risk scoring algorithm
function calculateRiskScore(
  currentPrice: number,
  strike: number,
  optionType: 'PUT' | 'CALL',
  volatility: number,
  sector: string
): number {
  const moneyness = Math.abs(currentPrice - strike) / currentPrice;
  const volatilityRisk = volatility > 0.40 ? 0.8 : volatility > 0.25 ? 0.6 : 0.4;
  const moneynessRisk = moneyness < 0.05 ? 0.9 : moneyness < 0.10 ? 0.6 : 0.3;
  const sectorRisk = sector === 'Technology' ? 0.7 : sector === 'Financial Services' ? 0.6 : 0.5;
  
  return (volatilityRisk + moneynessRisk + sectorRisk) / 3;
}

// Premium scoring with risk adjustment
function calculatePremiumScore(premium: number, riskScore: number, marketConditions: MarketConditions): number {
  const baseScore = premium / 100; // Normalize premium
  const riskAdjustment = 1 - riskScore * 0.5; // Reduce score for higher risk
  const marketAdjustment = marketConditions.volatilityRegime === 'HIGH' ? 1.2 : 
                          marketConditions.volatilityRegime === 'LOW' ? 0.8 : 1.0;
  
  return baseScore * riskAdjustment * marketAdjustment;
}

// Correlation calculation (simplified)
function calculateCorrelation(symbol: string, sector: string): number {
  // Simplified correlation based on sector
  const techCorrelation = 0.7;
  const indexCorrelation = 0.8;
  const otherCorrelation = 0.4;
  
  return sector === 'Technology' ? techCorrelation :
         sector === 'Index' ? indexCorrelation : otherCorrelation;
}

// Confidence calculation
function calculateConfidence(
  riskScore: number,
  premiumScore: number,
  volatility: number,
  marketConditions: MarketConditions
): number {
  const baseConfidence = 0.7;
  const riskAdjustment = (1 - riskScore) * 0.2;
  const premiumAdjustment = Math.min(0.15, premiumScore * 0.05);
  const volatilityAdjustment = volatility > 0.35 ? -0.1 : volatility < 0.20 ? 0.1 : 0;
  const marketAdjustment = marketConditions.marketSentiment > 0.5 ? 0.05 : 
                          marketConditions.marketSentiment < -0.5 ? -0.05 : 0;
  
  return Math.min(0.95, Math.max(0.3, 
    baseConfidence + riskAdjustment + premiumAdjustment + volatilityAdjustment + marketAdjustment
  ));
}

// Enhanced reasoning generation
function generateReasoning(
  strategy: string,
  symbol: string,
  currentPrice: number,
  strike: number,
  premium: number,
  volatility: number,
  sentimentAdjustment: number
): string {
  const otmPercent = Math.abs((currentPrice - strike) / currentPrice * 100).toFixed(1);
  const volPercent = (volatility * 100).toFixed(0);
  
  let reasoning = `${strategy} ${symbol} @ $${strike}: ${otmPercent}% OTM provides $${premium.toFixed(0)} premium. `;
  reasoning += `IV: ${volPercent}%. `;
  
  if (sentimentAdjustment > 0.2) {
    reasoning += "Bullish sentiment supports higher strikes. ";
  } else if (sentimentAdjustment < -0.2) {
    reasoning += "Bearish sentiment allows aggressive positioning. ";
  }
  
  reasoning += `Optimal risk/reward ratio for weekly income generation.`;
  
  return reasoning;
}

// Max pain calculation
function calculateMaxPain(symbol: string, currentPrice: number): number {
  // Simplified max pain calculation
  return Math.floor(currentPrice * (0.98 + Math.random() * 0.04) / 5) * 5;
}

// Fallback strategies when target isn't met
async function generateFallbackStrategies(
  premiumGap: number,
  mockPrices: any,
  sentimentResults: Map<string, any>,
  constraints: PortfolioConstraints
): Promise<RecommendedTrade[]> {
  const fallbackTrades: RecommendedTrade[] = [];
  
  // High-premium, liquid options
  const liquidSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA'];
  
  for (const symbol of liquidSymbols) {
    if (fallbackTrades.length >= 3) break;
    
    const priceData = mockPrices[symbol];
    if (!priceData) continue;
    
    const currentPrice = priceData.price;
    const sentiment = sentimentResults.get(symbol);
    
    // More aggressive strikes for higher premiums
    const aggressiveStrike = Math.floor(currentPrice * 0.98 / 5) * 5;
    const premium = calculateAdvancedPremium(currentPrice, aggressiveStrike, 'PUT', priceData.volatility, 7);
    
    if (premium * 2 <= premiumGap) { // 2 contracts max
      fallbackTrades.push({
        symbol,
        optionType: 'PUT',
        strike: aggressiveStrike,
        expiry: nextFriday(new Date()),
        premium: premium * 2,
        maxPain: calculateMaxPain(symbol, currentPrice),
        confidence: 0.65, // Lower confidence for aggressive trades
        reasoning: `Fallback strategy: Aggressive ${symbol} PUT positioning to meet weekly premium target. Higher risk for higher reward.`,
        sentimentScore: sentiment?.overallScore,
        sentimentLabel: sentiment?.sentiment,
        sentimentConfidence: sentiment?.overallConfidence
      });
    }
  }
  
  return fallbackTrades;
}