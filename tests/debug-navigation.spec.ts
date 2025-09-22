import { test, expect } from '@playwright/test';

test.describe('Debug Navigation Issue', () => {
  
  test('Debug router navigation with detailed logging', async ({ page }) => {
    console.log('🔍 Starting navigation debug test...');
    
    // Listen to all console messages
    page.on('console', msg => {
      console.log(`BROWSER ${msg.type()}: ${msg.text()}`);
    });
    
    // Listen to page errors
    page.on('pageerror', error => {
      console.log(`PAGE ERROR: ${error.message}`);
    });
    
    // Go to onboarding page
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Fill form
    await page.locator('input').first().fill('Pet Supplies Test');
    
    // Set up navigation promise BEFORE clicking
    const navigationPromise = page.waitForURL('**/platform-dashboard', { timeout: 5000 }).catch(() => null);
    
    // Monitor router calls
    await page.evaluate(() => {
      const originalPush = window.history.pushState;
      window.history.pushState = function(...args) {
        console.log('ROUTER PUSH CALLED:', args);
        return originalPush.apply(this, args);
      };
      
      // Also monitor any router from Next.js
      if (window.next && window.next.router) {
        const originalRouterPush = window.next.router.push;
        window.next.router.push = function(...args) {
          console.log('NEXT ROUTER PUSH CALLED:', args);
          return originalRouterPush.apply(this, args);
        };
      }
    });
    
    // Click button
    const continueButton = page.locator('button:has-text("Continue to Setup")');
    await continueButton.click();
    
    console.log('⏳ Waiting for navigation...');
    
    // Wait for navigation or timeout
    const navigated = await navigationPromise;
    
    if (navigated) {
      console.log('✅ Navigation successful');
    } else {
      console.log('❌ Navigation failed - checking what happened...');
      
      // Wait a bit more and check URL
      await page.waitForTimeout(2000);
      console.log('📍 URL after wait:', page.url());
      
      // Check if there are any error messages
      const errorElements = await page.locator('text=/error|failed/i').count();
      console.log(`🔍 Error elements found: ${errorElements}`);
      
      // Check loading state
      const loadingElements = await page.locator('text=/loading|creating/i').count();
      console.log(`⏳ Loading elements found: ${loadingElements}`);
      
      // Try manual navigation
      console.log('🔄 Trying manual navigation...');
      await page.evaluate(() => {
        window.location.href = '/platform-dashboard';
      });
      
      await page.waitForTimeout(1000);
      console.log('📍 URL after manual navigation:', page.url());
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/debug-navigation-final.png', fullPage: true });
  });
});