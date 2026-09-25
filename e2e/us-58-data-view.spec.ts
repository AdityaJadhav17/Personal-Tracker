import { test, expect } from '@playwright/test';
import { add, openData } from './helpers';

test('AC-58.1 the data tools are in the Data view only, with the file pickers shown as buttons', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Export', exact: true }),
  ).toHaveCount(0);

  await openData(page);

  await expect(
    page.getByRole('main').getByRole('heading', { level: 1 }),
  ).toHaveText('Data');
  for (const name of ['Import', 'Add from calendar file']) {
    const input = page.getByLabel(name, { exact: true });
    // The browser's own "Choose File / No file chosen" is out of sight; the
    // label around it is what shows, sized like the buttons beside it.
    const inputBox = (await input.boundingBox())!;
    expect(inputBox.width).toBeLessThanOrEqual(1);
    const label = page.locator('label', { has: input });
    const labelBox = (await label.boundingBox())!;
    expect(labelBox.height).toBeGreaterThan(20);
  }
});

test('AC-58.1 a file picker reached from the keyboard shows where focus is', async ({
  page,
}) => {
  await page.goto('/');
  await openData(page);

  await page.getByLabel('Import', { exact: true }).focus();
  const outline = await page
    .locator('label', { has: page.getByLabel('Import', { exact: true }) })
    .evaluate((el) => getComputedStyle(el).outlineStyle);

  expect(outline).toBe('solid');
});

test('AC-58.2 a backup that is due marks Data in the sidebar until you export', async ({
  page,
}) => {
  await page.goto('/');
  const data = page
    .getByRole('navigation')
    .getByRole('button', { name: 'Data', exact: true });
  await expect(data).not.toHaveAttribute('aria-description');

  await add(page, 'Rent');
  await expect(data).toHaveAttribute('aria-description', 'Backup due');

  await openData(page);
  await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  await expect(data).not.toHaveAttribute('aria-description');
});
