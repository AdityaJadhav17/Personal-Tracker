import { test, expect, type Page } from '@playwright/test';

/**
 * A day in this month with room after it, so the spec does not depend on
 * which day of the month it runs: the 10th, or the 20th late in the month.
 */
function base(): Date {
  const d = new Date();
  d.setDate(d.getDate() > 20 ? 10 : 20);
  d.setHours(12, 0, 0, 0);
  return d;
}

function named(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function input(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

async function seed(page: Page, titles: string[], day: Date) {
  await page.goto('/');
  await page.evaluate(
    ({ titles, at }) => {
      localStorage.setItem(
        'personal-tracker/v1',
        JSON.stringify({
          version: 4,
          lastBackupAt: null,
          courses: [],
          reflections: [],
          goals: [
            {
              id: 'goal',
              name: 'AWS certification',
              description: '',
              targetAt: at,
              createdAt: at,
            },
          ],
          items: titles.map((title, index) => ({
            id: `item-${index}`,
            title,
            dueAt: at,
            category: 'academic',
            priority: 'normal',
            status: 'open',
            note: '',
            createdAt: at,
            completedAt: null,
            goalId: null,
            courseId: null,
            repeat: 'none',
            repeatDay: null,
          })),
        }),
      );
    },
    { titles, at: day.toISOString() },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
}

test('AC-41.1 and AC-41.2 a goal shows on its day, and "more" opens everything due', async ({
  page,
}) => {
  const day = base();
  await seed(page, ['First', 'Second', 'Third'], day);

  const cell = page.getByRole('cell', { name: new RegExp(named(day)) });
  await expect(cell).toContainText('Goal: AWS certification');

  await cell.getByRole('button', { name: '1 more' }).click();
  const opened = page.getByRole('dialog', { name: named(day) });
  await expect(opened.getByRole('listitem')).toHaveCount(3);
  await expect(opened).toContainText('Third');
});

test('AC-41.3 an item opened from the calendar can be moved by its date field, no dragging', async ({
  page,
}) => {
  const day = base();
  const later = new Date(day);
  later.setDate(later.getDate() + 2);
  await seed(page, ['CSE 123 HW 1'], day);

  await page.getByRole('button', { name: 'CSE 123 HW 1', exact: true }).click();
  const opened = page.getByRole('dialog', { name: named(day) });
  await opened
    .getByRole('button', { name: 'CSE 123 HW 1', exact: true })
    .click();
  await opened.getByLabel('Due for CSE 123 HW 1').fill(input(later));
  // AC-70.1. Enter keeps it; there is no Save.
  await page.keyboard.press('Enter');

  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: new RegExp(named(later)) }),
  ).toContainText('CSE 123 HW 1');
});
