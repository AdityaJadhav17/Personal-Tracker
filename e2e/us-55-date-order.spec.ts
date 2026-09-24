import { test, expect } from '@playwright/test';

test('AC-55.1 Later reads in date order, and a final a month out does not push next week off the ten', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const item = (
      id: string,
      title: string,
      days: number,
      priority: string,
    ) => {
      const due = new Date();
      due.setDate(due.getDate() + days);
      due.setHours(23, 59, 0, 0);
      return {
        id,
        title,
        dueAt: due.toISOString(),
        category: 'academic',
        priority,
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
          item('final', 'CSE 120 Final Exam', 75, 'high'),
          item('midterm', 'CSE 123 Midterm', 34, 'high'),
          ...Array.from({ length: 9 }, (_, n) =>
            item(`hw-${n}`, `HW ${n + 1}`, 10 + n, 'normal'),
          ),
        ],
      }),
    );
  });
  await page.reload();

  await expect(page.getByRole('listitem')).toContainText([
    'HW 1',
    'HW 2',
    'HW 3',
    'HW 4',
    'HW 5',
    'HW 6',
    'HW 7',
    'HW 8',
    'HW 9',
    'CSE 123 Midterm',
  ]);
  await expect(page.getByText('CSE 120 Final Exam')).toHaveCount(0);
});
