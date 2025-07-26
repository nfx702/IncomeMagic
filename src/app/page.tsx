'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { IncomeChart } from '@/components/dashboard/IncomeChart';
import { ActivePositions } from '@/components/dashboard/ActivePositions';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { MarketSentimentWidget } from '@/components/dashboard/MarketSentimentWidget';
import { WidgetGrid } from '@/components/widgets/WidgetGrid';
import { PortfolioValueCard } from '@/components/dashboard/PortfolioValueCard';
import { RadialMultilayerChart, defaultOptionsLayers } from '@/components/charts/RadialMultilayerChart';
import { IBTradeParser } from '@/services/xmlParser';
import { WheelStrategyAnalyzer } from '@/services/wheelStrategyAnalyzer';
import { AnalyticsEngine } from '@/services/analyticsEngine';
import { PortfolioService, PortfolioValue } from '@/services/portfolioService';
import { AlpacaService } from '@/services/alpacaService';
import { Trade, WheelCycle, Position } from '@/types/trade';
import { IncomeForecastService } from '@/services/incomeForecast';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cycles, setCycles] = useState<Map<string, WheelCycle[]>>(new Map());
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [totalIncome, setTotalIncome] = useState(0);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState<PortfolioValue | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [forecastSummary, setForecastSummary] = useState<{
    nextWeek: number;
    nextMonth: number;
    trend: string;
    confidence: number;
  } | null>(null);

  // Sample options data for RadialMultilayerChart
  const sampleOptionsData = [
    { strike: 420, expiration: '2024-02-16', openInterest: 1250, volume: 340, impliedVolatility: 0.25, delta: -0.45, gamma: 0.08, theta: -0.12, vega: 0.35, type: 'put' as const },
    { strike: 430, expiration: '2024-02-16', openInterest: 2100, volume: 560, impliedVolatility: 0.22, delta: -0.35, gamma: 0.09, theta: -0.15, vega: 0.40, type: 'put' as const },
    { strike: 440, expiration: '2024-02-16', openInterest: 3200, volume: 890, impliedVolatility: 0.20, delta: -0.25, gamma: 0.11, theta: -0.18, vega: 0.45, type: 'put' as const },
    { strike: 450, expiration: '2024-02-16', openInterest: 4100, volume: 1200, impliedVolatility: 0.18, delta: -0.15, gamma: 0.12, theta: -0.20, vega: 0.48, type: 'put' as const },
    { strike: 460, expiration: '2024-02-16', openInterest: 2800, volume: 780, impliedVolatility: 0.21, delta: 0.15, gamma: 0.12, theta: -0.18, vega: 0.46, type: 'call' as const },
    { strike: 470, expiration: '2024-02-16', openInterest: 1900, volume: 520, impliedVolatility: 0.24, delta: 0.25, gamma: 0.10, theta: -0.15, vega: 0.42, type: 'call' as const },
    { strike: 480, expiration: '2024-02-16', openInterest: 1200, volume: 310, impliedVolatility: 0.27, delta: 0.35, gamma: 0.08, theta: -0.12, vega: 0.38, type: 'call' as const },
    { strike: 490, expiration: '2024-02-16', openInterest: 850, volume: 180, impliedVolatility: 0.30, delta: 0.45, gamma: 0.06, theta: -0.10, vega: 0.33, type: 'call' as const }
  ];

  useEffect(() => {
    loadTradeData();
  }, []);

  const loadPortfolioValue = async (positions: Map<string, Position>) => {
    setPortfolioLoading(true);
    try {
      const portfolioService = PortfolioService.getInstance();
      const alpacaService = AlpacaService.getInstance();
      
      // Get current prices for positions
      const symbols = Array.from(positions.keys());
      const currentPrices = new Map<string, number>();
      
      for (const symbol of symbols) {
        try {
          const quote = await alpacaService.getQuote(symbol);
          currentPrices.set(symbol, quote.lastPrice);
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          // Use average cost as fallback
          const position = positions.get(symbol);
          if (position) {
            currentPrices.set(symbol, position.averageCost);
          }
        }
      }
      
      // Calculate portfolio value
      const value = await portfolioService.calculatePortfolioValue(positions, trades, currentPrices);
      setPortfolioValue(value);
    } catch (error) {
      console.error('Error loading portfolio value:', error);
      // Try mock IB data as fallback
      try {
        const portfolioService = PortfolioService.getInstance();
        const mockValue = await portfolioService.fetchPortfolioFromIB();
        setPortfolioValue(mockValue);
      } catch (fallbackError) {
        console.error('Error loading mock portfolio value:', fallbackError);
      }
    } finally {
      setPortfolioLoading(false);
    }
  };

  const loadTradeData = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
      if (data.error) {
        console.error('Error loading trade data:', data.error, data.details);
        return;
      }
      
      // Convert dates in trades
      const tradesWithDates = data.trades.map((trade: any) => ({
        ...trade,
        dateTime: new Date(trade.dateTime),
        orderTime: new Date(trade.orderTime),
        openDateTime: new Date(trade.openDateTime),
        reportDate: new Date(trade.reportDate),
        tradeDate: new Date(trade.tradeDate),
        expiry: trade.expiry ? new Date(trade.expiry) : undefined
      }));
      
      // Convert objects back to Maps and handle dates in cycles
      const cyclesMap = new Map();
      Object.entries(data.cycles).forEach(([key, cycles]: [string, any]) => {
        const cyclesWithDates = cycles.map((cycle: any) => ({
          ...cycle,
          startDate: new Date(cycle.startDate),
          endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
          trades: cycle.trades.map((trade: any) => ({
            ...trade,
            dateTime: new Date(trade.dateTime),
            orderTime: new Date(trade.orderTime),
            openDateTime: new Date(trade.openDateTime),
            reportDate: new Date(trade.reportDate),
            tradeDate: new Date(trade.tradeDate),
            expiry: trade.expiry ? new Date(trade.expiry) : undefined
          }))
        }));
        cyclesMap.set(key, cyclesWithDates);
      });
      
      // Convert positions and handle dates
      const positionsMap = new Map();
      Object.entries(data.positions).forEach(([key, position]: [string, any]) => {
        const positionWithDates = {
          ...position,
          activeCycles: position.activeCycles.map((cycle: any) => ({
            ...cycle,
            startDate: new Date(cycle.startDate),
            endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
            trades: cycle.trades.map((trade: any) => ({
              ...trade,
              dateTime: new Date(trade.dateTime),
              orderTime: new Date(trade.orderTime),
              openDateTime: new Date(trade.openDateTime),
              reportDate: new Date(trade.reportDate),
              tradeDate: new Date(trade.tradeDate),
              expiry: trade.expiry ? new Date(trade.expiry) : undefined
            }))
          })),
          completedCycles: position.completedCycles.map((cycle: any) => ({
            ...cycle,
            startDate: new Date(cycle.startDate),
            endDate: cycle.endDate ? new Date(cycle.endDate) : undefined,
            trades: cycle.trades.map((trade: any) => ({
              ...trade,
              dateTime: new Date(trade.dateTime),
              orderTime: new Date(trade.orderTime),
              openDateTime: new Date(trade.openDateTime),
              reportDate: new Date(trade.reportDate),
              tradeDate: new Date(trade.tradeDate),
              expiry: trade.expiry ? new Date(trade.expiry) : undefined
            }))
          }))
        };
        positionsMap.set(key, positionWithDates);
      });
      
      setTrades(tradesWithDates);
      setCycles(cyclesMap);
      setPositions(positionsMap);
      setTotalIncome(data.totalIncome);
      
      // Generate forecast summary
      if (tradesWithDates.length > 0) {
        const forecastService = new IncomeForecastService(tradesWithDates, cyclesMap);
        const summary = forecastService.getForecastSummary();
        setForecastSummary(summary);
      }
      
      // Load portfolio value
      await loadPortfolioValue(positionsMap);
    } catch (error) {
      console.error('Error loading trade data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCyclesCount = Array.from(cycles.values())
    .flat()
    .filter(c => c.status === 'active').length;

  const totalPremiums = Array.from(cycles.values())
    .flat()
    .reduce((sum, c) => sum + c.totalPremiumCollected, 0);

  const winRate = (() => {
    const allCycles = Array.from(cycles.values()).flat();
    const completed = allCycles.filter(c => c.status === 'completed');
    const winning = completed.filter(c => c.netProfit > 0);
    return completed.length > 0 ? (winning.length / completed.length) * 100 : 0;
  })();

  return (
    <AppLayout>
        {/* Clean Header Section */}
        <div className="mb-8">
          <div className="glass-card p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-gradient">
                  Income Magic Dashboard
                </h1>
                <p className="text-lg text-secondary">
                  Master your wheel strategy performance with AI-powered insights
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="btn-pill">
                    <span className="status-indicator live mr-2"></span>
                    Live Trading Data
                  </div>
                  <div className="btn-pill">
                    <span className="mr-2">🤖</span>
                    AI Powered
                  </div>
                </div>
              </div>

              {/* Search and Market Status */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="relative">
                  <IconSearch size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search positions, symbols..."
                    className="glass-input pl-10 w-64"
                  />
                </div>
                
                <div className="glass-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="status-indicator live"></div>
                    <span className="text-sm font-semibold">
                      Market Status
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Options</span>
                      <span className="text-success font-semibold">OPEN</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Data Feed</span>
                      <span className="text-success font-semibold">LIVE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="glass-card p-8 flex flex-col items-center gap-6">
              <div className="relative w-20 h-20">
                <div className="w-full h-full rounded-full border-4 border-accent-primary/20 border-t-accent-primary animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  Loading Portfolio Data
                </h3>
                <p className="text-sm text-secondary">
                  Analyzing your wheel strategy performance...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Portfolio Value and Widget Grid */}
            <div className="dashboard-grid mb-8">
              <PortfolioValueCard 
                portfolioValue={portfolioValue}
                onRefresh={() => loadPortfolioValue(positions)}
                loading={portfolioLoading}
              />
              <div className="col-span-12 lg:col-span-8">
                <WidgetGrid 
                  totalIncome={totalIncome}
                  winRate={winRate}
                  activeCycles={activeCyclesCount}
                  weeklyTarget={1300}
                />
              </div>
            </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
              <StatsCard
                title="Total Income"
                subtitle="Premium income after costs"
                value={`$${(totalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                trend={totalIncome > 0 ? 'up' : 'down'}
                percentage={totalIncome > 0 ? 15.2 : 0}
                change="+$1,247"
                icon="dollar"
              />
              <StatsCard
                title="Active Cycles"
                subtitle="Currently running positions"
                value={activeCyclesCount.toString()}
                trend="neutral"
                percentage={0}
                icon="cycle"
              />
              <StatsCard
                title="Total Premiums"
                subtitle="Collected from all trades"
                value={`$${(totalPremiums || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                trend="up"
                percentage={8.7}
                change="+$892"
                icon="premium"
              />
              <StatsCard
                title="Win Rate"
                subtitle="Profitable cycle percentage"
                value={`${(winRate || 0).toFixed(1)}%`}
                trend={winRate > 70 ? 'up' : 'down'}
                percentage={winRate > 70 ? 2.1 : 0}
                change="+1.4%"
                icon="percentage"
              />
              <StatsCard
                title="Next Week Forecast"
                subtitle={forecastSummary ? `${forecastSummary.trend} trend` : 'AI prediction'}
                value={forecastSummary ? `$${(forecastSummary.nextWeek || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                trend={forecastSummary?.trend === 'increasing' ? 'up' : forecastSummary?.trend === 'decreasing' ? 'down' : 'neutral'}
                percentage={forecastSummary ? forecastSummary.confidence * 100 : 0}
                change={`${forecastSummary ? (forecastSummary.confidence * 100).toFixed(0) : 0}% confidence`}
                icon="forecast"
              />
            </div>

            {/* Enhanced Main Content Grid */}
            <div className="dashboard-grid">
              {/* Primary Chart Section */}
              <div className="col-span-12 xl:col-span-8">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-2">
                    Income Performance
                  </h2>
                  <p className="text-secondary">
                    Track your wheel strategy returns over time
                  </p>
                </div>
                <IncomeChart trades={trades} cycles={cycles} />
              </div>

              {/* Secondary Info Panel */}
              <div className="col-span-12 xl:col-span-4 space-y-6">
                <div className="glass-card p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-1">
                      Active Positions
                    </h3>
                    <p className="text-sm text-secondary">
                      Monitor your current holdings
                    </p>
                  </div>
                  <ActivePositions positions={positions} />
                </div>

                <div className="glass-card p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-1">
                      Options Market View
                    </h3>
                    <p className="text-sm text-secondary">
                      Live options flow visualization
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <RadialMultilayerChart 
                      data={sampleOptionsData}
                      layers={defaultOptionsLayers}
                      width={320}
                      height={320}
                      className="transform transition-all duration-300 hover:scale-105"
                    />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-1">
                      Market Sentiment
                    </h3>
                    <p className="text-sm text-secondary">
                      Current market indicators
                    </p>
                  </div>
                  <MarketSentimentWidget />
                </div>
              </div>
            </div>

            {/* Enhanced Recent Trades Section */}
            <div className="glass-card p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      Recent Activity
                    </h2>
                    <p className="text-secondary">
                      Latest trades and cycle updates
                    </p>
                  </div>
                  <button className="btn-pill">
                    View All Trades
                  </button>
                </div>
              </div>
              <RecentTrades trades={trades.slice(-10).reverse()} />
            </div>
          </div>
        )}

        {/* Floating Action Button */}
        <FloatingActionButton 
          onClick={() => console.log('Add new trade')} 
        />
    </AppLayout>
  );
}