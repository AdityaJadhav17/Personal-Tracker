import { test, expect, type Page } from '@playwright/test';
import { isoDate } from './helpers';

/** The filter, which is the only select on Home labelled exactly "Course". */
function courseFilter(page: Page) {
  return page.getByLabel('Course', { exact: true });
}

function titled(page: Page, title: string) {
  return page.getByRole('button', { name: title, exact: true });
}

/**
 * Two courses, one item in each, and one belonging to neither.
 *
 * Seeded rather than clicked: the point of this spec is the filtering, and
 * building the same term through the UI six times is slower and no more real.
 */
async function aTerm(page: Page) {
  await page.goto('/');
  await page.evaluate((due: string) => {
    const at = (d: string, h: number) =>
      new Date(`${d}T${String(h).padStart(2, '0')}:00`).toISOString();
    const item = (
      id: string,
      title: string,
      category: string,
      courseId: string | null,
    ) => ({
      id,
      title,
      dueAt: at(due, 12),
      category,
      priority: 'normal',
      status: 'open',
      note: '',
      createdAt: at(due, 9),
      completedAt: null,
      goalId: null,
      courseId,
    });
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 2,
        goals: [],
        reflections: [],
        courses: [
          {
            id: 'c1',
            name: 'CSE 110',
            meetingLocation: '',
            professorEmail: '',
            officeHours: '',
            createdAt: at(due, 9),
          },
          {
            id: 'c2',
            name: 'MATH 20C',
            meetingLocation: '',
            professorEmail: '',
            officeHours: '',
            createdAt: at(due, 9),
          },
        ],
        items: [
          item('i1', 'CSE 110 midterm', 'academic', 'c1'),
          item('i2', 'MATH problem set', 'academic', 'c2'),
          item('i3', 'Dentist', 'personal', null),
        ],
      }),
    );
  }, isoDate(1));
  await page.reload();
}

test('AC-27.1 filtering to a course shows only its items', async ({ page }) => {
  await aTerm(page);

  await courseFilter(page).selectOption({ label: 'CSE 110' });

  await expect(titled(page, 'CSE 110 midterm')).toBeVisible();
  await expect(titled(page, 'MATH problem set')).toHaveCount(0);
});

test('AC-27.3 an item in no course is hidden by a course filter', async ({
  page,
}) => {
  await aTerm(page);

  await courseFilter(page).selectOption({ label: 'CSE 110' });

  await expect(titled(page, 'Dentist')).toHaveCount(0);
});

test('AC-27.4 a course and a category filter both apply', async ({ page }) => {
  await aTerm(page);

  await page
    .getByRole('group', { name: 'Show' })
    .getByRole('button', { name: 'Academic', exact: true })
    .click();
  await courseFilter(page).selectOption({ label: 'MATH 20C' });

  await expect(titled(page, 'MATH problem set')).toBeVisible();
  await expect(titled(page, 'CSE 110 midterm')).toHaveCount(0);
  await expect(titled(page, 'Dentist')).toHaveCount(0);
});

test('AC-27.6 a filter that hides everything names what it is hiding', async ({
  page,
}) => {
  await aTerm(page);

  await page
    .getByRole('group', { name: 'Show' })
    .getByRole('button', { name: 'Personal', exact: true })
    .click();
  await courseFilter(page).selectOption({ label: 'CSE 110' });

  await expect(
    page.getByText(/Nothing personal for CSE 110 is open right now/i),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Show everything' }).click();
  await expect(titled(page, 'Dentist')).toBeVisible();
  await expect(titled(page, 'MATH problem set')).toBeVisible();
});

test('AC-27.5 a reload clears the course filter', async ({ page }) => {
  await aTerm(page);
  await courseFilter(page).selectOption({ label: 'CSE 110' });
  await expect(titled(page, 'Dentist')).toHaveCount(0);

  await page.reload();

  await expect(courseFilter(page)).toHaveValue('');
  await expect(titled(page, 'Dentist')).toBeVisible();
});

test('AC-27.7 deleting the course you filtered to shows everything again', async ({
  page,
}) => {
  await aTerm(page);
  await courseFilter(page).selectOption({ label: 'CSE 110' });
  await expect(titled(page, 'Dentist')).toHaveCount(0);

  await page.getByRole('button', { name: 'Courses', exact: true }).click();
  // US-60. Delete waits behind the card's More.
  await page
    .getByRole('button', { name: 'More for CSE 110', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete CSE 110' }).click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();

  // Not an empty list naming a course that no longer exists.
  await expect(titled(page, 'Dentist')).toBeVisible();
  await expect(titled(page, 'MATH problem set')).toBeVisible();
  await expect(titled(page, 'CSE 110 midterm')).toBeVisible();
});

test('AC-27.2 with no courses recorded there is no course control', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Title', { exact: true }).fill('Dentist');
  await page.getByLabel('Due', { exact: true }).fill(isoDate(1));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(courseFilter(page)).toHaveCount(0);
});
