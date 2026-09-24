import { test, expect } from '@playwright/test';

/** A local date `days` from today, as the date input wants it. */
function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

test('AC-45.1 to AC-45.3 a step added from a project survives a reload and shows on both rows', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Title', { exact: true }).fill('Project 2b');
  await page.getByLabel('Due', { exact: true }).fill(inDays(14));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByRole('button', { name: 'Project 2b', exact: true }).click();
  await page.getByLabel('New step for Project 2b').fill('Design doc');
  await page.getByLabel('Step date for Project 2b').fill(inDays(5));
  await page.getByRole('button', { name: 'Add step to Project 2b' }).click();

  await page.reload();

  const step = page.getByRole('listitem').filter({
    has: page.getByRole('button', { name: 'Design doc', exact: true }),
  });
  await expect(step).toContainText('Step of Project 2b');
  const project = page.getByRole('listitem').filter({
    has: page.getByRole('button', { name: 'Project 2b', exact: true }),
  });
  await expect(project).toContainText('0 of 1 steps done');
});

test('AC-45.6 the calendar counts each week, and a heavy week says so', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const due = new Date();
    due.setHours(23, 59, 0, 0);
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: null,
        goals: [],
        courses: [],
        reflections: [],
        items: Array.from({ length: 6 }, (_, index) => ({
          id: `i${index}`,
          title: `Deadline ${index}`,
          dueAt: due.toISOString(),
          category: 'academic',
          priority: 'normal',
          status: 'open',
          note: '',
          createdAt: due.toISOString(),
          completedAt: null,
          goalId: null,
          courseId: null,
          repeat: 'none',
          repeatDay: null,
          parentId: null,
        })),
      }),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();

  await expect(
    page.getByRole('cell', { name: '6 due, heavy', exact: true }),
  ).toBeVisible();
});
