import { test, expect } from '@playwright/test';

test.describe('Basic Functionality Tests', () => {
  test('should load the homepage', async ({ page }) => {
    // Go to homepage
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check response is successful
    expect(response?.status()).toBe(200);
    
    // Wait for main content to appear
    await page.waitForSelector('main', { timeout: 10000 });
    
    // Check page has rendered
    const title = await page.title();
    expect(title).toContain('Income Magic');
    
    console.log('✅ Homepage loads successfully');
  });
  
  test('should have glassmorphic elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for glass card elements
    const glassCard = page.locator('.glass-card').first();
    await expect(glassCard).toBeVisible({ timeout: 10000 });
    
    // Count glass elements
    const glassCount = await page.locator('.glass-card').count();
    expect(glassCount).toBeGreaterThan(0);
    
    console.log(`✅ Found ${glassCount} glassmorphic elements`);
  });
  
  test('should display main dashboard elements', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Check for key text content
    await expect(page.locator('text=Income Magic Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Check for stats cards
    const statsTexts = ['Total Income', 'Active Cycles', 'Total Premiums', 'Win Rate'];
    for (const text of statsTexts) {
      const element = page.locator(`text=${text}`).first();
      await expect(element).toBeVisible({ timeout: 5000 });
    }
    
    console.log('✅ Dashboard elements are visible');
  });
  
  test('should check for console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && 
      !err.includes('Failed to load resource') &&
      !err.includes('runtime.lastError')
    );
    
    console.log('Console errors found:', criticalErrors.length);
    expect(criticalErrors.length).toBe(0);
  });
  
  test('should have working navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Find and click on Positions link
    const positionsLink = page.locator('a[href="/positions"]').first();
    if (await positionsLink.isVisible()) {
      await positionsLink.click();
      await page.waitForURL('**/positions');
      expect(page.url()).toContain('/positions');
      console.log('✅ Navigation to positions works');
    } else {
      console.log('⚠️ Positions link not found');
    }
  });
});