import { test, expect } from '@playwright/test';

test.describe('Seasonal Showcase', () => {
  test('displays seasonal recommendations', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3001/nectarheat');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the seasonal showcase section exists
    const seasonalSection = page.locator('text=AI-Powered Seasonal Recommendations');
    await expect(seasonalSection).toBeVisible();
    
    // Check for seasonal content cards - Fall 2025
    const fallCard = page.locator('text=Fall Fitness Revolution');
    const studentCard = page.locator('text=Back to School Tech');
    
    // At least one should be visible (from database)
    const fallVisible = await fallCard.isVisible().catch(() => false);
    const studentVisible = await studentCard.isVisible().catch(() => false);
    
    expect(fallVisible || studentVisible).toBeTruthy();
    
    // Check for the seasonal insights section
    const insightsSection = page.locator('text=Market Trends');
    await expect(insightsSection).toBeVisible();
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'seasonal-showcase.png', fullPage: false });
  });
  
  test('seasonal cards have proper styling and gradients', async ({ page }) => {
    await page.goto('http://localhost:3001/nectarheat');
    await page.waitForLoadState('networkidle');
    
    // Check for gradient backgrounds
    const gradientCard = page.locator('.bg-gradient-to-r').first();
    await expect(gradientCard).toBeVisible();
    
    // Check for hover effects
    const firstCard = page.locator('[class*="hover:scale-105"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.hover();
      // Card should scale on hover
      await page.waitForTimeout(300); // Wait for transition
    }
  });
});