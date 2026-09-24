import { test, expect } from '@playwright/test';
import { add } from './helpers';

test('AC-05.1 marking done removes the item from its group', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await add(page, 'Laundry');

  await page.getByRole('button', { name: 'Mark Rent done' }).click();

  await expect(page.getByText('Rent', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Laundry', { exact: true })).toBeVisible();
});

test('AC-05.1 done survives a real reload', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');

  await page.getByRole('button', { name: 'Mark Rent done' }).click();
  await page.reload();

  await expect(page.getByText('Rent', { exact: true })).toHaveCount(0);
});

test('AC-05.2 pressing u restores the item to its group', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');

  await page.getByRole('button', { name: 'Mark Rent done' }).click();
  await expect(page.getByText('Nothing due yet.')).toBeVisible();

  await page.keyboard.press('u');

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
  // US-57. Back under today, where it was due.
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
});

test('AC-05.2 an undone item is still gone-free after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');

  await page.getByRole('button', { name: 'Mark Rent done' }).click();
  await page.keyboard.press('u');
  await page.reload();

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
});

test('AC-05.2 typing u in the title field does not undo', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');
  await page.getByRole('button', { name: 'Mark Rent done' }).click();

  await page.getByLabel('Title', { exact: true }).click();
  await page.keyboard.type('Tuesday');

  await expect(page.getByText('Rent', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Tuesday',
  );
});

test('AC-05.3 add an item and finish it without touching the mouse', async ({
  page,
}) => {
  await page.goto('/');

  // A native date control takes locale-ordered digits, not an ISO string, so
  // this is what a keyboard user really presses: month, day, year.
  const today = new Date();
  const digits =
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0') +
    String(today.getFullYear());

  await page.getByLabel('Title', { exact: true }).click();
  await page.keyboard.type('Rent');
  await page.keyboard.press('Tab');
  await page.keyboard.type(digits);
  await page.keyboard.press('Enter');

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();

  // Tab count is not asserted on purpose: Chromium exposes each segment of the
  // date and time controls as its own stop, so a fixed number would encode a
  // browser detail. What AC-05.3 needs is that the control is reachable.
  const done = page.getByRole('button', { name: 'Mark Rent done' });
  await page.getByLabel('Title', { exact: true }).focus();
  for (let i = 0; i < 20; i += 1) {
    if (await done.evaluate((node) => node === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(done).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByText('Nothing due yet.')).toBeVisible();
});
