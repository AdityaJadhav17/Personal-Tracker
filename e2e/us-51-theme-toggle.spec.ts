import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

const LIGHT_BG = 'rgb(245, 246, 248)';
const DARK_BG = 'rgb(15, 23, 42)';

function background(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test.describe('with the system in light mode', () => {
  test.use({ colorScheme: 'light' });

  test('AC-51.1 and AC-51.2 switching to dark sticks across a reload', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/');
    expect(await background(page)).toBe(LIGHT_BG);

    await page
      .getByRole('button', { name: 'Switch to dark mode', exact: true })
      .click();
    await expect.poll(() => background(page)).toBe(DARK_BG);

    await page.reload();
    expect(await background(page)).toBe(DARK_BG);
    await expect(
      page.getByRole('button', { name: 'Switch to light mode', exact: true }),
    ).toBeVisible();
    // theme.js ran under the Content-Security-Policy without a violation.
    expect(errors).toEqual([]);
  });

  test('AC-51.4 forced dark still meets WCAG 2.2 AA', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Switch to dark mode', exact: true })
      .click();
    await expect.poll(() => background(page)).toBe(DARK_BG);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe('with the system in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('AC-51.3 with no choice made the page follows the system', async ({
    page,
  }) => {
    await page.goto('/');

    expect(await background(page)).toBe(DARK_BG);
    await expect(
      page.getByRole('button', { name: 'Switch to light mode', exact: true }),
    ).toBeVisible();
  });

  test('AC-51.2 a light choice wins over a dark system', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Switch to light mode', exact: true })
      .click();
    await page.reload();

    expect(await background(page)).toBe(LIGHT_BG);
  });
});
