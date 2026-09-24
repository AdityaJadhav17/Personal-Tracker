import { test, expect, type Page } from '@playwright/test';

/**
 * A day next to today in the same month, so both cells are on screen whatever
 * day the spec runs: tomorrow, unless today is the last of the month.
 */
function neighbour(): number {
  const d = new Date();
  const month = d.getMonth();
  d.setDate(d.getDate() + 1);
  return d.getMonth() === month ? 1 : -1;
}

/** A day named the way a calendar cell reads it, "September 16, 2026". */
function dayName(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function cell(page: Page, offset: number) {
  return page.getByRole('cell', { name: new RegExp(dayName(offset)) });
}

/** One open item due today at 8am, then the calendar. */
async function seedHomework(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const due = new Date();
    due.setHours(8, 0, 0, 0);
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 3,
        goals: [],
        courses: [],
        reflections: [],
        items: [
          {
            id: 'hw',
            title: 'CSE 123 HW 1',
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
          },
        ],
      }),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
}

function storedDue(page: Page) {
  return page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
      items: { dueAt: string }[];
    };
    const due = new Date(db.items[0]!.dueAt);
    return { day: due.getDate(), hours: due.getHours() };
  });
}

test('AC-39.2 a dragged item is on its new day after a reload, at the same time', async ({
  page,
}) => {
  const to = neighbour();
  await seedHomework(page);

  await page.getByText('CSE 123 HW 1').dragTo(cell(page, to));
  await expect(page.getByRole('status')).toHaveText(
    `CSE 123 HW 1 moved to ${dayName(to)}`,
  );

  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(cell(page, to)).toContainText('CSE 123 HW 1');
  await expect(cell(page, 0)).not.toContainText('CSE 123 HW 1');

  const expected = new Date();
  expected.setDate(expected.getDate() + to);
  expect(await storedDue(page)).toEqual({
    day: expected.getDate(),
    hours: 8,
  });
});

test('AC-39.4 dropping it back on its own day leaves the deadline alone', async ({
  page,
}) => {
  await seedHomework(page);
  const before = await storedDue(page);

  await page.getByText('CSE 123 HW 1').dragTo(cell(page, 0));

  await expect(page.getByRole('status')).toBeEmpty();
  expect(await storedDue(page)).toEqual(before);
});

test('AC-39.6 an item dragged over Next month can be dropped in the next month', async ({
  page,
}) => {
  await seedHomework(page);
  const heading = page.getByRole('heading', { level: 2 });
  const thisMonth = await heading.textContent();

  const next = new Date();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  next.setDate(10);
  const target = next.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Held down the whole way, as a hand would: pick up, rest on the button
  // until the page turns, then carry on to a day that was not on screen.
  await page.getByText('CSE 123 HW 1').hover();
  await page.mouse.down();
  const button = await page
    .getByRole('button', { name: 'Next month' })
    .boundingBox();
  await page.mouse.move(button!.x + 10, button!.y + 10, { steps: 5 });
  await expect(heading).not.toHaveText(thisMonth!);
  const day = await page
    .getByRole('cell', { name: new RegExp(target) })
    .boundingBox();
  await page.mouse.move(day!.x + 20, day!.y + 20, { steps: 5 });
  await page.mouse.up();

  await expect(page.getByRole('status')).toHaveText(
    `CSE 123 HW 1 moved to ${target}`,
  );
  await page.reload();
  expect(await storedDue(page)).toEqual({ day: 10, hours: 8 });
});
