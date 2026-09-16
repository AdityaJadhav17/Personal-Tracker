import { test, expect, type Page } from '@playwright/test';

/** Every view the sidebar offers, so a new one cannot be quietly dropped. */
const VIEWS = ['Home', 'Calendar', 'Goals', 'Courses', 'Reflections', 'Trends'];

/** How much wider than the screen the document is. Zero is the whole point. */
function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
}

test('AC-23.1 the page fits a 320px screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('AC-23.2 no width from a phone to a desktop scrolls sideways', async ({
  page,
}) => {
  await page.goto('/');

  for (const width of [320, 375, 390, 430, 560, 600, 700, 900, 1400]) {
    await page.setViewportSize({ width, height: 800 });
    expect(await overflow(page), `at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test('AC-23.2 a full dashboard still fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  // Overflow from a long title is the other way this breaks, so the check is
  // not run on an empty page.
  await page.getByLabel('Title').fill('CSE 110 final project proposal draft');
  await page.getByLabel('Due').fill('2026-12-11');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(
    page.getByText('CSE 110 final project proposal draft'),
  ).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('AC-23.3 every view is reachable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  for (const view of VIEWS) {
    await expect(
      page.getByRole('button', { name: view, exact: true }),
    ).toBeVisible();
  }
});

test('AC-23.3 tapping a view on a phone actually moves', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test('AC-23.4 each view still announces its name on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  // The labels are hidden from the eye, not from the accessibility tree.
  for (const view of VIEWS) {
    await expect(
      page.getByRole('button', { name: view, exact: true }),
    ).toHaveCount(1);
  }
});

test('AC-23.4 the view you are on is still marked on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Goals' }).click();

  await expect(page.getByRole('button', { name: 'Goals' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('AC-23.5 a wide screen still shows the labels', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/');

  for (const view of VIEWS) {
    await expect(
      page.getByRole('button', { name: view, exact: true }),
    ).toContainText(view);
  }
});

test('AC-23.6 the sidebar is no taller than what is in it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();

  const slack = await page.evaluate(() => {
    const bar = document.querySelector('.sidebar')!.getBoundingClientRect();
    const nav = document
      .querySelector('.sidebar__nav')!
      .getBoundingClientRect();
    return bar.bottom - nav.bottom;
  });

  // Padding below the icons, not a band of empty colour. A grid stretches its
  // rows to fill the page by default, which gave the sidebar 82px of nothing.
  expect(slack).toBeLessThan(24);
});
