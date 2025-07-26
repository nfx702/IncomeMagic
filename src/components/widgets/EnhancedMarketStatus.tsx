'use client';

import { useState, useEffect } from 'react';
import { 
  IconCalendar, 
  IconWifi, 
  IconWifiOff, 
  IconCheck, 
  IconX,
  IconClock,
  IconDatabase
} from '@tabler/icons-react';
import { AlpacaService } from '@/services/alpacaService';

interface DataFeedStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
  responseTime: number;
  status: 'live' | 'delayed' | 'offline';
}

interface MarketInfo {
  isOpen: boolean;
  nextOpen: Date | null;
  currentTime: Date;
}

export function EnhancedMarketStatus() {
  const [marketInfo, setMarketInfo] = useState<MarketInfo>({
    isOpen: false,
    nextOpen: null,
    currentTime: new Date()
  });

  const [alpacaStatus, setAlpacaStatus] = useState<DataFeedStatus>({
    isConnected: false,
    lastUpdate: null,
    responseTime: 0,
    status: 'offline'
  });

  const [ibStatus, setIbStatus] = useState<DataFeedStatus>({
    isConnected: true, // IB data is from XML files, so it's always "connected" when available
    lastUpdate: new Date(), // Would be the timestamp of the last XML import
    responseTime: 0,
    status: 'live'
  });

  const alpacaService = AlpacaService.getInstance();

  useEffect(() => {
    // Update current time every second
    const timeInterval = setInterval(() => {
      setMarketInfo(prev => ({ ...prev, currentTime: new Date() }));
    }, 1000);

    // Check market status and data feeds every 30 seconds
    const statusInterval = setInterval(() => {
      checkMarketStatus();
      checkAlpacaStatus();
      checkIBStatus();
    }, 30000);

    // Initial check
    checkMarketStatus();
    checkAlpacaStatus();
    checkIBStatus();

    return () => {
      clearInterval(timeInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const checkMarketStatus = async () => {
    try {
      const startTime = Date.now();
      const status = await alpacaService.getMarketStatus();
      const responseTime = Date.now() - startTime;
      
      setMarketInfo({
        isOpen: status.isOpen,
        nextOpen: status.nextOpen,
        currentTime: new Date()
      });

      // Update Alpaca status based on the response
      setAlpacaStatus(prev => ({
        ...prev,
        isConnected: true,
        lastUpdate: new Date(),
        responseTime,
        status: responseTime < 2000 ? 'live' : 'delayed'
      }));
    } catch (error) {
      console.error('Failed to check market status:', error);
      setAlpacaStatus(prev => ({
        ...prev,
        isConnected: false,
        status: 'offline'
      }));
    }
  };

  const checkAlpacaStatus = async () => {
    try {
      const startTime = Date.now();
      // Test Alpaca connection with a simple API call
      await alpacaService.getMarketStatus();
      const responseTime = Date.now() - startTime;
      
      setAlpacaStatus(prev => ({
        ...prev,
        isConnected: true,
        lastUpdate: new Date(),
        responseTime,
        status: responseTime < 2000 ? 'live' : 'delayed'
      }));
    } catch (error) {
      setAlpacaStatus(prev => ({
        ...prev,
        isConnected: false,
        status: 'offline'
      }));
    }
  };

  const checkIBStatus = async () => {
    // For IB status, we'll check if we have recent trade data
    // This would typically check the last XML import or API connection
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
      if (data.trades && data.trades.length > 0) {
        // Check if we have recent trades (within last 24 hours)
        const recentTrades = data.trades.filter((trade: any) => {
          const tradeDate = new Date(trade.dateTime);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return tradeDate > dayAgo;
        });

        setIbStatus({
          isConnected: true,
          lastUpdate: data.trades.length > 0 ? new Date(data.trades[0].dateTime) : null,
          responseTime: 0,
          status: recentTrades.length > 0 ? 'live' : 'delayed'
        });
      } else {
        setIbStatus(prev => ({
          ...prev,
          isConnected: false,
          status: 'offline'
        }));
      }
    } catch (error) {
      setIbStatus(prev => ({
        ...prev,
        isConnected: false,
        status: 'offline'
      }));
    }
  };

  const getStatusIcon = (status: DataFeedStatus) => {
    switch (status.status) {
      case 'live':
        return <IconCheck size={14} className="text-green-500" />;
      case 'delayed':
        return <IconClock size={14} className="text-yellow-500" />;
      case 'offline':
        return <IconX size={14} className="text-red-500" />;
      default:
        return <IconWifiOff size={14} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: DataFeedStatus) => {
    switch (status.status) {
      case 'live':
        return 'text-green-500';
      case 'delayed':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-btn">
          <IconCalendar size={24} strokeWidth={1.5} />
        </div>
        <div className="metric-label">
          Market Status
        </div>
      </div>
      
      {/* Market Status */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className={`status-indicator ${marketInfo.isOpen ? 'live' : 'closed'}`}></div>
        <span className={`text-lg font-semibold ${marketInfo.isOpen ? 'text-success' : 'text-muted-foreground'}`}>
          {marketInfo.isOpen ? 'OPEN' : 'CLOSED'}
        </span>
      </div>
      
      {/* Data Feed Status */}
      <div className="space-y-3 border-t border-border/50 pt-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Data Feed Status
        </div>
        
        {/* Alpaca Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWifi size={14} className="text-blue-500" />
            <span className="text-xs font-medium">Alpaca</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(alpacaStatus)}
            <span className={`text-xs font-medium ${getStatusColor(alpacaStatus)}`}>
              {alpacaStatus.status.toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* IB Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconDatabase size={14} className="text-purple-500" />
            <span className="text-xs font-medium">IB Data</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(ibStatus)}
            <span className={`text-xs font-medium ${getStatusColor(ibStatus)}`}>
              {ibStatus.status.toUpperCase()}
            </span>
          </div>
        </div>
        
        {/* Last Update Info */}
        <div className="mt-3 pt-2 border-t border-border/30">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <div className="font-medium">Alpaca:</div>
              <div>{formatTime(alpacaStatus.lastUpdate)}</div>
              {alpacaStatus.responseTime > 0 && (
                <div className="text-xs text-muted-foreground">
                  {alpacaStatus.responseTime}ms
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">IB Data:</div>
              <div>{formatTime(ibStatus.lastUpdate)}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Market Hours Info */}
      <div className="text-xs text-tertiary text-center mt-3">
        {marketInfo.isOpen ? (
          'Options Trading Active'
        ) : marketInfo.nextOpen ? (
          `Next open: ${formatTime(marketInfo.nextOpen)}`
        ) : (
          'Market Closed'
        )}
      </div>
    </div>
  );
}