import { test, expect } from '@playwright/test';

test('Debug console errors', async ({ page }) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Capture console messages
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log('ERROR:', text);
    } else if (msg.type() === 'warning') {
      warnings.push(text);
      console.log('WARNING:', text);
    }
  });

  // Also capture page errors
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000); // Wait for any async errors

  console.log('\n=== CONSOLE ERROR SUMMARY ===');
  console.log('Total Errors:', errors.length);
  console.log('Total Warnings:', warnings.length);
  
  console.log('\n=== ALL ERRORS ===');
  errors.forEach((err, i) => {
    console.log(`${i + 1}. ${err}`);
  });
  
  console.log('\n=== ALL WARNINGS ===');
  warnings.forEach((warn, i) => {
    console.log(`${i + 1}. ${warn}`);
  });
});