import type { Page } from '@playwright/test';
import { test, expect } from './clock';

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

async function addGoal(page: Page, name: string) {
  await page.getByLabel('Goal name', { exact: true }).fill(name);
  await page.getByLabel('Target date', { exact: true }).fill('2026-10-01');
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
}

test('AC-98.1, AC-98.2 and AC-98.3 a goal marked achieved moves under Achieved, stays there after a reload, and comes back', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Goals').click();
  await addGoal(page, 'AWS exam');

  await page
    .getByRole('button', { name: 'Mark AWS exam achieved', exact: true })
    .click();
  await page.reload();
  await nav(page, 'Goals').click();

  const achieved = page.getByRole('heading', { name: 'Achieved', exact: true });
  await expect(achieved).toBeVisible();
  await expect(page.getByText('Achieved Sep 15')).toBeVisible();

  await page
    .getByRole('button', { name: 'Mark AWS exam not achieved', exact: true })
    .click();
  await expect(achieved).toBeHidden();
  await expect(page.getByText(/days left|Passed/)).toBeVisible();
});
