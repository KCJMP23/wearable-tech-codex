import { test, expect } from '@playwright/test';

test.describe('Critical User Journey Tests', () => {
  // Use the running dev server
  const baseURL = 'http://localhost:3001';
  
  test.use({
    baseURL: baseURL,
    // Set shorter timeouts for faster feedback
    actionTimeout: 10000,
    navigationTimeout: 15000,
  });

  test('Critical Path 1: Homepage to Start Trial', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Verify homepage loads
    await expect(page).toHaveTitle(/Wearable Tech Codex/);
    
    // Click Start Free Trial from homepage
    const trialButton = page.getByRole('link', { name: /Start Free Trial/i }).first();
    await trialButton.click();
    
    // Should be on start-trial page
    await expect(page).toHaveURL(/\/start-trial/);
    
    // Fill Step 1: Store Information
    await page.getByPlaceholder('My Awesome Store').fill('Test Store');
    await page.getByPlaceholder('John Doe').fill('Test User');
    
    // Continue to Step 2
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Fill Step 2: Account Setup
    await page.waitForTimeout(500); // Brief wait for step transition
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('Minimum 8 characters').fill('password123');
    
    // Continue to Step 3
    await page.getByRole('button', { name: /Continue/i }).click();
    
    // Step 3: Verify information is displayed
    await page.waitForTimeout(500);
    await expect(page.getByText('Test Store')).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();
    
    console.log('✅ Critical Path 1: Homepage to Start Trial - PASSED');
  });

  test('Critical Path 2: Explore Features and Pricing', async ({ page }) => {
    // Start at features page
    await page.goto('/features');
    
    // Verify features page loads with key content
    await expect(page.getByRole('heading', { name: /Complete E-commerce Platform/i })).toBeVisible();
    
    // Check for AI features section
    await expect(page.getByText(/AI-Powered/i).first()).toBeVisible();
    
    // Navigate to pricing from features page
    await page.getByRole('link', { name: 'Pricing' }).first().click();
    
    // Verify pricing page loads
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole('heading', { name: /Simple, Transparent Pricing/i })).toBeVisible();
    
    // Test pricing toggle functionality
    const toggleButton = page.locator('button').filter({ hasText: /Annual|Monthly/ }).first();
    
    // Get initial starter price
    const starterPrice = page.locator('text=$29').or(page.locator('text=$24')).first();
    const initialPriceText = await starterPrice.textContent();
    
    // Toggle pricing
    await toggleButton.click();
    await page.waitForTimeout(300);
    
    // Verify price changed
    const newPriceText = await starterPrice.textContent();
    expect(initialPriceText).not.toBe(newPriceText);
    
    console.log('✅ Critical Path 2: Features and Pricing - PASSED');
  });

  test('Critical Path 3: Login Flow', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login page loads
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    
    // Test form fields
    const emailField = page.getByPlaceholder('you@example.com');
    const passwordField = page.getByPlaceholder('Enter your password');
    
    await emailField.fill('user@example.com');
    await passwordField.fill('testpassword');
    
    // Test password visibility toggle
    const eyeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await eyeButton.click();
    
    // Password should now be visible (type="text")
    await expect(passwordField).toHaveAttribute('type', 'text');
    
    // Click again to hide
    await eyeButton.click();
    await expect(passwordField).toHaveAttribute('type', 'password');
    
    // Verify social login options are present
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Continue with GitHub')).toBeVisible();
    
    // Check link to start trial
    const trialLink = page.getByRole('link', { name: /Start free trial/i });
    await expect(trialLink).toBeVisible();
    await trialLink.click();
    
    // Should navigate to start-trial page
    await expect(page).toHaveURL(/\/start-trial/);
    
    console.log('✅ Critical Path 3: Login Flow - PASSED');
  });

  test('Critical Path 4: Navigation Consistency', async ({ page }) => {
    const pages = [
      { url: '/', title: /Wearable Tech Codex/ },
      { url: '/features', heading: /Complete E-commerce Platform/i },
      { url: '/pricing', heading: /Simple, Transparent Pricing/i },
      { url: '/examples', heading: /Success Stories/i },
      { url: '/resources', heading: /Everything You Need/i }
    ];
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      
      if (pageInfo.title) {
        await expect(page).toHaveTitle(pageInfo.title);
      } else if (pageInfo.heading) {
        await expect(page.getByRole('heading', { name: pageInfo.heading })).toBeVisible();
      }
      
      // Verify navigation is consistent on each page
      const navLinks = ['Features', 'Pricing', 'Examples', 'Resources'];
      for (const link of navLinks) {
        const navLink = page.getByRole('link', { name: link, exact: true }).first();
        await expect(navLink).toBeVisible();
      }
      
      console.log(`✅ Navigation verified on ${pageInfo.url}`);
    }
    
    console.log('✅ Critical Path 4: Navigation Consistency - PASSED');
  });

  test('Critical Path 5: Examples and Resources', async ({ page }) => {
    // Test Examples page
    await page.goto('/examples');
    
    // Verify success stories are displayed
    const exampleStores = ['TechGear Pro', 'Fashion Forward'];
    for (const store of exampleStores) {
      await expect(page.getByText(store)).toBeVisible();
    }
    
    // Verify revenue metrics are shown
    await expect(page.getByText(/\$\d+K\/mo/).first()).toBeVisible();
    
    // Navigate to Resources
    await page.getByRole('link', { name: 'Resources' }).first().click();
    await expect(page).toHaveURL(/\/resources/);
    
    // Verify resource categories
    await expect(page.getByText('Documentation')).toBeVisible();
    await expect(page.getByText('Video Tutorials')).toBeVisible();
    
    // Test newsletter form
    const emailInput = page.getByPlaceholder('Enter your email');
    await emailInput.fill('newsletter@test.com');
    await expect(emailInput).toHaveValue('newsletter@test.com');
    
    console.log('✅ Critical Path 5: Examples and Resources - PASSED');
  });

  test.afterAll(async () => {
    console.log('\n🎉 All critical user journey tests completed!');
  });
});