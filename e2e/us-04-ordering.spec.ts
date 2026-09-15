import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

async function add(
  page: Page,
  title: string,
  daysFromToday: number,
  options: { priority?: string; time?: string } = {},
) {
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due').fill(isoDate(daysFromToday));
  if (options.time) await page.getByLabel('Time').fill(options.time);
  if (options.priority) {
    await page.getByLabel('Priority').selectOption(options.priority);
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

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

  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('listitem')).toContainText([
    'first thing',
    'second thing',
  ]);

  await page.reload();

  await expect(page.getByRole('listitem')).toContainText([
    'first thing',
    'second thing',
  ]);
});

test('AC-04.4 a low item due today still beats a high item due in six days', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Laundry', 0, { priority: 'low' });
  await add(page, 'Midterm', 6, { priority: 'high' });

  const section = (title: string) =>
    page
      .locator('section', { has: page.getByText(title, { exact: true }) })
      .locator('h2');

  await expect(section('Laundry')).toHaveText('Today');
  await expect(section('Midterm')).toHaveText('This week');

  // Grouping decides the page order, so Today is read before This week.
  await expect(page.getByRole('listitem')).toContainText([
    'Laundry',
    'Midterm',
  ]);
});
