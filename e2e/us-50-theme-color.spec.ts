import { test, expect, type Page } from '@playwright/test';

/** What the title bar would be painted, for each system scheme. */
function themeColors(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('meta[name="theme-color"]')].map(
      (meta) => `${meta.getAttribute('media')} ${meta.getAttribute('content')}`,
    ),
  );
}

test.use({ colorScheme: 'light' });

test('AC-50.1 each system scheme has a title bar colour matching the page', async ({
  page,
}) => {
  await page.goto('/');

  expect(await themeColors(page)).toEqual([
    '(prefers-color-scheme: light) #f7f9f9',
    '(prefers-color-scheme: dark) #0f172a',
  ]);
});

test('AC-50.2 a chosen theme repaints the title bar, and still does after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Switch to dark mode', exact: true })
    .click();

  const dark = 'rgb(15, 23, 42)';
  await expect
    .poll(() => themeColors(page))
    .toEqual([
      `(prefers-color-scheme: light) ${dark}`,
      `(prefers-color-scheme: dark) ${dark}`,
    ]);

  await page.reload();
  await expect
    .poll(() => themeColors(page))
    .toEqual([
      `(prefers-color-scheme: light) ${dark}`,
      `(prefers-color-scheme: dark) ${dark}`,
    ]);
});
