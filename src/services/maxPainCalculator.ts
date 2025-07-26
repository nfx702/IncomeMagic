import { Trade } from '@/types/trade';

// Enum for specifying which week to analyze
export enum ExpirationWeek {
  CURRENT = 'current',  // 0-7 days from now
  NEXT = 'next',       // 7-14 days from now
  BOTH = 'both'        // Both current and next week
}

export interface OptionChainData {
  symbol: string;
  expiry: Date;
  strikes: StrikeData[];
}

export interface StrikeData {
  strike: number;
  callOpenInterest: number;
  putOpenInterest: number;
  callVolume?: number;
  putVolume?: number;
}

export interface MaxPainResult {
  symbol: string;
  expiry: Date;
  maxPainPrice: number;
  totalPainAtMaxPain: number;
  strikeAnalysis: StrikePainAnalysis[];
  confidence: number;
  week: ExpirationWeek;
  daysToExpiry: number;
}

export interface WeeklyMaxPainResult {
  symbol: string;
  currentWeek: MaxPainResult | null;
  nextWeek: MaxPainResult | null;
  comparison?: {
    priceDifference: number;
    confidenceDifference: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
}

export interface StrikePainAnalysis {
  strike: number;
  callPain: number;
  putPain: number;
  totalPain: number;
  callOpenInterest: number;
  putOpenInterest: number;
}

export class MaxPainCalculator {
  /**
   * Calculate max pain for a given option chain
   * Max pain is the strike price where the total value of ITM options is minimized
   */
  public calculateMaxPain(chainData: OptionChainData, week?: ExpirationWeek): MaxPainResult {
    const strikeAnalysis: StrikePainAnalysis[] = [];
    
    // Calculate pain at each strike price
    for (const strikeData of chainData.strikes) {
      const analysis = this.calculatePainAtStrike(strikeData.strike, chainData.strikes);
      strikeAnalysis.push(analysis);
    }
    
    // Find the strike with minimum total pain (max pain point)
    const maxPainStrike = strikeAnalysis.reduce((min, current) => 
      current.totalPain < min.totalPain ? current : min
    );
    
    // Calculate confidence based on how clear the max pain point is
    const confidence = this.calculateConfidence(strikeAnalysis);
    
    // Calculate days to expiry
    const daysToExpiry = (chainData.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    // Determine week based on days to expiry if not provided
    const determinedWeek = week || (daysToExpiry <= 7 ? ExpirationWeek.CURRENT : ExpirationWeek.NEXT);
    
    return {
      symbol: chainData.symbol,
      expiry: chainData.expiry,
      maxPainPrice: maxPainStrike.strike,
      totalPainAtMaxPain: maxPainStrike.totalPain,
      strikeAnalysis: strikeAnalysis.sort((a, b) => a.strike - b.strike),
      confidence,
      week: determinedWeek,
      daysToExpiry: Math.round(daysToExpiry * 100) / 100
    };
  }
  
  /**
   * Calculate pain (total ITM value) at a specific strike price
   */
  private calculatePainAtStrike(strikePrice: number, strikes: StrikeData[]): StrikePainAnalysis {
    let callPain = 0;
    let putPain = 0;
    
    // Find the current strike data
    const currentStrike = strikes.find(s => s.strike === strikePrice);
    const callOI = currentStrike?.callOpenInterest || 0;
    const putOI = currentStrike?.putOpenInterest || 0;
    
    // Calculate call pain: sum of ITM call values
    // Calls are ITM when strike < stock price (strikePrice in this case)
    for (const strike of strikes) {
      if (strike.strike < strikePrice) {
        const intrinsicValue = strikePrice - strike.strike;
        callPain += intrinsicValue * strike.callOpenInterest * 100; // 100 shares per contract
      }
    }
    
    // Calculate put pain: sum of ITM put values  
    // Puts are ITM when strike > stock price (strikePrice in this case)
    for (const strike of strikes) {
      if (strike.strike > strikePrice) {
        const intrinsicValue = strike.strike - strikePrice;
        putPain += intrinsicValue * strike.putOpenInterest * 100; // 100 shares per contract
      }
    }
    
    return {
      strike: strikePrice,
      callPain,
      putPain,
      totalPain: callPain + putPain,
      callOpenInterest: callOI,
      putOpenInterest: putOI
    };
  }
  
  /**
   * Calculate confidence in the max pain calculation
   * Higher confidence when there's a clear minimum and good open interest data
   */
  private calculateConfidence(strikeAnalysis: StrikePainAnalysis[]): number {
    if (strikeAnalysis.length < 3) return 0.3; // Low confidence with limited data
    
    // Sort by total pain to analyze distribution
    const sortedByPain = [...strikeAnalysis].sort((a, b) => a.totalPain - b.totalPain);
    const minPain = sortedByPain[0].totalPain;
    const maxPain = sortedByPain[sortedByPain.length - 1].totalPain;
    const secondMinPain = sortedByPain[1].totalPain;
    
    // Check if there's a clear minimum (good separation)
    const painRange = maxPain - minPain;
    const separationRatio = painRange > 0 ? (secondMinPain - minPain) / painRange : 0;
    
    // Check total open interest volume
    const totalOI = strikeAnalysis.reduce((sum, s) => sum + s.callOpenInterest + s.putOpenInterest, 0);
    const oiScore = Math.min(totalOI / 10000, 1); // Normalize to 0-1, peak at 10k+ total OI
    
    // Check distribution of open interest (not concentrated in just one strike)
    const maxOIAtOneStrike = Math.max(...strikeAnalysis.map(s => s.callOpenInterest + s.putOpenInterest));
    const distributionScore = totalOI > 0 ? 1 - (maxOIAtOneStrike / totalOI) : 0;
    
    // Combine factors for final confidence score
    const baseConfidence = 0.4;
    const separationBonus = separationRatio * 0.3;
    const oiBonus = oiScore * 0.2;
    const distributionBonus = distributionScore * 0.1;
    
    return Math.min(baseConfidence + separationBonus + oiBonus + distributionBonus, 1.0);
  }
  
  /**
   * Extract option chain data from active options trades
   * Groups by symbol and expiry to create chain data
   */
  public extractChainDataFromTrades(trades: Trade[], targetSymbol?: string, week: ExpirationWeek = ExpirationWeek.CURRENT): OptionChainData[] {
    // Filter for option trades only
    const optionTrades = trades.filter(t => 
      t.assetCategory === 'OPT' && 
      t.expiry && 
      t.strike !== undefined &&
      (!targetSymbol || (t.underlyingSymbol || t.symbol) === targetSymbol)
    );
    
    // Group by symbol and expiry
    const chainMap = new Map<string, Map<number, { callOI: number, putOI: number }>>();
    
    for (const trade of optionTrades) {
      const symbol = trade.underlyingSymbol || trade.symbol;
      const expiryKey = trade.expiry!.toISOString();
      const chainKey = `${symbol}_${expiryKey}`;
      
      if (!chainMap.has(chainKey)) {
        chainMap.set(chainKey, new Map());
      }
      
      const strikeMap = chainMap.get(chainKey)!;
      const strike = trade.strike!;
      
      if (!strikeMap.has(strike)) {
        strikeMap.set(strike, { callOI: 0, putOI: 0 });
      }
      
      const strikeData = strikeMap.get(strike)!;
      
      // Estimate open interest from trade quantity (this is a rough approximation)
      // In a real implementation, you'd get actual OI data from your data provider
      const quantity = Math.abs(trade.quantity);
      if (trade.putCall === 'C') {
        strikeData.callOI += quantity;
      } else if (trade.putCall === 'P') {
        strikeData.putOI += quantity;
      }
    }
    
    // Convert to OptionChainData format
    const chainDataArray: OptionChainData[] = [];
    
    for (const [chainKey, strikeMap] of chainMap) {
      const [symbol, expiryStr] = chainKey.split('_');
      const expiry = new Date(expiryStr);
      
      // Filter by week based on days to expiry
      const daysToExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      const includeExpiry = this.shouldIncludeExpiry(daysToExpiry, week);
      
      if (includeExpiry) {
        const strikes: StrikeData[] = [];
        
        for (const [strike, data] of strikeMap) {
          strikes.push({
            strike,
            callOpenInterest: data.callOI,
            putOpenInterest: data.putOI
          });
        }
        
        if (strikes.length >= 3) { // Need at least 3 strikes for meaningful calculation
          chainDataArray.push({
            symbol,
            expiry,
            strikes: strikes.sort((a, b) => a.strike - b.strike)
          });
        }
      }
    }
    
    return chainDataArray;
  }
  
  /**
   * Helper method to determine if an expiry should be included based on week filter
   */
  private shouldIncludeExpiry(daysToExpiry: number, week: ExpirationWeek): boolean {
    if (daysToExpiry <= 0) return false; // Skip expired options
    
    switch (week) {
      case ExpirationWeek.CURRENT:
        return daysToExpiry <= 7;
      case ExpirationWeek.NEXT:
        return daysToExpiry > 7 && daysToExpiry <= 14;
      case ExpirationWeek.BOTH:
        return daysToExpiry <= 14;
      default:
        return daysToExpiry <= 7;
    }
  }

  /**
   * Calculate max pain for all active options in the current week
   */
  public calculateMaxPainForActiveOptions(trades: Trade[]): MaxPainResult[] {
    const chainData = this.extractChainDataFromTrades(trades, undefined, ExpirationWeek.CURRENT);
    return chainData.map(chain => this.calculateMaxPain(chain, ExpirationWeek.CURRENT));
  }

  /**
   * Calculate max pain for next week's expirations (7-14 days from now)
   */
  public calculateMaxPainForNextWeek(trades: Trade[]): MaxPainResult[] {
    const chainData = this.extractChainDataFromTrades(trades, undefined, ExpirationWeek.NEXT);
    return chainData.map(chain => this.calculateMaxPain(chain, ExpirationWeek.NEXT));
  }

  /**
   * Get max pain for both current and next week for all symbols
   */
  public calculateMaxPainForBothWeeks(trades: Trade[]): WeeklyMaxPainResult[] {
    const currentWeekResults = this.calculateMaxPainForActiveOptions(trades);
    const nextWeekResults = this.calculateMaxPainForNextWeek(trades);
    
    // Group results by symbol
    const symbolMap = new Map<string, WeeklyMaxPainResult>();
    
    // Add current week results
    for (const result of currentWeekResults) {
      if (!symbolMap.has(result.symbol)) {
        symbolMap.set(result.symbol, {
          symbol: result.symbol,
          currentWeek: result,
          nextWeek: null
        });
      } else {
        symbolMap.get(result.symbol)!.currentWeek = result;
      }
    }
    
    // Add next week results
    for (const result of nextWeekResults) {
      if (!symbolMap.has(result.symbol)) {
        symbolMap.set(result.symbol, {
          symbol: result.symbol,
          currentWeek: null,
          nextWeek: result
        });
      } else {
        symbolMap.get(result.symbol)!.nextWeek = result;
      }
    }
    
    // Add comparison analysis for symbols that have both weeks
    const results = Array.from(symbolMap.values());
    for (const result of results) {
      if (result.currentWeek && result.nextWeek) {
        result.comparison = this.compareWeeklyResults(result.currentWeek, result.nextWeek);
      }
    }
    
    return results;
  }

  /**
   * Compare current and next week max pain results to identify trends
   */
  private compareWeeklyResults(current: MaxPainResult, next: MaxPainResult): {
    priceDifference: number;
    confidenceDifference: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  } {
    const priceDifference = next.maxPainPrice - current.maxPainPrice;
    const confidenceDifference = next.confidence - current.confidence;
    
    // Determine trend based on max pain price movement
    // A significant move (>2% of current max pain) indicates trend
    const percentChange = Math.abs(priceDifference) / current.maxPainPrice;
    let trend: 'bullish' | 'bearish' | 'neutral';
    
    if (percentChange < 0.02) {
      trend = 'neutral';
    } else {
      trend = priceDifference > 0 ? 'bullish' : 'bearish';
    }
    
    return {
      priceDifference: Math.round(priceDifference * 100) / 100,
      confidenceDifference: Math.round(confidenceDifference * 1000) / 1000,
      trend
    };
  }
  
  /**
   * Get max pain for a specific symbol and expiry, with optional week filtering
   */
  public getMaxPainForSymbol(
    trades: Trade[], 
    symbol: string, 
    expiry?: Date, 
    week: ExpirationWeek = ExpirationWeek.CURRENT
  ): MaxPainResult | null {
    const chainData = this.extractChainDataFromTrades(trades, symbol, week);
    
    if (expiry) {
      const targetChain = chainData.find(chain => 
        chain.expiry.toDateString() === expiry.toDateString()
      );
      return targetChain ? this.calculateMaxPain(targetChain, week) : null;
    }
    
    // Return the nearest expiry if no specific expiry requested
    if (chainData.length > 0) {
      const nearestChain = chainData.reduce((nearest, current) => 
        current.expiry.getTime() < nearest.expiry.getTime() ? current : nearest
      );
      return this.calculateMaxPain(nearestChain, week);
    }
    
    return null;
  }

  /**
   * Get max pain for a specific symbol for both current and next week
   */
  public getMaxPainForSymbolBothWeeks(trades: Trade[], symbol: string): WeeklyMaxPainResult {
    const currentWeek = this.getMaxPainForSymbol(trades, symbol, undefined, ExpirationWeek.CURRENT);
    const nextWeek = this.getMaxPainForSymbol(trades, symbol, undefined, ExpirationWeek.NEXT);
    
    const result: WeeklyMaxPainResult = {
      symbol,
      currentWeek,
      nextWeek
    };
    
    // Add comparison if both weeks have results
    if (currentWeek && nextWeek) {
      result.comparison = this.compareWeeklyResults(currentWeek, nextWeek);
    }
    
    return result;
  }

  /**
   * Get max pain data for next week only for a specific symbol
   */
  public getMaxPainForSymbolNextWeek(trades: Trade[], symbol: string): MaxPainResult | null {
    return this.getMaxPainForSymbol(trades, symbol, undefined, ExpirationWeek.NEXT);
  }
}