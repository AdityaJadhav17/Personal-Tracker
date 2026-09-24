import type { Page } from '@playwright/test';

/**
 * Helpers that nineteen specs used to copy. A spec whose helper takes
 * different arguments keeps its own, rather than bending this one to fit.
 */

/** A local date `daysFromToday` away, as `<input type="date">` wants it. */
export function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Add an item through the form, the way a person does. */
export async function add(
  page: Page,
  title: string,
  daysFromToday = 0,
  options: { time?: string; category?: string; priority?: string } = {},
) {
  if (title) await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  if (options.time) {
    await page.getByLabel('Time', { exact: true }).fill(options.time);
  }
  if (options.category) {
    await page.getByLabel('Category').selectOption(options.category);
  }
  if (options.priority) {
    await page.getByLabel('Priority').selectOption(options.priority);
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/**
 * Open an item's controls. US-22 put the note and the selects behind the
 * title, so anything that edits an item clicks it open first. A reload closes
 * every row again.
 */
export async function open(page: Page, title: string) {
  await page.getByRole('button', { name: title, exact: true }).click();
}
