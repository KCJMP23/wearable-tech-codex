import { test, expect } from '@playwright/test';

test.describe('Quick Onboarding Test', () => {
  
  test('Test first few steps of premium onboarding', async ({ page }) => {
    console.log('🚀 Quick onboarding test...');
    
    // Step 1: Navigate to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Verify we see the premium landing page
    await expect(page.locator('text=Launch Your AI-Powered Store')).toBeVisible();
    console.log('✅ Premium landing page loads');
    
    // Step 2: Email capture
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button:has-text("Start Your Free Trial")').click();
    
    await page.waitForSelector('text=Create Your Account');
    console.log('✅ Email capture works');
    
    // Step 3: Account creation
    await page.locator('input[placeholder*="full name"]').fill('John Doe');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Create Account")').click();
    
    await page.waitForSelector('text=Tell Us About Your Business');
    console.log('✅ Account creation works');
    
    // Step 4: Business information
    await page.locator('input[placeholder*="Tech Gadgets Pro"]').fill('Pet Supplies Pro');
    await page.locator('button:has-text("Continue to Store Setup")').click();
    
    await page.waitForSelector('text=Configure Your Store');
    console.log('✅ Business info works');
    
    // Quick quiz test - just first question
    await page.locator('button:has-text("Health & Wellness")').click();
    await page.locator('button:has-text("Next")').click();
    
    console.log('✅ Quiz starts successfully');
    
    await page.screenshot({ path: 'test-results/quick-test-success.png', fullPage: true });
    
    console.log('\n🎉 QUICK TEST SUCCESS - Premium onboarding working!');
  });
});