import { test, expect, type Page } from '@playwright/test';
import { add, isoDate, openData } from './helpers';

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const height = async (page: Page, name: string) =>
  Math.round(
    (await page.getByRole('button', { name, exact: true }).boundingBox())!
      .height,
  );

test.describe('light', () => {
  test.use({ colorScheme: 'light' });

  test('AC-62.1 the sidebar is light in light mode', async ({ page }) => {
    await page.goto('/');
    const background = await page
      .getByRole('navigation')
      .evaluate((el) => getComputedStyle(el.parentElement!).backgroundColor);
    expect(background).toBe('rgb(236, 238, 242)');
  });
});

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' });

  test('AC-62.1 the sidebar is dark in dark mode', async ({ page }) => {
    await page.goto('/');
    const background = await page
      .getByRole('navigation')
      .evaluate((el) => getComputedStyle(el.parentElement!).backgroundColor);
    expect(background).toBe('rgb(23, 32, 51)');
  });
});

test('AC-62.3 buttons in the page share one height, and a row keeps the small one', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Late thing', -1);
  await add(page, 'Soon thing', 2);

  expect(await height(page, 'Move Late thing to tomorrow')).toBe(28);

  await openData(page);
  expect(await height(page, 'Export')).toBe(36);
  expect(await height(page, 'Paste a list')).toBe(36);

  await nav(page, 'Calendar').click();
  expect(await height(page, 'Today')).toBe(36);
  expect(await height(page, 'Next month')).toBe(36);

  await nav(page, 'Goals').click();
  await page.getByLabel('Goal name', { exact: true }).fill('AWS cert');
  await page.getByLabel('Target date', { exact: true }).fill(isoDate(30));
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  expect(await height(page, 'New goal')).toBe(36);
});

test('AC-62.4 no section heading is set in capitals', async ({ page }) => {
  await page.goto('/');
  for (const view of ['Reflections', 'Trends', 'Data', 'Courses']) {
    await nav(page, view).click();
    const shouting = await page
      .getByRole('main')
      .evaluate((main) =>
        [...main.querySelectorAll('h1, h2, h3, figcaption, dt, summary')]
          .filter((el) => getComputedStyle(el).textTransform === 'uppercase')
          .map((el) => el.textContent),
      );
    expect(shouting, view).toEqual([]);
  }
});

test('AC-62.5 the list starts one step below the add field, with no reserved gap', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await page.getByRole('heading', { level: 1 }).first().click();

  const form = (await page
    .getByLabel('Title', { exact: true })
    .locator('xpath=ancestor::form')
    .boundingBox())!;
  const list = (await page.getByRole('list').first().boundingBox())!;
  const gap = list.y - (form.y + form.height);

  expect(gap).toBeGreaterThanOrEqual(8);
  expect(gap).toBeLessThanOrEqual(24);
});
