'use client';

import { useMemo } from 'react';
import { 
  IconTarget, 
  IconTrendingUp, 
  IconAlertCircle,
  IconCheck,
  IconX
} from '@tabler/icons-react';

interface WeeklyGoalProgressProps {
  targetWeekly: number;
  actualWeekly: number;
  recommendedPremium: number;
  recommendationsCount: number;
}

export function WeeklyGoalProgress({ 
  targetWeekly, 
  actualWeekly, 
  recommendedPremium,
  recommendationsCount 
}: WeeklyGoalProgressProps) {
  const metrics = useMemo(() => {
    const currentProgress = (actualWeekly / targetWeekly) * 100;
    const remainingNeeded = Math.max(0, targetWeekly - actualWeekly);
    const projectedTotal = actualWeekly + recommendedPremium;
    const projectedProgress = (projectedTotal / targetWeekly) * 100;
    const willMeetTarget = projectedTotal >= targetWeekly;
    
    return {
      currentProgress: Math.min(100, currentProgress),
      remainingNeeded,
      projectedTotal,
      projectedProgress: Math.min(100, projectedProgress),
      willMeetTarget,
      surplusAmount: Math.max(0, projectedTotal - targetWeekly)
    };
  }, [targetWeekly, actualWeekly, recommendedPremium]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="relative mb-8 group">
      {/* Floating background orbs */}
      <div className="absolute -top-4 -left-4 w-32 h-32 floating-orb opacity-60"></div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 floating-orb opacity-40"></div>
      
      <div className="metric-card relative overflow-hidden">
        {/* Animated liquid background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/20 via-transparent to-purple-400/20 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-conic from-blue-300/30 via-purple-300/30 to-pink-300/30 rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black gradient-text-primary mb-2">
                Weekly Income Goal Progress
              </h2>
              <p className="text-slate-600/80 dark:text-slate-400/80 font-medium">
                Track your progress toward your weekly premium target
              </p>
            </div>
            <div className={`relative p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ${
              metrics.willMeetTarget 
                ? 'bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-400/30' 
                : 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30'
            }`}>
              <div className="absolute inset-0 rounded-2xl bg-white/10 animate-pulse"></div>
              {metrics.willMeetTarget ? (
                <IconCheck size={28} className="relative z-10 text-emerald-500 drop-shadow-lg" />
              ) : (
                <IconAlertCircle size={28} className="relative z-10 text-amber-500 drop-shadow-lg" />
              )}
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat-card group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400/20 to-indigo-500/20 border border-blue-400/30">
                  <IconTarget size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Weekly Target</p>
              </div>
              <p className="premium-number mb-1">
                {formatCurrency(targetWeekly)}
              </p>
              <div className="h-1 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800 rounded-full opacity-50"></div>
            </div>

            <div className="stat-card group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-400/30">
                  <IconTrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Income</p>
              </div>
              <p className="premium-number mb-1">
                {formatCurrency(actualWeekly)}
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-2 py-1 rounded-full">
                {metrics.currentProgress.toFixed(0)}% of target
              </p>
            </div>

            <div className="stat-card group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${
                  metrics.remainingNeeded > 0 
                    ? 'bg-gradient-to-br from-rose-400/20 to-red-500/20 border border-rose-400/30' 
                    : 'bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-400/30'
                }`}>
                  <IconX size={18} className={metrics.remainingNeeded > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Remaining Needed</p>
              </div>
              <p className={`text-2xl font-bold mb-1 ${
                metrics.remainingNeeded > 0 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {formatCurrency(metrics.remainingNeeded)}
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                To reach target
              </p>
            </div>

            <div className="stat-card group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${
                  metrics.willMeetTarget 
                    ? 'bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-400/30' 
                    : 'bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30'
                }`}>
                  <IconCheck size={18} className={metrics.willMeetTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">If All Executed</p>
              </div>
              <p className={`text-2xl font-bold mb-1 ${
                metrics.willMeetTarget 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {formatCurrency(metrics.projectedTotal)}
              </p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 px-2 py-1 rounded-full">
                {metrics.projectedProgress.toFixed(0)}% of target
              </p>
            </div>
          </div>

          {/* Enhanced Visual Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold gradient-text-primary">Progress to Target</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/20">
                {formatCurrency(actualWeekly)} / {formatCurrency(targetWeekly)}
              </span>
            </div>
            
            <div className="relative">
              {/* Enhanced progress container */}
              <div className="relative h-12 bg-gradient-to-r from-slate-200/50 to-slate-300/50 dark:from-slate-700/50 dark:to-slate-800/50 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/30">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100/30 via-transparent to-purple-100/30 animate-pulse"></div>
                
                {/* Current Progress */}
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${Math.min(metrics.currentProgress, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-transparent animate-shimmer"></div>
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-2xl"></div>
                </div>
                
                {/* Projected Progress (if recommendations executed) */}
                {recommendedPremium > 0 && (
                  <div 
                    className="absolute inset-y-0 bg-gradient-to-r from-blue-400/60 via-indigo-400/60 to-purple-400/60 rounded-2xl transition-all duration-1000 border-2 border-dashed border-white/60 shadow-inner"
                    style={{ 
                      left: `${Math.min(metrics.currentProgress, 100)}%`,
                      width: `${Math.max(0, Math.min(metrics.projectedProgress - metrics.currentProgress, 100 - metrics.currentProgress))}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 animate-pulse rounded-2xl"></div>
                  </div>
                )}
                
                {/* Target marker */}
                <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 rounded-full shadow-lg" 
                     style={{ left: '100%', transform: 'translateX(-50%)' }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                    TARGET
                  </div>
                </div>
                
                {/* Progress percentage indicator */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-lg transition-all duration-1000"
                  style={{ 
                    left: `${Math.min(metrics.currentProgress / 2, 45)}%`,
                    opacity: metrics.currentProgress > 10 ? 1 : 0
                  }}
                >
                  {metrics.currentProgress.toFixed(0)}%
                </div>
              </div>
              
              {/* Enhanced Legend */}
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm"></div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Income</span>
                </div>
                {recommendedPremium > 0 && (
                  <div className="flex items-center gap-2 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-400/60 to-indigo-400/60 rounded-full border-2 border-dashed border-white/60 shadow-sm"></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Potential Addition</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Recommendations Summary */}
          <div className={`relative overflow-hidden rounded-2xl backdrop-blur-sm border transition-all duration-500 ${
            metrics.willMeetTarget 
              ? 'bg-gradient-to-br from-emerald-400/10 via-green-400/10 to-emerald-500/10 border-emerald-400/30' 
              : 'bg-gradient-to-br from-amber-400/10 via-orange-400/10 to-amber-500/10 border-amber-400/30'
          }`}>
            {/* Animated background */}
            <div className="absolute inset-0 opacity-30">
              <div className={`absolute inset-0 ${
                metrics.willMeetTarget 
                  ? 'bg-gradient-to-br from-emerald-200/20 to-green-200/20' 
                  : 'bg-gradient-to-br from-amber-200/20 to-orange-200/20'
              } animate-pulse`}></div>
            </div>
            
            <div className="relative z-10 p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl backdrop-blur-sm ${
                  metrics.willMeetTarget 
                    ? 'bg-emerald-500/20 border border-emerald-400/30' 
                    : 'bg-amber-500/20 border border-amber-400/30'
                }`}>
                  {metrics.willMeetTarget ? (
                    <IconCheck size={24} className="text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
                  ) : (
                    <IconAlertCircle size={24} className="text-amber-600 dark:text-amber-400 drop-shadow-sm" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-lg mb-2 ${
                    metrics.willMeetTarget 
                      ? 'text-emerald-700 dark:text-emerald-300' 
                      : 'text-amber-700 dark:text-amber-300'
                  }`}>
                    {metrics.willMeetTarget 
                      ? `🎯 Goal Achievable! Executing all ${recommendationsCount} recommendations will exceed your target by ${formatCurrency(metrics.surplusAmount)}.`
                      : `⚠️ Additional income needed. Current recommendations will get you ${metrics.projectedProgress.toFixed(0)}% of the way to your target.`
                    }
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                    {metrics.willMeetTarget 
                      ? '💡 Consider executing the highest confidence trades to meet your goal efficiently.'
                      : `📈 You need ${formatCurrency(metrics.remainingNeeded - recommendedPremium)} more in premium income to reach your weekly target.`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Action Items */}
          {!metrics.willMeetTarget && (
            <div className="mt-6">
              <div className="glass-card p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/30 dark:border-blue-700/30">
                <p className="text-lg font-bold gradient-text-primary mb-4 flex items-center gap-2">
                  <IconTrendingUp size={20} />
                  Suggested Actions to Reach Your Goal:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="stat-card bg-gradient-to-br from-white/60 to-blue-50/60 dark:from-slate-800/60 dark:to-blue-900/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Expand Watchlist</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Add more symbols to your watchlist for additional opportunities</p>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-white/60 to-purple-50/60 dark:from-slate-800/60 dark:to-purple-900/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Optimize Strikes</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Consider slightly more aggressive strikes with higher premiums</p>
                  </div>
                  <div className="stat-card bg-gradient-to-br from-white/60 to-green-50/60 dark:from-slate-800/60 dark:to-green-900/60 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">High IV Focus</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Look for high IV symbols that offer better premium potential</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}