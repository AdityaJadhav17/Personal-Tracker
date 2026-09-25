import { test, expect, type Page } from '@playwright/test';
import { isoDate } from './helpers';

test.use({ viewport: { width: 1280, height: 900 } });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

test('AC-65.1 a goal says how long is left, with no time of day', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Goals').click();
  await page.getByLabel('Goal name', { exact: true }).fill('AWS cert');
  await page.getByLabel('Target date', { exact: true }).fill(isoDate(16));
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();

  await expect(page.getByText(/ · 16 days left$/)).toBeVisible();
  await expect(page.getByText(/PM|AM/)).toHaveCount(0);
});

test('AC-65.2 the numbers wait behind Show the numbers', async ({ page }) => {
  await page.goto('/');
  // Two days of reflections, the least Trends draws.
  await page.evaluate(() => {
    const day = (back: number) => {
      const d = new Date();
      d.setDate(d.getDate() - back);
      return d.toLocaleDateString('en-CA');
    };
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: null,
        items: [],
        goals: [],
        courses: [],
        reflections: [1, 2].map((back) => ({
          id: `r${back}`,
          day: day(back),
          score: 3,
          note: '',
          createdAt: new Date().toISOString(),
        })),
      }),
    );
  });
  await page.reload();
  await nav(page, 'Trends').click();

  await expect(page.getByRole('table')).toBeHidden();
  await page.getByText('Show the numbers', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
});

test('AC-65.3 the theme button sits at the foot of the sidebar', async ({
  page,
}) => {
  await page.goto('/');
  const theme = (await page
    .getByRole('button', { name: /mode$/ })
    .boundingBox())!;
  expect(theme.y + theme.height).toBeGreaterThan(900 - 80);
});
