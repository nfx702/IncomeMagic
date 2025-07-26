'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DividendDashboard } from '@/components/analytics/DividendDashboard';
import { DividendTracker, DividendAnalytics } from '@/services/dividendTracker';
import { Trade } from '@/types/trade';
import { 
  IconCash,
  IconDownload,
  IconInfoCircle
} from '@tabler/icons-react';

export default function DividendsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dividendAnalytics, setDividendAnalytics] = useState<DividendAnalytics | null>(null);
  const [upcomingDividends, setUpcomingDividends] = useState<Array<{
    symbol: string;
    estimatedPaymentDate: Date;
    estimatedAmount: number;
    shares: number;
  }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      
      // Convert dates
      const tradesWithDates = data.trades.map((trade: any) => ({
        ...trade,
        dateTime: new Date(trade.dateTime),
        orderTime: new Date(trade.orderTime),
        openDateTime: new Date(trade.openDateTime),
        reportDate: new Date(trade.reportDate),
        tradeDate: new Date(trade.tradeDate),
        expiry: trade.expiry ? new Date(trade.expiry) : undefined
      }));
      
      setTrades(tradesWithDates);
      
      // Generate dividend analytics
      const tracker = new DividendTracker(tradesWithDates);
      const analytics = tracker.getAnalytics();
      const upcoming = tracker.getUpcomingDividends();
      
      setDividendAnalytics(analytics);
      setUpcomingDividends(upcoming);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportDividendData = () => {
    if (!dividendAnalytics) return;
    
    // Create CSV data
    const headers = ['Symbol', 'Total Received', 'Payments', 'Average Yield %'];
    const rows = Array.from(dividendAnalytics.bySymbol.entries()).map(([symbol, data]) => [
      symbol,
      data.total.toFixed(2),
      data.payments.length,
      data.averageYield.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividend-income-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <IconCash size={32} className="text-primary" />
                <h1 className="text-3xl font-bold">Dividend Income</h1>
              </div>
              <p className="text-muted-foreground">
                Track dividend payments from your stock positions
              </p>
            </div>
            
            <button
              onClick={exportDividendData}
              className="glass-button px-4 py-2 flex items-center gap-2"
            >
              <IconDownload size={18} />
              Export Data
            </button>
          </div>
        </div>

        {/* Dividend Dashboard */}
        {dividendAnalytics && (
          <DividendDashboard 
            analytics={dividendAnalytics}
            upcomingDividends={upcomingDividends}
          />
        )}
      </div>
    </AppLayout>
  );
}