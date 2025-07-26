export interface Trade {
  id: string;
  dateTime: Date;
  symbol: string;
  assetCategory: 'STK' | 'OPT' | 'FOP';
  currency: string;
  quantity: number;
  tradePrice: number;
  tradeMoney: number;
  proceeds: number;
  commissionAndTax: number;
  netCash: number;
  orderTime: Date;
  openDateTime: Date;
  reportDate: Date;
  tradeDate: Date;
  buy_sell: 'BUY' | 'SELL';
  putCall?: 'P' | 'C';
  strike?: number;
  expiry?: Date;
  multiplier?: number;
  underlyingSymbol?: string;
  notes?: string;
  transactionId: string;
  orderReference: string;
  exchange: string;
  tradeId: string;
}

export interface WheelCycle {
  id: string;
  symbol: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed';
  trades: Trade[];
  totalPremiumCollected: number;
  totalFees: number;
  netProfit: number;
  assignmentPrice?: number;
  sharesAssigned?: number;
  safeStrikePrice?: number;
  cycleType: 'put-expired' | 'put-assigned-call-expired' | 'put-assigned-call-assigned';
}

export interface Position {
  symbol: string;
  quantity: number;
  averageCost: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL: number;
  activeCycles: WheelCycle[];
  completedCycles: WheelCycle[];
}

export interface AnalyticsData {
  symbol: string;
  totalPremiumCollected: number;
  totalFees: number;
  netIncome: number;
  winRate: number;
  averagePremiumPerTrade: number;
  activeCycles: number;
  completedCycles: number;
}

export interface RecommendedTrade {
  symbol: string;
  optionType: 'PUT' | 'CALL';
  strike: number;
  expiry: Date;
  premium: number;
  maxPain?: number;
  earningsDate?: Date;
  predictedPrice?: number;
  confidence: number;
  reasoning: string;
  sentimentScore?: number; // -1 to +1
  sentimentLabel?: 'very_bearish' | 'bearish' | 'neutral' | 'bullish' | 'very_bullish';
  sentimentConfidence?: number; // 0 to 1
}

export interface StrikeRecommendation {
  strategy: 'cash_secured_put' | 'covered_call' | 'iron_condor';
  symbol: string;
  strikes: number[];
  expiry: Date;
  totalPremium: number;
  maxRisk: number;
  probabilityOfProfit: number;
  maxPainAlignment: number;
  mlPredictionAlignment: number;
  overallScore: number;
  reasoning: string;
  visualIndicators: {
    strikeZones: Array<{
      strike: number;
      zone: 'optimal' | 'good' | 'acceptable' | 'risky';
      confidence: number;
    }>;
    maxPainLevel: number;
    mlPredictionRange: [number, number];
  };
}

export interface TechnicalSetup {
  type: 'breakout' | 'reversal' | 'continuation' | 'consolidation' | 'support_resistance';
  description: string;
  keyLevels: {
    support?: number;
    resistance?: number;
    breakoutLevel?: number;
  };
  timeframe: '1D' | '1W' | '1M' | '3M';
  strength: number; // 0-1 confidence in setup
}

export interface VolatilityData {
  impliedVolatility: number;
  historicalVolatility: number;
  ivRank: number; // 0-100 percentile rank
  ivPercentile: number; // 0-100 percentile
  trend: 'expanding' | 'contracting' | 'stable';
}

export interface OptionsFlow {
  unusualActivity: boolean;
  largeTradeVolume: number;
  putCallRatio: number;
  openInterest: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  flowDescription: string;
}

export interface SocialSentiment {
  mentions: number;
  positiveRatio: number; // 0-1
  trendingScore: number; // 0-100
  keyTopics: string[];
  influencerBuzz: boolean;
}

export interface TradingViewIdea {
  id: string;
  symbol: string;
  title: string;
  category: 'momentum' | 'value' | 'income' | 'volatility' | 'earnings' | 'technical';
  description: string;
  technicalSetup: TechnicalSetup;
  volatilityData: VolatilityData;
  optionsFlow?: OptionsFlow;
  socialSentiment?: SocialSentiment;
  riskRewardRatio: number;
  maxRisk: number;
  expectedReturn: number;
  timeHorizon: '1-7 days' | '1-2 weeks' | '2-4 weeks' | '1-3 months';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  wheelAlignment: number; // 0-1 how well it aligns with wheel strategy
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  confidence: number; // 0-1
  tradingViewUrl?: string;
  author: 'AI Analysis' | 'Community' | 'Pro Trader';
  riskWarning: string;
  educationalNote: string;
}