const { chromium } = require('playwright');
const fs = require('fs');

class BrowserErrorTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.errors = [];
    this.warnings = [];
    this.networkErrors = [];
    this.performanceMetrics = [];
    
    this.pagesToTest = [
      { name: 'Dashboard', url: 'http://localhost:3000' },
      { name: 'Analytics', url: 'http://localhost:3000/analytics' },
      { name: 'Analytics Monthly', url: 'http://localhost:3000/analytics/monthly' },
      { name: 'Analytics Forecast', url: 'http://localhost:3000/analytics/forecast' },
      { name: 'Analytics Targets', url: 'http://localhost:3000/analytics/targets' },
      { name: 'Analytics Dividends', url: 'http://localhost:3000/analytics/dividends' },
      { name: 'Positions', url: 'http://localhost:3000/positions' },
      { name: 'Recommendations', url: 'http://localhost:3000/recommendations' },
      { name: 'Settings', url: 'http://localhost:3000/settings' }
    ];
  }

  async initialize() {
    console.log('🚀 Starting comprehensive browser error testing...\n');
    
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
  }

  async testPage(pageInfo) {
    const page = await this.context.newPage();
    const pageErrors = [];
    const pageWarnings = [];
    const pageNetworkErrors = [];
    let performanceMetrics = {};

    try {
      console.log(`🔍 Testing: ${pageInfo.name} (${pageInfo.url})`);

      // Listen for console errors
      page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        
        if (type === 'error') {
          pageErrors.push({
            type: 'Console Error',
            message: text,
            page: pageInfo.name
          });
        } else if (type === 'warning') {
          pageWarnings.push({
            type: 'Console Warning',
            message: text,
            page: pageInfo.name
          });
        }
      });

      // Listen for page errors
      page.on('pageerror', error => {
        pageErrors.push({
          type: 'Page Error',
          message: error.message,
          stack: error.stack,
          page: pageInfo.name
        });
      });

      // Listen for network failures
      page.on('response', response => {
        if (!response.ok() && response.status() >= 400) {
          pageNetworkErrors.push({
            type: 'Network Error',
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            page: pageInfo.name
          });
        }
      });

      // Navigate with timeout and error handling
      const startTime = Date.now();
      
      try {
        await page.goto(pageInfo.url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Wait for page to be fully loaded
        await page.waitForTimeout(2000);
        
        const loadTime = Date.now() - startTime;
        
        // Get performance metrics
        const navigation = await page.evaluate(() => {
          return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]));
        });

        performanceMetrics = {
          page: pageInfo.name,
          loadTime: loadTime,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
          firstContentfulPaint: await page.evaluate(() => {
            const paintEntries = performance.getEntriesByType('paint');
            const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            return fcp ? fcp.startTime : 0;
          })
        };

        // Test theme switching
        console.log(`  ↳ Testing theme switching...`);
        try {
          // Try to find and test theme buttons
          const themeButtons = await page.locator('.theme-toggle-btn').count();
          if (themeButtons > 0) {
            await page.locator('.theme-toggle-btn').first().click();
            await page.waitForTimeout(500);
            console.log(`  ↳ Theme switching: ✅ Working (${themeButtons} themes found)`);
          }
        } catch (themeError) {
          pageWarnings.push({
            type: 'Theme Test Warning',
            message: `Theme switching test failed: ${themeError.message}`,
            page: pageInfo.name
          });
        }

        // Test responsive behavior
        console.log(`  ↳ Testing responsive behavior...`);
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(1000);
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(500);

        console.log(`  ↳ Page loaded successfully in ${loadTime}ms`);
        
        if (pageErrors.length === 0 && pageNetworkErrors.length === 0) {
          console.log(`  ↳ Status: ✅ No errors found`);
        } else {
          console.log(`  ↳ Status: ❌ ${pageErrors.length + pageNetworkErrors.length} errors found`);
        }

      } catch (navigationError) {
        pageErrors.push({
          type: 'Navigation Error',
          message: `Failed to load page: ${navigationError.message}`,
          page: pageInfo.name
        });
        console.log(`  ↳ Status: ❌ Navigation failed: ${navigationError.message}`);
      }

    } catch (error) {
      pageErrors.push({
        type: 'Test Error',
        message: `Test execution failed: ${error.message}`,
        page: pageInfo.name
      });
    } finally {
      await page.close();
    }

    // Store results
    this.errors.push(...pageErrors);
    this.warnings.push(...pageWarnings);
    this.networkErrors.push(...pageNetworkErrors);
    if (Object.keys(performanceMetrics).length > 0) {
      this.performanceMetrics.push(performanceMetrics);
    }

    console.log(`  ↳ Errors: ${pageErrors.length}, Warnings: ${pageWarnings.length}, Network: ${pageNetworkErrors.length}\n`);
    
    return {
      errors: pageErrors,
      warnings: pageWarnings,
      networkErrors: pageNetworkErrors,
      performance: performanceMetrics
    };
  }

  async runAllTests() {
    await this.initialize();

    console.log(`🎯 Testing ${this.pagesToTest.length} pages...\n`);

    for (const pageInfo of this.pagesToTest) {
      await this.testPage(pageInfo);
    }

    await this.generateReport();
    await this.browser.close();
  }

  async generateReport() {
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    const totalNetworkErrors = this.networkErrors.length;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPages: this.pagesToTest.length,
        totalErrors: totalErrors,
        totalWarnings: totalWarnings,
        totalNetworkErrors: totalNetworkErrors,
        status: totalErrors === 0 && totalNetworkErrors === 0 ? 'PASS' : 'FAIL'
      },
      pages: this.pagesToTest.map(page => {
        const pageErrors = this.errors.filter(e => e.page === page.name);
        const pageWarnings = this.warnings.filter(w => w.page === page.name);
        const pageNetworkErrors = this.networkErrors.filter(n => n.page === page.name);
        const pagePerformance = this.performanceMetrics.find(p => p.page === page.name);
        
        return {
          name: page.name,
          url: page.url,
          status: pageErrors.length === 0 && pageNetworkErrors.length === 0 ? 'PASS' : 'FAIL',
          errorCount: pageErrors.length,
          warningCount: pageWarnings.length,
          networkErrorCount: pageNetworkErrors.length,
          performance: pagePerformance || {},
          errors: pageErrors,
          warnings: pageWarnings,
          networkErrors: pageNetworkErrors
        };
      })
    };

    // Write detailed report
    await fs.promises.writeFile(
      '/Users/x/Coding/MagicCode/IncomeMagic/income-magic/browser-test-report.json',
      JSON.stringify(report, null, 2)
    );

    // Generate markdown summary
    const markdown = this.generateMarkdownReport(report);
    await fs.promises.writeFile(
      '/Users/x/Coding/MagicCode/IncomeMagic/income-magic/browser-test-summary.md',
      markdown
    );

    console.log('📊 BROWSER TEST RESULTS');
    console.log('========================');
    console.log(`📄 Pages Tested: ${report.summary.totalPages}`);
    console.log(`❌ Total Errors: ${report.summary.totalErrors}`);
    console.log(`⚠️  Total Warnings: ${report.summary.totalWarnings}`);
    console.log(`🌐 Network Errors: ${report.summary.totalNetworkErrors}`);
    console.log(`🎯 Overall Status: ${report.summary.status}`);
    console.log('');

    // Show page-by-page results
    report.pages.forEach(page => {
      const statusIcon = page.status === 'PASS' ? '✅' : '❌';
      const perfText = page.performance.loadTime ? `(${page.performance.loadTime}ms)` : '';
      console.log(`${statusIcon} ${page.name} ${perfText}`);
      
      if (page.errorCount > 0) {
        console.log(`   ├─ ${page.errorCount} errors`);
      }
      if (page.warningCount > 0) {
        console.log(`   ├─ ${page.warningCount} warnings`);
      }
      if (page.networkErrorCount > 0) {
        console.log(`   └─ ${page.networkErrorCount} network errors`);
      }
    });

    console.log('');
    console.log('📁 Reports saved:');
    console.log('   ├─ browser-test-report.json (detailed)');
    console.log('   └─ browser-test-summary.md (summary)');
  }

  generateMarkdownReport(report) {
    let markdown = `# Browser Test Report\n\n`;
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Pages Tested | ${report.summary.totalPages} |\n`;
    markdown += `| Total Errors | ${report.summary.totalErrors} |\n`;
    markdown += `| Total Warnings | ${report.summary.totalWarnings} |\n`;
    markdown += `| Network Errors | ${report.summary.totalNetworkErrors} |\n`;
    markdown += `| Status | **${report.summary.status}** |\n\n`;

    markdown += `## Page Results\n\n`;
    report.pages.forEach(page => {
      const statusIcon = page.status === 'PASS' ? '✅' : '❌';
      const loadTime = page.performance.loadTime || 'N/A';
      
      markdown += `### ${statusIcon} ${page.name}\n\n`;
      markdown += `- **URL:** ${page.url}\n`;
      markdown += `- **Status:** ${page.status}\n`;
      markdown += `- **Load Time:** ${loadTime}ms\n`;
      markdown += `- **Errors:** ${page.errorCount}\n`;
      markdown += `- **Warnings:** ${page.warningCount}\n`;
      markdown += `- **Network Errors:** ${page.networkErrorCount}\n\n`;

      if (page.errors.length > 0) {
        markdown += `#### Errors\n`;
        page.errors.forEach((error, index) => {
          markdown += `${index + 1}. **${error.type}:** ${error.message}\n`;
        });
        markdown += `\n`;
      }

      if (page.networkErrors.length > 0) {
        markdown += `#### Network Errors\n`;
        page.networkErrors.forEach((error, index) => {
          markdown += `${index + 1}. **${error.status}** ${error.url}\n`;
        });
        markdown += `\n`;
      }
    });

    return markdown;
  }
}

// Run the tests
const tester = new BrowserErrorTester();
tester.runAllTests().catch(console.error);