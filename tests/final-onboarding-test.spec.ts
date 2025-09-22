import { test, expect } from '@playwright/test';

test.describe('Final Onboarding Flow Verification', () => {
  
  test('Complete onboarding flow with pet niche', async ({ page }) => {
    console.log('🚀 Final onboarding flow test...');
    
    // Step 1: Go to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Starting URL:', page.url());
    
    // Step 2: Fill form
    const nicheInput = page.locator('input').first();
    const continueButton = page.locator('button:has-text("Continue to Setup")');
    
    await nicheInput.fill('Pet Supplies & Accessories');
    console.log('✅ Filled niche field');
    
    // Step 3: Click button and monitor for navigation
    console.log('🚀 Clicking Continue to Setup button...');
    
    // Set up navigation promise
    const navigationPromise = page.waitForURL(url => 
      url.toString().includes('platform-dashboard'), 
      { timeout: 10000 }
    );
    
    await continueButton.click();
    console.log('✅ Button clicked');
    
    // Wait for navigation
    try {
      await navigationPromise;
      console.log('✅ Navigation successful!');
      
      const finalUrl = page.url();
      console.log('📍 Final URL:', finalUrl);
      
      // Verify we're on the dashboard
      expect(finalUrl).toContain('platform-dashboard');
      
      // Wait for page to load and check content
      await page.waitForLoadState('networkidle');
      
      // Look for success indicators
      const successHeading = page.locator('text=/Your Pet Store is Ready/i');
      const successMessage = page.locator('text=/SUCCESS.*Pet Supplies Store is Live/i');
      
      await expect(successHeading).toBeVisible({ timeout: 5000 });
      await expect(successMessage).toBeVisible({ timeout: 5000 });
      
      console.log('✅ Success page content verified');
      
      // Take final screenshot
      await page.screenshot({ path: 'test-results/final-success.png', fullPage: true });
      
      console.log('\n🎉 COMPLETE SUCCESS! Onboarding flow works end-to-end:');
      console.log('   ✅ Form submission works');
      console.log('   ✅ API call succeeds');  
      console.log('   ✅ Redirect to dashboard works');
      console.log('   ✅ Success page displays correctly');
      console.log('   ✅ Premium UX achieved!');
      
    } catch (error) {
      console.log('❌ Navigation failed:', error);
      
      // Take debug screenshot
      await page.screenshot({ path: 'test-results/navigation-failed.png', fullPage: true });
      
      const currentUrl = page.url();
      console.log('📍 Current URL after failed navigation:', currentUrl);
      
      throw error;
    }
  });
});