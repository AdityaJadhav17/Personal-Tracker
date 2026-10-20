import type { Page } from '@playwright/test';
import { test, expect } from './clock';

const APP = 'http://localhost:4190/';

const heading = (page: Page) =>
  page.getByRole('heading', { name: 'Margin', level: 1 });

/** Open once online, so the worker controls the page and has kept it. */
async function openedOnce(page: Page) {
  await page.goto(APP);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const kept = await caches.match('/');
        return (
          kept !== undefined && navigator.serviceWorker.controller !== null
        );
      }),
    )
    .toBe(true);
}

test('AC-103.1 with the laptop not answering, the kept app opens within seconds', async ({
  page,
  context,
}) => {
  await openedOnce(page);
  // As a sleeping laptop over Tailscale: the request is sent, nothing answers.
  await context.route(APP, () => {});
  const started = Date.now();
  await page.reload();
  await expect(heading(page)).toBeVisible();
  expect(Date.now() - started).toBeLessThan(6_000);
});
