import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TEST_TENANT = 'nectarheat';

// Helper functions
async function checkPagePerformance(page: Page, url: string, maxLoadTime: number = 3000) {
  const startTime = Date.now();
  await page.goto(url);
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(maxLoadTime);
  return loadTime;
}

async function checkAccessibility(page: Page) {
  // Check for alt text on images
  const images = await page.$$('img');
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }

  // Check for proper heading hierarchy
  const h1Count = await page.$$eval('h1', elements => elements.length);
  expect(h1Count).toBeGreaterThan(0);
  expect(h1Count).toBeLessThanOrEqual(1);

  // Check for keyboard navigation
  await page.keyboard.press('Tab');
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBeTruthy();
}

async function testAllLinks(page: Page) {
  const links = await page.$$eval('a[href]', links => 
    links.map(link => ({
      href: (link as HTMLAnchorElement).href,
      text: (link as HTMLAnchorElement).innerText
    }))
  );

  for (const link of links) {
    if (link.href.startsWith('http') && !link.href.includes('localhost')) {
      continue; // Skip external links in tests
    }
    
    const response = await page.goto(link.href, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await page.goBack();
  }
}

// Test Suites

test.describe('Critical User Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('First-time visitor can navigate and understand the platform', async ({ page }) => {
    // Check homepage loads
    await expect(page).toHaveTitle(/Wearable Tech/);
    
    // Check hero section is visible
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toBeVisible();

    // Check navigation menu
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Check for value proposition
    const valueProposition = page.locator('text=/compare|review|guide/i');
    await expect(valueProposition).toBeVisible();

    // Check CTA buttons
    const cta = page.locator('button:has-text("Get Started"), a:has-text("Get Started")').first();
    await expect(cta).toBeVisible();
  });

  test('Product discovery journey works end-to-end', async ({ page }) => {
    // Navigate to products page
    await page.click('a:has-text("Products")');
    await expect(page).toHaveURL(/\/products/);

    // Check product grid loads
    const productGrid = page.locator('[data-testid="product-grid"]');
    await expect(productGrid).toBeVisible();

    // Apply a filter
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      const priceFilter = page.locator('input[type="range"], select[name="price"]').first();
      if (await priceFilter.isVisible()) {
        await priceFilter.fill('500');
      }
    }

    // Click on a product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Check product detail page
    await expect(page).toHaveURL(/\/products\//);
    const productTitle = page.locator('h1');
    await expect(productTitle).toBeVisible();

    // Check for key product elements
    const price = page.locator('[data-testid="product-price"]');
    await expect(price).toBeVisible();

    const buyButton = page.locator('a:has-text("Check Price"), button:has-text("Buy")').first();
    await expect(buyButton).toBeVisible();
  });

  test('Comparison shopping flow functions correctly', async ({ page }) => {
    // Navigate to products
    await page.goto(`${BASE_URL}/${TEST_TENANT}/products`);

    // Add products to comparison
    const compareButtons = page.locator('button:has-text("Compare")');
    const count = await compareButtons.count();
    
    if (count >= 2) {
      await compareButtons.nth(0).click();
      await compareButtons.nth(1).click();

      // Go to comparison page
      const compareLink = page.locator('a:has-text("View Comparison")');
      if (await compareLink.isVisible()) {
        await compareLink.click();
        
        // Check comparison table
        const comparisonTable = page.locator('table, [data-testid="comparison-table"]');
        await expect(comparisonTable).toBeVisible();
      }
    }
  });

  test('Newsletter subscription flow works', async ({ page }) => {
    // Look for newsletter section
    const newsletterSection = page.locator('[data-testid="newsletter"], form:has-text("Newsletter")');
    
    if (await newsletterSection.isVisible()) {
      const emailInput = newsletterSection.locator('input[type="email"]');
      await emailInput.fill('test@example.com');
      
      const submitButton = newsletterSection.locator('button[type="submit"]');
      await submitButton.click();

      // Check for success message
      const successMessage = page.locator('text=/success|subscribed|thank/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Onboarding Flow Tests', () => {
  test('Complete onboarding wizard successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`);

    // Step 1: Brand Setup
    await page.fill('input[name="brandName"]', 'Test Brand');
    await page.fill('input[name="domain"]', 'test-brand');
    await page.fill('input[name="tagline"]', 'Your trusted wearable tech source');
    await page.click('button:has-text("Next")');

    // Step 2: Niche Selection
    await page.selectOption('select[name="primaryNiche"]', 'smartwatches');
    await page.selectOption('select[name="targetAudience"]', 'tech');
    await page.selectOption('select[name="priceRange"]', 'all');
    await page.click('button:has-text("Next")');

    // Step 3: Visual Theme
    await page.selectOption('select[name="theme"]', 'modern');
    await page.selectOption('select[name="primaryColor"]', 'blue');
    await page.click('button:has-text("Next")');

    // Step 4: Content Strategy
    await page.selectOption('select[name="contentTypes"]', 'reviews');
    await page.selectOption('select[name="publishingFrequency"]', 'weekly');
    await page.click('button:has-text("Next")');

    // Step 5: Initial Products
    await page.selectOption('select[name="productImportMethod"]', 'auto');
    await page.selectOption('select[name="initialProductCount"]', '25');
    
    // Complete onboarding
    await page.click('button:has-text("Launch Site")');

    // Check redirect to admin
    await expect(page).toHaveURL(/\/admin\//);
  });
});

test.describe('Admin Dashboard Tests', () => {
  test('Admin dashboard loads with correct metrics', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/${TEST_TENANT}`);

    // Check dashboard elements
    const dashboard = page.locator('[data-testid="admin-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Check for metrics cards
    const metricsCards = page.locator('[data-testid="metric-card"]');
    expect(await metricsCards.count()).toBeGreaterThan(0);

    // Check navigation sidebar
    const sidebar = page.locator('aside, [data-testid="admin-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test('Product management interface works', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/${TEST_TENANT}/products`);

    // Check product list
    const productList = page.locator('[data-testid="product-list"], table');
    await expect(productList).toBeVisible();

    // Check import button
    const importButton = page.locator('button:has-text("Import")');
    await expect(importButton).toBeVisible();
  });

  test('Content management interface loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/${TEST_TENANT}/posts`);

    // Check posts list
    const postsList = page.locator('[data-testid="posts-list"], table');
    await expect(postsList).toBeVisible();

    // Check create button
    const createButton = page.locator('button:has-text("Create"), a:has-text("New Post")');
    await expect(createButton.first()).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('Homepage loads within performance budget', async ({ page }) => {
    const metrics = await page.goto(`${BASE_URL}/${TEST_TENANT}`, {
      waitUntil: 'networkidle'
    }).then(() => page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        FCP: perfData.loadEventEnd - perfData.fetchStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart
      };
    }));

    expect(metrics.FCP).toBeLessThan(1500); // First Contentful Paint < 1.5s
    expect(metrics.domContentLoaded).toBeLessThan(3000); // DOM Content Loaded < 3s
    expect(metrics.loadComplete).toBeLessThan(5000); // Full page load < 5s
  });

  test('Product page loads within performance budget', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}/products`);
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    const productUrl = await firstProduct.getAttribute('href') || '';
    
    if (productUrl) {
      const loadTime = await checkPagePerformance(page, productUrl, 3000);
      expect(loadTime).toBeLessThan(3000);
    }
  });
});

test.describe('Mobile Responsive Tests', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('Mobile navigation works correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);

    // Check hamburger menu is visible
    const hamburger = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    await expect(hamburger).toBeVisible();

    // Open mobile menu
    await hamburger.click();

    // Check menu items are visible
    const menuItems = page.locator('nav a, [data-testid="mobile-menu-item"]');
    expect(await menuItems.count()).toBeGreaterThan(0);
  });

  test('Product cards are properly sized on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}/products`);

    const productCard = page.locator('[data-testid="product-card"]').first();
    const box = await productCard.boundingBox();
    
    if (box) {
      expect(box.width).toBeLessThan(375); // Should fit within viewport
      expect(box.width).toBeGreaterThan(250); // Should be reasonably sized
    }
  });
});

test.describe('Accessibility Tests', () => {
  test('Homepage meets basic accessibility standards', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);
    await checkAccessibility(page);

    // Check color contrast using axe-core
    // Note: This requires @axe-core/playwright to be installed
    // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation works throughout the site', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);

    // Tab through main navigation
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          text: el?.textContent,
          href: (el as HTMLAnchorElement)?.href
        };
      });
      expect(focusedElement.tag).toBeTruthy();
    }

    // Test Enter key activation
    await page.keyboard.press('Enter');
    // Should navigate to a new page or trigger an action
  });
});

test.describe('Error Handling Tests', () => {
  test('404 page displays correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/non-existent-page-12345`);
    
    const errorMessage = page.locator('h1:has-text("404"), h1:has-text("Not Found")');
    await expect(errorMessage.first()).toBeVisible();

    const homeLink = page.locator('a:has-text("Home"), a:has-text("Go Back")');
    await expect(homeLink.first()).toBeVisible();
  });

  test('Form validation displays appropriate errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/onboarding`);

    // Try to submit without filling required fields
    await page.click('button:has-text("Next")');

    // Check for validation messages
    const validationMessage = page.locator('.error, [role="alert"], :text("required")');
    await expect(validationMessage.first()).toBeVisible();
  });
});

test.describe('SEO and Meta Tags Tests', () => {
  test('Homepage has proper meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);

    // Check title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(60);

    // Check meta description
    const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
    expect(description!.length).toBeLessThan(160);

    // Check Open Graph tags
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content'));
    expect(ogTitle).toBeTruthy();

    const ogImage = await page.$eval('meta[property="og:image"]', el => el.getAttribute('content'));
    expect(ogImage).toBeTruthy();
  });

  test('Product pages have structured data', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}/products`);
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Check for JSON-LD structured data
    const structuredData = await page.$eval('script[type="application/ld+json"]', el => el.textContent);
    expect(structuredData).toBeTruthy();
    
    const jsonLd = JSON.parse(structuredData!);
    expect(jsonLd['@type']).toContain('Product');
  });
});

test.describe('Integration Tests', () => {
  test('Search functionality returns relevant results', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('smartwatch');
      await searchInput.press('Enter');

      // Wait for results
      await page.waitForTimeout(1000);

      // Check for search results
      const results = page.locator('[data-testid="search-result"], [data-testid="product-card"]');
      expect(await results.count()).toBeGreaterThan(0);
    }
  });

  test('Filter and sort functionality works', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}/products`);

    // Test sort functionality
    const sortSelect = page.locator('select[name="sort"], button:has-text("Sort")').first();
    if (await sortSelect.isVisible()) {
      if (sortSelect.locator('select').isVisible()) {
        await sortSelect.selectOption({ label: 'Price: Low to High' });
      } else {
        await sortSelect.click();
        await page.click('text="Price: Low to High"');
      }

      // Wait for products to re-sort
      await page.waitForTimeout(1000);

      // Verify products are displayed
      const products = page.locator('[data-testid="product-card"]');
      expect(await products.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Cross-Browser Compatibility', () => {
  // These tests would typically run on different browsers via playwright.config.ts
  test('Site renders correctly on Chrome', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only test');
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);
    await expect(page).toHaveScreenshot('homepage-chrome.png');
  });

  test('Site renders correctly on Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-only test');
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);
    await expect(page).toHaveScreenshot('homepage-firefox.png');
  });

  test('Site renders correctly on Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-only test');
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);
    await expect(page).toHaveScreenshot('homepage-safari.png');
  });
});

// Comprehensive link checking test (runs last due to time consumption)
test.describe('Comprehensive Link Validation', () => {
  test.slow(); // Mark as slow test

  test('All internal links are functional', async ({ page }) => {
    await page.goto(`${BASE_URL}/${TEST_TENANT}`);
    await testAllLinks(page);
  });
});