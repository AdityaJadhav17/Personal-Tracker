import { test, expect } from '@playwright/test';
import { add, open } from './helpers';

test('AC-06.1 a note survives a real reload', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');
  await open(page, 'Rent');

  await page.getByLabel('Note for Rent').fill('Zelle, not Venmo');
  await page.getByLabel('Note for Rent').blur();
  await page.reload();
  await open(page, 'Rent');

  await expect(page.getByLabel('Note for Rent')).toHaveValue(
    'Zelle, not Venmo',
  );
});

test('AC-06.1 a note lands on the item it was typed into', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');
  await add(page, 'Laundry');
  await open(page, 'Laundry');

  await page.getByLabel('Note for Laundry').fill('quarters');
  await page.getByLabel('Note for Laundry').blur();
  await page.reload();

  await open(page, 'Laundry');
  await expect(page.getByLabel('Note for Laundry')).toHaveValue('quarters');
  await open(page, 'Rent');
  await expect(page.getByLabel('Note for Rent')).toHaveValue('');
});

test('AC-06.1 typing alone does not save, blurring does', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');
  await open(page, 'Rent');

  await page.getByLabel('Note for Rent').fill('half typed');
  // No blur. Reloading throws the draft away, which is the documented
  // consequence of writing on blur rather than on every keystroke.
  await page.reload();
  await open(page, 'Rent');

  await expect(page.getByLabel('Note for Rent')).toHaveValue('');
});

test('AC-06.3 a 2000 character note is stored and shown in full', async ({
  page,
}) => {
  const long = 'x'.repeat(2000);

  await page.goto('/');
  await add(page, 'Rent');
  await open(page, 'Rent');

  await page.getByLabel('Note for Rent').fill(long);
  await page.getByLabel('Note for Rent').blur();
  await page.reload();
  await open(page, 'Rent');

  await expect(page.getByLabel('Note for Rent')).toHaveValue(long);
  expect(await page.getByLabel('Note for Rent').inputValue()).toHaveLength(
    2000,
  );
});

test('a note containing markup is stored as text', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });

  await page.goto('/');
  await add(page, 'Rent');
  await open(page, 'Rent');

  await page.getByLabel('Note for Rent').fill('<img src=x onerror=alert(1)>');
  await page.getByLabel('Note for Rent').blur();
  await page.reload();
  await open(page, 'Rent');

  await expect(page.getByLabel('Note for Rent')).toHaveValue(
    '<img src=x onerror=alert(1)>',
  );
  expect(dialogs).toEqual([]);
  expect(await page.locator('img').count()).toBe(0);
});

test('AC-06.1 a note is kept when an item is finished and undone', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await open(page, 'Rent');

  await page.getByLabel('Note for Rent').fill('Zelle, not Venmo');
  await page.getByLabel('Note for Rent').blur();

  await page.getByRole('button', { name: 'Mark Rent done' }).click();
  await page.keyboard.press('u');

  await open(page, 'Rent');
  await expect(page.getByLabel('Note for Rent')).toHaveValue(
    'Zelle, not Venmo',
  );
});
