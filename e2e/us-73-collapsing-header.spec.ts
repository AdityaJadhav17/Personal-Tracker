import { test, expect, type Page } from '@playwright/test';
import { dayName } from './helpers';

test.use({ colorScheme: 'light', viewport: { width: 1280, height: 800 } });

/** A term's worth of deadlines, so Home is long enough to scroll. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const at = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(23, 59, 0, 0);
      return d.toISOString();
    };
    const items = Array.from({ length: 10 }, (_, n) => ({
      id: `i${n}`,
      title: `Deadline ${n + 1}`,
      dueAt: at(n * 3),
      category: 'academic',
      priority: 'normal',
      status: 'open',
      note: '',
      createdAt: at(-5),
      completedAt: null,
      goalId: null,
      courseId: null,
      repeat: 'none',
      repeatDay: null,
      parentId: null,
    }));
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: at(0),
        goals: [],
        courses: [],
        reflections: [],
        items,
      }),
    );
  });
  await page.reload();
}

/** The slim bar: the second copy of today's date, the one that is not a heading. */
const bar = (page: Page) =>
  page.locator('[aria-hidden="true"]', { hasText: dayName(0).split(',')[0]! });

const opacity = (locator: ReturnType<Page['locator']>) =>
  locator.evaluate((el) => Number(getComputedStyle(el).opacity));

const title = (page: Page) =>
  page.getByRole('main').getByRole('heading', { level: 1 });

test('AC-73.1 and AC-73.3 the large date gives way to a slim bar, and back', async ({
  page,
}) => {
  await seed(page);
  const slim = bar(page);

  expect(await opacity(slim)).toBe(0);
  expect(await opacity(title(page))).toBe(1);

  await page.mouse.wheel(0, 600);
  await expect.poll(() => opacity(slim)).toBe(1);
  expect(await opacity(title(page))).toBe(0);
  const box = (await slim.boundingBox())!;
  expect(box.y).toBe(0);

  await page.mouse.wheel(0, -600);
  await expect.poll(() => opacity(slim)).toBe(0);
});

test('AC-73.2 the list blurs under the bar', async ({ page }) => {
  await seed(page);
  const filter = await bar(page).evaluate(
    (el) => getComputedStyle(el).backdropFilter,
  );
  expect(filter).toContain('blur');
});

test('AC-73.5 only Home has the bar', async ({ page }) => {
  await seed(page);
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();
  await expect(bar(page)).toHaveCount(0);
});
