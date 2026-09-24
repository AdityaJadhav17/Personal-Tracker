import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * US-42. An automated WCAG 2.2 AA scan of every view, in both colour schemes.
 *
 * It does not replace the contrast unit test, which checks the palette itself,
 * or the keyboard specs, which check order and reach. It catches what those
 * cannot: a control with no name, a landmark missing, a region unlabelled.
 */

const VIEWS = ['Home', 'Calendar', 'Goals', 'Courses', 'Reflections', 'Trends'];

/** Something in every group and every collection, so each view has content. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const day = (offset: number, hours = 23, minutes = 59) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      d.setHours(hours, minutes, 0, 0);
      return d.toISOString();
    };
    const item = (id: string, title: string, dueAt: string, extra = {}) => ({
      id,
      title,
      dueAt,
      category: 'academic',
      priority: 'normal',
      status: 'open',
      note: '',
      createdAt: day(-20),
      completedAt: null,
      goalId: null,
      courseId: null,
      repeat: 'none',
      repeatDay: null,
      ...extra,
    });
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 4,
        lastBackupAt: null,
        goals: [
          {
            id: 'goal',
            name: 'AWS certification',
            description: 'Pass the associate exam',
            targetAt: day(10, 12, 0),
            createdAt: day(-20),
          },
        ],
        courses: [
          {
            id: 'course',
            name: 'CSE 123',
            meetingLocation: 'CENTR 115',
            professorEmail: 'prof@example.edu',
            officeHours: 'Tue 2-3pm',
            createdAt: day(-20),
          },
        ],
        reflections: [
          {
            id: 'r',
            day: day(-1).slice(0, 10),
            score: 4,
            note: 'Good',
            createdAt: day(-1),
          },
        ],
        items: [
          item('late', 'Overdue reading', day(-2)),
          item('today', 'CSE 123 HW 1', day(0), {
            courseId: 'course',
            goalId: 'goal',
            priority: 'high',
            note: 'Gradescope',
          }),
          item('soon', 'Rent', day(2), {
            category: 'personal',
            repeat: 'monthly',
          }),
          item('later', 'Final exam', day(12, 8, 0)),
          item('done', 'Finished thing', day(-1), {
            status: 'done',
            completedAt: day(-1),
          }),
        ],
      }),
    );
  });
  await page.reload();
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    for (const view of VIEWS) {
      test(`AC-42.1 ${view} has no WCAG 2.2 AA violations (${scheme})`, async ({
        page,
      }) => {
        await seed(page);
        await page.getByRole('button', { name: view, exact: true }).click();
        if (view === 'Calendar') {
          // The open day is part of the view, so it is scanned too.
          await page.getByRole('button', { name: 'CSE 123 HW 1' }).click();
        }

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(
          results.violations.map((v) => ({
            id: v.id,
            help: v.help,
            nodes: v.nodes.map((n) => n.target.join(' ')),
          })),
        ).toEqual([]);
      });
    }
  });
}

test('AC-42.2 the skip link takes a keyboard past the sidebar', async ({
  page,
}) => {
  await seed(page);

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('main')).toBeFocused();
  // The next Tab is inside the content, not back in the sidebar.
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => Boolean(document.activeElement?.closest('main'))),
  ).toBe(true);
});

test('AC-42.3 a deadline can be moved from the calendar with the keyboard alone', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();

  // Reach the calendar item by keyboard focus and open its day with Enter.
  await page.getByRole('button', { name: 'Rent', exact: true }).focus();
  await page.keyboard.press('Enter');
  const row = page.getByRole('region').getByRole('listitem');
  await row.getByRole('button', { name: 'Rent', exact: true }).focus();
  await page.keyboard.press('Enter');

  const target = new Date();
  target.setDate(target.getDate() + 5);
  const value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
  await row.getByLabel('Due for Rent').focus();
  await page.keyboard.type(
    value.split('-').slice(1).join('') + value.slice(0, 4),
  );
  await row.getByRole('button', { name: 'Save Rent' }).focus();
  await page.keyboard.press('Enter');

  const stored = await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
      items: { id: string; dueAt: string }[];
    };
    return new Date(db.items.find((i) => i.id === 'soon')!.dueAt).getDate();
  });
  expect(stored).toBe(target.getDate());
});
