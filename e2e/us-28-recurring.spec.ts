import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

async function addRepeating(
  page: Page,
  title: string,
  repeat: 'none' | 'weekly' | 'monthly',
  daysFromToday = 1,
) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  await page.getByLabel('Repeat', { exact: true }).selectOption(repeat);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/** Every item in storage, which is where a spawned one has to land. */
function stored(page: Page) {
  return page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}') as {
          items?: { title: string; status: string; dueAt: string }[];
        }
      ).items ?? [],
  );
}

/**
 * Put arbitrary text into the file input without touching the filesystem,
 * which keeps @types/node out of the project. Same trick as us-10-import.
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

test('AC-28.1 finishing a monthly item leaves one done and one open', async ({
  page,
}) => {
  await page.goto('/');
  await addRepeating(page, 'Rent', 'monthly');

  await page.getByRole('button', { name: 'Mark Rent done' }).click();

  const items = await stored(page);
  expect(items).toHaveLength(2);
  expect(items.filter((i) => i.status === 'open')).toHaveLength(1);

  const [done] = items.filter((i) => i.status === 'done');
  const [open] = items.filter((i) => i.status === 'open');
  const gap = Date.parse(open!.dueAt) - Date.parse(done!.dueAt);
  // Between 28 and 31 days, whichever month it lands in.
  expect(gap).toBeGreaterThanOrEqual(28 * 86_400_000);
  expect(gap).toBeLessThanOrEqual(31 * 86_400_000);
});

test('AC-28.2 a weekly item comes back exactly seven days later', async ({
  page,
}) => {
  await page.goto('/');
  await addRepeating(page, 'Lab writeup', 'weekly');

  await page.getByRole('button', { name: 'Mark Lab writeup done' }).click();

  const items = await stored(page);
  const [done] = items.filter((i) => i.status === 'done');
  const [open] = items.filter((i) => i.status === 'open');
  expect(Date.parse(open!.dueAt) - Date.parse(done!.dueAt)).toBe(
    7 * 86_400_000,
  );
});

test('AC-28.3 an item that does not repeat creates nothing', async ({
  page,
}) => {
  await page.goto('/');
  await addRepeating(page, 'Midterm', 'none');

  await page.getByRole('button', { name: 'Mark Midterm done' }).click();

  expect(await stored(page)).toHaveLength(1);
});

test('AC-28.4 undo reopens the finished one and removes the new one', async ({
  page,
}) => {
  await page.goto('/');
  await addRepeating(page, 'Rent', 'monthly');

  await page.getByRole('button', { name: 'Mark Rent done' }).click();
  expect(await stored(page)).toHaveLength(2);

  await page.keyboard.press('u');

  const items = await stored(page);
  expect(items).toHaveLength(1);
  expect(items[0]?.status).toBe('open');

  // And it really went, not just from the screen.
  await page.reload();
  expect(await stored(page)).toHaveLength(1);
});

test('AC-28.6 a repeating item says so, and a plain one does not', async ({
  page,
}) => {
  await page.goto('/');
  await addRepeating(page, 'Rent', 'monthly');
  await addRepeating(page, 'Midterm', 'none', 2);

  const rentRow = page.getByRole('listitem').filter({ hasText: 'Rent' });
  const midtermRow = page.getByRole('listitem').filter({ hasText: 'Midterm' });

  await expect(rentRow.getByText('Monthly')).toBeVisible();
  await expect(midtermRow.getByText('Monthly')).toHaveCount(0);
});

test('AC-28.1 the next one survives a reload', async ({ page }) => {
  await page.goto('/');
  await addRepeating(page, 'Rent', 'monthly');
  await page.getByRole('button', { name: 'Mark Rent done' }).click();

  await page.reload();

  await expect(
    page.getByRole('button', { name: 'Rent', exact: true }),
  ).toBeVisible();
  expect(await stored(page)).toHaveLength(2);
});

test('AC-28.7 a version 1 export still imports, with nothing repeating', async ({
  page,
}) => {
  await page.goto('/');
  const v1 = JSON.stringify({
    version: 1,
    items: [
      {
        id: 'legacy-1',
        title: 'Old v1 item',
        dueAt: '2026-09-20T23:59:00.000Z',
        category: 'personal',
        priority: 'high',
        status: 'open',
        note: 'from v1',
        createdAt: '2026-09-01T00:00:00.000Z',
        completedAt: null,
      },
    ],
  });

  await uploadText(page, v1);

  await expect(
    page.getByRole('button', { name: 'Old v1 item', exact: true }),
  ).toBeVisible();

  const db = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}'),
  );
  expect(db.version).toBe(3);
  expect(db.items[0].repeat).toBe('none');
  expect(db.items[0].note).toBe('from v1');
});

test('AC-28.8 a repeating item survives an export and import round trip', async ({
  page,
}) => {
  await page.goto('/');
  await addRepeating(page, 'Rent', 'monthly');

  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
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

  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await uploadText(page, text);

  await expect(
    page.getByRole('button', { name: 'Rent', exact: true }),
  ).toBeVisible();
  const items = await stored(page);
  expect((items[0] as unknown as { repeat: string }).repeat).toBe('monthly');
});
