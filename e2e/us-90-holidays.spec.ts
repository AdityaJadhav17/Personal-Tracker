import type { Page } from '@playwright/test';
import { test, expect } from './clock';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const cell = (page: Page, day: string) =>
  page.getByRole('cell', { name: new RegExp(day) });

test('AC-90.1, AC-90.2 and AC-90.4 holidays show on their days, this month and the next', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Calendar').click();

  await expect(cell(page, 'September 7, 2026')).toContainText('Labor Day');

  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(cell(page, 'October 12, 2026')).toContainText(
    'Indigenous Peoples’ Day',
  );
  await expect(cell(page, 'October 31, 2026')).toContainText('Halloween');
});

test('AC-90.5 a holiday is not a deadline: Home stays empty and nothing is stored', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Calendar').click();
  await expect(cell(page, 'September 7, 2026')).toContainText('Labor Day');

  await nav(page, 'Home').click();
  await expect(page.getByText('Nothing due yet.')).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem('personal-tracker/v1'),
  );
  expect(stored ?? '').not.toContain('Labor Day');
});
