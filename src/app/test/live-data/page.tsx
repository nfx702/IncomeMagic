/**
 * Live Data Test Page
 * Interactive testing environment for the live data integration
 */

'use client';

import { LiveDataDashboard } from '@/components/LiveDataDashboard';

export default function LiveDataTestPage() {
  // Mock trades for testing
  const mockTrades = [
    {
      tradeId: 'test_1',
      symbol: 'AAPL',
      action: 'BUY',
      quantity: 100,
      price: 150,
      assetCategory: 'STK',
      netCash: -15000,
      dateTime: new Date(),
      orderTime: new Date(),
      openDateTime: new Date(),
      reportDate: new Date(),
      tradeDate: new Date(),
      settleDate: new Date()
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Data Integration Test</h1>
          <p className="mt-2 text-gray-600">
            Test the real-time market data integration, recommendations engine, and risk management system.
          </p>
        </div>

        <LiveDataDashboard
          symbols={['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']}
          portfolioValue={100000}
          trades={mockTrades}
          className="space-y-8"
        />

        {/* Additional Test Controls */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Testing Instructions</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-600">1. Real-time Data Flow</h4>
              <p>Watch the quotes update automatically. The connection indicator should show "Connected" in green.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">2. Market Indicators</h4>
              <p>VIX, SPY price, and market sentiment should display current values from Yahoo Finance.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">3. Live Recommendations</h4>
              <p>Change risk tolerance to see different recommendation strategies. Click "Refresh" to generate new recommendations.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600">4. Risk Assessment</h4>
              <p>Portfolio risk metrics should update based on current market conditions and positions.</p>
            </div>

            <div>
              <h4 className="font-medium text-blue-600">5. Data Sources</h4>
              <p>Each quote shows confidence levels and data sources. Higher confidence indicates better data quality.</p>
            </div>
          </div>
        </div>

        {/* API Test Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">API Endpoints</h3>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-blue-600">GET</span> /api/live-data?action=quotes&symbols=AAPL,MSFT
            </div>
            <div>
              <span className="text-blue-600">GET</span> /api/live-data?action=indicators
            </div>
            <div>
              <span className="text-blue-600">GET</span> /api/live-data?action=candidates&portfolioValue=100000
            </div>
            <div>
              <span className="text-blue-600">POST</span> /api/live-data (action: recommendations, risk-assessment, subscribe)
            </div>
            <div>
              <span className="text-green-600">SSE</span> /api/live-data/stream?symbols=AAPL,MSFT
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}