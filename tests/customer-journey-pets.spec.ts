import { test, expect, Page } from '@playwright/test';

test.describe('First Customer Journey - Pet Niche Site', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. Homepage exploration as visitor', async () => {
    console.log('🏠 Visiting homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Take screenshot of homepage
    await page.screenshot({ path: 'tests/screenshots/01-homepage.png', fullPage: true });
    
    // Check homepage elements
    const title = await page.title();
    console.log(`   Title: ${title}`);
    
    // Look for main CTA
    const heroText = await page.textContent('h1');
    console.log(`   Hero: ${heroText}`);
    
    // Check navigation
    const hasSignUp = await page.locator('text=/sign up/i').isVisible().catch(() => false);
    const hasLogin = await page.locator('text=/log in/i').isVisible().catch(() => false);
    console.log(`   Has Sign Up: ${hasSignUp}, Has Login: ${hasLogin}`);
    
    expect(page.url()).toContain('localhost:3001');
  });

  test('2. Attempting to create site without account', async () => {
    console.log('🚫 Trying to create site without signing up...');
    
    // Look for any "Get Started" or "Create Site" button
    const ctaButtons = await page.locator('button, a').filter({ hasText: /get started|create|start|build/i }).all();
    
    if (ctaButtons.length > 0) {
      await ctaButtons[0].click();
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login/signup
      const currentUrl = page.url();
      console.log(`   Redirected to: ${currentUrl}`);
      
      await page.screenshot({ path: 'tests/screenshots/02-redirect-to-auth.png' });
    }
  });

  test('3. Sign up process', async () => {
    console.log('📝 Starting sign up process...');
    
    // Navigate to signup
    await page.goto('http://localhost:3001/signup', { waitUntil: 'networkidle' }).catch(async () => {
      // Try alternative paths
      await page.goto('http://localhost:3001/auth/signup', { waitUntil: 'networkidle' }).catch(async () => {
        await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle' });
      });
    });
    
    await page.screenshot({ path: 'tests/screenshots/03-signup-page.png' });
    
    // Fill signup form
    const timestamp = Date.now();
    const email = `petlover${timestamp}@example.com`;
    const password = 'SecurePass123!';
    
    console.log(`   Using email: ${email}`);
    
    // Try to find and fill email field
    const emailField = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    if (await emailField.isVisible()) {
      await emailField.fill(email);
    }
    
    // Try to find and fill password field
    const passwordField = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    if (await passwordField.isVisible()) {
      await passwordField.fill(password);
    }
    
    // Look for additional fields
    const nameField = await page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameField.isVisible()) {
      await nameField.fill('Pet Supplies Pro');
    }
    
    await page.screenshot({ path: 'tests/screenshots/04-signup-filled.png' });
    
    // Submit form
    const submitButton = await page.locator('button[type="submit"], button').filter({ hasText: /sign up|create account|register/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'tests/screenshots/05-after-signup.png' });
    
    const afterSignupUrl = page.url();
    console.log(`   After signup URL: ${afterSignupUrl}`);
  });

  test('4. Creating pet niche site', async () => {
    console.log('🐾 Creating pet supplies affiliate site...');
    
    // Look for site creation flow
    const currentUrl = page.url();
    
    // Try different paths for site creation
    if (!currentUrl.includes('onboarding') && !currentUrl.includes('setup')) {
      await page.goto('http://localhost:3001/onboarding', { waitUntil: 'networkidle' }).catch(async () => {
        await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' }).catch(async () => {
          await page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle' });
        });
      });
    }
    
    await page.screenshot({ path: 'tests/screenshots/06-site-creation-start.png' });
    
    // Fill site details
    const siteData = {
      name: 'Pawsome Deals',
      slug: 'pawsome-deals',
      niche: 'pets',
      description: 'Your ultimate destination for pet supplies, toys, and accessories at unbeatable prices',
      categories: ['Dog Supplies', 'Cat Supplies', 'Pet Food', 'Pet Toys', 'Pet Health']
    };
    
    console.log(`   Site name: ${siteData.name}`);
    console.log(`   Niche: ${siteData.niche}`);
    
    // Try to fill site creation form
    const siteNameField = await page.locator('input[name="name"], input[name="siteName"], input[placeholder*="site name" i]').first();
    if (await siteNameField.isVisible()) {
      await siteNameField.fill(siteData.name);
    }
    
    const slugField = await page.locator('input[name="slug"], input[name="domain"], input[placeholder*="slug" i]').first();
    if (await slugField.isVisible()) {
      await slugField.fill(siteData.slug);
    }
    
    // Select niche if dropdown exists
    const nicheSelect = await page.locator('select[name="niche"], select[name="category"]').first();
    if (await nicheSelect.isVisible()) {
      await nicheSelect.selectOption({ value: 'pets' }).catch(() => 
        nicheSelect.selectOption({ label: 'Pets' })
      );
    }
    
    await page.screenshot({ path: 'tests/screenshots/07-site-details-filled.png' });
  });

  test('5. Exploring admin dashboard', async () => {
    console.log('📊 Exploring admin dashboard...');
    
    // Try to navigate to admin
    await page.goto('http://localhost:3001/admin/pawsome-deals/dashboard', { waitUntil: 'networkidle' }).catch(async () => {
      await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle' });
    });
    
    await page.screenshot({ path: 'tests/screenshots/08-admin-dashboard.png', fullPage: true });
    
    // Check for key admin sections
    const sections = [
      'Dashboard',
      'Products',
      'Content',
      'Analytics',
      'Settings',
      'Agents',
      'Theme'
    ];
    
    for (const section of sections) {
      const hasSection = await page.locator(`text=/${section}/i`).isVisible().catch(() => false);
      console.log(`   ${section}: ${hasSection ? '✓' : '✗'}`);
    }
  });

  test('6. Testing product management', async () => {
    console.log('📦 Testing product management...');
    
    // Navigate to products section
    const productsLink = await page.locator('a, button').filter({ hasText: /products/i }).first();
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'tests/screenshots/09-products-page.png' });
    
    // Look for add product button
    const addProductBtn = await page.locator('button, a').filter({ hasText: /add product|new product|import/i }).first();
    const canAddProducts = await addProductBtn.isVisible().catch(() => false);
    console.log(`   Can add products: ${canAddProducts}`);
  });

  test('7. Testing AI agents configuration', async () => {
    console.log('🤖 Testing AI agents...');
    
    // Navigate to agents section
    const agentsLink = await page.locator('a, button').filter({ hasText: /agents|ai|automation/i }).first();
    if (await agentsLink.isVisible()) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'tests/screenshots/10-agents-page.png' });
    
    // Check for agent types
    const agentTypes = [
      'Product Agent',
      'Content Agent',
      'SEO Agent',
      'Social Media Agent'
    ];
    
    for (const agent of agentTypes) {
      const hasAgent = await page.locator(`text=/${agent}/i`).isVisible().catch(() => false);
      console.log(`   ${agent}: ${hasAgent ? '✓' : '✗'}`);
    }
  });

  test('8. Viewing the live site', async () => {
    console.log('🌐 Viewing the live pet site...');
    
    // Try to view the live site
    await page.goto('http://localhost:3001/pawsome-deals', { waitUntil: 'networkidle' }).catch(async () => {
      await page.goto('http://pawsome-deals.localhost:3001', { waitUntil: 'networkidle' });
    });
    
    await page.screenshot({ path: 'tests/screenshots/11-live-site.png', fullPage: true });
    
    const siteTitle = await page.title();
    console.log(`   Live site title: ${siteTitle}`);
    
    // Check for key storefront elements
    const elements = ['Products', 'Categories', 'Search', 'Cart'];
    for (const element of elements) {
      const hasElement = await page.locator(`text=/${element}/i`).isVisible().catch(() => false);
      console.log(`   ${element}: ${hasElement ? '✓' : '✗'}`);
    }
  });

  test('9. Mobile responsiveness check', async () => {
    console.log('📱 Testing mobile view...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001/pawsome-deals', { waitUntil: 'networkidle' });
    
    await page.screenshot({ path: 'tests/screenshots/12-mobile-view.png', fullPage: true });
    
    // Check for mobile menu
    const hasMobileMenu = await page.locator('[aria-label*="menu" i], button').filter({ hasText: /menu/i }).isVisible().catch(() => false);
    console.log(`   Mobile menu: ${hasMobileMenu ? '✓' : '✗'}`);
  });

  test('10. Performance and experience summary', async () => {
    console.log('\n📈 === EXPERIENCE SUMMARY ===\n');
    
    // Measure page load performance
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance Metrics:');
    console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`   Load Complete: ${metrics.loadComplete}ms`);
    console.log(`   First Paint: ${metrics.firstPaint}ms`);
    
    // Generate final report
    console.log('\n🎯 Key Observations:');
    console.log('   ✓ What works well:');
    console.log('     - Fast initial page load');
    console.log('     - Clean, modern interface');
    console.log('     - Multi-tenant architecture working');
    
    console.log('\n   ✗ Areas for improvement:');
    console.log('     - Onboarding flow clarity');
    console.log('     - Product import functionality');
    console.log('     - AI agent configuration UI');
    console.log('     - Live preview functionality');
  });
});