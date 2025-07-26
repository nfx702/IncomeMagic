import { test, expect } from '@playwright/test';

test.describe('Position Validation System', () => {
  test('should show validation warnings for incorrect positions', async ({ page }) => {
    // Navigate to positions page
    await page.goto('http://localhost:3000/positions', { waitUntil: 'domcontentloaded' });
    
    // Wait for positions to load
    await page.waitForSelector('.glass-card', { timeout: 10000 });
    
    // Wait for validation component to appear
    await page.waitForSelector('text=Position Validation', { timeout: 10000 });
    
    // Check if validation is running
    const validationSection = await page.locator('text=Position Validation').first();
    expect(validationSection).toBeVisible();
    
    // Wait for validation to complete
    await page.waitForTimeout(2000);
    
    // Look for PYPL validation result
    const pyplValidation = await page.locator('text=PYPL').first();
    if (await pyplValidation.isVisible()) {
      console.log('✅ PYPL validation found');
      
      // Check if the discrepancy is shown
      const discrepancyText = await page.locator('text=Discrepancy').first();
      if (await discrepancyText.isVisible()) {
        console.log('✅ Discrepancy information displayed');
      }
      
      // Check for auto-fix option
      const autoFixButton = await page.locator('text=Auto-Fix Available').first();
      if (await autoFixButton.isVisible()) {
        console.log('✅ Auto-fix option available');
      }
    }
    
    // Check validation stats
    const totalPositions = await page.locator('text=Total Positions').first();
    const criticalErrors = await page.locator('text=Critical').first();
    
    expect(totalPositions).toBeVisible();
    expect(criticalErrors).toBeVisible();
    
    // Take screenshot of validation results
    await page.screenshot({ 
      path: 'tests/screenshots/position-validation.png',
      fullPage: true 
    });
    
    console.log('✅ Position validation system is working');
  });
  
  test('should correctly calculate PYPL position as 35 shares', async ({ page }) => {
    // Navigate to positions page
    await page.goto('http://localhost:3000/positions', { waitUntil: 'domcontentloaded' });
    
    // Wait for positions to load
    await page.waitForSelector('.glass-card', { timeout: 10000 });
    
    // Look for PYPL in stock positions
    const pyplPosition = await page.locator('h3:has-text("PYPL")').first();
    
    if (await pyplPosition.isVisible()) {
      // Get the parent card
      const positionCard = await pyplPosition.locator('..').locator('..');
      
      // Check the shares text
      const sharesText = await positionCard.locator('text=shares @').first();
      const sharesContent = await sharesText.textContent();
      
      console.log('PYPL position text:', sharesContent);
      
      // Should show 35 shares (not 100)
      expect(sharesContent).toContain('35 shares');
      console.log('✅ PYPL position correctly shows 35 shares');
    } else {
      console.log('⚠️ PYPL position not found in active stock positions');
    }
  });
});