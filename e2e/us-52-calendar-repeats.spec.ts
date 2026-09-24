import { test, expect, type Page } from '@playwright/test';
import { isoDate } from './helpers';

async function addMonthly(page: Page, title: string) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(0));
  await page.getByLabel('Repeat', { exact: true }).selectOption('monthly');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

async function nextMonth(page: Page) {
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
}

test('AC-52.1 rent set to monthly shows next month before this month is paid', async ({
  page,
}) => {
  await page.goto('/');
  await addMonthly(page, 'Rent');
  await page.reload();
  await nextMonth(page);

  await page
    .getByRole('button', { name: 'Rent, repeats monthly', exact: true })
    .click();
  await expect(
    page.getByText(
      'Rent repeats monthly. It joins your list when you finish the one before it.',
    ),
  ).toBeVisible();
});

test('AC-52.3 once this month is paid, next month shows the real one, not a copy beside it', async ({
  page,
}) => {
  await page.goto('/');
  await addMonthly(page, 'Rent');
  await page.getByRole('button', { name: 'Mark Rent done' }).click();
  await nextMonth(page);

  await expect(
    page.getByRole('button', { name: 'Rent', exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Rent, repeats monthly', exact: true }),
  ).toHaveCount(0);
});
