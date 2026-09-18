import { test, expect, type Page } from '@playwright/test';

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
  daysFromToday: number,
  priority?: string,
) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  if (priority) await page.getByLabel('Priority').selectOption(priority);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test('AC-12.1 an item due in two days is marked', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Midterm', 2);

  await expect(page.getByText('Soon')).toBeVisible();
});

test('AC-12.2 an item due in nine days is not marked', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Finals', 9);

  await expect(page.getByText('Soon')).toHaveCount(0);
});

test('AC-12.3 a low priority item due in two days is still marked', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Laundry', 2, 'low');

  await expect(page.getByText('Soon')).toBeVisible();
});

test('AC-12.1 only the items inside the window are marked', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Late thing', -2);
  await add(page, 'Today thing', 0);
  await add(page, 'Soon thing', 2);
  await add(page, 'Far thing', 20);

  await expect(page.getByText('Soon', { exact: true })).toHaveCount(1);
  await expect(
    page.locator('li', { has: page.getByText('Soon thing') }),
  ).toContainText('Soon');
});

test('AC-12.1 the marker survives a reload', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Midterm', 2);

  await page.reload();

  await expect(page.getByText('Soon')).toBeVisible();
});

test('AC-12.1 finishing a marked item takes the marker with it', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Midterm', 2);

  await page.getByRole('button', { name: 'Mark Midterm done' }).click();

  await expect(page.getByText('Soon')).toHaveCount(0);
});
