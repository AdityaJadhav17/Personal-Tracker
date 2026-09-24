import { test, expect, type Page } from '@playwright/test';
import { add, open } from './helpers';

/** Export, and hand back the path of the file the browser actually wrote. */
async function exportToDisk(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export', exact: true }).click(),
  ]);
  return download.path();
}

/**
 * Put arbitrary text into the file input without touching the filesystem,
 * which keeps @types/node out of the project for one test helper.
 */
async function uploadText(page: Page, text: string) {
  await page.getByLabel('Import').evaluate((node, contents: string) => {
    const input = node as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([contents], 'handed-to-me.json', { type: 'application/json' }),
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, text);
}

function storedTitles(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('personal-tracker/v1') ?? '{"items":[]}';
    return (JSON.parse(raw) as { items: { title: string }[] }).items
      .map((i) => i.title)
      .sort();
  });
}

test('AC-10.1 a real export imports back into an empty database exactly', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await add(page, 'Midterm', 3);
  await open(page, 'Rent');
  await page.getByLabel('Note for Rent').fill('Zelle, not Venmo');
  await page.getByLabel('Note for Rent').blur();
  await page.getByRole('button', { name: 'Mark Midterm done' }).click();

  const file = await exportToDisk(page);
  const before = await page.evaluate(() =>
    localStorage.getItem('personal-tracker/v1'),
  );

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('Nothing due yet.')).toBeVisible();

  await page.getByLabel('Import').setInputFiles(file!);

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
  const after = await page.evaluate(() =>
    localStorage.getItem('personal-tracker/v1'),
  );
  expect(JSON.parse(after!)).toEqual(JSON.parse(before!));
});

test('AC-10.2 a file that is not JSON changes nothing and says why', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');

  await uploadText(page, 'not json at all');

  await expect(page.getByRole('alert')).toContainText(/not valid JSON/i);
  expect(await storedTitles(page)).toEqual(['Rent']);
});

test('AC-10.3 a file with no items list changes nothing and names items', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');

  await uploadText(page, '{"version": 1}');

  await expect(page.getByRole('alert')).toContainText(/items/i);
  expect(await storedTitles(page)).toEqual(['Rent']);
});

test('AC-10.3 a file carrying unknown fields is refused by name', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');

  await uploadText(page, '{"version": 1, "items": [], "courses": []}');

  await expect(page.getByRole('alert')).toContainText('courses');
  expect(await storedTitles(page)).toEqual(['Rent']);
});

test('AC-10.4 importing over existing data asks before writing', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');

  await uploadText(page, '{"version": 1, "items": []}');

  await expect(page.getByRole('button', { name: 'Replace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Merge' })).toBeVisible();
  expect(await storedTitles(page)).toEqual(['Rent']);
});

test('AC-10.4 Cancel leaves everything as it was', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Rent');

  await uploadText(page, '{"version": 1, "items": []}');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByRole('button', { name: 'Replace' })).toHaveCount(0);
  expect(await storedTitles(page)).toEqual(['Rent']);
});

test('AC-10.4 Replace swaps everything for the file', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Old thing');
  const file = await exportToDisk(page);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await add(page, 'New thing');

  await page.getByLabel('Import').setInputFiles(file!);
  await page.getByRole('button', { name: 'Replace' }).click();

  expect(await storedTitles(page)).toEqual(['Old thing']);
});

test('AC-10.4 Merge keeps both, and merging the same file twice is a no-op', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Old thing');
  const file = await exportToDisk(page);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await add(page, 'New thing');

  await page.getByLabel('Import').setInputFiles(file!);
  await page.getByRole('button', { name: 'Merge' }).click();
  expect(await storedTitles(page)).toEqual(['New thing', 'Old thing']);

  await page.getByLabel('Import').setInputFiles(file!);
  await page.getByRole('button', { name: 'Merge' }).click();
  expect(await storedTitles(page)).toEqual(['New thing', 'Old thing']);
});

test('AC-10.4 Merge keeps the courses you already had, after a reload', async ({
  page,
}) => {
  const withCourse = (name: string) =>
    JSON.stringify({
      version: 3,
      items: [],
      goals: [],
      courses: [
        {
          id: name,
          name,
          meetingLocation: '',
          professorEmail: '',
          officeHours: '',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      reflections: [],
    });

  await page.goto('/');
  await uploadText(page, withCourse('CSE 120'));
  // Anything held, so the second file asks Replace or Merge.
  await add(page, 'Rent');
  await uploadText(page, withCourse('CSE 123'));
  await page.getByRole('button', { name: 'Merge' }).click();
  await page.reload();

  const courses = await page.evaluate(() =>
    (
      JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
        courses: { name: string }[];
      }
    ).courses.map((c) => c.name),
  );
  expect(courses).toEqual(['CSE 120', 'CSE 123']);
});

test('importing sends nothing off-origin', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/');
  await add(page, 'Rent');
  const file = await exportToDisk(page);
  await page.getByLabel('Import').setInputFiles(file!);
  await page.getByRole('button', { name: 'Merge' }).click();

  expect(offOrigin).toEqual([]);
});
