import { test, expect, type Page } from '@playwright/test';

test.use({ colorScheme: 'light' });

const ACCENT_SOFT = 'rgb(230, 244, 242)';

/** A day in this month with room either side, as the calendar cell names it. */
function dayName(date: number): string {
  const d = new Date();
  d.setDate(date);
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function seedAndOpenCalendar(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const due = new Date();
    due.setDate(10);
    due.setHours(12, 0, 0, 0);
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: due.toISOString(),
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
            repeatDay: null,
            parentId: null,
          },
        ],
      }),
    );
  });
  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
}

function background(page: Page, day: string) {
  return page
    .getByRole('cell', { name: new RegExp(day) })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
}

test('AC-48.1 the day under a dragged item lights up, and goes quiet after the drop', async ({
  page,
}) => {
  await seedAndOpenCalendar(page);
  const target = dayName(12);
  const before = await background(page, target);

  const item = await page
    .getByRole('button', { name: 'CSE 123 HW 1', exact: true })
    .boundingBox();
  const cell = await page
    .getByRole('cell', { name: new RegExp(target) })
    .boundingBox();
  await page.mouse.move(item!.x + 10, item!.y + 5);
  await page.mouse.down();
  await page.mouse.move(cell!.x + 30, cell!.y + 40, { steps: 6 });

  expect(await background(page, target)).toBe(ACCENT_SOFT);

  await page.mouse.up();
  expect(await background(page, target)).toBe(before);
});

test('AC-48.2 panels and status messages enter from a starting style, not a jump', async ({
  page,
}) => {
  await page.goto('/');

  const entering = await page.evaluate(() => {
    const found: string[] = [];
    const walk = (rules: CSSRuleList, inStarting: boolean) => {
      for (const rule of rules) {
        const starting =
          inStarting || rule.cssText.startsWith('@starting-style');
        if ('cssRules' in rule && !(rule instanceof CSSStyleRule)) {
          walk((rule as CSSGroupingRule).cssRules, starting);
        } else if (rule instanceof CSSStyleRule && starting) {
          found.push(rule.selectorText);
        }
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules, false);
    return found;
  });

  expect(entering).toEqual(
    expect.arrayContaining([
      '.item__edit',
      '.calendar__day',
      '.status__message',
    ]),
  );
});
