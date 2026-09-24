import { test, expect, type Page } from '@playwright/test';

/** A day this month with room either side, whatever day the spec runs. */
function base(): Date {
  const d = new Date();
  d.setDate(d.getDate() > 20 ? 10 : 20);
  return d;
}

function named(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function openCalendar(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
}

const cell = (page: Page, d: Date) =>
  page.getByRole('cell', { name: new RegExp(`${named(d)}`) });

test('AC-53.1 click an empty part of a day, type, Enter: it is on that day, and still there after a reload', async ({
  page,
}) => {
  const day = base();
  await openCalendar(page);

  // The lower right of the cell, clear of the date and any items.
  const box = await cell(page, day).boundingBox();
  await page.mouse.click(box!.x + box!.width - 8, box!.y + box!.height - 8);
  await page.keyboard.type('Dentist');
  await page.keyboard.press('Enter');

  await expect(
    cell(page, day).getByRole('button', { name: 'Dentist', exact: true }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(
    cell(page, day).getByRole('button', { name: 'Dentist', exact: true }),
  ).toBeVisible();
});

test('AC-53.1 the day opens beside its cell, not somewhere else on the page', async ({
  page,
}) => {
  const day = base();
  await openCalendar(page);

  await cell(page, day)
    .getByRole('button', { name: `Open ${named(day)}`, exact: true })
    .click();

  const from = (await cell(page, day).boundingBox())!;
  const pop = (await page
    .getByRole('dialog', { name: named(day) })
    .boundingBox())!;
  // Touching the cell's left or right side, give or take the 8px gap.
  const gap = Math.min(
    Math.abs(pop.x - (from.x + from.width)),
    Math.abs(pop.x + pop.width - from.x),
  );
  expect(gap).toBeLessThanOrEqual(12);
});

test('AC-53.7 Escape closes the day and gives focus back to the date that opened it', async ({
  page,
}) => {
  const day = base();
  await openCalendar(page);
  const date = cell(page, day).getByRole('button', {
    name: `Open ${named(day)}`,
    exact: true,
  });

  await date.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(date).toBeFocused();
});
