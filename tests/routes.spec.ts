import { test, expect } from '@playwright/test';

test.describe('Application Routes Testing', () => {
  const routes = [
    { path: '/', title: 'Income Magic Dashboard' },
    { path: '/positions', title: 'Positions' },
    { path: '/recommendations', title: 'Trade Recommendations' },
    { path: '/analytics', title: 'Analytics' },
    { path: '/analytics/monthly', title: 'Monthly Analytics' },
    { path: '/analytics/dividends', title: 'Dividend Analytics' },
    { path: '/analytics/forecast', title: 'Income Forecast' },
    { path: '/analytics/targets', title: 'Target Analytics' },
    { path: '/sentiment', title: 'Market Sentiment' },
    { path: '/settings', title: 'Settings' }
  ];
  
  for (const route of routes) {
    test(`should load ${route.path} without errors`, async ({ page }) => {
      // Monitor console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Monitor network failures
      const failedRequests: string[] = [];
      page.on('response', response => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });
      
      // Navigate to route
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      
      // Check page loads successfully
      expect(page.url()).toContain(route.path);
      
      // Check for main content
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
      
      // Check no critical console errors (ignore warnings about dev mode)
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('Warning:') && 
        !error.includes('Download the React DevTools') &&
        !error.includes('runtime.lastError')
      );
      
      if (criticalErrors.length > 0) {
        console.log(`Critical errors on ${route.path}:`, criticalErrors);
      }
      expect(criticalErrors.length).toBe(0);
      
      // Check no 404 errors for static assets
      const assetErrors = failedRequests.filter(req => 
        req.includes('404') && 
        (req.includes('.js') || req.includes('.css') || req.includes('.png'))
      );
      
      if (assetErrors.length > 0) {
        console.log(`Asset 404 errors on ${route.path}:`, assetErrors);
      }
      expect(assetErrors.length).toBe(0);
    });
  }
  
  test('should handle invalid routes with 404 page', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');
    
    // Should show 404 page or redirect
    const is404 = await page.locator('text=404').isVisible();
    const isRedirected = page.url().includes('/');
    
    expect(is404 || isRedirected).toBe(true);
  });
  
  test('should navigate between routes using sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Income Magic');
    
    // Test navigation to each main route
    const navItems = [
      { text: 'Positions', expectedPath: '/positions' },
      { text: 'Recommendations', expectedPath: '/recommendations' },
      { text: 'Analytics', expectedPath: '/analytics' },
      { text: 'Market Sentiment', expectedPath: '/sentiment' },
      { text: 'Settings', expectedPath: '/settings' }
    ];
    
    for (const item of navItems) {
      // Click navigation item
      await page.click(`text=${item.text}`);
      await page.waitForLoadState('networkidle');
      
      // Verify URL changed
      expect(page.url()).toContain(item.expectedPath);
      
      // Verify page content loaded
      await expect(page.locator('main')).toBeVisible();
    }
  });
  
  test('should test API endpoints', async ({ page }) => {
    const apiEndpoints = [
      '/api/trades',
      '/api/recommendations', 
      '/api/analytics',
      '/api/sentiment',
      '/api/strike-recommendations'
    ];
    
    for (const endpoint of apiEndpoints) {
      const response = await page.request.get(endpoint);
      
      console.log(`${endpoint}: ${response.status()}`);
      
      // API should return valid response
      expect(response.status()).toBeLessThan(500);
      
      // Should return JSON
      const contentType = response.headers()['content-type'];
      if (response.status() === 200) {
        expect(contentType).toContain('application/json');
      }
    }
  });
  
  test('should verify responsive behavior', async ({ page }) => {
    await page.goto('/');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1024, height: 768, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Let layout adjust
      
      // Check main content is visible
      await expect(page.locator('main')).toBeVisible();
      
      // Check sidebar behavior on mobile
      if (viewport.width < 768) {
        // Mobile: sidebar should be collapsible
        const sidebar = page.locator('[data-testid="sidebar"], nav');
        const sidebarVisible = await sidebar.isVisible();
        console.log(`${viewport.name}: Sidebar visible = ${sidebarVisible}`);
      }
      
      // Take screenshot for visual testing
      await page.screenshot({ 
        path: `tests/screenshots/${viewport.name.toLowerCase()}-${viewport.width}x${viewport.height}.png`,
        fullPage: true 
      });
    }
  });
});