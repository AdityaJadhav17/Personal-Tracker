import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

async function addItem(page: Page, title: string, daysFromToday = 0) {
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due').fill(isoDate(daysFromToday));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

async function addCourse(
  page: Page,
  name: string,
  details: { location?: string; email?: string; hours?: string } = {},
) {
  await page.getByLabel('Course name').fill(name);
  if (details.location) {
    await page.getByLabel('Location').fill(details.location);
  }
  if (details.email) {
    await page.getByLabel('Professor email').fill(details.email);
  }
  if (details.hours) {
    await page.getByLabel('Office hours').fill(details.hours);
  }
  await page.getByRole('button', { name: 'Add course' }).click();
}

/**
 * Open an item's controls. US-22 put the note and the selects behind the
 * title, so anything that edits an item clicks it open first. A reload closes
 * every row again.
 */
async function open(page: Page, title: string) {
  await page.getByRole('button', { name: title, exact: true }).click();
}

test('AC-07.1 a course keeps every detail across a real reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();

  await addCourse(page, 'CSE 100', {
    location: 'Center Hall 101',
    email: 'prof@ucsd.edu',
    hours: 'Tue 2-4pm, CSE 3108',
  });

  await page.reload();
  await page.getByRole('button', { name: 'Courses' }).click();

  await expect(page.getByRole('heading', { name: 'CSE 100' })).toBeVisible();
  await expect(page.getByText('Center Hall 101')).toBeVisible();
  await expect(page.getByText('prof@ucsd.edu')).toBeVisible();
  await expect(page.getByText('Tue 2-4pm, CSE 3108')).toBeVisible();
});

test('AC-07.1 a course with no name is refused', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();

  await page.getByLabel('Location').fill('Center Hall 101');
  await page.getByRole('button', { name: 'Add course' }).click();

  await expect(page.getByText('Give the course a name.')).toBeVisible();
  await expect(page.getByText('No courses yet.')).toBeVisible();
});

test('AC-07.2 an item can be given a course, and keeps it after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();
  await addCourse(page, 'CSE 100');

  await page.getByRole('button', { name: 'Home' }).click();
  await addItem(page, 'Project', 3);
  await open(page, 'Project');
  await page
    .getByLabel('Course for Project')
    .selectOption({ label: 'CSE 100' });

  await page.reload();

  // Closed, the row names the course it belongs to (AC-22.1).
  await expect(page.getByText('CSE 100')).toBeVisible();

  await open(page, 'Project');
  await expect(page.getByLabel('Course for Project')).toHaveValue(/.+/);
  await expect(
    page.getByRole('option', { name: 'CSE 100', selected: true }),
  ).toBeAttached();
});

test('AC-07.2 no course control appears until a course exists', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Rent', 0);
  await open(page, 'Rent');

  await expect(page.getByLabel('Course for Rent')).toHaveCount(0);
});

test('AC-07.3 and AC-20.3 deleting asks first, then keeps the items', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();
  await addCourse(page, 'CSE 100');

  await page.getByRole('button', { name: 'Home' }).click();
  await addItem(page, 'Project', 3);
  await open(page, 'Project');
  await page
    .getByLabel('Course for Project')
    .selectOption({ label: 'CSE 100' });

  await page.getByRole('button', { name: 'Courses' }).click();
  await page.getByRole('button', { name: 'Delete CSE 100' }).click();

  // Nothing gone yet.
  await expect(page.getByText('Delete CSE 100? Its items stay.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CSE 100' })).toBeVisible();

  await page.getByRole('button', { name: 'Yes, delete' }).click();

  await expect(page.getByText('No courses yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Home' }).click();
  await expect(page.getByText('Project')).toBeVisible();

  // Opened, because a closed row hides the control either way.
  await open(page, 'Project');
  await expect(page.getByLabel('Course for Project')).toHaveCount(0);
});

test('AC-20.3 keeping the course removes nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();
  await addCourse(page, 'CSE 100');

  await page.getByRole('button', { name: 'Delete CSE 100' }).click();
  await page.getByRole('button', { name: 'Keep' }).click();

  await expect(page.getByRole('heading', { name: 'CSE 100' })).toBeVisible();
  await expect(page.getByText('No courses yet.')).toHaveCount(0);
});

test('courses survive an export and import round trip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Courses' }).click();
  await addCourse(page, 'CSE 100', { location: 'Center Hall 101' });

  await page.getByRole('button', { name: 'Home' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  const file = await download.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('Import').setInputFiles(file!);

  await page.getByRole('button', { name: 'Courses' }).click();
  await expect(page.getByText('Center Hall 101')).toBeVisible();
});
