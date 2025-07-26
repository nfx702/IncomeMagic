import { NextResponse } from 'next/server';
import { sentimentService } from '@/services/sentimentAnalysis';

export async function POST(request: Request) {
  try {
    // Check if request has body
    const requestText = await request.text();
    if (!requestText) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }
    
    const { symbols, type = 'batch' } = JSON.parse(requestText);
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    if (type === 'single' && symbols.length === 1) {
      // Single symbol detailed analysis
      const sentiment = await sentimentService.analyzeSentiment(symbols[0]);
      return NextResponse.json({ sentiment });
    } else if (type === 'overview') {
      // Market overview analysis
      const overview = await sentimentService.getMarketOverview(symbols);
      return NextResponse.json({ overview });
    } else {
      // Batch analysis for multiple symbols
      const sentiments = await sentimentService.analyzeBatchSentiment(symbols);
      
      // Convert Map to object for JSON response
      const sentimentData: { [key: string]: any } = {};
      sentiments.forEach((sentiment, symbol) => {
        sentimentData[symbol] = sentiment;
      });
      
      return NextResponse.json({ sentiments: sentimentData });
    }
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const type = url.searchParams.get('type') || 'single';
    
    if (!symbol) {
      // Return market overview for major indices
      const overview = await sentimentService.getMarketOverview(['SPY', 'QQQ', 'IWM']);
      return NextResponse.json({ overview });
    }

    if (type === 'single') {
      const sentiment = await sentimentService.analyzeSentiment(symbol);
      return NextResponse.json({ sentiment });
    } else {
      const sentiments = await sentimentService.analyzeBatchSentiment([symbol]);
      const sentimentData = sentiments.get(symbol);
      return NextResponse.json({ sentiment: sentimentData });
    }
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    
    // Clear sentiment cache
    sentimentService.clearCache(symbol || undefined);
    
    return NextResponse.json({ 
      message: symbol ? `Cache cleared for ${symbol}` : 'All sentiment cache cleared' 
    });
  } catch (error) {
    console.error('Error clearing sentiment cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}