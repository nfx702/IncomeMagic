import { NextResponse } from 'next/server';
import { IBTradeParser } from '@/services/xmlParser';
import { WheelStrategyAnalyzer } from '@/services/wheelStrategyAnalyzer';
import { AnalyticsEngine } from '@/services/analyticsEngine';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), '../_reports');
    
    const parser = IBTradeParser.getInstance();
    parser.clearCache();
    const trades = await parser.parseReportsDirectory(reportsDir);
    
    const analyzer = new WheelStrategyAnalyzer(trades);
    const cycles = analyzer.getCycles();
    
    const analytics = new AnalyticsEngine(trades, cycles);
    
    // Get analytics for each symbol
    const symbolAnalytics: { [key: string]: any } = {};
    
    // Get all unique symbols from trades, not just those with cycles
    const allSymbols = new Set<string>();
    trades.forEach(trade => {
      if (trade.underlyingSymbol) {
        allSymbols.add(trade.underlyingSymbol);
      }
    });
    
    for (const symbol of allSymbols) {
      const symbolData = analytics.getSymbolAnalytics(symbol);
      
      // Convert dates to ISO strings for JSON serialization
      symbolAnalytics[symbol] = {
        ...symbolData,
        weeklyBreakdown: symbolData.weeklyBreakdown.map(item => ({
          ...item,
          date: item.date.toISOString()
        })),
        monthlyBreakdown: symbolData.monthlyBreakdown.map(item => ({
          ...item,
          date: item.date.toISOString()
        })),
        cycleBreakdown: symbolData.cycleBreakdown.map(cycle => ({
          ...cycle,
          startDate: cycle.startDate.toISOString(),
          endDate: cycle.endDate ? cycle.endDate.toISOString() : null
        }))
      };
    }
    
    return NextResponse.json({
      symbolAnalytics
    });
  } catch (error) {
    console.error('Error in analytics API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load analytics data', details: errorMessage },
      { status: 500 }
    );
  }
}