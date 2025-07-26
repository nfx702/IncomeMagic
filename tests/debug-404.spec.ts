import { test, expect } from '@playwright/test';

test.describe('Debug 404 Errors', () => {
  test('should identify 404 resources', async ({ page }) => {
    const failed404s: string[] = [];
    
    // Monitor network responses
    page.on('response', response => {
      if (response.status() === 404) {
        failed404s.push(response.url());
      }
    });
    
    // Navigate to the page
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Log all 404s
    if (failed404s.length > 0) {
      console.log('❌ 404 Resources found:');
      failed404s.forEach(url => {
        console.log(`  - ${url}`);
      });
    } else {
      console.log('✅ No 404 errors found');
    }
    
    // Check specific problematic paths mentioned in the error
    const problematicPaths = [
      '/_next/static/chunks/app/layout.js',
      '/_next/static/chunks/main-app.js',
      '/_next/static/chunks/app-pages-internals.js',
      '/_next/static/chunks/commons.js',
      '/_next/static/chunks/npm.tabler.js',
      '/_next/static/chunks/npm.date-fns.js',
      '/_next/static/chunks/app/positions/page.js'
    ];
    
    for (const path of problematicPaths) {
      const response = await page.request.get(path).catch(() => null);
      if (response && response.status() === 404) {
        console.log(`❌ 404: ${path}`);
      }
    }
    
    // Check if the app is using correct chunk names
    const pageContent = await page.content();
    const scriptTags = await page.locator('script[src*="_next"]').all();
    
    console.log(`\n📦 Found ${scriptTags.length} Next.js script tags`);
    
    for (const script of scriptTags.slice(0, 5)) { // First 5 scripts
      const src = await script.getAttribute('src');
      if (src) {
        console.log(`  Script: ${src}`);
      }
    }
  });
  
  test('should check actual bundle structure', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Get the actual chunk file names from the page
    const chunks = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src*="_next/static/chunks"]'));
      return scripts.map(s => (s as HTMLScriptElement).src);
    });
    
    console.log('\n🔍 Actual chunk files loaded:');
    chunks.forEach(chunk => {
      const filename = chunk.split('/').pop();
      console.log(`  - ${filename}`);
    });
    
    // Check CSS files
    const styles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map(l => (l as HTMLLinkElement).href);
    });
    
    console.log('\n🎨 CSS files loaded:');
    styles.forEach(style => {
      const filename = style.split('/').pop();
      console.log(`  - ${filename}`);
    });
  });
});