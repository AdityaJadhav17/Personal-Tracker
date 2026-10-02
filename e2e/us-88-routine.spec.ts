import type { Page } from '@playwright/test';
import { test, expect, TODAY } from './clock';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const lines = (page: Page) =>
  page.getByRole('textbox', { name: 'Task', exact: true });

test('AC-88.2, AC-88.3 and AC-88.7 a routine typed like Notion keeps its ticks across a reload', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Routine').click();

  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.keyboard.type('Vitamins');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Gym');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Read');

  await page.getByRole('checkbox', { name: 'Gym', exact: true }).check();
  await expect(page.getByText('1 of 3 done today')).toBeVisible();

  await page.reload();
  await nav(page, 'Routine').click();
  await expect(lines(page)).toHaveCount(3);
  await expect(
    page.getByRole('checkbox', { name: 'Gym', exact: true }),
  ).toBeChecked();
});

test('AC-88.4 the next morning every box is unticked again', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Routine').click();
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.keyboard.type('Gym');
  await page.getByRole('checkbox', { name: 'Gym', exact: true }).check();

  // The one that would actually happen: the app left open overnight, then
  // reopened in the morning.
  const morning = new Date(TODAY);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(7, 0, 0, 0);
  await page.clock.setSystemTime(morning);
  await page.reload();
  await nav(page, 'Routine').click();

  await expect(
    page.getByRole('checkbox', { name: 'Gym', exact: true }),
  ).not.toBeChecked();
  await expect(page.getByText('0 of 1 done today')).toBeVisible();
  await expect(page.getByText('Wednesday, September 16')).toBeVisible();
});
