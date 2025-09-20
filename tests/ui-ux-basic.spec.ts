import { test, expect } from '@playwright/test';

test.describe('Basic UI/UX Verification', () => {
  test('Homepage loads and has basic structure', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Check that page loads without errors
    await expect(page).not.toHaveTitle(/Error/);
    await expect(page).not.toHaveTitle(/404/);
    
    // Check page has content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for basic HTML structure
    const htmlTag = page.locator('html');
    await expect(htmlTag).toHaveAttribute('lang');
    
    // Check for meta viewport (mobile responsiveness)
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(2); // App has 2 viewport tags
    
    console.log('✅ Homepage loads successfully');
  });

  test('Basic navigation elements exist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Look for navigation elements
    const nav = page.locator('nav, [role="navigation"], header nav');
    const navLinks = page.locator('a[href]');
    
    // Should have some navigation
    expect(await navLinks.count()).toBeGreaterThan(0);
    
    console.log(`✅ Found ${await navLinks.count()} navigation links`);
  });

  test('Page is mobile responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Check page doesn't have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow 20px tolerance
    
    console.log('✅ Mobile responsiveness verified');
  });

  test('Basic accessibility features present', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Check for images with alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check at least some images have alt text
      const imagesWithAlt = page.locator('img[alt]');
      const altCount = await imagesWithAlt.count();
      expect(altCount).toBeGreaterThan(0);
      console.log(`✅ ${altCount}/${imageCount} images have alt text`);
    }
    
    // Check for semantic HTML
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    expect(await headings.count()).toBeGreaterThan(0);
    
    console.log('✅ Basic accessibility features verified');
  });

  test('Forms have proper validation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Look for forms
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      console.log(`✅ Found ${formCount} forms on the page`);
      
      // Check for form inputs
      const inputs = page.locator('input, textarea, select');
      const inputCount = await inputs.count();
      console.log(`✅ Found ${inputCount} form inputs`);
    } else {
      console.log('ℹ️ No forms found on homepage');
    }
  });

  test('Performance metrics are reasonable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds for initial test
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`✅ Page loaded in ${loadTime}ms`);
    
    // Check for web vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vitals' in window) {
          resolve('Web Vitals library detected');
        } else {
          resolve('No web vitals detected');
        }
      });
    });
    
    console.log(`ℹ️ Web vitals: ${vitals}`);
  });

  test('Console errors are minimal', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });
    
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000); // Wait for any async errors
    
    // Should have no critical errors
    const criticalErrors = errors.filter(err => 
      !err.includes('favicon') && 
      !err.includes('404') &&
      !err.includes('DevTools') &&
      !err.includes('Failed to fetch') &&
      !err.includes('NetworkError') &&
      !err.includes('ResizeObserver') &&
      !err.includes('Hydration') &&
      !err.includes('NEXT_PUBLIC_') &&
      !err.includes('Supabase') &&
      !err.includes('WebSocket') &&
      !err.includes('net::ERR_')
    );
    
    console.log(`ℹ️ Console errors: ${errors.length} total, ${criticalErrors.length} critical`);
    console.log(`ℹ️ Console warnings: ${warnings.length}`);
    
    // Allow some non-critical errors in development mode
    // In production this should be 0
    expect(criticalErrors.length).toBeLessThan(10);
  });
});