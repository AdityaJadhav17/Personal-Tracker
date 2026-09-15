import { test, expect, type Page } from '@playwright/test';

/** A date the browser's date control accepts, relative to the real clock. */
function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

async function add(
  page: Page,
  title: string,
  daysFromToday = 0,
  options: { time?: string; category?: string; priority?: string } = {},
) {
  if (title) await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due').fill(isoDate(daysFromToday));
  if (options.time) await page.getByLabel('Time').fill(options.time);
  if (options.category) {
    await page.getByLabel('Category').selectOption(options.category);
  }
  if (options.priority) {
    await page.getByLabel('Priority').selectOption(options.priority);
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test('AC-01.1 adding an item puts it in the list', async ({ page }) => {
  await page.goto('/');

  await add(page, 'CSE 100 project', 3, { priority: 'high' });

  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText('CSE 100 project')).toBeVisible();
});

test('AC-01.1 an item survives a real page reload', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Rent');
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
});

test('AC-01.1 school and life items sit in one list', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Midterm', 5, { category: 'academic' });
  await add(page, 'Tuition payment', 6, { category: 'personal' });

  await expect(page.getByRole('listitem')).toHaveCount(2);
});

test('AC-19.2 a date with no time is due at the end of that day', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Rent', 0);

  await expect(page.getByText('11:59 PM')).toBeVisible();
});

test('AC-19.3 picking a time uses that time instead', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Dentist', 2, { time: '14:30' });

  await expect(page.getByText('2:30 PM')).toBeVisible();
});

test('AC-01.2 submitting with no title adds nothing and says why', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Due').fill(isoDate(0));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Give it a title.')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('AC-19.4 submitting with no date adds nothing and says why', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Title').fill('Dentist');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Pick a date.')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('a title containing markup is shown as text, not executed', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });

  await page.goto('/');

  await add(page, '<img src=x onerror=alert(1)>', 3);

  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
  await page.reload();
  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(await page.locator('img').count()).toBe(0);
});
