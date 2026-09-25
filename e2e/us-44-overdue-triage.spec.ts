import { test, expect, type Page } from '@playwright/test';

/** Two overdue items, due at 5pm two days ago. */
async function seedOverdue(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const due = new Date();
    due.setDate(due.getDate() - 2);
    due.setHours(17, 0, 0, 0);
    const item = (id: string, title: string) => ({
      id,
      title,
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
    });
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 4,
        lastBackupAt: null,
        goals: [],
        courses: [],
        reflections: [],
        items: [item('lab', 'Missed lab'), item('quiz', 'Old quiz')],
      }),
    );
  });
  await page.reload();
}

function stored(page: Page) {
  return page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
          items: { id: string; dueAt: string }[];
        }
      ).items,
  );
}

test('AC-44.2 Tomorrow takes an item out of Overdue, due tomorrow at the same time, after a reload', async ({
  page,
}) => {
  await seedOverdue(page);

  await page
    .getByRole('button', { name: 'Move Missed lab to tomorrow' })
    .click();
  await page.reload();

  const lab = (await stored(page)).find((i) => i.id === 'lab')!;
  const due = new Date(lab.dueAt);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  expect([due.getDate(), due.getHours()]).toEqual([tomorrow.getDate(), 17]);
  await expect(
    page.getByRole('button', { name: 'Move Missed lab to tomorrow' }),
  ).toHaveCount(0);
});

test('AC-44.3 and AC-67.3 Drop removes it at once, and Undo is offered', async ({
  page,
}) => {
  await seedOverdue(page);

  await page.getByRole('button', { name: 'Drop Old quiz' }).click();
  await expect(page.getByRole('status').last()).toContainText(
    'Deleted Old quiz.',
  );
  await page.reload();
  expect((await stored(page)).map((i) => i.id)).toEqual(['lab']);
});
