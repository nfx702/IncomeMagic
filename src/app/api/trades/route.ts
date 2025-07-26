import { NextResponse } from 'next/server';
import { IBTradeParser } from '@/services/xmlParser';
import { WheelStrategyAnalyzer } from '@/services/wheelStrategyAnalyzer';
import { AnalyticsEngine } from '@/services/analyticsEngine';
import path from 'path';

export async function GET() {
  try {
    // Fix the path to point to the correct _reports directory
    const reportsDir = path.join(process.cwd(), '../_reports');
    
    console.log('Current working directory:', process.cwd());
    console.log('Reports directory:', reportsDir);
    
    // Check if directory exists
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(reportsDir);
      console.log('Directory exists:', stats.isDirectory());
    } catch (err) {
      console.error('Directory not found:', reportsDir);
      throw new Error(`Reports directory not found: ${reportsDir}`);
    }
    
    const parser = IBTradeParser.getInstance();
    parser.clearCache(); // Clear any cached data
    const trades = await parser.parseReportsDirectory(reportsDir);
    
    console.log('Parsed trades count:', trades.length);
    
    const analyzer = new WheelStrategyAnalyzer(trades);
    const cycles = analyzer.getCycles();
    const positions = analyzer.getPositions();
    const activeOptions = analyzer.getActiveOptions();
    const latestPrices = analyzer.getLatestPrices();
    
    const analytics = new AnalyticsEngine(trades, cycles);
    const totalIncome = analytics.getTotalIncome();
    
    // Convert Maps to objects for JSON serialization
    const cyclesObject: { [key: string]: any } = {};
    cycles.forEach((value, key) => {
      cyclesObject[key] = value;
    });
    
    const positionsObject: { [key: string]: any } = {};
    positions.forEach((value, key) => {
      positionsObject[key] = value;
    });
    
    return NextResponse.json({
      trades,
      cycles: cyclesObject,
      positions: positionsObject,
      activeOptions,
      latestPrices: Object.fromEntries(latestPrices),
      totalIncome: totalIncome.total,
      incomeBySymbol: Object.fromEntries(totalIncome.bySymbol),
    });
  } catch (error) {
    console.error('Error in trades API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load trade data', details: errorMessage },
      { status: 500 }
    );
  }
}