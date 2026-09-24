import { test, expect, type Page } from '@playwright/test';

/** Two overdue items and twelve upcoming ones, one a day from tomorrow. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const item = (id: string, title: string, days: number) => {
      const due = new Date();
      due.setDate(due.getDate() + days);
      due.setHours(12, 0, 0, 0);
      return {
        id,
        title,
        dueAt: due.toISOString(),
        category: 'academic',
        priority: 'normal',
        status: 'open',
        note: '',
        createdAt: new Date().toISOString(),
        completedAt: null,
        goalId: null,
        courseId: null,
        repeat: 'none',
        repeatDay: null,
        parentId: null,
      };
    };
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: new Date().toISOString(),
        goals: [],
        courses: [],
        reflections: [],
        items: [
          item('late-1', 'Missed quiz', -2),
          item('late-2', 'Missed lab', -1),
          ...Array.from({ length: 12 }, (_, n) =>
            item(`up-${n}`, `Reading ${n + 1}`, n + 1),
          ),
        ],
      }),
    );
  });
  await page.reload();
}

const rows = (page: Page) =>
  page.getByRole('button', { name: /^Mark .+ done$/ });

test('AC-54.1 Home shows every overdue item and the next ten, and a reload shows ten again', async ({
  page,
}) => {
  await seed(page);

  await expect(rows(page)).toHaveCount(12);
  await expect(page.getByText('Missed quiz', { exact: true })).toBeVisible();
  await expect(page.getByText('Reading 10', { exact: true })).toBeVisible();
  await expect(page.getByText('Reading 11', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Showing 10 of 12 upcoming.')).toBeVisible();

  await page.getByRole('button', { name: 'Show 2 more', exact: true }).click();
  await expect(rows(page)).toHaveCount(14);

  await page.reload();
  await expect(rows(page)).toHaveCount(12);
});
