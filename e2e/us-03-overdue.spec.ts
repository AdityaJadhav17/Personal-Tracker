import { test, expect } from '@playwright/test';
import { add } from './helpers';

test('AC-03.1 an overdue item is pinned above everything else', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Finals', 21);
  await add(page, 'Quiz today', 0);
  await add(page, 'Missed lab', -1);

  // Entered last, read first.
  await expect(page.getByRole('listitem').first()).toContainText('Missed lab');
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
    'Overdue',
  );
});

test('AC-03.2 with nothing overdue the Overdue group is absent', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Quiz today', 0);

  await expect(page.getByRole('heading', { name: 'Overdue' })).toHaveCount(0);
});

test('AC-03.3 overdue items are ordered most overdue first', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'one day late', -1);
  await add(page, 'twelve days late', -12);
  await add(page, 'five days late', -5);

  await expect(page.getByRole('listitem')).toContainText([
    'twelve days late',
    'five days late',
    'one day late',
  ]);
});

test('AC-03.3 the overdue order survives a reload', async ({ page }) => {
  await page.goto('/');

  await add(page, 'one day late', -1);
  await add(page, 'twelve days late', -12);
  await page.reload();

  await expect(page.getByRole('listitem')).toContainText([
    'twelve days late',
    'one day late',
  ]);
});
