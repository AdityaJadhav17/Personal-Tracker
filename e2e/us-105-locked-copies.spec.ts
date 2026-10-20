import type { Browser, Page } from '@playwright/test';
import { test, expect, TODAY } from './clock';
import { openData, openHome } from './helpers';

/**
 * US-105. Two browser contexts are two devices against the one server on 4190
 * (playwright.config.ts), as in us-101-sync.spec.ts.
 */
const APP = 'http://localhost:4190/';

async function device(browser: Browser) {
  const context = await browser.newContext();
  await context.clock.install({ time: TODAY });
  const page = await context.newPage();
  await page.goto(APP);
  return { context, page };
}

async function syncNow(page: Page) {
  await openData(page);
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await openHome(page);
}

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const noteButton = (page: Page) =>
  page.getByRole('button', { name: /^Sealed copy/ });

test("AC-105.1 a note locked on one device stays locked after sync, and the other device's later edit is not kept", async ({
  browser,
}) => {
  const laptop = await device(browser);
  const phone = await device(browser);

  await nav(laptop.page, 'Notes').click();
  await laptop.page
    .getByRole('button', { name: 'New note', exact: true })
    .click();
  await laptop.page.keyboard.type('Sealed copy');
  await laptop.page.keyboard.press('Enter');
  await laptop.page.keyboard.type('first words');
  await syncNow(laptop.page);

  // The phone gets the readable note, then goes quiet.
  await nav(phone.page, 'Notes').click();
  await expect(async () => {
    await syncNow(phone.page);
    await nav(phone.page, 'Notes').click();
    await expect(noteButton(phone.page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });

  // The laptop locks it and syncs.
  await nav(laptop.page, 'Notes').click();
  await laptop.page
    .getByRole('button', { name: 'Lock note', exact: true })
    .click();
  await laptop.page
    .getByLabel('New passcode', { exact: true })
    .fill('hunter22');
  await laptop.page
    .getByLabel('Confirm passcode', { exact: true })
    .fill('hunter22');
  await laptop.page
    .getByRole('button', { name: 'Lock with this passcode', exact: true })
    .click();
  await expect(
    laptop.page.getByRole('button', { name: 'Remove lock', exact: true }),
  ).toBeVisible();
  await syncNow(laptop.page);

  // The phone, which has not seen the lock, edits the note later, then syncs.
  await noteButton(phone.page).click();
  await phone.page.getByRole('textbox', { name: 'Note', exact: true }).click();
  await phone.page.keyboard.press('Control+End');
  await phone.page.clock.setSystemTime(new Date(TODAY.getTime() + 60 * 60_000));
  await phone.page.keyboard.type(' later words');
  await expect(
    phone.page.getByRole('textbox', { name: 'Note', exact: true }),
  ).toContainText('later words');
  await syncNow(phone.page);
  await syncNow(laptop.page);

  for (const { page } of [laptop, phone]) {
    await page.reload();
    await nav(page, 'Notes').click();
    await expect(noteButton(page)).toContainText('Locked');
    await expect(
      page.getByRole('textbox', { name: 'Note', exact: true }),
    ).toBeHidden();
    await expect(page.getByText('later words')).toHaveCount(0);
  }
});
