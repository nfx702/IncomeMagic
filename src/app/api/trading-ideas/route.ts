import { NextRequest, NextResponse } from 'next/server';
import { tradingViewIdeasService } from '@/services/tradingViewIdeas';
import { TradingViewIdea } from '@/types/trade';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'], 
      category = 'all',
      difficulty = 'all',
      timeHorizon = 'all',
      minWheelAlignment = 0.5,
      limit = 10
    } = body;

    // Validate input
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Valid symbols array is required' },
        { status: 400 }
      );
    }

    if (symbols.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 symbols allowed' },
        { status: 400 }
      );
    }

    // Generate ideas for the requested symbols
    const allIdeas = await tradingViewIdeasService.generateIdeas(symbols);

    // Apply filters
    let filteredIdeas = allIdeas;
    
    if (category !== 'all') {
      filteredIdeas = tradingViewIdeasService.filterByCategory(filteredIdeas, category);
    }
    
    if (difficulty !== 'all') {
      filteredIdeas = tradingViewIdeasService.filterByDifficulty(filteredIdeas, difficulty);
    }
    
    if (timeHorizon !== 'all') {
      filteredIdeas = tradingViewIdeasService.filterByTimeHorizon(filteredIdeas, timeHorizon);
    }

    // Filter by minimum wheel alignment
    filteredIdeas = tradingViewIdeasService.filterByWheelAlignment(filteredIdeas, minWheelAlignment);

    // Limit results
    if (limit && limit > 0) {
      filteredIdeas = filteredIdeas.slice(0, limit);
    }

    // Add some metadata
    const response = {
      ideas: filteredIdeas,
      meta: {
        total: filteredIdeas.length,
        categories: getUniqueCategories(filteredIdeas),
        difficulties: getUniqueDifficulties(filteredIdeas),
        timeHorizons: getUniqueTimeHorizons(filteredIdeas),
        averageWheelAlignment: getAverageWheelAlignment(filteredIdeas),
        averageConfidence: getAverageConfidence(filteredIdeas),
        generatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating trading ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating ideas' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get('symbols')?.split(',') || ['AAPL', 'MSFT', 'GOOGL'];
    const category = searchParams.get('category') || 'all';
    const difficulty = searchParams.get('difficulty') || 'all';
    const timeHorizon = searchParams.get('timeHorizon') || 'all';
    const minWheelAlignment = parseFloat(searchParams.get('minWheelAlignment') || '0.5');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Use the same logic as POST
    const allIdeas = await tradingViewIdeasService.generateIdeas(symbols);
    
    let filteredIdeas = allIdeas;
    
    if (category !== 'all') {
      filteredIdeas = tradingViewIdeasService.filterByCategory(filteredIdeas, category);
    }
    
    if (difficulty !== 'all') {
      filteredIdeas = tradingViewIdeasService.filterByDifficulty(filteredIdeas, difficulty);
    }
    
    if (timeHorizon !== 'all') {
      filteredIdeas = tradingViewIdeasService.filterByTimeHorizon(filteredIdeas, timeHorizon);
    }

    filteredIdeas = tradingViewIdeasService.filterByWheelAlignment(filteredIdeas, minWheelAlignment);

    if (limit && limit > 0) {
      filteredIdeas = filteredIdeas.slice(0, limit);
    }

    const response = {
      ideas: filteredIdeas,
      meta: {
        total: filteredIdeas.length,
        categories: getUniqueCategories(filteredIdeas),
        difficulties: getUniqueDifficulties(filteredIdeas),
        timeHorizons: getUniqueTimeHorizons(filteredIdeas),
        averageWheelAlignment: getAverageWheelAlignment(filteredIdeas),
        averageConfidence: getAverageConfidence(filteredIdeas),
        generatedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating trading ideas:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating ideas' },
      { status: 500 }
    );
  }
}

// Helper functions
function getUniqueCategories(ideas: TradingViewIdea[]): string[] {
  return [...new Set(ideas.map(idea => idea.category))];
}

function getUniqueDifficulties(ideas: TradingViewIdea[]): string[] {
  return [...new Set(ideas.map(idea => idea.difficulty))];
}

function getUniqueTimeHorizons(ideas: TradingViewIdea[]): string[] {
  return [...new Set(ideas.map(idea => idea.timeHorizon))];
}

function getAverageWheelAlignment(ideas: TradingViewIdea[]): number {
  if (ideas.length === 0) return 0;
  const sum = ideas.reduce((acc, idea) => acc + idea.wheelAlignment, 0);
  return Math.round((sum / ideas.length) * 100) / 100;
}

function getAverageConfidence(ideas: TradingViewIdea[]): number {
  if (ideas.length === 0) return 0;
  const sum = ideas.reduce((acc, idea) => acc + idea.confidence, 0);
  return Math.round((sum / ideas.length) * 100) / 100;
}