import type { BrowserContext, Page } from '@playwright/test';
import { test, expect } from './clock';

/**
 * The built app, as 4180 serves it, on a scratch port (playwright.config.ts).
 * A service worker belongs to a production build: on the dev server it would
 * cache modules Vite rewrites on every save.
 */
const APP = 'http://localhost:4190/';

const heading = (page: Page) =>
  page.getByRole('heading', { name: 'Margin', level: 1 });

/** Opened once, and everything it needs kept by the service worker. */
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

async function offline(context: BrowserContext, page: Page) {
  await context.setOffline(true);
  await page.reload();
}

test.afterEach(({ context }) => context.setOffline(false));

test('AC-96.2 and AC-96.3 the built app is Margin, with a manifest and icons', async ({
  page,
  request,
}) => {
  await page.goto(APP);
  await expect(page).toHaveTitle('Margin');
  await expect(heading(page)).toBeVisible();

  const manifest = await request.get(`${APP}manifest.webmanifest`);
  expect(manifest.headers()['content-type']).toBe('application/manifest+json');
  const { name, icons } = (await manifest.json()) as {
    name: string;
    icons: { src: string }[];
  };
  expect(name).toBe('Margin');
  for (const { src } of [...icons, { src: '/icons/apple-touch-icon.png' }]) {
    const icon = await request.get(new URL(src, APP).href);
    expect(icon.headers()['content-type']).toBe('image/png');
  }
});

test('AC-96.4 once opened, the app opens again with no connection', async ({
  page,
  context,
}) => {
  await openedOnce(page);
  await offline(context, page);

  await expect(heading(page)).toBeVisible();
});

test('AC-96.4 a deploy reaches the app on the next open that can reach the server', async ({
  page,
  context,
}) => {
  await openedOnce(page);

  // The server now has a newer page, as after a deploy.
  await context.route(APP, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      '</title>',
      '</title><meta name="deploy" content="next" />',
    );
    await route.fulfill({ response, body });
  });
  await page.reload();
  await expect(page.locator('meta[name="deploy"]')).toHaveCount(1);

  // And that newer page is the one kept for opening offline.
  await context.unroute(APP);
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await (await caches.match('/'))!.text()).includes('name="deploy"'),
      ),
    )
    .toBe(true);
  await offline(context, page);
  await expect(page.locator('meta[name="deploy"]')).toHaveCount(1);
});

test('AC-96.6 opening a file of the app as a page does not replace the offline app', async ({
  page,
  context,
}) => {
  await openedOnce(page);

  // The icon, opened as a page: by hand, or by another site opening it.
  await page.goto(`${APP}icon.svg`);
  // Long enough for the worker to have kept it, had it meant to.
  await page.waitForTimeout(1_000);
  await context.setOffline(true);
  await page.goto(APP);

  await expect(heading(page)).toBeVisible();
});
