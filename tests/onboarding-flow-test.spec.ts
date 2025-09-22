import { test, expect, Page } from '@playwright/test';

test.describe('Onboarding Flow - Pet Niche Site Creation', () => {
  
  test('Complete onboarding flow: Create pet supplies affiliate site', async ({ page }) => {
    console.log('🐾 Starting onboarding flow test for pet niche...');
    
    // Step 1: Navigate to onboarding page
    console.log('📍 Step 1: Navigating to onboarding page...');
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/01-onboarding-initial.png', fullPage: true });
    
    // Verify onboarding page loaded
    await expect(page).toHaveTitle(/Create Your Affiliate Site|Onboarding/);
    
    // Check for key elements
    const pageTitle = await page.locator('h1').textContent();
    console.log(`   Page title: ${pageTitle}`);
    expect(pageTitle).toContain('Create Your Affiliate Site');
    
    // Step 2: Fill out the niche field (required)
    console.log('📝 Step 2: Filling out niche field...');
    const nicheField = page.locator('input[placeholder*="Pet supplies"]').or(
      page.locator('input').filter({ hasText: /niche/i }).first()
    ).or(
      page.locator('input').first()
    );
    
    await nicheField.fill('Pet Supplies & Accessories');
    console.log('   ✓ Niche filled: Pet Supplies & Accessories');
    
    // Step 3: Fill out optional site name
    console.log('📝 Step 3: Filling out site name...');
    const siteNameField = page.locator('input[placeholder*="suggest"]').or(
      page.locator('input').nth(1)
    );
    
    await siteNameField.fill('Pawsome Pet Paradise');
    console.log('   ✓ Site name filled: Pawsome Pet Paradise');
    
    // Take screenshot before clicking continue
    await page.screenshot({ path: 'test-results/02-form-filled.png' });
    
    // Step 4: Verify the Continue button is enabled
    console.log('🔍 Step 4: Checking Continue button state...');
    const continueButton = page.locator('button', { hasText: 'Continue to Setup' });
    
    await expect(continueButton).toBeVisible();
    await expect(continueButton).toBeEnabled();
    console.log('   ✓ Continue button is visible and enabled');
    
    // Step 5: Click the Continue to Setup button (the main fix!)
    console.log('🚀 Step 5: Clicking Continue to Setup button...');
    
    // Setup network interception to monitor API call
    const apiPromise = page.waitForResponse(response => 
      response.url().includes('/api/onboarding') && response.request().method() === 'POST'
    );
    
    await continueButton.click();
    console.log('   ✓ Button clicked successfully');
    
    // Step 6: Wait for and verify API call
    console.log('⏳ Step 6: Waiting for API call...');
    const apiResponse = await apiPromise;
    const responseData = await apiResponse.json();
    
    console.log(`   API Status: ${apiResponse.status()}`);
    console.log(`   Response: ${JSON.stringify(responseData)}`);
    
    expect(apiResponse.status()).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.tenant).toBeDefined();
    expect(responseData.tenant.name).toBeTruthy();
    console.log('   ✓ API call successful');
    
    // Step 7: Verify redirect to dashboard
    console.log('🎯 Step 7: Verifying redirect to dashboard...');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    expect(currentUrl).toContain('/dashboard');
    console.log('   ✓ Successfully redirected to dashboard');
    
    // Step 8: Verify dashboard content
    console.log('📊 Step 8: Verifying dashboard content...');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'test-results/03-dashboard-success.png', fullPage: true });
    
    // Check for success message
    const successMessage = page.locator('text=/Congratulations/i');
    await expect(successMessage).toBeVisible();
    console.log('   ✓ Success message displayed');
    
    // Check for quick start guide
    const quickStartGuide = page.locator('text=/Quick Start Guide/i');
    await expect(quickStartGuide).toBeVisible();
    console.log('   ✓ Quick start guide displayed');
    
    // Check for stats cards
    const statsCards = page.locator('.bg-white.rounded-lg.shadow');
    const cardCount = await statsCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(3);
    console.log(`   ✓ Found ${cardCount} stats cards`);
    
    // Verify specific stat cards
    await expect(page.locator('text=Products')).toBeVisible();
    await expect(page.locator('text=Conversion Rate')).toBeVisible();
    await expect(page.locator('text=AI Agents')).toBeVisible();
    console.log('   ✓ All expected stat cards present');
    
    // Step 9: Test dashboard navigation
    console.log('🧭 Step 9: Testing dashboard navigation...');
    
    // Check for settings link
    const settingsLink = page.locator('a', { hasText: 'Settings' });
    await expect(settingsLink).toBeVisible();
    console.log('   ✓ Settings link available');
    
    // Check for platform link
    const platformLink = page.locator('a', { hasText: 'View Platform' });
    await expect(platformLink).toBeVisible();
    console.log('   ✓ View Platform link available');
    
    // Step 10: Final success verification
    console.log('✅ Step 10: Final verification...');
    
    // Verify page title
    const dashboardTitle = await page.locator('h1').textContent();
    expect(dashboardTitle).toContain('Dashboard');
    console.log(`   ✓ Dashboard title: ${dashboardTitle}`);
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/04-test-complete.png', fullPage: true });
    
    console.log('\n🎉 === ONBOARDING TEST COMPLETED SUCCESSFULLY ===\n');
    console.log('✅ Verified:');
    console.log('   - Onboarding page loads correctly');
    console.log('   - Form fields can be filled');
    console.log('   - Continue button works (was previously broken!)');
    console.log('   - API call succeeds');
    console.log('   - Dashboard redirect works');
    console.log('   - Success message displays');
    console.log('   - All dashboard elements present');
    console.log('\n🚀 The onboarding UX issue has been FIXED!');
  });

  test('Onboarding form validation', async ({ page }) => {
    console.log('🔒 Testing form validation...');
    
    await page.goto('/onboarding');
    
    // Try to click continue without filling niche (should be disabled/show error)
    const continueButton = page.locator('button', { hasText: 'Continue to Setup' });
    
    // Check if button is initially disabled
    const isInitiallyDisabled = await continueButton.isDisabled();
    console.log(`   Button initially disabled: ${isInitiallyDisabled}`);
    
    if (!isInitiallyDisabled) {
      // Click and check for validation message
      await continueButton.click();
      
      // Should show error message
      const errorMessage = page.locator('text=/Please enter a niche/i');
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
      console.log('   ✓ Validation error displayed correctly');
    } else {
      console.log('   ✓ Button properly disabled when niche is empty');
    }
    
    // Fill niche and verify button becomes enabled
    const nicheField = page.locator('input').first();
    await nicheField.fill('test niche');
    
    await expect(continueButton).toBeEnabled();
    console.log('   ✓ Button becomes enabled after filling niche');
  });

  test('Loading states during onboarding', async ({ page }) => {
    console.log('⏳ Testing loading states...');
    
    await page.goto('/onboarding');
    
    // Fill form
    await page.locator('input').first().fill('Test Pet Supplies');
    await page.locator('input').nth(1).fill('Test Pet Store');
    
    const continueButton = page.locator('button', { hasText: 'Continue to Setup' });
    
    // Click and immediately check for loading state
    await continueButton.click();
    
    // Should show loading text
    const loadingText = page.locator('text=/Creating Your Site/i');
    const hasLoadingState = await loadingText.isVisible().catch(() => false);
    
    if (hasLoadingState) {
      console.log('   ✓ Loading state displayed');
      
      // Button should be disabled during loading
      await expect(continueButton).toBeDisabled();
      console.log('   ✓ Button disabled during loading');
    }
    
    // Wait for completion
    await page.waitForURL('/dashboard', { timeout: 15000 });
    console.log('   ✓ Loading completed successfully');
  });
});