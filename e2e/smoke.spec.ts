import { test, expect } from '@playwright/test';

test('the app loads with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Personal Tracker' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the app makes no third-party requests', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(offOrigin).toEqual([]);
});
