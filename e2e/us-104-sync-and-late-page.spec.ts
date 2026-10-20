import type { Page } from '@playwright/test';
import { test, expect } from './clock';

const APP = 'http://localhost:4190/';
const MARK = '<meta name="margin-e2e" content="late">';

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

const keptPage = (page: Page) =>
  page.evaluate(async () => (await caches.match('/'))?.text() ?? '');

test('AC-104.2 a page that arrives after the kept copy opened is kept for next time', async ({
  page,
  context,
}) => {
  await openedOnce(page);
  expect(await keptPage(page)).not.toContain(MARK);
  // A slow laptop: the page comes, but after the 3 s fallback, and it is newer.
  await context.route(APP, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    const response = await route.fetch();
    const html = (await response.text()).replace('</head>', `${MARK}</head>`);
    await route.fulfill({ response, body: html });
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Margin', level: 1, exact: true }),
  ).toBeVisible();
  await expect.poll(() => keptPage(page), { timeout: 15_000 }).toContain(MARK);
});
