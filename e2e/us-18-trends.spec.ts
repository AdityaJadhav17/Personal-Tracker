import { test, expect, type Page } from '@playwright/test';

function dayKey(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Put a database straight into storage; the UI only ever records today. */
/** US-61. How the table names a day: "Wed, Sep 23". */
function shortName(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

async function seed(
  page: Page,
  reflections: { day: string; score: number }[],
  completedDays: string[],
) {
  await page.goto('/');
  await page.evaluate(
    ([entries, days]) => {
      const iso = (day: string) => {
        const [y, m, d] = day.split('-').map(Number);
        return new Date(y!, m! - 1, d!, 12).toISOString();
      };
      localStorage.setItem(
        'personal-tracker/v1',
        JSON.stringify({
          version: 2,
          goals: [],
          courses: [],
          reflections: (entries as { day: string; score: number }[]).map(
            (entry) => ({
              id: entry.day,
              day: entry.day,
              score: entry.score,
              note: '',
              createdAt: iso(entry.day),
            }),
          ),
          items: (days as string[]).map((day, index) => ({
            id: `done-${index}`,
            title: `done-${index}`,
            dueAt: iso(day),
            category: 'academic',
            priority: 'normal',
            status: 'done',
            note: '',
            createdAt: iso(day),
            completedAt: iso(day),
            goalId: null,
            courseId: null,
          })),
        }),
      );
    },
    [reflections, completedDays] as const,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Trends' }).click();
}

test('AC-18.3 with nothing recorded it says there is not enough yet', async ({
  page,
}) => {
  await seed(page, [], []);

  await expect(page.getByText(/not enough yet/i)).toBeVisible();
  await expect(page.getByRole('img')).toHaveCount(0);
});

test('AC-18.3 one day of data is still not enough to draw', async ({
  page,
}) => {
  await seed(page, [{ day: dayKey(-1), score: 4 }], []);

  await expect(page.getByText(/not enough yet/i)).toBeVisible();
  await expect(page.getByRole('img')).toHaveCount(0);
});

test('AC-18.1 and AC-18.2 two days give two charts, not one dual axis', async ({
  page,
}) => {
  await seed(
    page,
    [
      { day: dayKey(-3), score: 2 },
      { day: dayKey(-1), score: 5 },
    ],
    [dayKey(-3), dayKey(-1), dayKey(-1)],
  );

  await expect(page.getByRole('img')).toHaveCount(2);
  await expect(
    page.getByRole('img', { name: /how the day went/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /items finished/i }),
  ).toBeVisible();
});

test('AC-18.4 the same numbers are in a table', async ({ page }) => {
  await seed(
    page,
    [
      { day: dayKey(-2), score: 2 },
      { day: dayKey(-1), score: 5 },
    ],
    [dayKey(-1), dayKey(-1)],
  );

  // AC-65.2. Behind a disclosure now, one click away.
  await page.getByText('Show the numbers', { exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  const row = page.getByRole('row', { name: new RegExp(shortName(-1)) });
  await expect(row).toContainText('5');
  await expect(row).toContainText('2');
});

test('AC-18.4 a day with no reflection reads as no entry', async ({ page }) => {
  await seed(
    page,
    [
      { day: dayKey(-3), score: 2 },
      { day: dayKey(-1), score: 5 },
    ],
    [],
  );

  await page.getByText('Show the numbers', { exact: true }).click();
  await expect(
    page.getByRole('row', { name: new RegExp(shortName(-2)) }),
  ).toContainText('No entry');
});

test('the trends view makes no network request', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await seed(
    page,
    [
      { day: dayKey(-2), score: 2 },
      { day: dayKey(-1), score: 5 },
    ],
    [dayKey(-1)],
  );

  expect(offOrigin).toEqual([]);
});
