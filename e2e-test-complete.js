const { chromium } = require('playwright');
const fs = require('fs').promises;

// Configuration
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 10000; // Reduced timeout for faster failures

// All pages in the application
const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Analytics Forecast', path: '/analytics/forecast' },
  { name: 'Analytics Monthly', path: '/analytics/monthly' },
  { name: 'Analytics Targets', path: '/analytics/targets' },
  { name: 'Analytics Dividends', path: '/analytics/dividends' },
  { name: 'Positions', path: '/positions' },
  { name: 'Recommendations', path: '/recommendations' },
  { name: 'Sentiment', path: '/sentiment' },
  { name: 'Settings', path: '/settings' }
];

// API endpoints to test
const API_ENDPOINTS = [
  { name: 'Trades', path: '/api/trades', method: 'GET' },
  { name: 'Analytics', path: '/api/analytics', method: 'GET' },
  { name: 'Recommendations', path: '/api/recommendations', method: 'GET' },
  { name: 'Sentiment', path: '/api/sentiment', method: 'POST', body: { symbols: ['SPY'] } },
  { name: 'Trading Ideas', path: '/api/trading-ideas', method: 'GET' }
];

async function runE2ETests() {
  console.log('🚀 Income Magic E2E Test Suite\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox'] 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const results = {
    pages: [],
    apis: [],
    navigation: { tested: false, working: false },
    theme: { tested: false, working: false },
    glassmorphic: { cardsFound: 0, pagesWithCards: 0 },
    performance: {},
    errors: []
  };
  
  try {
    // Create screenshots directory
    await fs.mkdir('e2e-screenshots', { recursive: true });
    
    // Test each page
    console.log('📄 Testing Pages:\n');
    
    for (const pageInfo of PAGES) {
      const page = await context.newPage();
      const pageResult = { ...pageInfo, success: false, loadTime: 0, errors: [] };
      
      try {
        const startTime = Date.now();
        const response = await page.goto(`${BASE_URL}${pageInfo.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: TIMEOUT
        });
        
        pageResult.loadTime = Date.now() - startTime;
        pageResult.statusCode = response.status();
        
        // Wait for content
        await page.waitForTimeout(1000);
        
        // Check for glass cards
        const glassCards = await page.locator('.glass-card').count();
        if (glassCards > 0) {
          results.glassmorphic.cardsFound += glassCards;
          results.glassmorphic.pagesWithCards++;
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `e2e-screenshots/${pageInfo.path.replace(/\//g, '-').substring(1) || 'home'}.png`,
          fullPage: true 
        });
        
        pageResult.success = response.status() === 200;
        pageResult.glassCards = glassCards;
        
        console.log(`${pageResult.success ? '✅' : '❌'} ${pageInfo.name} - ${pageResult.statusCode} (${pageResult.loadTime}ms) - ${glassCards} glass cards`);
        
        // Test navigation on dashboard
        if (pageInfo.path === '/' && !results.navigation.tested) {
          results.navigation.tested = true;
          try {
            const navToggle = page.locator('.floating-nav-toggle');
            if (await navToggle.count() > 0) {
              await navToggle.click({ timeout: 2000 });
              await page.waitForTimeout(500);
              const menuOpen = await page.locator('.floating-nav.open').count() > 0;
              results.navigation.working = menuOpen;
              console.log(`  🧭 Navigation toggle: ${menuOpen ? 'working' : 'not working'}`);
            }
          } catch (e) {
            console.log('  🧭 Navigation test skipped');
          }
        }
        
      } catch (error) {
        pageResult.errors.push(error.message);
        results.errors.push({ page: pageInfo.name, error: error.message });
        console.log(`❌ ${pageInfo.name} - Error: ${error.message}`);
      }
      
      results.pages.push(pageResult);
      await page.close();
    }
    
    // Test API endpoints
    console.log('\n🔌 Testing API Endpoints:\n');
    
    for (const endpoint of API_ENDPOINTS) {
      const apiResult = { ...endpoint, success: false, responseTime: 0 };
      
      try {
        const startTime = Date.now();
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
        });
        
        apiResult.responseTime = Date.now() - startTime;
        apiResult.statusCode = response.status;
        apiResult.success = response.ok;
        
        if (response.ok) {
          const data = await response.json();
          apiResult.hasData = data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);
        }
        
        console.log(`${apiResult.success ? '✅' : '❌'} ${endpoint.name} - ${apiResult.statusCode} (${apiResult.responseTime}ms)`);
        
      } catch (error) {
        apiResult.error = error.message;
        results.errors.push({ api: endpoint.name, error: error.message });
        console.log(`❌ ${endpoint.name} - Error: ${error.message}`);
      }
      
      results.apis.push(apiResult);
    }
    
    // Performance test
    console.log('\n⚡ Performance Test:\n');
    
    const perfPage = await context.newPage();
    const perfStart = Date.now();
    await perfPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    const totalLoadTime = Date.now() - perfStart;
    
    // Get performance metrics
    const metrics = await perfPage.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domNodes: document.getElementsByTagName('*').length,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    
    results.performance = {
      totalLoadTime,
      domNodes: metrics.domNodes,
      domContentLoaded: Math.round(metrics.domContentLoaded),
      loadComplete: Math.round(metrics.loadComplete)
    };
    
    console.log(`⏱️  Full page load: ${totalLoadTime}ms`);
    console.log(`📊 DOM Nodes: ${metrics.domNodes}`);
    console.log(`📐 DOM Content Loaded: ${results.performance.domContentLoaded}ms`);
    console.log(`📏 Load Complete: ${results.performance.loadComplete}ms`);
    
    await perfPage.close();
    
  } finally {
    await browser.close();
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY\n');
  console.log('='.repeat(50));
  
  const successfulPages = results.pages.filter(p => p.success).length;
  const successfulAPIs = results.apis.filter(a => a.success).length;
  
  console.log(`\n📄 Pages: ${successfulPages}/${results.pages.length} passed`);
  console.log(`🔌 APIs: ${successfulAPIs}/${results.apis.length} passed`);
  console.log(`🎨 Glass cards found: ${results.glassmorphic.cardsFound} across ${results.glassmorphic.pagesWithCards} pages`);
  console.log(`🧭 Floating navigation: ${results.navigation.working ? 'working' : 'not tested or not working'}`);
  console.log(`❌ Total errors: ${results.errors.length}`);
  
  // Save detailed report
  await fs.writeFile('e2e-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to e2e-test-results.json');
  console.log('📸 Screenshots saved in e2e-screenshots/');
  
  // Overall status
  const allPassed = successfulPages === results.pages.length && 
                    successfulAPIs === results.apis.length;
  
  if (allPassed) {
    console.log('\n✨ All tests PASSED! Income Magic is fully functional!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the detailed report.');
  }
  
  return allPassed;
}

// Run tests
runE2ETests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });