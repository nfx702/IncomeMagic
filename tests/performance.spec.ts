import { test, expect } from '@playwright/test';

test.describe('Performance Testing', () => {
  test('should measure Core Web Vitals', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Total Income', { timeout: 10000 });
    
    // Measure Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          FCP: 0,
          LCP: 0,
          CLS: 0,
          FID: 0,
          TTFB: 0
        };
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals.LCP = entry.startTime;
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals.CLS += entry.value;
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Time to First Byte
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
          vitals.TTFB = navigationEntry.responseStart - navigationEntry.requestStart;
        }
        
        setTimeout(() => resolve(vitals), 3000);
      });
    });
    
    console.log('Web Vitals:', webVitals);
    
    // Assert performance thresholds
    expect(webVitals.FCP).toBeLessThan(2500); // < 2.5s for good FCP
    expect(webVitals.LCP).toBeLessThan(4000); // < 4s for good LCP
    expect(webVitals.CLS).toBeLessThan(0.25); // < 0.25 for good CLS
    expect(webVitals.TTFB).toBeLessThan(800); // < 800ms for good TTFB
  });
  
  test('should check resource loading performance', async ({ page }) => {
    // Monitor network requests
    const resources: any[] = [];
    
    page.on('response', response => {
      resources.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'],
        size: response.headers()['content-length'],
        timing: response.timing()
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for 404 errors
    const failedResources = resources.filter(r => r.status === 404);
    if (failedResources.length > 0) {
      console.log('404 Resources:', failedResources);
    }
    expect(failedResources.length).toBe(0);
    
    // Check for slow resources (>3s)
    const slowResources = resources.filter(r => r.timing && r.timing.responseEnd > 3000);
    console.log('Slow resources (>3s):', slowResources);
    expect(slowResources.length).toBe(0);
    
    // Check JavaScript bundle sizes
    const jsResources = resources.filter(r => 
      r.url.includes('.js') && 
      r.contentType && 
      r.contentType.includes('javascript')
    );
    
    console.log(`JavaScript resources: ${jsResources.length}`);
    jsResources.forEach(js => {
      const sizeKB = js.size ? parseInt(js.size) / 1024 : 0;
      console.log(`${js.url}: ${sizeKB.toFixed(2)}KB`);
      
      // Main bundle should be < 500KB
      if (js.url.includes('main')) {
        expect(sizeKB).toBeLessThan(500);
      }
    });
  });
  
  test('should check glassmorphism rendering performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.glass-card');
    
    // Measure rendering performance for glassmorphic elements
    const glassElementsPerf = await page.evaluate(() => {
      const glassElements = document.querySelectorAll('.glass-card, .glass-input, .glass-bg');
      
      return {
        count: glassElements.length,
        hasBackdropFilter: Array.from(glassElements).every(el => {
          const styles = window.getComputedStyle(el);
          return styles.backdropFilter && styles.backdropFilter !== 'none';
        }),
        hasBorderRadius: Array.from(glassElements).every(el => {
          const styles = window.getComputedStyle(el);
          return parseInt(styles.borderRadius) > 0;
        })
      };
    });
    
    console.log('Glassmorphism elements:', glassElementsPerf);
    
    expect(glassElementsPerf.count).toBeGreaterThan(0);
    expect(glassElementsPerf.hasBackdropFilter).toBe(true);
    expect(glassElementsPerf.hasBorderRadius).toBe(true);
  });
  
  test('should check theme switching performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button:has-text("Dark")');
    
    // Measure theme switching time
    const switchingTimes: number[] = [];
    
    for (const theme of ['Dark', 'Maya', 'Light']) {
      const startTime = Date.now();
      await page.click(`button:has-text("${theme}")`);
      await page.waitForTimeout(100); // Let transition complete
      const endTime = Date.now();
      
      switchingTimes.push(endTime - startTime);
    }
    
    const avgSwitchTime = switchingTimes.reduce((a, b) => a + b) / switchingTimes.length;
    console.log('Theme switching times:', switchingTimes);
    console.log('Average theme switch time:', avgSwitchTime + 'ms');
    
    // Theme switching should be fast (<300ms)
    expect(avgSwitchTime).toBeLessThan(300);
  });
  
  test('should check RadialMultilayerChart performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Options Market View');
    
    // Check if the chart renders without errors
    const chartPerf = await page.evaluate(() => {
      const chartContainer = document.querySelector('text="Options Market View"')?.closest('.glass-card');
      const svgElement = chartContainer?.querySelector('svg');
      
      return {
        hasChart: !!svgElement,
        svgElementCount: svgElement?.children.length || 0,
        chartWidth: svgElement?.getAttribute('width'),
        chartHeight: svgElement?.getAttribute('height')
      };
    });
    
    console.log('RadialMultilayerChart performance:', chartPerf);
    
    expect(chartPerf.hasChart).toBe(true);
    expect(chartPerf.svgElementCount).toBeGreaterThan(0);
    expect(chartPerf.chartWidth).toBe('320');
    expect(chartPerf.chartHeight).toBe('320');
  });
});