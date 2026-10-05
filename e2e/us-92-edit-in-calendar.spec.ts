import type { Page } from '@playwright/test';
import { test, expect, TODAY } from './clock';

test.use({ colorScheme: 'light' });

/** One event on the 17th, with a course and a goal to choose from. */
async function seed(page: Page) {
  await page.goto('/');
  const due = new Date(TODAY);
  due.setDate(17);
  due.setHours(10, 0, 0, 0);
  await page.evaluate(
    ({ dueAt, now }) => {
      localStorage.setItem(
        'personal-tracker/v1',
        JSON.stringify({
          version: 9,
          lastBackupAt: now,
          lock: null,
          notes: [],
          tasks: [],
          reflections: [],
          courses: [
            {
              id: 'c',
              name: 'CSE 123',
              meetingLocation: '',
              professorEmail: '',
              officeHours: '',
              createdAt: now,
            },
          ],
          goals: [
            {
              id: 'g',
              name: 'Internship',
              description: '',
              targetAt: now,
              createdAt: now,
            },
          ],
          items: [
            {
              id: 'meet',
              title: 'Paturi meeting',
              dueAt,
              category: 'work',
              priority: 'normal',
              status: 'open',
              note: '',
              createdAt: now,
              completedAt: null,
              goalId: null,
              courseId: null,
              repeat: 'none',
              repeatDay: null,
              parentId: null,
            },
          ],
        }),
      );
    },
    { dueAt: due.toISOString(), now: new Date(TODAY).toISOString() },
  );
  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();
  await page
    .getByRole('cell', { name: /September 17, 2026/ })
    .click({ position: { x: 8, y: 90 } });
}

const day = (page: Page) =>
  page.getByRole('dialog', { name: 'September 17, 2026' });

test('AC-92.1 opening an event in the day hides the add form, and closing it brings it back', async ({
  page,
}) => {
  await seed(page);
  const addTitle = day(page).getByLabel('Title', { exact: true });
  await expect(addTitle).toBeVisible();

  const event = day(page).getByRole('button', {
    name: 'Paturi meeting',
    exact: true,
  });
  await event.click();
  await expect(
    day(page).getByLabel('Title for Paturi meeting', { exact: true }),
  ).toBeVisible();
  await expect(addTitle).toBeHidden();

  await event.click();
  await expect(addTitle).toBeVisible();
});

test('AC-92.2 and AC-92.3 priority is changed in the open event, sits with Course and Goal, and survives a reload', async ({
  page,
}) => {
  await seed(page);
  await day(page)
    .getByRole('button', { name: 'Paturi meeting', exact: true })
    .click();

  const field = (name: string) =>
    day(page).getByLabel(`${name} for Paturi meeting`, { exact: true });
  const [priority, course, goal, due] = await Promise.all(
    ['Priority', 'Course', 'Goal', 'Due'].map((name) =>
      field(name).boundingBox(),
    ),
  );
  expect(course!.y).toBe(priority!.y);
  expect(goal!.y).toBe(priority!.y);
  expect(priority!.y).toBeGreaterThan(due!.y);

  await field('Priority').selectOption('high');

  await page.reload();
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Home', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Paturi meeting', exact: true })
    .click();
  await expect(
    page.getByLabel('Priority for Paturi meeting', { exact: true }),
  ).toHaveValue('high');
});
