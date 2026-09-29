import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const editor = (page: Page) =>
  page.getByRole('textbox', { name: 'Note', exact: true });

// "Passcode" is inside "New passcode" and "Confirm passcode".
const passcode = (page: Page) => page.getByLabel('Passcode', { exact: true });

async function lockedNote(page: Page) {
  await page.goto('/');
  await nav(page, 'Notes').click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type('Bank details');
  await page.keyboard.press('Enter');
  await page.keyboard.type('PIN 4412');

  await page.getByRole('button', { name: 'Lock note', exact: true }).click();
  await page.getByLabel('New passcode', { exact: true }).fill('hunter22');
  await page.getByLabel('Confirm passcode', { exact: true }).fill('hunter22');
  await page
    .getByRole('button', { name: 'Lock with this passcode', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Remove lock', exact: true }),
  ).toBeVisible();
}

test('AC-82.2, AC-82.3 and AC-82.7 a locked note is unreadable in storage and opens only with the passcode after a reload', async ({
  page,
}) => {
  await lockedNote(page);

  const stored = await page.evaluate(() =>
    localStorage.getItem('personal-tracker/v1'),
  );
  expect(stored).toContain('Bank details');
  expect(stored).not.toMatch(/4412|hunter22/);

  await page.reload();
  await nav(page, 'Notes').click();
  await expect(
    page.getByRole('button', { name: /^Bank details/ }),
  ).toContainText('Locked');
  await expect(editor(page)).toBeHidden();

  // The one that would actually happen: a typo.
  await passcode(page).fill('hunter2');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'That passcode is not right.',
  );
  await expect(editor(page)).toBeHidden();

  await passcode(page).fill('hunter22');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(editor(page)).toHaveText(/^Bank details\s+PIN 4412$/);
});

test('AC-82.4 an edit to an open locked note is kept, still encrypted', async ({
  page,
}) => {
  await lockedNote(page);

  const read = () =>
    page.evaluate(() => localStorage.getItem('personal-tracker/v1'));
  const before = await read();

  await editor(page).click();
  await page.keyboard.press('End');
  await page.keyboard.type('9');
  // Sealing is asynchronous: wait for the stored note to change, then check
  // the change went in encrypted.
  await expect.poll(read).not.toBe(before);
  expect(await read()).not.toMatch(/4412/);

  await page.reload();
  await nav(page, 'Notes').click();
  await passcode(page).fill('hunter22');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(editor(page)).toHaveText(/PIN 44129$/);
});

test('AC-82.3 the lock screen passes a WCAG 2.2 AA scan', async ({ page }) => {
  await lockedNote(page);
  await page.getByRole('button', { name: 'Lock now', exact: true }).click();
  await expect(passcode(page)).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
