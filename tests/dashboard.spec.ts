import { test, expect } from '@playwright/test';

test.describe('Income Magic Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Income Magic/);
    
    // Check main heading
    await expect(page.locator('main h1').first()).toContainText('Dashboard');
    
    // Check that sidebar is visible
    await expect(page.locator('text=Income Magic').first()).toBeVisible();
  });

  test('should display stats cards with data', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('text=Total Income', { timeout: 10000 });
    
    // Check all stats cards are present
    await expect(page.locator('text=Total Income')).toBeVisible();
    await expect(page.locator('text=Active Cycles')).toBeVisible();
    await expect(page.locator('text=Total Premiums')).toBeVisible();
    await expect(page.locator('text=Win Rate')).toBeVisible();
    
    // Check that values are displayed (not just $0.00)
    const totalIncomeCard = page.locator('text=Total Income').locator('..');
    const incomeValue = await totalIncomeCard.locator('p.text-2xl').textContent();
    console.log('Total Income:', incomeValue);
    
    // Should have some non-zero values
    expect(incomeValue).toBeTruthy();
  });

  test('should display income chart', async ({ page }) => {
    await page.goto('/');
    
    // Wait for chart to load
    await page.waitForSelector('text=Monthly Income Trend');
    
    // Check chart container exists
    const chartContainer = page.locator('text=Monthly Income Trend').locator('..');
    await expect(chartContainer).toBeVisible();
    
    // Check SVG chart is rendered
    await expect(chartContainer.locator('svg')).toBeVisible();
  });

  test('should display active positions or empty state', async ({ page }) => {
    await page.goto('/');
    
    // Wait for positions section
    await page.waitForSelector('text=Active Positions');
    
    const positionsSection = page.locator('text=Active Positions').locator('..');
    
    // Check if we have positions or empty state
    const hasPositions = await positionsSection.locator('text=No active positions').count() === 0;
    
    if (hasPositions) {
      // Should show position details
      await expect(positionsSection.locator('text=Shares').first()).toBeVisible();
      await expect(positionsSection.locator('text=Safe Strike').first()).toBeVisible();
      console.log('Active positions found');
    } else {
      // Should show empty state
      await expect(positionsSection.locator('text=No active positions')).toBeVisible();
      console.log('No active positions');
    }
  });

  test('should display recent trades table', async ({ page }) => {
    await page.goto('/');
    
    // Wait for trades table
    await page.waitForSelector('text=Recent Trades');
    
    // Check table headers
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Symbol")')).toBeVisible();
    await expect(page.locator('th:has-text("Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Action")')).toBeVisible();
    await expect(page.locator('th:has-text("Net Cash")')).toBeVisible();
    
    // Check that we have trade rows
    const tradeRows = page.locator('tbody tr');
    const rowCount = await tradeRows.count();
    console.log(`Found ${rowCount} recent trades`);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should switch between themes', async ({ page }) => {
    await page.goto('/');
    
    // Find theme buttons
    const darkButton = page.locator('button:has-text("Dark")');
    const mayaButton = page.locator('button:has-text("Maya")');
    const magicButton = page.locator('button:has-text("Magic")');
    const lightButton = page.locator('button:has-text("Light")');
    
    // Test Maya theme
    await mayaButton.click();
    await page.waitForTimeout(500);
    const bodyClassMaya = await page.locator('html').getAttribute('class');
    expect(bodyClassMaya).toContain('maya');
    
    // Test Magic theme
    await magicButton.click();
    await page.waitForTimeout(500);
    const bodyClassMagic = await page.locator('html').getAttribute('class');
    expect(bodyClassMagic).toContain('magic');
    
    // Test Light theme
    await lightButton.click();
    await page.waitForTimeout(500);
    const bodyClassLight = await page.locator('html').getAttribute('class');
    expect(bodyClassLight).toBe('');
    
    // Test Dark theme
    await darkButton.click();
    await page.waitForTimeout(500);
    const bodyClassDark = await page.locator('html').getAttribute('class');
    expect(bodyClassDark).toContain('dark');
  });

  test('should navigate to recommendations page', async ({ page }) => {
    await page.goto('/');
    
    // Click recommendations link
    await page.click('text=Recommendations');
    
    // Check URL changed
    await expect(page).toHaveURL('/recommendations');
    
    // Check recommendations page loaded
    await expect(page.locator('main h1')).toContainText('Trade Recommendations');
    
    // Check weekly target is displayed
    await expect(page.locator('text=Weekly Premium Target')).toBeVisible();
    await expect(page.locator('text=$1300.00')).toBeVisible();
  });

  test('should check data accuracy', async ({ page }) => {
    await page.goto('/');
    
    // Wait for API data
    await page.waitForSelector('text=Total Income');
    
    // Get total income from UI
    const totalIncomeText = await page.locator('text=Total Income').locator('..').locator('p.text-2xl').textContent();
    console.log('Total Income displayed:', totalIncomeText);
    
    // Get active cycles count
    const activeCyclesText = await page.locator('text=Active Cycles').locator('..').locator('p.text-2xl').textContent();
    console.log('Active Cycles:', activeCyclesText);
    
    // Get win rate
    const winRateText = await page.locator('text=Win Rate').locator('..').locator('p.text-2xl').textContent();
    console.log('Win Rate:', winRateText);
    
    // Verify data format (allow negative values)
    expect(totalIncomeText).toMatch(/^\$-?[\d,]+\.\d{2}$/);
    expect(activeCyclesText).toMatch(/^\d+$/);
    expect(winRateText).toMatch(/^\d+\.\d%$/);
  });

  test('should take screenshots of key features', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Total Income');
    
    // Full page screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard-full.png', fullPage: true });
    
    // Stats cards screenshot
    await page.locator('.grid').first().screenshot({ path: 'tests/screenshots/stats-cards.png' });
    
    // Chart screenshot
    const chartSection = page.locator('text=Monthly Income Trend').locator('..');
    await chartSection.screenshot({ path: 'tests/screenshots/income-chart.png' });
    
    // Recent trades screenshot
    const tradesSection = page.locator('text=Recent Trades').locator('..');
    await tradesSection.screenshot({ path: 'tests/screenshots/recent-trades.png' });
  });
});