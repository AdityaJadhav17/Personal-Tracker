import { test, expect, type Page } from '@playwright/test';
import { add, open, row } from './helpers';

test.use({ colorScheme: 'light' });

const stored = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}').items as {
        title: string;
        status: string;
      }[],
  );

test('AC-70.1 a renamed item is kept when you click away, with no Save', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Midterm', 1);
  await open(page, 'Midterm');
  await expect(page.getByRole('button', { name: /^Save/ })).toHaveCount(0);

  await page.getByLabel('Title for Midterm', { exact: true }).fill('Midterm 1');
  await page.getByRole('heading', { level: 1 }).first().click();

  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Midterm 1', exact: true }),
  ).toBeVisible();
});

test('AC-71.1 Delete folds the row away, then the item is gone', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await add(page, 'Dentist', 2);
  await open(page, 'Rent');

  const rent = row(page, 'Rent');
  await page.getByRole('button', { name: 'Delete Rent', exact: true }).click();
  // The fold is running (a hover transition may be too).
  expect(
    await rent.evaluate((el) => el.getAnimations().length),
  ).toBeGreaterThanOrEqual(1);

  await expect(rent).toHaveCount(0);
  expect((await stored(page)).map((i) => i.title)).toEqual(['Dentist']);
});

test('AC-71.2 a tick during a drop is kept, and so is the drop', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Old quiz', -2);
  await add(page, 'Rent', 1);

  await page
    .getByRole('button', { name: 'Drop Old quiz', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Mark Rent done', exact: true })
    .click();

  await expect
    .poll(async () => (await stored(page)).map((i) => `${i.title}:${i.status}`))
    .toEqual(['Rent:done']);
});

test('AC-71.3 the undo message waits while the pointer is on it', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await page
    .getByRole('button', { name: 'Mark Rent done', exact: true })
    .click();

  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await undo.hover();
  expect(
    await undo.evaluate(
      (el) => getComputedStyle(el.parentElement!).animationPlayState,
    ),
  ).toBe('paused');
});
