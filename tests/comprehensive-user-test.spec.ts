import { test, expect } from '@playwright/test';

test.describe('Comprehensive Platform User Testing', () => {
  const baseURL = 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1. Homepage - Navigation and Hero Section', async ({ page }) => {
    await page.goto(baseURL);
    
    // Check page title
    await expect(page).toHaveTitle(/Wearable Tech Codex/);
    
    // Verify main navigation links are present
    const navLinks = ['Features', 'Pricing', 'Examples', 'Resources', 'Login'];
    for (const linkText of navLinks) {
      const link = page.getByRole('link', { name: linkText, exact: true }).first();
      await expect(link).toBeVisible();
    }
    
    // Check for Start Free Trial CTA
    const trialButton = page.getByRole('link', { name: /Start Free Trial/i }).first();
    await expect(trialButton).toBeVisible();
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true });
  });

  test('2. Features Page - Complete Feature Showcase', async ({ page }) => {
    await page.goto(`${baseURL}/features`);
    
    // Check page loaded
    await expect(page.getByRole('heading', { name: /The Complete E-commerce Platform/i })).toBeVisible();
    
    // Verify key features are displayed
    const features = [
      'AI-Powered',
      'Multi-tenant',
      'Analytics',
      'Inventory'
    ];
    
    for (const feature of features) {
      const element = page.getByText(new RegExp(feature, 'i')).first();
      await expect(element).toBeVisible({ timeout: 10000 });
    }
    
    // Check comparison table is present
    await expect(page.getByRole('table')).toBeVisible();
    
    // Verify CTA button
    const ctaButton = page.getByRole('link', { name: /Start Your Free Trial/i });
    await expect(ctaButton).toBeVisible();
    
    await page.screenshot({ path: 'test-results/02-features.png', fullPage: true });
  });

  test('3. Pricing Page - Interactive Pricing Toggle', async ({ page }) => {
    await page.goto(`${baseURL}/pricing`);
    
    // Check pricing page loaded
    await expect(page.getByRole('heading', { name: /Simple, Transparent Pricing/i })).toBeVisible();
    
    // Test monthly/annual toggle
    const toggleButton = page.locator('button').filter({ hasText: /Annual|Monthly/ }).first();
    
    // Get initial price
    const starterPrice = page.locator('text=/\\$\\d+/').first();
    const initialPrice = await starterPrice.textContent();
    
    // Click toggle to switch between monthly/annual
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Check if price changed
    const newPrice = await starterPrice.textContent();
    expect(initialPrice).not.toBe(newPrice);
    
    // Verify all three pricing tiers are displayed
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Professional')).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
    
    // Check for "Most Popular" badge
    await expect(page.getByText('Most Popular')).toBeVisible();
    
    await page.screenshot({ path: 'test-results/03-pricing.png', fullPage: true });
  });

  test('4. Examples Page - Success Stories', async ({ page }) => {
    await page.goto(`${baseURL}/examples`);
    
    // Check examples page loaded
    await expect(page.getByRole('heading', { name: /Success Stories/i })).toBeVisible();
    
    // Verify example cards are displayed
    const exampleStores = ['TechGear Pro', 'Fashion Forward', 'Home Haven', 'FitLife Store'];
    
    for (const store of exampleStores) {
      await expect(page.getByText(store)).toBeVisible();
    }
    
    // Check for revenue metrics
    await expect(page.getByText(/\$\d+K\/mo/)).toBeVisible();
    
    // Verify "View Case Study" links
    const caseStudyLinks = page.getByRole('link', { name: /View Case Study/i });
    const count = await caseStudyLinks.count();
    expect(count).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'test-results/04-examples.png', fullPage: true });
  });

  test('5. Resources Page - Documentation Hub', async ({ page }) => {
    await page.goto(`${baseURL}/resources`);
    
    // Check resources page loaded
    await expect(page.getByRole('heading', { name: /Everything You Need to Succeed/i })).toBeVisible();
    
    // Verify resource categories
    const categories = ['Documentation', 'Video Tutorials', 'Blog & Articles', 'Community', 'Support Center', 'Developer Resources'];
    
    for (const category of categories) {
      await expect(page.getByText(category)).toBeVisible();
    }
    
    // Check newsletter signup form
    const emailInput = page.getByPlaceholder('Enter your email');
    await expect(emailInput).toBeVisible();
    
    const subscribeButton = page.getByRole('button', { name: /Subscribe/i });
    await expect(subscribeButton).toBeVisible();
    
    // Test newsletter form interaction
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    await page.screenshot({ path: 'test-results/05-resources.png', fullPage: true });
  });

  test('6. Login Page - Authentication Form', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    // Check login page loaded
    await expect(page.getByRole('heading', { name: /AffiliateOS/i })).toBeVisible();
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    
    // Verify form fields
    const emailField = page.getByPlaceholder('you@example.com');
    const passwordField = page.getByPlaceholder('Enter your password');
    
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    
    // Test form interaction
    await emailField.fill('user@test.com');
    await passwordField.fill('password123');
    
    // Check password visibility toggle
    const eyeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await eyeButton.click();
    await expect(passwordField).toHaveAttribute('type', 'text');
    
    // Verify social login options
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Continue with GitHub')).toBeVisible();
    
    // Check "Start free trial" link
    const trialLink = page.getByRole('link', { name: /Start free trial/i });
    await expect(trialLink).toBeVisible();
    
    await page.screenshot({ path: 'test-results/06-login.png', fullPage: true });
  });

  test('7. Start Trial Page - Multi-Step Registration', async ({ page }) => {
    await page.goto(`${baseURL}/start-trial`);
    
    // Check trial page loaded
    await expect(page.getByRole('heading', { name: /Start Your Free Trial/i })).toBeVisible();
    
    // Step 1: Store Information
    const storeNameInput = page.getByPlaceholder('My Awesome Store');
    const fullNameInput = page.getByPlaceholder('John Doe');
    
    await expect(storeNameInput).toBeVisible();
    await expect(fullNameInput).toBeVisible();
    
    await storeNameInput.fill('Test Store');
    await fullNameInput.fill('Test User');
    
    // Check store URL preview updates
    await expect(page.getByText(/test-store\.affiliateos\.com/i)).toBeVisible();
    
    // Click Continue to Step 2
    const continueButton = page.getByRole('button', { name: /Continue/i });
    await continueButton.click();
    
    // Step 2: Account Setup
    await page.waitForTimeout(500);
    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Minimum 8 characters');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    // Click Continue to Step 3
    await continueButton.click();
    
    // Step 3: Confirmation
    await page.waitForTimeout(500);
    await expect(page.getByText('Test Store')).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();
    
    // Check terms checkbox
    const termsCheckbox = page.getByRole('checkbox');
    await termsCheckbox.check();
    
    // Verify final CTA
    const startTrialButton = page.getByRole('button', { name: /Start My Trial/i });
    await expect(startTrialButton).toBeVisible();
    
    await page.screenshot({ path: 'test-results/07-start-trial-final.png', fullPage: true });
  });

  test('8. Navigation Flow - Cross-Page Links', async ({ page }) => {
    // Start at homepage
    await page.goto(baseURL);
    
    // Navigate to Features
    await page.getByRole('link', { name: 'Features', exact: true }).first().click();
    await expect(page).toHaveURL(/\/features/);
    await expect(page.getByRole('heading', { name: /Complete E-commerce Platform/i })).toBeVisible();
    
    // Navigate to Pricing
    await page.getByRole('link', { name: 'Pricing', exact: true }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.getByRole('heading', { name: /Simple, Transparent Pricing/i })).toBeVisible();
    
    // Navigate to Examples
    await page.getByRole('link', { name: 'Examples', exact: true }).first().click();
    await expect(page).toHaveURL(/\/examples/);
    await expect(page.getByRole('heading', { name: /Success Stories/i })).toBeVisible();
    
    // Navigate to Resources
    await page.getByRole('link', { name: 'Resources', exact: true }).first().click();
    await expect(page).toHaveURL(/\/resources/);
    await expect(page.getByRole('heading', { name: /Everything You Need/i })).toBeVisible();
    
    // Navigate to Login
    await page.getByRole('link', { name: 'Login', exact: true }).first().click();
    await expect(page).toHaveURL(/\/login/);
    
    // From Login, navigate to Start Trial
    await page.getByRole('link', { name: /Start free trial/i }).click();
    await expect(page).toHaveURL(/\/start-trial/);
    
    // Navigate back to home via logo
    await page.getByRole('link', { name: 'AffiliateOS' }).first().click();
    await expect(page).toHaveURL(baseURL + '/');
  });

  test('9. Mobile Responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test homepage on mobile
    await page.goto(baseURL);
    await page.screenshot({ path: 'test-results/08-mobile-homepage.png', fullPage: true });
    
    // Test pricing page on mobile
    await page.goto(`${baseURL}/pricing`);
    await expect(page.getByRole('heading', { name: /Simple, Transparent Pricing/i })).toBeVisible();
    await page.screenshot({ path: 'test-results/09-mobile-pricing.png', fullPage: true });
    
    // Test login page on mobile
    await page.goto(`${baseURL}/login`);
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await page.screenshot({ path: 'test-results/10-mobile-login.png', fullPage: true });
  });

  test('10. Performance and Loading', async ({ page }) => {
    const metrics: Record<string, number> = {};
    
    // Measure homepage load time
    const startTime = Date.now();
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    metrics.homepage = Date.now() - startTime;
    
    // Measure features page load time
    const featuresStart = Date.now();
    await page.goto(`${baseURL}/features`);
    await page.waitForLoadState('networkidle');
    metrics.features = Date.now() - featuresStart;
    
    // Measure pricing page load time
    const pricingStart = Date.now();
    await page.goto(`${baseURL}/pricing`);
    await page.waitForLoadState('networkidle');
    metrics.pricing = Date.now() - pricingStart;
    
    // Assert all pages load within reasonable time (5 seconds)
    Object.entries(metrics).forEach(([page, loadTime]) => {
      expect(loadTime).toBeLessThan(5000);
      console.log(`${page} loaded in ${loadTime}ms`);
    });
  });
});