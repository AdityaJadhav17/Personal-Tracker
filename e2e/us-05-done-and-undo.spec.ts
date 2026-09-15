import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

async function add(page: Page, title: string, daysFromToday = 0) {
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due').fill(isoDate(daysFromToday));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

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
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
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

  await page.getByLabel('Title').click();
  await page.keyboard.type('Tuesday');

  await expect(page.getByText('Rent', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Title')).toHaveValue('Tuesday');
});

test('AC-05.3 add an item and finish it without touching the mouse', async ({
  page,
}) => {
  await page.goto('/');

  // Whole flow on the keyboard: type, tab, submit, tab to the item, activate.
  await page.getByLabel('Title').click();
  await page.keyboard.type('Rent');
  await page.keyboard.press('Tab');
  await page.keyboard.type(isoDate(0));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();

  await page.getByLabel('Title').focus();
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Mark Rent done' }),
  ).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByText('Nothing due yet.')).toBeVisible();
});
