import type { Page } from '@playwright/test';
import { test, expect, TODAY } from './clock';
import { add, dayName } from './helpers';

const calendar = (page: Page) =>
  page
    .getByRole('navigation')
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();

/** A day this month, as the grid names it: "Open September 29, 2026". */
const day = (page: Page, daysFromToday: number) =>
  page.getByRole('cell', {
    name: new RegExp(`Open ${dayName(daysFromToday)}`),
  });

const stored = (page: Page) =>
  page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
          items: { title: string; dueAt: string; repeat: string }[];
        }
      ).items,
  );

/** The next day in the same month, so both are on one page of the grid. */
function neighbour() {
  const today = new Date(TODAY);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return today.getDate() < last.getDate() ? 1 : -1;
}

test('AC-79.1 and AC-79.2 Ctrl-dragging copies, and a plain drag still moves', async ({
  page,
}) => {
  const to = neighbour();
  await page.goto('/');
  await add(page, 'Reading quiz', 0);
  await calendar(page);

  // AC-79.4. The hover says how.
  const chip = page.getByRole('button', { name: 'Reading quiz', exact: true });
  await expect(chip).toHaveAttribute('title', /hold Ctrl as you drop to copy/);

  await page.keyboard.down('Control');
  await chip.dragTo(day(page, to));
  await page.keyboard.up('Control');

  await expect(page.getByRole('status').first()).toHaveText(
    `Reading quiz copied to ${dayName(to)}`,
  );
  await page.reload();
  await calendar(page);
  await expect(day(page, 0)).toContainText('Reading quiz');
  await expect(day(page, to)).toContainText('Reading quiz');
  expect(await stored(page)).toHaveLength(2);
});

test('AC-79.3 Undo takes the copy back', async ({ page }) => {
  const to = neighbour();
  await page.goto('/');
  await add(page, 'Reading quiz', 0);
  await calendar(page);

  await page.keyboard.down('Control');
  await page
    .getByRole('button', { name: 'Reading quiz', exact: true })
    .dragTo(day(page, to));
  await page.keyboard.up('Control');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();

  expect(await stored(page)).toHaveLength(1);
  await expect(day(page, to)).not.toContainText('Reading quiz');
});
