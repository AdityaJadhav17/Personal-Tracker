import { test, expect } from '@playwright/test';
// Imported rather than hardcoded: adding a view must not break these.
import { VIEWS } from '../src/components/Shell';

test('AC-13.1 the sidebar lists the views and marks the current one', async ({
  page,
}) => {
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Views' });
  await expect(nav.getByRole('button', { name: 'Home' })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Courses' })).toBeVisible();

  await expect(nav.getByRole('button', { name: 'Home' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('AC-13.2 moving to Courses swaps the view and the marker', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Courses' }).click();

  await expect(page.getByText('No courses yet.')).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Courses' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('button', { name: 'Home' })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('AC-13.3 Tab reaches every sidebar item, in the order displayed', async ({
  page,
}) => {
  await page.goto('/');

  for (const { label } of VIEWS) {
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: label, exact: true }),
    ).toBeFocused();
  }
});

test('AC-13.3 a view can be opened from the keyboard alone', async ({
  page,
}) => {
  await page.goto('/');

  // Tab to Courses by identity, not by position, so adding a view later does
  // not silently change which one this test opens.
  const courses = VIEWS.findIndex((v) => v.id === 'courses');
  for (let i = 0; i <= courses; i += 1) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');

  await expect(page.getByText('No courses yet.')).toBeVisible();
});

test('AC-13.4 reloading puts you back on Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();
  await expect(page.getByText('No courses yet.')).toBeVisible();

  await page.reload();

  await expect(page.getByLabel('Title', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Home' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('the sidebar survives a browser that blocks site data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });

  await page.goto('/');

  await expect(page.getByText('Your data could not be loaded.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Views' })).toBeVisible();
});
