import { test, expect, type Page } from '@playwright/test';
import { add } from './helpers';

test.use({ colorScheme: 'light', viewport: { width: 1280, height: 900 } });

async function openCalendar(page: Page) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();
}

test('AC-63.1 Today comes back from two months out', async ({ page }) => {
  await page.goto('/');
  await openCalendar(page);
  const month = page.getByRole('main').getByRole('heading', { level: 1 });
  const thisMonth = await month.textContent();

  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(month).not.toHaveText(thisMonth!);

  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(month).toHaveText(thisMonth!);
});

test('AC-63.2 to AC-63.5 one block of weeks, today circled, empty weeks quiet, full height', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 0);
  await openCalendar(page);

  // AC-63.2. Every month has padding days in a Sunday-first grid except one
  // starting on Sunday and ending on Saturday; this checks whichever exist.
  const outside = await page.evaluate(() =>
    [...document.querySelectorAll('td[role="presentation"]')].map((td) => {
      const style = getComputedStyle(td);
      return style.borderTopColor !== 'rgba(0, 0, 0, 0)';
    }),
  );
  expect(outside.every(Boolean)).toBe(true);

  // AC-63.4. The cell is a plain cell; its number sits in the accent circle.
  const today = page.locator('td[aria-current="date"]');
  expect(
    await today.evaluate((td) => getComputedStyle(td).backgroundColor),
  ).toBe('rgb(255, 255, 255)');
  const date = await today
    .getByRole('button', { name: /^Open / })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      return { background: style.backgroundColor, radius: style.borderRadius };
    });
  expect(date.background).toBe('rgb(15, 118, 110)');
  expect(date.radius).toBe('50%');

  // AC-63.3. No "0 due" anywhere.
  await expect(page.getByRole('cell', { name: '0 due' })).toHaveCount(0);

  // AC-63.5. The grid reaches most of the way down the window.
  const grid = (await page.getByRole('table').boundingBox())!;
  expect(grid.y + grid.height).toBeGreaterThan(900 * 0.85);
});
