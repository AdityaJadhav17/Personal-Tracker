import { test, expect } from '@playwright/test';

function today(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

test('AC-40.1 the app asks the browser to keep its storage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const real = navigator.storage.persist.bind(navigator.storage);
    navigator.storage.persist = () => {
      (window as unknown as { asked: boolean }).asked = true;
      return real();
    };
  });

  await page.goto('/');

  expect(
    await page.evaluate(() => (window as unknown as { asked?: boolean }).asked),
  ).toBe(true);
});

test('AC-40.4 exporting clears the backup reminder, and it stays cleared after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Title', { exact: true }).fill('Rent');
  await page.getByLabel('Due', { exact: true }).fill(today());
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Not backed up yet.')).toBeVisible();

  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  await expect(page.getByText('Not backed up yet.')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
  await expect(page.getByText('Not backed up yet.')).toHaveCount(0);
});
