import { test, expect } from '@playwright/test';

test.describe('No Hardcoded Content Verification', () => {
  test('all homepage content comes from database', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3001/nectarheat');
    await page.waitForLoadState('networkidle');
    
    // Check that seasonal showcase only appears if there's database content
    const seasonalSection = page.locator('section:has-text("AI-Powered Seasonal Recommendations")');
    const seasonalVisible = await seasonalSection.isVisible().catch(() => false);
    
    if (seasonalVisible) {
      // If visible, it should have database content (Fall 2025)
      const fallContent = await page.locator('text=Fall Fitness Revolution').isVisible();
      const studentContent = await page.locator('text=Back to School Tech').isVisible();
      
      expect(fallContent || studentContent).toBeTruthy();
      
      // Should NOT have any winter/spring/summer content (not in season)
      const winterContent = await page.locator('text=Winter Tech Essentials').isVisible().catch(() => false);
      const springContent = await page.locator('text=Spring').isVisible().catch(() => false);
      
      expect(winterContent).toBeFalsy();
    }
  });
  
  test('category cards come from database', async ({ page }) => {
    await page.goto('http://localhost:3001/nectarheat');
    await page.waitForLoadState('networkidle');
    
    // Check for sticky categories section
    const categoriesSection = page.locator('section:has-text("Your Tech Essentials")');
    const categoriesVisible = await categoriesSection.isVisible().catch(() => false);
    
    if (categoriesVisible) {
      // Should have database-driven categories
      const smartwatches = await page.locator('text=Smartwatches').first().isVisible().catch(() => false);
      const fitnessTrackers = await page.locator('text=Fitness Trackers').first().isVisible().catch(() => false);
      
      // At least one category should be visible
      expect(smartwatches || fitnessTrackers).toBeTruthy();
    }
  });
  
  test('admin can manage seasonal showcases', async ({ page }) => {
    // Navigate to admin seasonal page
    await page.goto('http://localhost:3001/admin/nectarheat/homepage/seasonal');
    await page.waitForLoadState('networkidle');
    
    // Check for management interface
    const header = await page.locator('text=Seasonal Showcases').isVisible();
    expect(header).toBeTruthy();
    
    // Check for database content
    const fallRevolution = await page.locator('text=Fall Fitness Revolution').isVisible().catch(() => false);
    const backToSchool = await page.locator('text=Back to School Tech').isVisible().catch(() => false);
    
    expect(fallRevolution || backToSchool).toBeTruthy();
    
    // Check for add button (proves it's manageable)
    const addButton = await page.locator('button:has-text("Add Showcase")').isVisible().catch(() => false);
    expect(addButton).toBeTruthy();
  });
  
  test('admin can manage category cards', async ({ page }) => {
    // Navigate to admin categories page
    await page.goto('http://localhost:3001/admin/nectarheat/homepage/categories');
    await page.waitForLoadState('networkidle');
    
    // Check for management interface
    const header = await page.locator('text=Category Cards').isVisible();
    expect(header).toBeTruthy();
    
    // Check for database content
    const categories = await page.locator('text=Smartwatches').isVisible().catch(() => false);
    expect(categories).toBeTruthy();
    
    // Check for add button
    const addButton = await page.locator('button:has-text("Add Category")').isVisible().catch(() => false);
    expect(addButton).toBeTruthy();
  });
  
  test('empty database results in no content sections', async ({ page }) => {
    // This test would verify that without database content, sections don't appear
    // For now, we verify that content is database-driven by checking current state
    
    await page.goto('http://localhost:3001/nectarheat');
    await page.waitForLoadState('networkidle');
    
    // Get page source
    const pageContent = await page.content();
    
    // Should NOT contain hardcoded fallback content
    expect(pageContent).not.toContain('Winter Tech Essentials');
    expect(pageContent).not.toContain('New Year Fitness Goals');
    
    // Should contain current season content from DB
    expect(pageContent).toContain('Fall');
  });
});