/**
 * React Hook for Live Market Data Integration
 * Provides real-time market data and recommendations to React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedRecommendation } from '@/services/enhancedRecommendationEngine';
import { AggregatedQuote, MarketIndicators } from '@/services/marketDataService';
import { PortfolioRisk } from '@/services/riskManagement';

export interface LiveDataState {
  quotes: Record<string, AggregatedQuote>;
  recommendations: EnhancedRecommendation[];
  marketIndicators: MarketIndicators | null;
  portfolioRisk: PortfolioRisk | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export interface LiveDataOptions {
  symbols: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableStreaming?: boolean;
}

export function useLiveData(options: LiveDataOptions) {
  const [state, setState] = useState<LiveDataState>({
    quotes: {},
    recommendations: [],
    marketIndicators: null,
    portfolioRisk: null,
    isConnected: false,
    isLoading: false,
    error: null,
    lastUpdate: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<LiveDataState>) => {
    setState(prev => ({
      ...prev,
      ...updates,
      lastUpdate: new Date()
    }));
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (options.symbols.length === 0) return;

    updateState({ isLoading: true, error: null });

    try {
      // Fetch quotes
      const quotesResponse = await fetch(
        `/api/live-data?action=quotes&symbols=${options.symbols.join(',')}`
      );
      const quotesData = await quotesResponse.json();

      // Fetch market indicators
      const indicatorsResponse = await fetch('/api/live-data?action=indicators');
      const indicatorsData = await indicatorsResponse.json();

      updateState({
        quotes: quotesData.quotes || {},
        marketIndicators: indicatorsData.indicators || null,
        isLoading: false,
        error: null
      });
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      });
    }
  }, [options.symbols, updateState]);

  // Generate recommendations
  const generateRecommendations = useCallback(async (
    trades: any[] = [],
    portfolioValue: number = 100000,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ) => {
    updateState({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/live-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recommendations',
          data: { trades, portfolioValue, riskTolerance }
        })
      });

      const data = await response.json();
      
      updateState({
        recommendations: data.recommendations || [],
        isLoading: false,
        error: null
      });

      return data.recommendations;
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate recommendations'
      });
      return [];
    }
  }, [updateState]);

  // Assess portfolio risk
  const assessRisk = useCallback(async (
    positions: any[] = [],
    recommendations: any[] = [],
    portfolioValue: number = 100000
  ) => {
    try {
      const response = await fetch('/api/live-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'risk-assessment',
          data: { positions, recommendations, portfolioValue }
        })
      });

      const data = await response.json();
      
      updateState({
        portfolioRisk: data.portfolioRisk || null,
        marketIndicators: data.marketIndicators || state.marketIndicators
      });

      return data.portfolioRisk;
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Failed to assess risk'
      });
      return null;
    }
  }, [updateState, state.marketIndicators]);

  // Start streaming
  const startStreaming = useCallback(() => {
    if (!options.enableStreaming || options.symbols.length === 0) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/live-data/stream?symbols=${options.symbols.join(',')}`
    );

    eventSource.addEventListener('connected', () => {
      updateState({ isConnected: true, error: null });
    });

    eventSource.addEventListener('price', (event) => {
      const update = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        quotes: {
          ...prev.quotes,
          [update.symbol]: {
            ...prev.quotes[update.symbol],
            price: update.price,
            change: update.change,
            changePercent: update.changePercent,
            volume: update.volume,
            timestamp: new Date(update.timestamp),
            lastUpdated: new Date()
          }
        },
        lastUpdate: new Date()
      }));
    });

    eventSource.addEventListener('alert', (event) => {
      const alert = JSON.parse(event.data);
      console.log('Live Data Alert:', alert);
      // Could integrate with a notification system here
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const error = JSON.parse(event.data);
        updateState({
          isConnected: false,
          error: error.message || 'Streaming connection error'
        });
      } catch {
        updateState({
          isConnected: false,
          error: 'Streaming connection error'
        });
      }
    });

    eventSource.onerror = () => {
      updateState({
        isConnected: false,
        error: 'Connection lost'
      });
    };

    eventSourceRef.current = eventSource;
  }, [options.enableStreaming, options.symbols, updateState]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    updateState({ isConnected: false });
  }, [updateState]);

  // Subscribe to market data
  const subscribe = useCallback(async () => {
    if (options.symbols.length === 0) return;

    try {
      await fetch('/api/live-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          data: {
            subscriptionId: `ui_${Date.now()}`,
            symbols: options.symbols,
            interval: options.refreshInterval || 10000
          }
        })
      });
    } catch (error) {
      console.error('Failed to subscribe to market data:', error);
    }
  }, [options.symbols, options.refreshInterval]);

  // Initialize services
  const initializeServices = useCallback(async () => {
    try {
      await fetch('/api/live-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-monitoring' })
      });
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  }, []);

  // Effect for initial setup
  useEffect(() => {
    initializeServices();
    fetchData();
    subscribe();

    if (options.enableStreaming) {
      startStreaming();
    }

    return () => {
      stopStreaming();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [
    initializeServices,
    fetchData,
    subscribe,
    options.enableStreaming,
    startStreaming,
    stopStreaming
  ]);

  // Effect for auto-refresh
  useEffect(() => {
    if (options.autoRefresh && !options.enableStreaming) {
      refreshIntervalRef.current = setInterval(
        fetchData,
        options.refreshInterval || 30000
      );

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [options.autoRefresh, options.enableStreaming, options.refreshInterval, fetchData]);

  return {
    ...state,
    actions: {
      refresh: fetchData,
      generateRecommendations,
      assessRisk,
      startStreaming,
      stopStreaming,
      subscribe
    }
  };
}