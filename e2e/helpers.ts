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

/**
 * US-57. One per item: its done control. Home's days are list items too, so
 * counting list items no longer counts items.
 */
export function doneControls(page: Page) {
  return page.getByRole('button', { name: /^Mark .+ done$/ });
}

/** US-57. An item's own row, not the day it sits under. */
export function row(page: Page, title: string) {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: title, exact: true }) })
    .last();
}

/** US-57. A day's heading on Home, named in full: "September 29, 2026". */
export function dayName(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** US-58. Export, import and the calendar tools live in the Data view. */
export async function openData(page: Page) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Data', exact: true })
    .click();
}

/** Back to the list, to read what an import or a paste brought in. */
export async function openHome(page: Page) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Home', exact: true })
    .click();
}

/**
 * US-73. Home's summary sentence, the one a screen reader hears. The
 * collapsing bar repeats it for the eye, hidden from assistive technology,
 * so matching the text alone finds two.
 */
export function summary(page: Page, text: string) {
  return page
    .getByRole('paragraph')
    .filter({ hasText: new RegExp(`^${text}$`) });
}
