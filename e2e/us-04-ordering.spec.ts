import { test, expect, type Page } from '@playwright/test';
import { add, dayName, doneControls } from './helpers';

/** Item titles in page order. Only a title reports whether it is open. */
const titles = (page: Page) => page.getByRole('button', { expanded: false });

test('AC-04.1 high, normal and low order inside one group', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'normal task', 3, { priority: 'normal' });
  await add(page, 'low task', 3, { priority: 'low' });
  await add(page, 'high task', 3, { priority: 'high' });

  await expect(page.getByRole('listitem')).toContainText([
    'high task',
    'normal task',
    'low task',
  ]);
});

test('AC-04.2 same priority and day, the 9am item comes first', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'evening lab', 3, { time: '17:00' });
  await add(page, 'morning quiz', 3, { time: '09:00' });

  await expect(page.getByRole('listitem')).toContainText([
    'morning quiz',
    'evening lab',
  ]);
});

test('AC-04.3 two items due at the same minute both render, stably', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'first thing', 3, { time: '09:00' });
  await add(page, 'second thing', 3, { time: '09:00' });

  await expect(doneControls(page)).toHaveCount(2);
  await expect(titles(page)).toHaveText(['first thing', 'second thing']);

  await page.reload();

  await expect(titles(page)).toHaveText(['first thing', 'second thing']);
});

test('AC-04.4 a low item due today still beats a high item due in six days', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Laundry', 0, { priority: 'low' });
  await add(page, 'Midterm', 6, { priority: 'high' });

  // US-57. Each sits under its own day, whatever its priority.
  const day = (title: string) =>
    page
      .locator('ol > li', { has: page.getByText(title, { exact: true }) })
      .getByRole('heading', { level: 2 });

  await expect(day('Laundry')).toHaveAccessibleName(dayName(0));
  await expect(day('Midterm')).toHaveAccessibleName(dayName(6));

  // The day decides the page order, so today is read first.
  await expect(titles(page)).toHaveText(['Laundry', 'Midterm']);
});
