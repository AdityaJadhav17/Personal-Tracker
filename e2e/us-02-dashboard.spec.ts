import { test, expect, type Page } from '@playwright/test';
import { add, dayName } from './helpers';

/**
 * The heading an item sits under. US-57 made that Overdue or the item's day,
 * where it used to be Today, This week or Later.
 */
function headingOver(page: Page, title: string) {
  return page
    .locator('section, ol > li', {
      has: page.getByText(title, { exact: true }),
    })
    .last()
    .getByRole('heading', { level: 2 });
}

test('AC-02.1 items land in Overdue, or under the day they are due', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Missed lab', -1);
  await add(page, 'Quiz', 0);
  await add(page, 'Project', 3);
  await add(page, 'Finals', 21);

  await expect(headingOver(page, 'Missed lab')).toHaveAccessibleName('Overdue');
  await expect(headingOver(page, 'Quiz')).toHaveAccessibleName(dayName(0));
  await expect(headingOver(page, 'Project')).toHaveAccessibleName(dayName(3));
  await expect(headingOver(page, 'Finals')).toHaveAccessibleName(dayName(21));
});

test('AC-02.1 Overdue is rendered above today', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Quiz', 0);
  await add(page, 'Missed lab', -1);

  const headings = page.getByRole('heading', { level: 2 });
  await expect(headings.nth(0)).toHaveAccessibleName('Overdue');
  await expect(headings.nth(1)).toHaveAccessibleName(dayName(0));
});

test('AC-02.2 only days with something due get a heading', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Quiz', 0);

  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: dayName(0), exact: true }),
  ).toBeVisible();
});

test('AC-02.1 where items sit survives a reload', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Missed lab', -1);
  await add(page, 'Project', 3);
  await page.reload();

  await expect(headingOver(page, 'Missed lab')).toHaveAccessibleName('Overdue');
  await expect(headingOver(page, 'Project')).toHaveAccessibleName(dayName(3));
});

test('AC-02.4 an item due today stays under today, not Overdue', async ({
  page,
}) => {
  // A date with no time is due at 23:59, which is the case that breaks if
  // grouping ever compares instants or UTC days instead of local days.
  await page.goto('/');

  await add(page, 'Due tonight', 0);

  await expect(headingOver(page, 'Due tonight')).toHaveAccessibleName(
    dayName(0),
  );
});
