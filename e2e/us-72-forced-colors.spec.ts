import { test, expect, type Locator, type Page } from '@playwright/test';
import { add, isoDate } from './helpers';

// Chromium repaints the page in the system's colours, as Windows does.
test.use({ forcedColors: 'active', colorScheme: 'dark' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const style = (locator: Locator, property: string) =>
  locator.evaluate(
    (el, name) => getComputedStyle(el).getPropertyValue(name),
    property,
  );

/** The page's background under forced colours; a marker must not match it. */
const canvas = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('AC-72.1 the current tab, chosen filter, chosen mood and today stand out', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 0);
  const plain = await canvas(page);

  // The current tab differs from its neighbours, and from the page.
  const home = await style(nav(page, 'Home'), 'background-color');
  expect(home).not.toBe(plain);
  expect(home).not.toBe(await style(nav(page, 'Calendar'), 'background-color'));
  expect(
    await style(
      page.getByRole('button', { name: 'All', exact: true }),
      'background-color',
    ),
  ).not.toBe(plain);

  await nav(page, 'Reflections').click();
  await page.getByRole('button', { name: 'Good', exact: true }).click();
  expect(
    await style(
      page.getByRole('button', { name: 'Good', exact: true }),
      'background-color',
    ),
  ).not.toBe(plain);

  await nav(page, 'Calendar').click();
  const today = page
    .locator('td[aria-current="date"]')
    .getByRole('button', { name: /^Open / });
  expect(await style(today, 'background-color')).not.toBe(plain);
});

test('AC-72.2 course dots, the backup dot and goal progress stay visible', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Courses').click();
  await page.getByLabel('Course name', { exact: true }).fill('CSE 120');
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  const plain = await canvas(page);

  const dot = page
    .getByRole('heading', { name: 'CSE 120' })
    .locator('[aria-hidden="true"]');
  expect(await style(dot, 'background-color')).not.toBe(plain);

  await nav(page, 'Home').click();
  await add(page, 'Rent', 1);
  const backup = nav(page, 'Data').locator('span[aria-hidden="true"]');
  expect(await style(backup, 'background-color')).not.toBe(plain);

  await nav(page, 'Goals').click();
  await page.getByLabel('Goal name', { exact: true }).fill('AWS cert');
  await page.getByLabel('Target date', { exact: true }).fill(isoDate(20));
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  const bar = page.getByRole('progressbar', { name: 'AWS cert progress' });
  expect(await style(bar, 'border-top-style')).toBe('solid');
});

test('AC-72.3 and AC-72.4 the open day keeps its ring, and floating things keep an edge', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 0);
  await page
    .getByRole('button', { name: 'Mark Rent done', exact: true })
    .click();

  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const toast = undo.locator('..');
  expect(await style(toast, 'border-top-style')).toBe('solid');

  await nav(page, 'Calendar').click();
  const day = page.locator('td[aria-current="date"]');
  await day.getByRole('button', { name: /^Open / }).click();
  expect(await style(day, 'outline-style')).toBe('solid');
  expect(await style(page.getByRole('dialog'), 'border-top-style')).toBe(
    'solid',
  );
});
