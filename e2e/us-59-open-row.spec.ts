import { test, expect, type Page } from '@playwright/test';
import { add, isoDate, open } from './helpers';

/** One item, opened, with a course and a goal so every control is there. */
async function openedRow(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses', exact: true }).click();
  await page.getByLabel('Course name', { exact: true }).fill('CSE 120');
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  await page.getByRole('button', { name: 'Goals', exact: true }).click();
  await page.getByLabel('Goal name', { exact: true }).fill('AWS cert');
  await page.getByLabel('Target date', { exact: true }).fill(isoDate(30));
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await add(page, 'HW 1', 3);
  await open(page, 'HW 1');
  // The panel rises 4px as it opens (AC-48.2). Measured mid-rise, two fields
  // on one row can be caught a frame apart, so wait for it to settle. Only
  // animations on the clock count: US-73's header runs on the scroll
  // position and is always "running".
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.timeline === document.timeline)
      .every((a) => a.playState !== 'running'),
  );
}

const box = async (page: Page, label: string) =>
  (await page.getByLabel(label, { exact: true }).boundingBox())!;

test('AC-59.2 every single-line control in the open row is the same height', async ({
  page,
}) => {
  await openedRow(page);

  const heights = await Promise.all(
    [
      'Title for HW 1',
      'Due for HW 1',
      'Time for HW 1',
      'Repeat for HW 1',
      'Course for HW 1',
      'Goal for HW 1',
      'New step for HW 1',
      'Step date for HW 1',
    ].map(async (label) => Math.round((await box(page, label)).height)),
  );

  expect(new Set(heights).size).toBe(1);
});

test('AC-59.3 when, then what it belongs to: Due, Time and Repeat share a row, Course and Goal the next', async ({
  page,
}) => {
  await openedRow(page);

  const [due, time, repeat, course, goal] = await Promise.all(
    ['Due', 'Time', 'Repeat', 'Course', 'Goal'].map((field) =>
      box(page, `${field} for HW 1`),
    ),
  );

  expect(time!.y).toBe(due!.y);
  expect(repeat!.y).toBe(due!.y);
  expect(goal!.y).toBe(course!.y);
  expect(course!.y).toBeGreaterThan(due!.y);
});
