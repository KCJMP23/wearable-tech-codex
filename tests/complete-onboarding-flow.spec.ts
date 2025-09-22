import { test, expect, Page } from '@playwright/test';

test.describe('Complete Onboarding Flow - End-to-End Test', () => {
  
  test('Full onboarding journey with screenshots and error detection', async ({ page }) => {
    console.log('🚀 Starting comprehensive onboarding flow test...');
    
    // Step 1: Navigate to onboarding page
    console.log('📍 Step 1: Navigating to onboarding page...');
    await page.goto('/onboarding', { waitUntil: 'networkidle' });
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'test-results/01-onboarding-page-initial.png', fullPage: true });
    
    // Check for any console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    // Check for any network errors
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
        console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
      }
    });
    
    // Step 2: Examine page content and elements
    console.log('🔍 Step 2: Examining page elements...');
    
    // Check page title
    const pageTitle = await page.title();
    console.log(`   Page title: ${pageTitle}`);
    
    // Check if error page is showing
    const errorIndicators = await page.locator('text=/error|500|failed/i').count();
    if (errorIndicators > 0) {
      console.log(`❌ Error indicators found on page: ${errorIndicators}`);
      await page.screenshot({ path: 'test-results/01-error-page-detected.png', fullPage: true });
    }
    
    // Look for main heading
    const mainHeading = await page.locator('h1').first().textContent();
    console.log(`   Main heading: ${mainHeading}`);
    
    // Step 3: Find and examine form elements
    console.log('📝 Step 3: Examining form elements...');
    
    const allInputs = await page.locator('input').count();
    console.log(`   Found ${allInputs} input fields`);
    
    const allButtons = await page.locator('button').count();
    console.log(`   Found ${allButtons} buttons`);
    
    // List all input fields
    for (let i = 0; i < Math.min(allInputs, 5); i++) {
      const input = page.locator('input').nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');
      console.log(`   Input ${i+1}: type="${type}", name="${name}", placeholder="${placeholder}"`);
    }
    
    // List all buttons
    for (let i = 0; i < Math.min(allButtons, 5); i++) {
      const button = page.locator('button').nth(i);
      const text = await button.textContent();
      const disabled = await button.isDisabled();
      console.log(`   Button ${i+1}: "${text?.trim()}" (disabled: ${disabled})`);
    }
    
    // Step 4: Try to find the specific onboarding form
    console.log('🎯 Step 4: Looking for onboarding form...');
    
    let nicheInput = null;
    let siteNameInput = null;
    let continueButton = null;
    
    // Try different selectors for niche input
    const nicheSelectors = [
      'input[placeholder*="pet" i]',
      'input[placeholder*="niche" i]',
      'input[name="niche"]',
      'input[name="primaryNiche"]',
      'input:first-of-type'
    ];
    
    for (const selector of nicheSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        nicheInput = input;
        console.log(`   ✅ Found niche input with selector: ${selector}`);
        break;
      }
    }
    
    // Try different selectors for site name input
    const siteNameSelectors = [
      'input[placeholder*="site" i]',
      'input[name="siteName"]',
      'input[name="brandName"]',
      'input:nth-of-type(2)'
    ];
    
    for (const selector of siteNameSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible().catch(() => false)) {
        siteNameInput = input;
        console.log(`   ✅ Found site name input with selector: ${selector}`);
        break;
      }
    }
    
    // Try different selectors for continue button
    const buttonSelectors = [
      'button:has-text("Continue to Setup")',
      'button:has-text("Continue")',
      'button[type="submit"]',
      'button:last-of-type'
    ];
    
    for (const selector of buttonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        continueButton = button;
        const buttonText = await button.textContent();
        console.log(`   ✅ Found continue button with selector: ${selector}, text: "${buttonText?.trim()}"`);
        break;
      }
    }
    
    // Take screenshot after element discovery
    await page.screenshot({ path: 'test-results/02-elements-identified.png', fullPage: true });
    
    // Step 5: Test form interaction if elements found
    if (nicheInput && continueButton) {
      console.log('📝 Step 5: Testing form interaction...');
      
      // Test initial button state
      const initiallyDisabled = await continueButton.isDisabled();
      console.log(`   Button initially disabled: ${initiallyDisabled}`);
      
      // Fill niche field
      const testNiche = 'Pet Supplies & Accessories';
      await nicheInput.fill(testNiche);
      console.log(`   ✅ Filled niche field: "${testNiche}"`);
      
      // Fill site name if available
      if (siteNameInput) {
        const testSiteName = 'Pawsome Pet Paradise';
        await siteNameInput.fill(testSiteName);
        console.log(`   ✅ Filled site name field: "${testSiteName}"`);
      }
      
      // Take screenshot after filling form
      await page.screenshot({ path: 'test-results/03-form-filled.png', fullPage: true });
      
      // Check button state after filling
      const afterFillingDisabled = await continueButton.isDisabled();
      console.log(`   Button disabled after filling: ${afterFillingDisabled}`);
      
      // Step 6: Submit form and monitor
      console.log('🚀 Step 6: Submitting form...');
      
      // Set up promise to catch API response
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/onboarding') && response.request().method() === 'POST',
        { timeout: 10000 }
      ).catch(() => null);
      
      // Click the button
      await continueButton.click();
      console.log('   ✅ Button clicked');
      
      // Take screenshot immediately after click
      await page.screenshot({ path: 'test-results/04-after-button-click.png', fullPage: true });
      
      // Wait for response
      const apiResponse = await responsePromise;
      
      if (apiResponse) {
        const status = apiResponse.status();
        console.log(`   API Response Status: ${status}`);
        
        if (status === 200) {
          try {
            const responseData = await apiResponse.json();
            console.log(`   API Response: ${JSON.stringify(responseData)}`);
            
            // Step 7: Check for redirect
            console.log('🎯 Step 7: Checking for redirect...');
            
            // Wait for URL change
            await page.waitForLoadState('networkidle', { timeout: 10000 });
            
            const currentUrl = page.url();
            console.log(`   Current URL after submission: ${currentUrl}`);
            
            // Take screenshot of result page
            await page.screenshot({ path: 'test-results/05-after-submission.png', fullPage: true });
            
            // Check if we're on a success page
            const successIndicators = await page.locator('text=/success|congratulations|created|ready/i').count();
            console.log(`   Success indicators found: ${successIndicators}`);
            
            if (successIndicators > 0) {
              console.log('   ✅ Success page detected');
              
              // Look for specific success messages
              const successMessages = await page.locator('text=/pet store|site.*created|congratulations/i').all();
              for (const msg of successMessages) {
                const text = await msg.textContent();
                console.log(`   Success message: "${text?.trim()}"`);
              }
            } else {
              console.log('   ❌ No success indicators found');
              
              // Check if still on onboarding page
              if (currentUrl.includes('onboarding')) {
                console.log('   ❌ Still on onboarding page - submission may have failed');
              }
              
              // Check for error messages
              const errorMessages = await page.locator('text=/error|failed|try again/i').all();
              for (const msg of errorMessages) {
                const text = await msg.textContent();
                console.log(`   Error message: "${text?.trim()}"`);
              }
            }
            
          } catch (e) {
            console.log(`   ❌ Failed to parse API response: ${e}`);
          }
        } else {
          console.log(`   ❌ API returned error status: ${status}`);
        }
      } else {
        console.log('   ❌ No API response received within timeout');
      }
      
    } else {
      console.log('❌ Step 5: Could not find required form elements');
      console.log(`   Niche input found: ${!!nicheInput}`);
      console.log(`   Continue button found: ${!!continueButton}`);
      
      // Take screenshot of current state
      await page.screenshot({ path: 'test-results/05-missing-elements.png', fullPage: true });
      
      // Try to find what's actually on the page
      const bodyText = await page.locator('body').textContent();
      console.log(`   Page content preview: ${bodyText?.substring(0, 500)}...`);
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/06-test-complete.png', fullPage: true });
    
    // Step 8: Summary and error report
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Console Errors: ${consoleErrors.length}`);
    console.log(`   Network Errors: ${networkErrors.length}`);
    console.log(`   Form Elements Found: ${!!nicheInput && !!continueButton}`);
    
    if (consoleErrors.length > 0) {
      console.log('\n❌ CONSOLE ERRORS:');
      consoleErrors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
    }
    
    if (networkErrors.length > 0) {
      console.log('\n❌ NETWORK ERRORS:');
      networkErrors.forEach((error, i) => console.log(`   ${i+1}. ${error}`));
    }
  });
});