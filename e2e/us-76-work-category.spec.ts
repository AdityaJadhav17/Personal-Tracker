import type { Page } from '@playwright/test';
import { test, expect } from './clock';
import { add } from './helpers';

const chip = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
const titled = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });

test('AC-76.1 a work item can be added, filtered to, and filtered out, across a reload', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Shift at the library', 1, { category: 'work' });
  await add(page, 'CSE 120 Lab 1', 2);

  await page.reload();
  await chip(page, 'Work').click();
  await expect(titled(page, 'Shift at the library')).toBeVisible();
  await expect(titled(page, 'CSE 120 Lab 1')).toHaveCount(0);

  await chip(page, 'Academic').click();
  await expect(titled(page, 'Shift at the library')).toHaveCount(0);
  await expect(titled(page, 'CSE 120 Lab 1')).toBeVisible();
});
