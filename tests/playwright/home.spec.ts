import { test, expect } from '@playwright/test';

test('home page has hero', async ({ page }) => {
  await page.goto('/nectarheat');
  await expect(page.getByRole('heading', { name: /nectar & heat/i })).toBeVisible();
});
