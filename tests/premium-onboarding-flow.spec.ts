import { test, expect } from '@playwright/test';

test.describe('Premium Onboarding Flow', () => {
  
  test('Complete premium onboarding flow with email capture and user registration', async ({ page }) => {
    console.log('🚀 Testing premium onboarding flow...');
    
    // Step 1: Navigate to onboarding
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Starting URL:', page.url());
    await page.screenshot({ path: 'test-results/01-onboarding-start.png', fullPage: true });
    
    // Verify we see the premium landing page
    await expect(page.locator('text=Launch Your AI-Powered Store')).toBeVisible();
    await expect(page.locator('text=Start Your Free Trial')).toBeVisible();
    
    // Step 2: Email capture
    console.log('✅ Step 1: Email capture');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('button:has-text("Start Your Free Trial")').click();
    
    await page.waitForSelector('text=Create Your Account');
    await page.screenshot({ path: 'test-results/02-account-creation.png', fullPage: true });
    
    // Step 3: Account creation
    console.log('✅ Step 2: Account creation');
    await page.locator('input[placeholder*="full name"]').fill('John Doe');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Create Account")').click();
    
    await page.waitForSelector('text=Tell Us About Your Business');
    await page.screenshot({ path: 'test-results/03-business-info.png', fullPage: true });
    
    // Step 4: Business information
    console.log('✅ Step 3: Business information');
    await page.locator('input[placeholder*="Tech Gadgets Pro"]').fill('Pet Supplies Pro');
    await page.locator('input[placeholder*="https://"]').fill('https://petsuppliespro.com');
    await page.locator('button:has-text("Continue to Store Setup")').click();
    
    await page.waitForSelector('text=Configure Your Store');
    await page.screenshot({ path: 'test-results/04-quiz-start.png', fullPage: true });
    
    // Step 5: Configuration quiz
    console.log('✅ Step 4: Configuration quiz');
    
    // Answer quiz questions
    await page.locator('button:has-text("Health & Wellness")').click();
    await page.locator('button:has-text("Next")').click();
    
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Parents & Families")').click();
    await page.locator('button:has-text("Next")').click();
    
    await page.waitForTimeout(500);
    await page.locator('input[type="range"]').fill('500');
    await page.locator('button:has-text("Next")').click();
    
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Product Reviews")').click();
    await page.locator('button:has-text("Next")').click();
    
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Moderate (1-2 posts/week)")').click();
    await page.locator('button:has-text("Next")').click();
    
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Supervised - Review before publishing")').click();
    await page.locator('button:has-text("Complete Setup")').click();
    
    await page.waitForSelector('text=Choose Your Plan');
    await page.screenshot({ path: 'test-results/05-payment-plans.png', fullPage: true });
    
    // Step 6: Payment plan selection
    console.log('✅ Step 5: Payment plan selection');
    await page.locator('button:has-text("Start Free Trial")').click();
    
    await page.waitForSelector('text=Welcome to Your Store!');
    await page.screenshot({ path: 'test-results/06-completion.png', fullPage: true });
    
    // Step 7: Completion and redirect
    console.log('✅ Step 6: Completion');
    await expect(page.locator('text=Welcome to Your Store!')).toBeVisible();
    await expect(page.locator('text=Account created and verified')).toBeVisible();
    
    // Wait for redirect
    console.log('⏳ Waiting for dashboard redirect...');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    
    const finalUrl = page.url();
    console.log('📍 Final dashboard URL:', finalUrl);
    
    // Step 8: Verify dashboard
    console.log('✅ Step 7: Dashboard verification');
    await expect(page.locator('text=Pet Supplies Pro')).toBeVisible();
    await expect(page.locator('text=Welcome to Your Store Dashboard!')).toBeVisible();
    await expect(page.locator('text=Revenue')).toBeVisible();
    await expect(page.locator('text=Setup Checklist')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/07-final-dashboard.png', fullPage: true });
    
    console.log('\n🎉 PREMIUM ONBOARDING SUCCESS!');
    console.log('   ✅ Email capture works');
    console.log('   ✅ Account creation completed');
    console.log('   ✅ Business information collected');
    console.log('   ✅ Configuration quiz completed');
    console.log('   ✅ Payment plan selected');
    console.log('   ✅ Store setup completed');
    console.log('   ✅ Unique dashboard created');
    console.log('   ✅ Premium Shopify-like UX achieved!');
  });
});