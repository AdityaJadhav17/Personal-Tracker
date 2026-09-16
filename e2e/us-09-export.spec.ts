import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

async function add(page: Page, title: string, daysFromToday = 0) {
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Due').fill(isoDate(daysFromToday));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/** Click Export and read the file the browser actually produced. */
async function exportAndRead(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ]);

  // Read as strings rather than Buffers, which would drag @types/node in for
  // one test helper. The export is small enough to arrive in one chunk.
  const stream = await download.createReadStream();
  const parts: string[] = [];
  for await (const chunk of stream) parts.push(String(chunk));

  return {
    filename: download.suggestedFilename(),
    text: parts.join(''),
  };
}

/**
 * Open an item's controls. US-22 put the note and the selects behind the
 * title, so anything that edits an item clicks it open first. A reload closes
 * every row again.
 */
async function open(page: Page, title: string) {
  await page.getByRole('button', { name: title, exact: true }).click();
}

test('AC-09.1 exporting downloads a real file containing every item', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await add(page, 'Midterm', 3);

  const { text } = await exportAndRead(page);

  const parsed = JSON.parse(text) as {
    version: number;
    items: { title: string }[];
  };
  expect(parsed.version).toBe(2);
  expect(parsed.items.map((i) => i.title).sort()).toEqual(['Midterm', 'Rent']);
});

test('AC-09.1 the download is named for the day it was taken', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');

  const { filename } = await exportAndRead(page);

  expect(filename).toBe(`personal-tracker-${isoDate(0)}.json`);
});

test('AC-09.1 notes and done state are carried in the file', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await open(page, 'Rent');
  await page.getByLabel('Note for Rent').fill('Zelle, not Venmo');
  await page.getByLabel('Note for Rent').blur();
  await page.getByRole('button', { name: 'Mark Rent done' }).click();

  const { text } = await exportAndRead(page);

  const parsed = JSON.parse(text) as {
    items: { note: string; status: string; completedAt: string | null }[];
  };
  expect(parsed.items[0]?.note).toBe('Zelle, not Venmo');
  expect(parsed.items[0]?.status).toBe('done');
  expect(parsed.items[0]?.completedAt).not.toBeNull();
});

test('AC-09.2 exporting an empty database downloads a valid file', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Nothing due yet.')).toBeVisible();

  const { text } = await exportAndRead(page);

  expect(JSON.parse(text)).toEqual({
    version: 2,
    items: [],
    goals: [],
    courses: [],
    reflections: [],
  });
});

test('AC-09.1 exporting sends nothing off-origin', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/');
  await add(page, 'Rent');
  await exportAndRead(page);

  // The whole point of owning the file is that taking it costs no network.
  expect(offOrigin).toEqual([]);
});
