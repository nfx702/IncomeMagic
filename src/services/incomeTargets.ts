/**
 * Income Targets Service
 * Manages weekly and monthly income targets with comparison analytics
 */

export interface IncomeTarget {
  period: 'weekly' | 'monthly';
  amount: number;
  startDate: Date;
  endDate?: Date;
}

export interface TargetComparison {
  target: number;
  actual: number;
  variance: number;
  percentageAchieved: number;
  status: 'exceeded' | 'met' | 'below';
}

export interface TargetAnalytics {
  weekly: {
    current: TargetComparison;
    history: Array<{
      weekStart: Date;
      comparison: TargetComparison;
    }>;
    averageAchievement: number;
    consistencyScore: number;
  };
  monthly: {
    current: TargetComparison;
    history: Array<{
      month: Date;
      comparison: TargetComparison;
    }>;
    averageAchievement: number;
    consistencyScore: number;
  };
  recommendations: string[];
}

export class IncomeTargetsService {
  private targets: IncomeTarget[] = [];
  
  constructor() {
    // Initialize with default targets
    this.targets = [
      {
        period: 'weekly',
        amount: 325, // $325/week target
        startDate: new Date('2025-01-01')
      },
      {
        period: 'monthly',
        amount: 1300, // $1300/month target
        startDate: new Date('2025-01-01')
      }
    ];
  }

  /**
   * Get current target for a period
   */
  public getCurrentTarget(period: 'weekly' | 'monthly'): number {
    const activeTargets = this.targets
      .filter(t => t.period === period)
      .filter(t => !t.endDate || t.endDate > new Date())
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    
    return activeTargets[0]?.amount || (period === 'weekly' ? 325 : 1300);
  }

  /**
   * Set a new target
   */
  public setTarget(period: 'weekly' | 'monthly', amount: number, startDate: Date = new Date()): void {
    // End current target
    const currentTarget = this.targets
      .filter(t => t.period === period && !t.endDate)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
    
    if (currentTarget) {
      currentTarget.endDate = new Date(startDate.getTime() - 1);
    }
    
    // Add new target
    this.targets.push({
      period,
      amount,
      startDate
    });
  }

  /**
   * Get target history
   */
  public getTargetHistory(period: 'weekly' | 'monthly'): IncomeTarget[] {
    return this.targets
      .filter(t => t.period === period)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  /**
   * Compare actual income to target
   */
  public compareToTarget(actual: number, target: number): TargetComparison {
    const variance = actual - target;
    const percentageAchieved = target > 0 ? (actual / target) * 100 : 0;
    
    let status: 'exceeded' | 'met' | 'below';
    if (percentageAchieved >= 110) {
      status = 'exceeded';
    } else if (percentageAchieved >= 95) {
      status = 'met';
    } else {
      status = 'below';
    }
    
    return {
      target,
      actual,
      variance,
      percentageAchieved,
      status
    };
  }

  /**
   * Calculate consistency score (0-100)
   * Based on how consistently targets are met
   */
  public calculateConsistencyScore(comparisons: TargetComparison[]): number {
    if (comparisons.length === 0) return 0;
    
    const metCount = comparisons.filter(c => c.status !== 'below').length;
    const consistencyRate = metCount / comparisons.length;
    
    // Factor in variance stability
    const variances = comparisons.map(c => c.percentageAchieved - 100);
    const avgVariance = variances.reduce((sum, v) => sum + v, 0) / variances.length;
    const varianceStdDev = Math.sqrt(
      variances.reduce((sum, v) => sum + Math.pow(v - avgVariance, 2), 0) / variances.length
    );
    
    // Lower std dev = more consistent
    const stabilityFactor = Math.max(0, 1 - (varianceStdDev / 50));
    
    return Math.round((consistencyRate * 0.7 + stabilityFactor * 0.3) * 100);
  }

  /**
   * Generate recommendations based on performance
   */
  public generateRecommendations(analytics: {
    weeklyAchievement: number;
    monthlyAchievement: number;
    weeklyConsistency: number;
    monthlyConsistency: number;
    recentTrend: 'improving' | 'declining' | 'stable';
  }): string[] {
    const recommendations: string[] = [];
    
    // Weekly performance recommendations
    if (analytics.weeklyAchievement < 90) {
      recommendations.push(
        '📊 Weekly income is below target. Consider increasing trading frequency or adjusting strike selection.'
      );
    } else if (analytics.weeklyAchievement > 120) {
      recommendations.push(
        '🎯 Excellent weekly performance! Consider raising your target to match your capabilities.'
      );
    }
    
    // Consistency recommendations
    if (analytics.weeklyConsistency < 70) {
      recommendations.push(
        '📈 Income consistency could improve. Focus on establishing regular trading patterns.'
      );
    }
    
    // Trend-based recommendations
    if (analytics.recentTrend === 'declining') {
      recommendations.push(
        '⚠️ Recent income trend is declining. Review your strategy and market conditions.'
      );
    } else if (analytics.recentTrend === 'improving') {
      recommendations.push(
        '✅ Income trend is improving! Keep up the current strategy.'
      );
    }
    
    // Monthly performance
    if (analytics.monthlyAchievement < 95 && analytics.weeklyAchievement > 100) {
      recommendations.push(
        '💡 Strong weekly performance but missing monthly targets. Ensure consistent weekly execution.'
      );
    }
    
    return recommendations;
  }

  /**
   * Calculate target achievement streak
   */
  public calculateStreak(comparisons: TargetComparison[]): {
    current: number;
    best: number;
  } {
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    // Process in reverse chronological order
    const reversed = [...comparisons].reverse();
    
    for (let i = 0; i < reversed.length; i++) {
      if (reversed[i].status !== 'below') {
        tempStreak++;
        if (i === 0) {
          currentStreak = tempStreak;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (i === 0) {
          currentStreak = 0;
        }
        tempStreak = 0;
      }
    }
    
    return { current: currentStreak, best: bestStreak };
  }

  /**
   * Get target adjustment suggestions
   */
  public getTargetAdjustmentSuggestion(
    recentComparisons: TargetComparison[]
  ): {
    suggested: number;
    reason: string;
  } | null {
    if (recentComparisons.length < 4) {
      return null;
    }
    
    const recentAchievements = recentComparisons.map(c => c.percentageAchieved);
    const avgAchievement = recentAchievements.reduce((sum, a) => sum + a, 0) / recentAchievements.length;
    
    if (avgAchievement > 130) {
      const currentTarget = recentComparisons[0].target;
      const suggested = Math.round(currentTarget * 1.2);
      return {
        suggested,
        reason: 'Consistently exceeding target by 30%+'
      };
    } else if (avgAchievement < 70) {
      const currentTarget = recentComparisons[0].target;
      const suggested = Math.round(currentTarget * 0.85);
      return {
        suggested,
        reason: 'Struggling to meet current target'
      };
    }
    
    return null;
  }
}