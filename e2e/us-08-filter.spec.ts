import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

async function addItem(
  page: Page,
  title: string,
  category: 'academic' | 'personal',
  daysFromToday = 1,
) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  await page.getByLabel('Category', { exact: true }).selectOption(category);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/** The filter control, so a bare button name cannot reach the wrong thing. */
function show(page: Page, label: string) {
  return page.getByRole('group', { name: 'Show' }).getByRole('button', {
    name: label,
    exact: true,
  });
}

test('AC-08.1 filtering to academic hides personal, and back again', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'CSE 110 midterm', 'academic');
  await addItem(page, 'Dentist', 'personal', 2);

  await show(page, 'Academic').click();
  await expect(
    page.getByRole('button', { name: 'CSE 110 midterm', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Dentist', exact: true }),
  ).toHaveCount(0);

  await show(page, 'All').click();
  await expect(
    page.getByRole('button', { name: 'Dentist', exact: true }),
  ).toBeVisible();
});

test('AC-08.1 the group headings still apply to what is left', async ({
  page,
}) => {
  await page.goto('/');
  // Personal today, academic next month: filtering should leave one heading.
  await addItem(page, 'Dentist', 'personal', 0);
  await addItem(page, 'Finals', 'academic', 30);

  await show(page, 'Academic').click();

  await expect(page.getByRole('heading', { name: 'Later' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today' })).toHaveCount(0);
});

test('AC-08.2 a reload clears the filter', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'CSE 110 midterm', 'academic');
  await addItem(page, 'Dentist', 'personal', 2);

  await show(page, 'Academic').click();
  await expect(
    page.getByRole('button', { name: 'Dentist', exact: true }),
  ).toHaveCount(0);

  await page.reload();

  await expect(
    page.getByRole('button', { name: 'Dentist', exact: true }),
  ).toBeVisible();
  await expect(show(page, 'All')).toHaveAttribute('aria-pressed', 'true');
});

test('AC-08.3 a filter that hides everything says so and offers a way back', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'CSE 110 midterm', 'academic');

  await show(page, 'Personal').click();

  await expect(page.getByText(/Nothing personal is open/i)).toBeVisible();
  await expect(page.getByText(/Nothing due yet/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Show everything' }).click();
  await expect(
    page.getByRole('button', { name: 'CSE 110 midterm', exact: true }),
  ).toBeVisible();
});

test('AC-08.1 the filter narrows the list, not the day', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'CSE 110 midterm', 'academic', 0);
  await addItem(page, 'Dentist', 'personal', 0);

  await show(page, 'Academic').click();

  // Two things are still due today, whatever the list is showing. Read off the
  // paragraph that holds both the number and the words, so this cannot pass on
  // a stray 2 somewhere else on the page.
  await expect(page.getByText(/^2\s*remaining today$/i)).toBeVisible();
});

test('AC-08.1 marking something done still works while filtered', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'CSE 110 midterm', 'academic');
  await addItem(page, 'Dentist', 'personal', 2);

  await show(page, 'Academic').click();
  await page.getByRole('button', { name: 'Mark CSE 110 midterm done' }).click();

  await expect(page.getByText(/Nothing academic is open/i)).toBeVisible();

  await page.keyboard.press('u');
  await expect(
    page.getByRole('button', { name: 'CSE 110 midterm', exact: true }),
  ).toBeVisible();
});
