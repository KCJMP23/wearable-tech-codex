/**
 * Performance testing script for AffiliateOS
 * Measures Core Web Vitals and other performance metrics
 */

import { chromium } from 'playwright';
import { performanceBudgets } from '../config/performance.js';

const TEST_URLS = [
  'http://localhost:3000/wearable-tech-codex',
  'http://localhost:3000/wearable-tech-codex/products',
  'http://localhost:3000/wearable-tech-codex/blog',
];

const RUNS_PER_URL = 3;

async function measurePerformance(page, url) {
  const metrics = {
    url,
    timestamp: new Date().toISOString(),
    webVitals: {},
    resources: {},
    timing: {},
  };

  // Navigate and wait for load
  await page.goto(url, { waitUntil: 'networkidle' });

  // Collect Core Web Vitals
  const webVitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals = {};
      
      // Get navigation timing
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        vitals.ttfb = nav.responseStart - nav.requestStart;
        vitals.domComplete = nav.domComplete - nav.fetchStart;
        vitals.loadComplete = nav.loadEventEnd - nav.fetchStart;
      }

      // Get paint timing
      const paint = performance.getEntriesByType('paint');
      paint.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          vitals.fcp = entry.startTime;
        }
      });

      // Get largest contentful paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        resolve(vitals);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Fallback if LCP observer doesn't trigger
      setTimeout(() => resolve(vitals), 5000);
    });
  });

  metrics.webVitals = webVitals;

  // Count resources
  const resources = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    const counts = {};
    
    entries.forEach((entry) => {
      const type = entry.initiatorType || 'other';
      counts[type] = (counts[type] || 0) + 1;
    });

    return {
      total: entries.length,
      ...counts,
      totalSize: entries.reduce((acc, e) => acc + e.encodedBodySize, 0),
      cachedCount: entries.filter((e) => e.transferSize === 0).length,
    };
  });

  metrics.resources = resources;

  // Get memory usage (Chrome only)
  const memory = await page.evaluate(() => {
    if ('memory' in performance) {
      const mem = performance.memory;
      return {
        usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1048576),
        totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1048576),
      };
    }
    return null;
  });

  if (memory) metrics.memory = memory;

  // Check against budgets
  metrics.budgetCheck = checkBudgets(metrics);

  return metrics;
}

function checkBudgets(metrics) {
  const results = {
    passed: [],
    failed: [],
  };

  // Check Web Vitals
  Object.entries(performanceBudgets.webVitals).forEach(([key, budget]) => {
    const value = metrics.webVitals[key];
    if (value !== undefined) {
      if (value <= budget) {
        results.passed.push(`${key}: ${value}ms ≤ ${budget}ms ✓`);
      } else {
        results.failed.push(`${key}: ${value}ms > ${budget}ms ✗`);
      }
    }
  });

  // Check resource counts
  Object.entries(performanceBudgets.resources).forEach(([key, budget]) => {
    const resourceType = key === 'scripts' ? 'script' :
                        key === 'stylesheets' ? 'link' :
                        key === 'images' ? 'img' :
                        key === 'fonts' ? 'font' : null;
    
    if (resourceType && metrics.resources[resourceType]) {
      const count = metrics.resources[resourceType];
      if (count <= budget) {
        results.passed.push(`${key}: ${count} ≤ ${budget} ✓`);
      } else {
        results.failed.push(`${key}: ${count} > ${budget} ✗`);
      }
    }
  });

  return results;
}

async function runTests() {
  console.log('🚀 Starting Performance Tests...\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const allResults = [];

  for (const url of TEST_URLS) {
    console.log(`\n📊 Testing: ${url}`);
    console.log('─'.repeat(50));
    
    const urlResults = [];
    
    for (let run = 1; run <= RUNS_PER_URL; run++) {
      console.log(`  Run ${run}/${RUNS_PER_URL}...`);
      const page = await context.newPage();
      
      try {
        const metrics = await measurePerformance(page, url);
        urlResults.push(metrics);
        
        // Print immediate results
        console.log(`    FCP: ${metrics.webVitals.fcp?.toFixed(0)}ms`);
        console.log(`    LCP: ${metrics.webVitals.lcp?.toFixed(0)}ms`);
        console.log(`    TTFB: ${metrics.webVitals.ttfb?.toFixed(0)}ms`);
        console.log(`    Resources: ${metrics.resources.total} (${metrics.resources.cachedCount} cached)`);
      } catch (error) {
        console.error(`    Error: ${error.message}`);
      } finally {
        await page.close();
      }
    }
    
    // Calculate averages
    const avgMetrics = calculateAverages(urlResults);
    allResults.push(avgMetrics);
    
    // Print summary
    console.log(`\n  📈 Average Results:`);
    console.log(`    FCP: ${avgMetrics.webVitals.fcp?.toFixed(0)}ms`);
    console.log(`    LCP: ${avgMetrics.webVitals.lcp?.toFixed(0)}ms`);
    console.log(`    TTFB: ${avgMetrics.webVitals.ttfb?.toFixed(0)}ms`);
    console.log(`    Load Time: ${avgMetrics.webVitals.loadComplete?.toFixed(0)}ms`);
    
    // Budget check
    console.log(`\n  ✅ Passed Budgets:`);
    avgMetrics.budgetCheck.passed.forEach((p) => console.log(`    ${p}`));
    
    if (avgMetrics.budgetCheck.failed.length > 0) {
      console.log(`\n  ❌ Failed Budgets:`);
      avgMetrics.budgetCheck.failed.forEach((f) => console.log(`    ${f}`));
    }
  }

  await browser.close();

  // Print final summary
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 PERFORMANCE TEST SUMMARY');
  console.log('='.repeat(50));
  
  allResults.forEach((result) => {
    console.log(`\n${result.url}`);
    console.log(`  Average Load Time: ${result.webVitals.loadComplete?.toFixed(0)}ms`);
    console.log(`  Cache Hit Rate: ${((result.resources.cachedCount / result.resources.total) * 100).toFixed(1)}%`);
    console.log(`  Budget Score: ${result.budgetCheck.passed.length}/${result.budgetCheck.passed.length + result.budgetCheck.failed.length} passed`);
  });
  
  console.log('\n✨ Performance tests completed!\n');
}

function calculateAverages(results) {
  const avg = {
    url: results[0].url,
    webVitals: {},
    resources: {},
    budgetCheck: { passed: [], failed: [] },
  };

  // Average web vitals
  const vitalKeys = ['fcp', 'lcp', 'ttfb', 'domComplete', 'loadComplete'];
  vitalKeys.forEach((key) => {
    const values = results.map((r) => r.webVitals[key]).filter(Boolean);
    if (values.length > 0) {
      avg.webVitals[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  });

  // Average resources
  const resourceKeys = Object.keys(results[0].resources);
  resourceKeys.forEach((key) => {
    const values = results.map((r) => r.resources[key]).filter((v) => v !== undefined);
    if (values.length > 0) {
      avg.resources[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  });

  // Check budgets on averages
  avg.budgetCheck = checkBudgets(avg);

  return avg;
}

// Run tests
runTests().catch(console.error);