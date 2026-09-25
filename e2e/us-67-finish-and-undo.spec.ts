import { test, expect, type Page } from '@playwright/test';
import { add, doneControls } from './helpers';

test.use({ colorScheme: 'light' });

const ACCENT = 'rgb(15, 118, 110)';

const stored = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}').items as {
        title: string;
        status: string;
      }[],
  );

test('AC-67.1 a tick fills the circle at once, then the row folds away', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await add(page, 'Dentist', 2);

  const tick = page.getByRole('button', {
    name: 'Mark Rent done',
    exact: true,
  });
  await tick.click();

  // Still there, and already filled: the answer to the click is immediate.
  await expect(tick).toHaveCSS('background-color', ACCENT);
  await expect(tick).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeVisible();
  expect((await stored(page)).find((i) => i.title === 'Rent')!.status).toBe(
    'done',
  );
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('AC-67.1 with reduced motion the item leaves at once', async ({
    page,
  }) => {
    await page.goto('/');
    await add(page, 'Rent', 1);

    await page
      .getByRole('button', { name: 'Mark Rent done', exact: true })
      .click();

    // Done by the time the click returns: no fold to wait for.
    expect((await stored(page))[0]!.status).toBe('done');
  });
});

test('AC-67.2 two quick ticks finish both', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await add(page, 'Dentist', 2);
  await add(page, 'Lab 3', 3);

  await page
    .getByRole('button', { name: 'Mark Rent done', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Mark Dentist done', exact: true })
    .click();

  await expect(doneControls(page)).toHaveCount(1);
  await page.reload();
  await expect(doneControls(page)).toHaveCount(1);
  const done = (await stored(page)).filter((i) => i.status === 'done');
  expect(done.map((i) => i.title).sort()).toEqual(['Dentist', 'Rent']);
});

test('AC-67.4 a delete from the calendar day can be undone right there', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 0);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();

  await page.getByRole('button', { name: 'Rent', exact: true }).first().click();
  const day = page.getByRole('dialog');
  await day.getByRole('button', { name: 'Rent', exact: true }).click();
  await day.getByRole('button', { name: 'Delete Rent', exact: true }).click();
  // AC-71.1. Gone once its fold ends.
  await expect.poll(() => stored(page)).toEqual([]);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await stored(page)).map((i) => i.title)).toEqual(['Rent']);
});
