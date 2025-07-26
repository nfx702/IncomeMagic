/**
 * Income Forecast Service
 * Advanced time series forecasting for option premium income prediction
 */

import { Trade, WheelCycle } from '@/types/trade';
import { AnalyticsEngine, TimeSeriesData } from './analyticsEngine';
import { addDays, addWeeks, addMonths, startOfWeek, endOfWeek, format } from 'date-fns';

export interface ForecastPoint {
  date: Date;
  predicted: number;
  lower: number;  // Lower confidence bound
  upper: number;  // Upper confidence bound
  confidence: number;
}

export interface IncomeForecast {
  weekly: ForecastPoint[];
  monthly: ForecastPoint[];
  accuracy: {
    mape: number;  // Mean Absolute Percentage Error
    rmse: number;  // Root Mean Square Error
    confidence: number;
  };
  patterns: {
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: boolean;
    averageWeeklyIncome: number;
    averageMonthlyIncome: number;
    volatility: number;
  };
}

export interface ForecastConfig {
  weeklyHorizon: number;  // Number of weeks to forecast
  monthlyHorizon: number; // Number of months to forecast
  confidenceLevel: number; // Confidence level for intervals (e.g., 0.95 for 95%)
  minHistoricalData: number; // Minimum weeks of data required
  seasonalityPeriod: number; // Weeks to check for seasonality (default: 12)
}

export class IncomeForecastService {
  private analytics: AnalyticsEngine;
  
  constructor(
    private trades: Trade[],
    private cycles: Map<string, WheelCycle[]>
  ) {
    this.analytics = new AnalyticsEngine(trades, cycles);
  }

  /**
   * Generate income forecast with configurable parameters
   */
  public generateForecast(config: Partial<ForecastConfig> = {}): IncomeForecast {
    const defaultConfig: ForecastConfig = {
      weeklyHorizon: 8,
      monthlyHorizon: 3,
      confidenceLevel: 0.95,
      minHistoricalData: 8,
      seasonalityPeriod: 12
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // Get historical data
    const weeklyHistory = this.getHistoricalWeeklyData();
    const monthlyHistory = this.getHistoricalMonthlyData();
    
    // Check if we have enough historical data
    if (weeklyHistory.length < finalConfig.minHistoricalData) {
      return this.generateDefaultForecast(finalConfig);
    }
    
    // Analyze patterns
    const patterns = this.analyzePatterns(weeklyHistory, finalConfig.seasonalityPeriod);
    
    // Generate forecasts
    const weeklyForecast = this.forecastWeekly(weeklyHistory, finalConfig);
    const monthlyForecast = this.forecastMonthly(monthlyHistory, finalConfig);
    
    // Calculate accuracy metrics (using backtesting)
    const accuracy = this.calculateAccuracy(weeklyHistory);
    
    return {
      weekly: weeklyForecast,
      monthly: monthlyForecast,
      accuracy,
      patterns
    };
  }

  /**
   * Get historical weekly income data
   */
  private getHistoricalWeeklyData(): { date: Date; income: number }[] {
    const weeklyAnalytics = this.analytics.getWeeklyAnalytics();
    const aggregatedData: { date: Date; income: number }[] = [];
    
    // Aggregate across all symbols
    const weeklyMap = new Map<string, number>();
    
    for (const [symbol, weeks] of weeklyAnalytics) {
      for (const week of weeks) {
        const weekKey = week.date.toISOString();
        const existing = weeklyMap.get(weekKey) || 0;
        weeklyMap.set(weekKey, existing + week.netIncome);
      }
    }
    
    // Convert to array and sort
    for (const [dateStr, income] of weeklyMap) {
      aggregatedData.push({
        date: new Date(dateStr),
        income
      });
    }
    
    return aggregatedData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get historical monthly income data
   */
  private getHistoricalMonthlyData(): { date: Date; income: number }[] {
    const monthlyAnalytics = this.analytics.getMonthlyAnalytics();
    const aggregatedData: { date: Date; income: number }[] = [];
    
    // Aggregate across all symbols
    const monthlyMap = new Map<string, number>();
    
    for (const [symbol, months] of monthlyAnalytics) {
      for (const month of months) {
        const monthKey = month.date.toISOString();
        const existing = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, existing + month.netIncome);
      }
    }
    
    // Convert to array and sort
    for (const [dateStr, income] of monthlyMap) {
      aggregatedData.push({
        date: new Date(dateStr),
        income
      });
    }
    
    return aggregatedData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Analyze patterns in historical data
   */
  private analyzePatterns(
    weeklyData: { date: Date; income: number }[],
    seasonalityPeriod: number
  ): IncomeForecast['patterns'] {
    if (weeklyData.length === 0) {
      return {
        trend: 'stable',
        seasonality: false,
        averageWeeklyIncome: 0,
        averageMonthlyIncome: 0,
        volatility: 0
      };
    }
    
    // Calculate averages
    const totalIncome = weeklyData.reduce((sum, w) => sum + w.income, 0);
    const averageWeeklyIncome = totalIncome / weeklyData.length;
    const averageMonthlyIncome = averageWeeklyIncome * 4.33; // Average weeks per month
    
    // Calculate trend using linear regression
    const trend = this.calculateTrend(weeklyData);
    
    // Check for seasonality
    const seasonality = this.detectSeasonality(weeklyData, seasonalityPeriod);
    
    // Calculate volatility (coefficient of variation)
    const variance = weeklyData.reduce((sum, w) => 
      sum + Math.pow(w.income - averageWeeklyIncome, 2), 0
    ) / weeklyData.length;
    const stdDev = Math.sqrt(variance);
    const volatility = averageWeeklyIncome > 0 ? stdDev / averageWeeklyIncome : 0;
    
    return {
      trend,
      seasonality,
      averageWeeklyIncome,
      averageMonthlyIncome,
      volatility
    };
  }

  /**
   * Calculate trend using simple linear regression
   */
  private calculateTrend(
    data: { date: Date; income: number }[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';
    
    // Convert dates to numeric values (days from first date)
    const firstDate = data[0].date.getTime();
    const points = data.map(d => ({
      x: (d.date.getTime() - firstDate) / (1000 * 60 * 60 * 24), // Days
      y: d.income
    }));
    
    // Calculate linear regression slope
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Determine trend based on slope and average income
    const avgIncome = sumY / n;
    const slopePercentage = avgIncome > 0 ? (slope * 7) / avgIncome : 0; // Weekly change %
    
    if (slopePercentage > 0.05) return 'increasing';
    if (slopePercentage < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect seasonality using autocorrelation
   */
  private detectSeasonality(
    data: { date: Date; income: number }[],
    period: number
  ): boolean {
    if (data.length < period * 2) return false;
    
    // Calculate autocorrelation at the seasonal period
    const mean = data.reduce((sum, d) => sum + d.income, 0) / data.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < data.length - period; i++) {
      numerator += (data[i].income - mean) * (data[i + period].income - mean);
    }
    
    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i].income - mean, 2);
    }
    
    const autocorrelation = numerator / denominator;
    
    // Consider seasonal if autocorrelation > 0.3
    return autocorrelation > 0.3;
  }

  /**
   * Forecast weekly income using exponential smoothing with trend
   */
  private forecastWeekly(
    historicalData: { date: Date; income: number }[],
    config: ForecastConfig
  ): ForecastPoint[] {
    if (historicalData.length === 0) {
      return this.generateDefaultWeeklyForecast(config);
    }
    
    // Use Holt's exponential smoothing (double exponential smoothing)
    const alpha = 0.3; // Level smoothing parameter
    const beta = 0.1;  // Trend smoothing parameter
    
    // Initialize
    let level = historicalData[0].income;
    let trend = historicalData.length > 1 
      ? (historicalData[1].income - historicalData[0].income) 
      : 0;
    
    // Update level and trend with historical data
    for (let i = 1; i < historicalData.length; i++) {
      const prevLevel = level;
      level = alpha * historicalData[i].income + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    
    // Generate forecasts
    const forecasts: ForecastPoint[] = [];
    const lastDate = historicalData[historicalData.length - 1].date;
    
    // Calculate prediction interval width based on historical volatility
    const errors = this.calculateHistoricalErrors(historicalData);
    const stdError = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);
    const zScore = this.getZScore(config.confidenceLevel);
    
    for (let i = 1; i <= config.weeklyHorizon; i++) {
      const forecastDate = addWeeks(lastDate, i);
      const predicted = Math.max(0, level + i * trend);
      
      // Wider intervals for further predictions
      const intervalWidth = stdError * zScore * Math.sqrt(i);
      
      forecasts.push({
        date: forecastDate,
        predicted,
        lower: Math.max(0, predicted - intervalWidth),
        upper: predicted + intervalWidth,
        confidence: config.confidenceLevel
      });
    }
    
    return forecasts;
  }

  /**
   * Forecast monthly income
   */
  private forecastMonthly(
    historicalData: { date: Date; income: number }[],
    config: ForecastConfig
  ): ForecastPoint[] {
    // Convert weekly forecast to monthly
    const weeklyForecast = this.forecastWeekly(
      this.getHistoricalWeeklyData(),
      { ...config, weeklyHorizon: config.monthlyHorizon * 4 }
    );
    
    const monthlyForecasts: ForecastPoint[] = [];
    const lastHistoricalDate = historicalData.length > 0 
      ? historicalData[historicalData.length - 1].date 
      : new Date();
    
    for (let month = 1; month <= config.monthlyHorizon; month++) {
      const monthDate = addMonths(lastHistoricalDate, month);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      // Aggregate weekly forecasts for this month
      const weeklyInMonth = weeklyForecast.filter(w => 
        w.date >= monthStart && w.date <= monthEnd
      );
      
      if (weeklyInMonth.length > 0) {
        const predicted = weeklyInMonth.reduce((sum, w) => sum + w.predicted, 0);
        const lower = weeklyInMonth.reduce((sum, w) => sum + w.lower, 0);
        const upper = weeklyInMonth.reduce((sum, w) => sum + w.upper, 0);
        
        monthlyForecasts.push({
          date: monthStart,
          predicted,
          lower,
          upper,
          confidence: config.confidenceLevel
        });
      }
    }
    
    return monthlyForecasts;
  }

  /**
   * Calculate historical prediction errors for interval estimation
   */
  private calculateHistoricalErrors(
    data: { date: Date; income: number }[]
  ): number[] {
    if (data.length < 3) return [100]; // Default error
    
    const errors: number[] = [];
    
    // Simple one-step-ahead errors
    for (let i = 2; i < data.length; i++) {
      const predicted = data[i-1].income + (data[i-1].income - data[i-2].income);
      const actual = data[i].income;
      errors.push(actual - predicted);
    }
    
    return errors;
  }

  /**
   * Calculate accuracy metrics using backtesting
   */
  private calculateAccuracy(
    historicalData: { date: Date; income: number }[]
  ): IncomeForecast['accuracy'] {
    if (historicalData.length < 4) {
      return { mape: 0.2, rmse: 100, confidence: 0.7 };
    }
    
    // Use last 25% of data for testing
    const splitIndex = Math.floor(historicalData.length * 0.75);
    const trainData = historicalData.slice(0, splitIndex);
    const testData = historicalData.slice(splitIndex);
    
    if (testData.length === 0) {
      return { mape: 0.2, rmse: 100, confidence: 0.7 };
    }
    
    // Generate predictions for test period
    const testConfig: ForecastConfig = {
      weeklyHorizon: testData.length,
      monthlyHorizon: 0,
      confidenceLevel: 0.95,
      minHistoricalData: 4,
      seasonalityPeriod: 12
    };
    
    const predictions = this.forecastWeekly(trainData, testConfig);
    
    // Calculate errors
    let sumAPE = 0;
    let sumSquaredError = 0;
    let validPredictions = 0;
    
    for (let i = 0; i < Math.min(predictions.length, testData.length); i++) {
      const predicted = predictions[i].predicted;
      const actual = testData[i].income;
      
      if (actual > 0) {
        sumAPE += Math.abs((actual - predicted) / actual);
        validPredictions++;
      }
      
      sumSquaredError += Math.pow(actual - predicted, 2);
    }
    
    const mape = validPredictions > 0 ? sumAPE / validPredictions : 0.2;
    const rmse = Math.sqrt(sumSquaredError / testData.length);
    const confidence = Math.max(0.5, Math.min(0.95, 1 - mape));
    
    return { mape, rmse, confidence };
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidenceLevel: number): number {
    // Common confidence levels
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    
    return zScores[confidenceLevel] || 1.96;
  }

  /**
   * Generate default forecast when insufficient data
   */
  private generateDefaultForecast(config: ForecastConfig): IncomeForecast {
    // Use current income if available, otherwise use a reasonable default
    const recentIncome = this.analytics.getTotalIncome();
    const baseWeeklyIncome = recentIncome.total > 0 
      ? recentIncome.total / 52  // Assume annual income
      : 325;  // Default $325/week (targeting $1300/month)
    
    const weeklyForecasts = this.generateDefaultWeeklyForecast(config, baseWeeklyIncome);
    const monthlyForecasts = this.generateDefaultMonthlyForecast(config, baseWeeklyIncome);
    
    return {
      weekly: weeklyForecasts,
      monthly: monthlyForecasts,
      accuracy: {
        mape: 0.3,
        rmse: baseWeeklyIncome * 0.2,
        confidence: 0.6
      },
      patterns: {
        trend: 'stable',
        seasonality: false,
        averageWeeklyIncome: baseWeeklyIncome,
        averageMonthlyIncome: baseWeeklyIncome * 4.33,
        volatility: 0.2
      }
    };
  }

  /**
   * Generate default weekly forecast
   */
  private generateDefaultWeeklyForecast(
    config: ForecastConfig,
    baseIncome: number = 325
  ): ForecastPoint[] {
    const forecasts: ForecastPoint[] = [];
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    for (let i = 1; i <= config.weeklyHorizon; i++) {
      const date = addWeeks(startDate, i);
      const predicted = baseIncome;
      const intervalWidth = baseIncome * 0.3; // 30% uncertainty
      
      forecasts.push({
        date,
        predicted,
        lower: Math.max(0, predicted - intervalWidth),
        upper: predicted + intervalWidth,
        confidence: config.confidenceLevel
      });
    }
    
    return forecasts;
  }

  /**
   * Generate default monthly forecast
   */
  private generateDefaultMonthlyForecast(
    config: ForecastConfig,
    baseWeeklyIncome: number = 325
  ): ForecastPoint[] {
    const forecasts: ForecastPoint[] = [];
    const startDate = new Date();
    const baseMonthlyIncome = baseWeeklyIncome * 4.33;
    
    for (let i = 1; i <= config.monthlyHorizon; i++) {
      const date = addMonths(startDate, i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const predicted = baseMonthlyIncome;
      const intervalWidth = baseMonthlyIncome * 0.3;
      
      forecasts.push({
        date: monthStart,
        predicted,
        lower: Math.max(0, predicted - intervalWidth),
        upper: predicted + intervalWidth,
        confidence: config.confidenceLevel
      });
    }
    
    return forecasts;
  }

  /**
   * Get forecast summary for quick display
   */
  public getForecastSummary(): {
    nextWeek: number;
    nextMonth: number;
    trend: string;
    confidence: number;
  } {
    const forecast = this.generateForecast();
    
    return {
      nextWeek: forecast.weekly[0]?.predicted || 0,
      nextMonth: forecast.monthly[0]?.predicted || 0,
      trend: forecast.patterns.trend,
      confidence: forecast.accuracy.confidence
    };
  }
}