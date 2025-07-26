/**
 * Live Data Streaming API Route
 * Provides Server-Sent Events (SSE) for real-time market data updates
 */

import { NextRequest } from 'next/server';
import { MarketDataService } from '@/services/marketDataService';
import { MonitoringService } from '@/services/monitoringService';

const marketDataService = MarketDataService.getInstance();
const monitoringService = MonitoringService.getInstance();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || [];
  
  if (symbols.length === 0) {
    return new Response('No symbols provided', { status: 400 });
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Set up SSE headers
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any, event?: string) => {
        const eventData = `${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

      // Send initial connection confirmation
      sendEvent({
        type: 'connection',
        status: 'connected',
        symbols,
        timestamp: new Date().toISOString()
      }, 'connected');

      // Set up market data subscription
      const subscriptionId = `stream_${Date.now()}`;
      
      marketDataService.subscribe(subscriptionId, {
        symbols,
        interval: 5000, // 5-second updates for streaming
        includeOptions: true,
        includeGreeks: true
      }).then(() => {
        sendEvent({
          type: 'subscription',
          status: 'active',
          subscriptionId,
          timestamp: new Date().toISOString()
        }, 'subscribed');
      });

      // Handle price updates
      const priceUpdateHandler = (update: any) => {
        if (symbols.includes(update.symbol)) {
          sendEvent({
            type: 'priceUpdate',
            ...update
          }, 'price');
        }
      };

      // Handle options updates
      const optionsUpdateHandler = (update: any) => {
        if (symbols.includes(update.symbol)) {
          sendEvent({
            type: 'optionsUpdate',
            symbol: update.symbol,
            chainCount: update.optionsChain.length,
            timestamp: update.timestamp
          }, 'options');
        }
      };

      // Handle alerts
      const alertHandler = (alert: any) => {
        sendEvent({
          type: 'alert',
          level: alert.level,
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp
        }, 'alert');
      };

      // Handle errors
      const errorHandler = (error: any) => {
        sendEvent({
          type: 'error',
          message: error.message || 'Unknown error',
          timestamp: new Date().toISOString()
        }, 'error');
      };

      // Set up event listeners
      marketDataService.on('priceUpdate', priceUpdateHandler);
      marketDataService.on('optionsUpdate', optionsUpdateHandler);
      marketDataService.on('error', errorHandler);
      monitoringService.on('alert', alertHandler);

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        sendEvent({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          stats: marketDataService.getStats()
        }, 'heartbeat');
      }, 30000); // Every 30 seconds

      // Cleanup function
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        
        marketDataService.off('priceUpdate', priceUpdateHandler);
        marketDataService.off('optionsUpdate', optionsUpdateHandler);
        marketDataService.off('error', errorHandler);
        monitoringService.off('alert', alertHandler);
        
        marketDataService.unsubscribe(subscriptionId).catch(console.error);
        
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);

      // Handle stream close
      return cleanup;
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}