import { test, expect, TODAY } from './clock';
import { isoDate } from './helpers';

test('AC-84.1 the page starts on the pinned day, and its clock moves', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Tuesday, September 15', exact: true }),
  ).toBeVisible();

  const first = await page.evaluate(() => Date.now());
  await expect
    .poll(() => page.evaluate(() => Date.now()))
    .toBeGreaterThan(first);
  expect(first - TODAY.getTime()).toBeLessThan(60_000);
});

test('AC-84.2 and AC-84.5 Node and the page agree on what today is', async ({
  page,
}) => {
  await page.goto('/');
  const pageToday = await page.evaluate(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  });

  expect(isoDate(0)).toBe('2026-09-15');
  expect(pageToday).toBe(isoDate(0));
});
