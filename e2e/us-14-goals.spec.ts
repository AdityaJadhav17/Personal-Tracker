import { test, expect, type Page } from '@playwright/test';
import { isoDate, open, openData } from './helpers';

async function addItem(page: Page, title: string, daysFromToday = 0) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

async function addGoal(page: Page, name: string, description = '') {
  await page.getByLabel('Goal name').fill(name);
  if (description) await page.getByLabel('Description').fill(description);
  await page.getByLabel('Target date').fill(isoDate(60));
  await page.getByRole('button', { name: 'Add goal' }).click();
}

test('AC-14.1 and AC-14.3 a goal keeps its details across a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();

  await addGoal(page, 'Finish the quarter clean', 'No late submissions');
  await page.reload();
  await page.getByRole('button', { name: 'Goals' }).click();

  await expect(
    page.getByRole('heading', { name: 'Finish the quarter clean' }),
  ).toBeVisible();
  await expect(page.getByText('No late submissions')).toBeVisible();
});

test('AC-14.2 a goal with no name is refused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();

  await page.getByLabel('Target date').fill(isoDate(60));
  await page.getByRole('button', { name: 'Add goal' }).click();

  await expect(page.getByText('Give the goal a name.')).toBeVisible();
  await expect(page.getByText('No goals yet.')).toBeVisible();
});

test('AC-14.4 the goals view starts empty', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();

  await expect(page.getByText('No goals yet.')).toBeVisible();
});

test('AC-15.1 and AC-15.3 progress moves as items are finished', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();
  await addGoal(page, 'Finish the quarter');

  await page.getByRole('button', { name: 'Home' }).click();
  for (const title of ['Pset 1', 'Pset 2']) {
    await addItem(page, title, 3);
    await open(page, title);
    await page
      .getByLabel(`Goal for ${title}`)
      .selectOption({ label: 'Finish the quarter' });
  }

  await page.getByRole('button', { name: 'Goals' }).click();
  await expect(page.getByText('0 of 2 done')).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Finish the quarter progress' }),
  ).toHaveAttribute('value', '0');

  await page.getByRole('button', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Mark Pset 1 done' }).click();
  await page.getByRole('button', { name: 'Goals' }).click();

  await expect(page.getByText('1 of 2 done')).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Finish the quarter progress' }),
  ).toHaveAttribute('value', '1');
});

test('AC-15.2 a goal with no items reads zero of zero', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();
  await addGoal(page, 'Finish the quarter');

  await expect(page.getByText('0 of 0 done')).toBeVisible();
});

test('AC-20.1 and AC-20.3 deleting a goal asks, then keeps the items', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();
  await addGoal(page, 'Finish the quarter');

  await page.getByRole('button', { name: 'Home' }).click();
  await addItem(page, 'Pset 1', 3);
  await open(page, 'Pset 1');
  await page
    .getByLabel('Goal for Pset 1')
    .selectOption({ label: 'Finish the quarter' });

  await page.getByRole('button', { name: 'Goals' }).click();
  // US-60. Delete waits behind the card's More.
  await page
    .getByRole('button', { name: 'More for Finish the quarter', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete Finish the quarter' }).click();

  await expect(
    page.getByText('Delete Finish the quarter? Its items stay.'),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Finish the quarter' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await expect(page.getByText('No goals yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByText('Pset 1')).toBeVisible();

  // Opened, because a closed row hides the control either way.
  await open(page, 'Pset 1');
  await expect(page.getByLabel('Goal for Pset 1')).toHaveCount(0);
});

test('goals survive an export and import round trip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals' }).click();
  await addGoal(page, 'Finish the quarter', 'No late submissions');

  await page.getByRole('button', { name: 'Home' }).click();
  await openData(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  const file = await download.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openData(page);
  await page.getByLabel('Import').setInputFiles(file!);

  await page.getByRole('button', { name: 'Goals' }).click();
  await expect(page.getByText('No late submissions')).toBeVisible();
});
