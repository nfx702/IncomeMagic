const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 30000;

// All pages to test
const PAGES = [
  { name: 'Dashboard', path: '/', selectors: ['.glass-card', '.floating-nav-container'] },
  { name: 'Analytics', path: '/analytics', selectors: ['.glass-card', '[class*="chart"]'] },
  { name: 'Analytics - Forecast', path: '/analytics/forecast', selectors: ['.glass-card', '[class*="forecast"]'] },
  { name: 'Analytics - Monthly', path: '/analytics/monthly', selectors: ['.glass-card'] },
  { name: 'Analytics - Targets', path: '/analytics/targets', selectors: ['.glass-card'] },
  { name: 'Analytics - Dividends', path: '/analytics/dividends', selectors: ['.glass-card'] },
  { name: 'Positions', path: '/positions', selectors: ['.glass-card', '[class*="position"]'] },
  { name: 'Recommendations', path: '/recommendations', selectors: ['.glass-card', '[class*="recommendation"]'] },
  { name: 'Sentiment', path: '/sentiment', selectors: ['.glass-card'] },
  { name: 'Settings', path: '/settings', selectors: ['.glass-card'] }
];

// API endpoints to test
const API_ENDPOINTS = [
  { name: 'Trades', path: '/api/trades', method: 'GET' },
  { name: 'Analytics', path: '/api/analytics', method: 'GET' },
  { name: 'Recommendations', path: '/api/recommendations', method: 'GET' },
  { name: 'Sentiment', path: '/api/sentiment', method: 'POST', body: { symbols: ['SPY', 'QQQ'] } },
  { name: 'Strike Recommendations', path: '/api/strike-recommendations', method: 'POST', body: { symbol: 'SPY' } },
  { name: 'Trading Ideas', path: '/api/trading-ideas', method: 'GET' }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPage(page, pageInfo, results) {
  const startTime = Date.now();
  const pageResults = {
    name: pageInfo.name,
    path: pageInfo.path,
    success: false,
    loadTime: 0,
    errors: [],
    warnings: [],
    screenshots: [],
    elements: {}
  };

  try {
    log(`\n📄 Testing ${pageInfo.name} (${pageInfo.path})...`, 'cyan');
    
    // Navigate to page
    const response = await page.goto(`${BASE_URL}${pageInfo.path}`, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT
    });
    
    pageResults.statusCode = response.status();
    pageResults.loadTime = Date.now() - startTime;
    
    if (response.status() !== 200) {
      throw new Error(`Page returned status ${response.status()}`);
    }
    
    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Additional wait for dynamic content
    
    // Check for required elements
    for (const selector of pageInfo.selectors) {
      const count = await page.locator(selector).count();
      pageResults.elements[selector] = count;
      log(`  ${count > 0 ? '✅' : '❌'} Found ${count} elements matching "${selector}"`, count > 0 ? 'green' : 'red');
    }
    
    // Check for glassmorphic UI elements
    const glassCards = await page.locator('.glass-card').count();
    const floatingNav = await page.locator('.floating-nav-container').count();
    log(`  📊 Glass cards: ${glassCards}`, glassCards > 0 ? 'green' : 'yellow');
    log(`  🧭 Floating navigation: ${floatingNav > 0 ? 'present' : 'missing'}`, floatingNav > 0 ? 'green' : 'yellow');
    
    // Test interactions
    if (pageInfo.path === '/') {
      // Test floating navigation toggle
      const navToggle = page.locator('.floating-nav-toggle');
      if (await navToggle.count() > 0) {
        await navToggle.click();
        await page.waitForTimeout(500);
        const menuOpen = await page.locator('.floating-nav.open').count() > 0;
        log(`  🎯 Navigation toggle: ${menuOpen ? 'working' : 'not working'}`, menuOpen ? 'green' : 'red');
      }
    }
    
    // Check for theme toggle
    const themeToggle = page.locator('[class*="theme-toggle"]').first();
    if (await themeToggle.count() > 0) {
      const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      await themeToggle.click();
      await page.waitForTimeout(300);
      const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      log(`  🎨 Theme toggle: ${initialTheme !== newTheme ? 'working' : 'not working'}`, initialTheme !== newTheme ? 'green' : 'red');
    }
    
    // Take screenshot
    const screenshotPath = `screenshots/${pageInfo.path.replace(/\//g, '-').substring(1) || 'home'}.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    pageResults.screenshots.push(screenshotPath);
    
    pageResults.success = true;
    log(`  ✅ Page test completed in ${pageResults.loadTime}ms`, 'green');
    
  } catch (error) {
    pageResults.errors.push(error.message);
    log(`  ❌ Error: ${error.message}`, 'red');
  }
  
  results.pages.push(pageResults);
}

async function testAPI(endpoint, results) {
  const startTime = Date.now();
  const apiResults = {
    name: endpoint.name,
    path: endpoint.path,
    method: endpoint.method,
    success: false,
    responseTime: 0,
    statusCode: null,
    dataReceived: false
  };

  try {
    log(`\n🔌 Testing API ${endpoint.name} (${endpoint.method} ${endpoint.path})...`, 'magenta');
    
    const options = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint.path}`, options);
    apiResults.statusCode = response.status;
    apiResults.responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      apiResults.dataReceived = data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);
      log(`  ✅ Status: ${response.status}, Response time: ${apiResults.responseTime}ms`, 'green');
      log(`  📊 Data received: ${apiResults.dataReceived ? 'Yes' : 'No'}`, apiResults.dataReceived ? 'green' : 'yellow');
      apiResults.success = true;
    } else {
      throw new Error(`API returned status ${response.status}`);
    }
    
  } catch (error) {
    apiResults.error = error.message;
    log(`  ❌ Error: ${error.message}`, 'red');
  }
  
  results.apis.push(apiResults);
}

async function runComprehensiveTests() {
  log('\n🚀 Income Magic Comprehensive E2E Test Suite', 'bright');
  log('=' .repeat(50), 'blue');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Create screenshots directory
  await fs.mkdir('screenshots', { recursive: true });
  
  const results = {
    startTime: new Date(),
    pages: [],
    apis: [],
    errors: [],
    performance: {}
  };
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('chrome-extension')) {
      results.errors.push({
        type: 'console',
        text: msg.text(),
        location: msg.location()
      });
    }
  });
  
  page.on('pageerror', error => {
    results.errors.push({
      type: 'pageerror',
      message: error.message
    });
  });
  
  try {
    // Test all pages
    log('\n📄 TESTING PAGES', 'bright');
    log('-'.repeat(30), 'blue');
    
    for (const pageInfo of PAGES) {
      await testPage(page, pageInfo, results);
    }
    
    // Test API endpoints
    log('\n\n🔌 TESTING API ENDPOINTS', 'bright');
    log('-'.repeat(30), 'blue');
    
    for (const endpoint of API_ENDPOINTS) {
      await testAPI(endpoint, results);
    }
    
    // Test performance
    log('\n\n⚡ PERFORMANCE TESTING', 'bright');
    log('-'.repeat(30), 'blue');
    
    // Test page load performance
    const perfPage = await context.newPage();
    const perfStart = Date.now();
    await perfPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - perfStart;
    
    const metrics = await perfPage.metrics();
    results.performance = {
      pageLoadTime: loadTime,
      metrics: metrics
    };
    
    log(`  ⏱️  Initial page load: ${loadTime}ms`, loadTime < 3000 ? 'green' : 'yellow');
    log(`  📊 DOM Nodes: ${metrics.Nodes}`, metrics.Nodes < 1500 ? 'green' : 'yellow');
    log(`  📏 Layout Duration: ${Math.round(metrics.LayoutDuration * 1000)}ms`, 'cyan');
    
    await perfPage.close();
    
  } finally {
    await browser.close();
  }
  
  // Generate report
  log('\n\n📊 TEST SUMMARY', 'bright');
  log('='.repeat(50), 'blue');
  
  const successfulPages = results.pages.filter(p => p.success).length;
  const successfulAPIs = results.apis.filter(a => a.success).length;
  
  log(`\n📄 Pages: ${successfulPages}/${results.pages.length} passed`, successfulPages === results.pages.length ? 'green' : 'yellow');
  results.pages.forEach(page => {
    const icon = page.success ? '✅' : '❌';
    const color = page.success ? 'green' : 'red';
    log(`  ${icon} ${page.name} (${page.loadTime}ms)`, color);
  });
  
  log(`\n🔌 APIs: ${successfulAPIs}/${results.apis.length} passed`, successfulAPIs === results.apis.length ? 'green' : 'yellow');
  results.apis.forEach(api => {
    const icon = api.success ? '✅' : '❌';
    const color = api.success ? 'green' : 'red';
    log(`  ${icon} ${api.name} - ${api.method} (${api.responseTime}ms)`, color);
  });
  
  if (results.errors.length > 0) {
    log(`\n⚠️  Errors detected: ${results.errors.length}`, 'yellow');
    results.errors.forEach(err => {
      log(`  - ${err.type}: ${err.text || err.message}`, 'yellow');
    });
  } else {
    log('\n✅ No JavaScript errors detected!', 'green');
  }
  
  // Save detailed report
  const reportPath = 'test-report-comprehensive.json';
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'cyan');
  
  // Overall result
  const allPassed = successfulPages === results.pages.length && 
                    successfulAPIs === results.apis.length && 
                    results.errors.length === 0;
  
  if (allPassed) {
    log('\n✨ ALL TESTS PASSED! The Income Magic application is fully functional!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the detailed report for more information.', 'yellow');
  }
  
  log('\n📸 Screenshots saved in ./screenshots/', 'cyan');
  
  // Return exit code
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runComprehensiveTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});