import { test, expect } from '@playwright/test';

// Playwright gives each test a fresh browser context, so localStorage starts
// empty without any cleanup of our own.

test('AC-01.1 adding an item puts it in the list', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Title').fill('CSE 100 project');
  await page.getByLabel('Due').fill('oct 3');
  await page.getByLabel('Priority').selectOption('high');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText('CSE 100 project')).toBeVisible();
});

test('AC-01.1 an item survives a real page reload', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Title').fill('Rent');
  await page.getByLabel('Due').fill('10/1');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Rent')).toBeVisible();

  await page.reload();

  await expect(page.getByText('Rent')).toBeVisible();
});

test('AC-01.1 school and life items sit in one list', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Title').fill('Midterm');
  await page.getByLabel('Due').fill('oct 20');
  await page.getByLabel('Category').selectOption('academic');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByLabel('Title').fill('Tuition payment');
  await page.getByLabel('Due').fill('oct 15');
  await page.getByLabel('Category').selectOption('personal');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('listitem')).toHaveCount(2);
});

test('AC-01.2 submitting with no title adds nothing and says why', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Due').fill('oct 3');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Give it a title.')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('an unreadable due date adds nothing and says what to try', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Title').fill('Dentist');
  await page.getByLabel('Due').fill('sometime next week');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(
    page.getByText('Try "oct 3", "10/3", or "oct 3 2pm".'),
  ).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('a title containing markup is shown as text, not executed', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });

  await page.goto('/');

  await page.getByLabel('Title').fill('<img src=x onerror=alert(1)>');
  await page.getByLabel('Due').fill('oct 3');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
  await page.reload();
  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(await page.locator('img').count()).toBe(0);
});
