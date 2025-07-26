import { test, expect } from '@playwright/test';

test.describe('API Endpoints Testing', () => {
  test('should test /api/trades endpoint', async ({ request }) => {
    const response = await request.get('/api/trades');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('trades');
    expect(data).toHaveProperty('cycles');
    expect(data).toHaveProperty('positions');
    expect(data).toHaveProperty('totalIncome');
    
    console.log('Trades API response structure validated');
  });
  
  test('should test /api/recommendations endpoint', async ({ request }) => {
    const response = await request.get('/api/recommendations');
    
    // API may return 405 if GET not supported, check for POST
    if (response.status() === 405) {
      const postResponse = await request.post('/api/recommendations', {
        data: { symbol: 'AAPL' }
      });
      expect(postResponse.status()).toBeLessThan(500);
      console.log('Recommendations API POST method validated');
    } else {
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.recommendations)).toBe(true);
      console.log('Recommendations API GET response structure validated');
    }
  });
  
  test('should test /api/analytics endpoint', async ({ request }) => {
    const response = await request.get('/api/analytics');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    // Analytics returns symbolAnalytics, not summary
    expect(data).toHaveProperty('symbolAnalytics');
    expect(typeof data.symbolAnalytics).toBe('object');
    
    console.log('Analytics API response structure validated');
  });
  
  test('should test /api/sentiment GET endpoint', async ({ request }) => {
    const response = await request.get('/api/sentiment');
    
    // Should not return 500 error
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('overview');
      console.log('Sentiment API GET response validated');
    } else {
      console.log(`Sentiment API returned status: ${response.status()}`);
    }
  });
  
  test('should handle /api/sentiment POST with valid data', async ({ request }) => {
    const response = await request.post('/api/sentiment', {
      data: {
        symbols: ['AAPL', 'GOOGL'],
        type: 'batch'
      }
    });
    
    // Should not return 500 error
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('sentiments');
      console.log('Sentiment API POST response validated');
    } else {
      console.log(`Sentiment API POST returned status: ${response.status()}`);
    }
  });
  
  test('should handle /api/sentiment POST with empty body gracefully', async ({ request }) => {
    const response = await request.post('/api/sentiment', {
      data: {}
    });
    
    // Should return 400 for bad request, not 500
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    
    console.log('Sentiment API handles empty body correctly');
  });
  
  test('should test /api/strike-recommendations endpoint', async ({ request }) => {
    const response = await request.get('/api/strike-recommendations');
    
    expect(response.status()).toBeLessThan(500);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('recommendations');
      console.log('Strike recommendations API response validated');
    }
  });
  
  test('should test all API endpoints for basic functionality', async ({ request }) => {
    const endpoints = [
      '/api/trades',
      '/api/recommendations',
      '/api/analytics',
      '/api/sentiment',
      '/api/strike-recommendations',
      '/api/live-data'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await request.get(endpoint);
        results.push({
          endpoint,
          status: response.status(),
          success: response.status() < 500
        });
      } catch (error) {
        results.push({
          endpoint,
          status: 'ERROR',
          success: false,
          error: error.message
        });
      }
    }
    
    console.table(results);
    
    // All endpoints should return < 500 (no server errors)
    const serverErrors = results.filter(r => typeof r.status === 'number' && r.status >= 500);
    expect(serverErrors.length).toBe(0);
  });
});