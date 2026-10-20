import type { Browser, Page } from '@playwright/test';
import { test, expect, TODAY } from './clock';
import { openData, openHome } from './helpers';

/**
 * US-106. Two browser contexts are two devices against a server of this spec's own
 * on 4191 (playwright.config.ts): no other spec's passcode is in its shared
 * copy, so the passcode here is the first one.
 */
const APP = 'http://localhost:4191/';

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

test('AC-106.2 a passcode that first arrives by sync clears Undo, so a deleted note does not come back readable', async ({
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

  // The laptop sets the first passcode, locks the note and syncs.
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

  // The phone, which has not seen the lock, deletes the note later.
  await noteButton(phone.page).click();
  await phone.page.clock.setSystemTime(new Date(TODAY.getTime() + 60 * 60_000));
  await phone.page
    .getByRole('button', { name: 'Delete note', exact: true })
    .click();
  const undo = phone.page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeVisible();

  // The passcode reaches the phone for the first time: Undo is gone.
  await syncNow(phone.page);
  await expect(undo).toHaveCount(0);

  await syncNow(laptop.page);
  await laptop.page.reload();
  await nav(laptop.page, 'Notes').click();
  await expect(laptop.page.getByText('first words')).toHaveCount(0);
});
