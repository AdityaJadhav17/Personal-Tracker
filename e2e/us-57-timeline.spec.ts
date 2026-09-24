import { test, expect, type Page } from '@playwright/test';
import { dayName, row } from './helpers';

test.use({ colorScheme: 'light' });

/** Two courses and three items, one overdue, one high priority. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const at = (days: number, hours = 23, minutes = 59) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };
    const item = (id: string, title: string, dueAt: string, extra = {}) => ({
      id,
      title,
      dueAt,
      category: 'academic',
      priority: 'normal',
      status: 'open',
      note: '',
      createdAt: at(-5),
      completedAt: null,
      goalId: null,
      courseId: null,
      repeat: 'none',
      repeatDay: null,
      parentId: null,
      ...extra,
    });
    const course = (id: string, name: string) => ({
      id,
      name,
      meetingLocation: '',
      professorEmail: '',
      officeHours: '',
      createdAt: at(-9),
    });
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: at(0),
        goals: [],
        reflections: [],
        courses: [course('c120', 'CSE 120'), course('c123', 'CSE 123')],
        items: [
          item('late', 'Reading quiz', at(-1)),
          item('hw', 'HW 1', at(2), { courseId: 'c123' }),
          item('mid', 'Midterm', at(5, 8, 0), {
            courseId: 'c120',
            priority: 'high',
          }),
        ],
      }),
    );
  });
  await page.reload();
}

test('AC-57.1 to AC-57.4 Home opens on the date, overdue first, then days, and adds from one line', async ({
  page,
}) => {
  await seed(page);

  const today = new Date().toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  await expect(
    page.getByRole('heading', { level: 1, name: today, exact: true }),
  ).toBeVisible();
  const headings = page.getByRole('heading', { level: 2 });
  await expect(headings.nth(0)).toHaveAccessibleName('Overdue');
  await expect(headings.nth(1)).toHaveAccessibleName(dayName(2));
  await expect(row(page, 'Reading quiz')).toContainText('Yesterday');

  await page.getByLabel('Title', { exact: true }).click();
  await expect(page.getByLabel('Due', { exact: true })).toHaveValue(
    new Date().toLocaleDateString('en-CA'),
  );
  await page.getByLabel('Title', { exact: true }).fill('Office hours');
  await page.keyboard.press('Enter');
  await page.reload();

  await expect(
    page
      .locator('ol > li', { hasText: 'Office hours' })
      .getByRole('heading', { level: 2 }),
  ).toHaveAccessibleName(dayName(0));
});

test('AC-57.7 and AC-57.8 high priority reads bold, and courses keep their colours in the order added', async ({
  page,
}) => {
  await seed(page);

  const weight = (title: string) =>
    page
      .getByRole('button', { name: title, exact: true })
      .evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(await weight('Midterm')).toBeGreaterThanOrEqual(600);
  expect(await weight('HW 1')).toBeLessThan(600);

  // CSE 120 was added first, so it has the first colour, blue in light mode.
  const dot = (title: string) =>
    row(page, title)
      .locator('[aria-hidden="true"]')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await dot('Midterm')).toBe('rgb(37, 99, 235)');
  expect(await dot('HW 1')).toBe('rgb(180, 83, 9)');
});
