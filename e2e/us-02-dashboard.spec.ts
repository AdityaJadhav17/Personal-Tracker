import { test, expect, type Page } from '@playwright/test';
import { add } from './helpers';

/** The heading of the section an item is rendered inside. */
function groupOf(page: Page, title: string) {
  return page
    .locator('section', { has: page.getByText(title, { exact: true }) })
    .locator('h2');
}

test('AC-02.1 items land in Overdue, Today, This week and Later', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Missed lab', -1);
  await add(page, 'Quiz', 0);
  await add(page, 'Project', 3);
  await add(page, 'Finals', 21);

  await expect(groupOf(page, 'Missed lab')).toHaveText('Overdue');
  await expect(groupOf(page, 'Quiz')).toHaveText('Today');
  await expect(groupOf(page, 'Project')).toHaveText('This week');
  await expect(groupOf(page, 'Finals')).toHaveText('Later');
});

test('AC-02.1 Overdue is rendered above Today', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Quiz', 0);
  await add(page, 'Missed lab', -1);

  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Overdue',
    'Today',
  ]);
});

test('AC-02.2 groups with no items render no heading', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Quiz', 0);

  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overdue' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'This week' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Later' })).toHaveCount(0);
});

test('AC-02.1 grouping survives a reload', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Missed lab', -1);
  await add(page, 'Project', 3);
  await page.reload();

  await expect(groupOf(page, 'Missed lab')).toHaveText('Overdue');
  await expect(groupOf(page, 'Project')).toHaveText('This week');
});

test('AC-02.4 an item due today stays in Today, not Overdue', async ({
  page,
}) => {
  // A date with no time is due at 23:59, which is the case that breaks if
  // grouping ever compares instants or UTC days instead of local days.
  await page.goto('/');

  await add(page, 'Due tonight', 0);

  await expect(groupOf(page, 'Due tonight')).toHaveText('Today');
});
