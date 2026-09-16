import { test, expect, type Page } from '@playwright/test';

interface Seed {
  title: string;
  /** Days from today, so the spec never goes stale. */
  offset: number;
  status?: 'open' | 'done';
}

/** The local calendar day `offset` days from today, "2026-09-16". */
function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The same day named the way a calendar cell reads it. */
function dayName(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function seed(page: Page, items: Seed[]) {
  await page.goto('/');
  await page.evaluate((seeds: Seed[]) => {
    const iso = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(12, 0, 0, 0);
      return d.toISOString();
    };
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 2,
        goals: [],
        courses: [],
        reflections: [],
        items: seeds.map((seed, index) => ({
          id: `seed-${index}`,
          title: seed.title,
          dueAt: iso(seed.offset),
          category: 'academic',
          priority: 'normal',
          status: seed.status ?? 'open',
          note: '',
          createdAt: iso(-30),
          completedAt: seed.status === 'done' ? iso(seed.offset) : null,
          goalId: null,
          courseId: null,
        })),
      }),
    );
  }, items);
  await page.reload();
  await page.getByRole('button', { name: 'Calendar' }).click();
}

/** The cell for a day, found by the full date it reads out. */
function cell(page: Page, offset: number) {
  return page.getByRole('cell', { name: new RegExp(dayName(offset)) });
}

test('AC-21.1 an item appears in the cell for the day it is due', async ({
  page,
}) => {
  await seed(page, [{ title: 'CSE 110 midterm', offset: 1 }]);

  await expect(cell(page, 1)).toContainText('CSE 110 midterm');
  await expect(cell(page, 2)).not.toContainText('CSE 110 midterm');
});

test('AC-21.2 today is marked as today', async ({ page }) => {
  await seed(page, []);

  await expect(cell(page, 0)).toHaveAttribute('aria-current', 'date');
});

test('AC-21.3 the next month shows that month, and today is no longer marked', async ({
  page,
}) => {
  await seed(page, []);

  const heading = page.getByRole('heading', { level: 2 });
  const opened = await heading.textContent();

  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(heading).not.toHaveText(opened!);
  await expect(page.locator('[aria-current="date"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(heading).toHaveText(opened!);
});

test('AC-21.4 a day with more than two items says how many more', async ({
  page,
}) => {
  await seed(page, [
    { title: 'First', offset: 1 },
    { title: 'Second', offset: 1 },
    { title: 'Third', offset: 1 },
  ]);

  await expect(cell(page, 1)).toContainText('1 more');
});

test('AC-21.5 a month with nothing in it still draws a grid', async ({
  page,
}) => {
  await seed(page, []);

  expect(await page.getByRole('cell').count()).toBeGreaterThanOrEqual(28);
});

test('AC-21.6 a finished item is not on the calendar', async ({ page }) => {
  await seed(page, [{ title: 'Already done', offset: 1, status: 'done' }]);

  await expect(page.getByText('Already done')).toHaveCount(0);
});

test('the calendar survives a reload, opening on the current month', async ({
  page,
}) => {
  await seed(page, [{ title: 'Rent', offset: 2 }]);
  await page.getByRole('button', { name: 'Next month' }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Calendar' }).click();

  await expect(cell(page, 2)).toContainText('Rent');
});

test('the calendar makes no network request', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await seed(page, [{ title: 'Rent', offset: 2 }]);
  await page.getByRole('button', { name: 'Next month' }).click();

  expect(offOrigin).toEqual([]);
  expect(dayKey(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
