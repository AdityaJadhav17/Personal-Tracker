import { test, expect, type Page } from '@playwright/test';

test.use({ colorScheme: 'light' });

/** Two courses and an item in each, one of them high priority. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const at = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 0, 0);
      return d.toISOString();
    };
    const item = (id: string, title: string, courseId: string, extra = {}) => ({
      id,
      title,
      dueAt: at(1),
      category: 'academic',
      priority: 'normal',
      status: 'open',
      note: '',
      createdAt: at(-5),
      completedAt: null,
      goalId: null,
      courseId,
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
          item('a', 'Project 0', 'c120', { priority: 'high' }),
          item('b', 'HW 1', 'c123'),
        ],
      }),
    );
  });
  await page.reload();
}

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

test('AC-60.1 and AC-60.2 Courses shows the list first, adds from New course, and deletes from More', async ({
  page,
}) => {
  await seed(page);
  await nav(page, 'Courses').click();

  await expect(page.getByLabel('Course name', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Delete CSE 120', exact: true }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'New course', exact: true }).click();
  await page.getByLabel('Course name', { exact: true }).fill('MGT 18');
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  await expect(page.getByLabel('Course name', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'MGT 18', exact: true }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'More for MGT 18', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete MGT 18', exact: true })
    .click();
  await page.getByRole('button', { name: 'Yes, delete', exact: true }).click();
  await page.reload();
  await nav(page, 'Courses').click();
  await expect(
    page.getByRole('heading', { name: 'MGT 18', exact: true }),
  ).toHaveCount(0);
});

test('AC-60.3 and AC-60.4 a course keeps one colour on its card and on the calendar, and high priority reads bold there too', async ({
  page,
}) => {
  await seed(page);

  // CSE 120 was added first: blue in light mode. CSE 123 second: amber.
  const BLUE = 'rgb(37, 99, 235)';
  const AMBER = 'rgb(180, 83, 9)';

  await nav(page, 'Courses').click();
  const dot = (name: string) =>
    page
      .getByRole('heading', { name, exact: true })
      .locator('[aria-hidden="true"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await dot('CSE 120')).toBe(BLUE);
  expect(await dot('CSE 123')).toBe(AMBER);

  await nav(page, 'Calendar').click();
  const bar = (title: string) =>
    page.getByRole('button', { name: title, exact: true }).evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.borderLeftColor, weight: style.fontWeight };
    });
  const project = await bar('Project 0');
  const homework = await bar('HW 1');
  expect(project.color).toBe(BLUE);
  expect(homework.color).toBe(AMBER);
  expect(Number(project.weight)).toBeGreaterThanOrEqual(600);
  expect(Number(homework.weight)).toBeLessThan(600);
});
