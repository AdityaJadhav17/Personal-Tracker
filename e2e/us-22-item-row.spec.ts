import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

async function addItem(page: Page, title: string, daysFromToday = 1) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

async function addCourse(page: Page, name: string) {
  await page.getByRole('button', { name: 'Courses' }).click();
  await page.getByLabel('Course name').fill(name);
  await page.getByRole('button', { name: 'Add course' }).click();
  await page.getByRole('button', { name: 'Home' }).click();
}

/** The title, which is also the control that opens the item. */
function title(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true });
}

test('AC-22.3 a closed row carries no select and no note field', async ({
  page,
}) => {
  await page.goto('/');
  await addCourse(page, 'CSE 110');
  await addItem(page, 'Midterm');

  await expect(page.getByLabel('Course for Midterm')).toHaveCount(0);
  await expect(page.getByLabel('Note for Midterm')).toHaveCount(0);
});

test('AC-22.1 a closed row names the course it belongs to', async ({
  page,
}) => {
  await page.goto('/');
  await addCourse(page, 'CSE 110');
  await addItem(page, 'Midterm');

  await title(page, 'Midterm').click();
  await page
    .getByLabel('Course for Midterm')
    .selectOption({ label: 'CSE 110' });
  await title(page, 'Midterm').click();

  // Scoped to the row: US-27 put the course name in a filter as well.
  await expect(page.getByRole('listitem').getByText('CSE 110')).toBeVisible();
});

test('AC-22.2 an item with no course shows nothing where a course would be', async ({
  page,
}) => {
  await page.goto('/');
  await addCourse(page, 'CSE 110');
  await addItem(page, 'Rent');

  // The course exists, this item just does not belong to it. Read off the row,
  // since the filter lists every course whatever the items say.
  await expect(page.getByRole('listitem').getByText('CSE 110')).toHaveCount(0);
});

test('AC-22.4 and AC-22.5 the title opens the controls and closes them again', async ({
  page,
}) => {
  await page.goto('/');
  await addCourse(page, 'CSE 110');
  await addItem(page, 'Midterm');

  await title(page, 'Midterm').click();
  await expect(page.getByLabel('Course for Midterm')).toBeVisible();
  await expect(page.getByLabel('Note for Midterm')).toBeVisible();

  await title(page, 'Midterm').click();
  await expect(page.getByLabel('Course for Midterm')).toHaveCount(0);
});

test('AC-22.6 the title reports whether the item is open', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Midterm');

  await expect(title(page, 'Midterm')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await title(page, 'Midterm').click();
  await expect(title(page, 'Midterm')).toHaveAttribute('aria-expanded', 'true');
});

test('AC-22.6 the title opens from the keyboard, with no mouse', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Midterm');

  await title(page, 'Midterm').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Note for Midterm')).toBeVisible();

  await page.keyboard.press(' ');
  await expect(page.getByLabel('Note for Midterm')).toHaveCount(0);
});

test('AC-22.7 a note stays readable when the row is closed', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Rent');

  await title(page, 'Rent').click();
  await page.getByLabel('Note for Rent').fill('Zelle, not Venmo');
  await page.getByLabel('Note for Rent').blur();
  await title(page, 'Rent').click();

  await expect(page.getByText('Zelle, not Venmo')).toBeVisible();
});

test('AC-22.8 done is still two tab stops from the add button', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Midterm');
  await addItem(page, 'Rent', 2);

  await page.getByRole('button', { name: 'Add', exact: true }).focus();

  // Each item contributes its done control then its title, in display order.
  for (const name of [
    'Mark Midterm done',
    'Midterm',
    'Mark Rent done',
    'Rent',
  ]) {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName(name);
  }
});

test('opening one item leaves the others closed', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Midterm');
  await addItem(page, 'Rent', 2);

  await title(page, 'Midterm').click();

  await expect(page.getByLabel('Note for Midterm')).toBeVisible();
  await expect(page.getByLabel('Note for Rent')).toHaveCount(0);
});
