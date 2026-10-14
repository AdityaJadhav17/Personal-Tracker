import type { Browser, Page, Request } from '@playwright/test';
import { test, expect, TODAY } from './clock';
import { add, open, openData, openHome } from './helpers';

/**
 * US-101. Two browser contexts are two devices: separate storage, one server
 * (the built app on 4190, playwright.config.ts). One server and one shared
 * copy serve every test here, so each test uses titles of its own.
 */
const APP = 'http://localhost:4190/';
test.describe.configure({ mode: 'serial' });

async function device(
  browser: Browser,
  onRequest?: (request: Request) => void,
) {
  const context = await browser.newContext();
  await context.clock.install({ time: TODAY });
  if (onRequest) context.on('request', onRequest);
  const page = await context.newPage();
  await page.goto(APP);
  return { context, page };
}

/** "Sync now" in Data, then back to the list. */
async function syncNow(page: Page) {
  await openData(page);
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await openHome(page);
}

/** Sync the device until `check` holds: the other device may not have pushed yet. */
async function syncUntil(page: Page, check: () => Promise<void>) {
  await expect(async () => {
    await syncNow(page);
    await check();
  }).toPass({ timeout: 20_000 });
}

test('AC-101.1 and AC-101.2 added on one device it appears on the other; deleted there, it goes', async ({
  browser,
}) => {
  const laptop = await device(browser);
  const phone = await device(browser);
  await add(laptop.page, 'Sync rent');
  await syncNow(laptop.page);

  const onPhone = phone.page.getByText('Sync rent', { exact: true });
  await syncUntil(phone.page, () =>
    expect(onPhone).toBeVisible({ timeout: 1_000 }),
  );

  await open(phone.page, 'Sync rent');
  await phone.page
    .getByRole('button', { name: 'Delete Sync rent', exact: true })
    .click();
  await syncNow(phone.page);

  const onLaptop = laptop.page.getByText('Sync rent', { exact: true });
  await syncUntil(laptop.page, () =>
    expect(onLaptop).toBeHidden({ timeout: 1_000 }),
  );
});

test('AC-101.1 an edit made while offline reaches the other device once back online', async ({
  browser,
}) => {
  const laptop = await device(browser);
  const phone = await device(browser);
  await add(laptop.page, 'Sync quiz');
  await syncNow(laptop.page);
  await syncUntil(phone.page, () =>
    expect(phone.page.getByText('Sync quiz', { exact: true })).toBeVisible({
      timeout: 1_000,
    }),
  );

  await phone.context.setOffline(true);
  await open(phone.page, 'Sync quiz');
  await phone.page.getByLabel('Title for Sync quiz').fill('Sync final');
  await phone.page.keyboard.press('Enter');
  await expect(phone.page.getByText('Sync final')).toBeVisible();

  await phone.context.setOffline(false);
  await syncNow(phone.page);

  await syncUntil(laptop.page, () =>
    expect(laptop.page.getByText('Sync final', { exact: true })).toBeVisible({
      timeout: 1_000,
    }),
  );
  await expect(laptop.page.getByText('Sync quiz', { exact: true })).toHaveCount(
    0,
  );
});

test('US-101 sync requests stay on the apps own origin', async ({
  browser,
}) => {
  const strays: string[] = [];
  const watch = (request: Request) => {
    const url = request.url();
    if (/^(data|blob|about):/.test(url)) return;
    if (new URL(url).origin !== new URL(APP).origin) strays.push(url);
  };
  const laptop = await device(browser, watch);
  const phone = await device(browser, watch);

  await add(laptop.page, 'Sync lab');
  await syncNow(laptop.page);
  await syncUntil(phone.page, () =>
    expect(phone.page.getByText('Sync lab', { exact: true })).toBeVisible({
      timeout: 1_000,
    }),
  );

  expect(strays).toEqual([]);
});

test('AC-101.5 the Sync line in Data says when the last sync was', async ({
  browser,
}) => {
  const phone = await device(browser);
  await openData(phone.page);
  await phone.page
    .getByRole('button', { name: 'Sync now', exact: true })
    .click();

  await expect(
    phone.page.getByRole('status').filter({ hasText: /^Synced / }),
  ).toBeVisible({ timeout: 20_000 });
});
