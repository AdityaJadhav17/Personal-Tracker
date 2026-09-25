import { test, expect, type Page } from '@playwright/test';
import { dayName, isoDate, open, openData } from './helpers';

async function addItem(page: Page, title: string, daysFromToday = 1) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test('AC-25.1 a renamed item keeps its new name across a reload', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Midterm');

  await open(page, 'Midterm');
  await page.getByLabel('Title for Midterm').fill('CSE 110 midterm');
  await page.getByRole('button', { name: 'Save Midterm' }).click();

  await expect(page.getByText('CSE 110 midterm')).toBeVisible();

  await page.reload();
  await expect(page.getByText('CSE 110 midterm')).toBeVisible();
  await expect(page.getByText('Midterm', { exact: true })).toHaveCount(0);
});

test('AC-25.3 clearing the title saves nothing and says why', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Midterm');

  await open(page, 'Midterm');
  await page.getByLabel('Title for Midterm').fill('');
  await page.getByRole('button', { name: 'Save Midterm' }).click();

  await expect(page.getByText('Give it a title.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Midterm', { exact: true })).toBeVisible();
});

test('AC-25.2 moving the date moves the item to its new day', async ({
  page,
}) => {
  await page.goto('/');
  // Due tomorrow, so it starts under tomorrow (US-57: headings are days).
  await addItem(page, 'Midterm', 1);
  await expect(
    page.getByRole('heading', { name: dayName(1), exact: true }),
  ).toBeVisible();

  await open(page, 'Midterm');
  await page.getByLabel('Due for Midterm').fill(isoDate(30));
  await page.getByRole('button', { name: 'Save Midterm' }).click();

  await expect(
    page.getByRole('heading', { name: dayName(30), exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: dayName(1), exact: true }),
  ).toHaveCount(0);
});

test('AC-25.2 a moved deadline survives a reload', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Midterm', 1);

  await open(page, 'Midterm');
  await page.getByLabel('Due for Midterm').fill(isoDate(30));
  await page.getByLabel('Time for Midterm').fill('09:00');
  await page.getByRole('button', { name: 'Save Midterm' }).click();

  await page.reload();
  await expect(page.getByText(/9:00 AM/)).toBeVisible();
});

test('AC-67.3 Delete acts at once, and Undo puts it back for good', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Midterm');

  await open(page, 'Midterm');
  await page.getByRole('button', { name: 'Delete Midterm' }).click();
  await expect(page.getByText('Midterm', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Midterm', { exact: true })).toBeVisible();
});

test('AC-25.5 a confirmed deletion does not come back', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Midterm');
  await addItem(page, 'Rent', 2);

  await open(page, 'Midterm');
  await page.getByRole('button', { name: 'Delete Midterm' }).click();

  await expect(page.getByText('Midterm', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText('Midterm', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
});

test('AC-25.5 a deleted item leaves the calendar too', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Midterm');

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByText('Midterm', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await open(page, 'Midterm');
  await page.getByRole('button', { name: 'Delete Midterm' }).click();

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByText('Midterm', { exact: true })).toHaveCount(0);
});

test('AC-25.6 deleting an item drops it from its goal progress', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Goals', exact: true }).click();
  await page.getByLabel('Goal name').fill('Finish the quarter');
  await page.getByLabel('Target date').fill(isoDate(60));
  await page.getByRole('button', { name: 'Add goal' }).click();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await addItem(page, 'Pset 1');
  await addItem(page, 'Pset 2', 2);
  for (const title of ['Pset 1', 'Pset 2']) {
    await open(page, title);
    await page
      .getByLabel(`Goal for ${title}`)
      .selectOption({ label: 'Finish the quarter' });
    await open(page, title);
  }

  await page.getByRole('button', { name: 'Goals', exact: true }).click();
  await expect(page.getByText('0 of 2 done')).toBeVisible();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await open(page, 'Pset 2');
  await page.getByRole('button', { name: 'Delete Pset 2' }).click();

  await page.getByRole('button', { name: 'Goals', exact: true }).click();
  await expect(page.getByText('0 of 1 done')).toBeVisible();
});

test('AC-25.7 deleting is not finishing: nothing counts as completed', async ({
  page,
}) => {
  await page.goto('/');
  // Due today, so it shows in the header's count.
  await addItem(page, 'Midterm', 0);
  await expect(page.getByText('1 due today', { exact: true })).toBeVisible();

  await open(page, 'Midterm');
  await page.getByRole('button', { name: 'Delete Midterm' }).click();

  // The whole point of US-25: clearing a mistake must not inflate the
  // completed numbers the way marking it done would.
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}'),
  );
  expect(stored.items).toEqual([]);
});

test('AC-25.5 a deleted item is not in the calendar export either', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Midterm');
  await addItem(page, 'Rent', 2);

  await open(page, 'Midterm');
  await page.getByRole('button', { name: 'Delete Midterm' }).click();

  await openData(page);
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export calendar' }).click();
  const download = await wait;

  const stream = await download.createReadStream();
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk as Uint8Array);
  const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);

  expect(text).not.toContain('Midterm');
  expect(text).toContain('Rent');
});
