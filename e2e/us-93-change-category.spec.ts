import type { Page } from '@playwright/test';
import { test, expect, TODAY } from './clock';

test.use({ colorScheme: 'light' });

/** A meeting filed as Academic by mistake, with a course and a goal about. */
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
              title: 'Team sync',
              dueAt,
              category: 'academic',
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
}

const field = (page: Page, name: string) =>
  page.getByLabel(`${name} for Team sync`, { exact: true });

test('AC-93.2 Category and Priority share a row under Due, and Course and Goal the next', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Team sync', exact: true }).click();

  const [due, category, priority, course, goal] = await Promise.all(
    ['Due', 'Category', 'Priority', 'Course', 'Goal'].map((name) =>
      field(page, name).boundingBox(),
    ),
  );
  expect(priority!.y).toBe(category!.y);
  expect(category!.y).toBeGreaterThan(due!.y);
  expect(goal!.y).toBe(course!.y);
  expect(course!.y).toBeGreaterThan(category!.y);
});

test('AC-93.1 a category changed in the open event is where the filter looks, after a reload', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Team sync', exact: true }).click();
  await field(page, 'Category').selectOption('work');

  await page.reload();
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Team sync', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Academic', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Team sync', exact: true }),
  ).toBeHidden();
});
