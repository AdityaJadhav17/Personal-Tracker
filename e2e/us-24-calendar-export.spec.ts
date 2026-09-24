import { test, expect, type Page } from '@playwright/test';

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

async function addItem(page: Page, title: string, time = '17:00') {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(isoDate(1));
  await page.getByLabel('Time', { exact: true }).fill(time);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/** How many octets a line costs, which is what the 75 limit counts. */
function octets(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Click the calendar export and return the file the browser was handed.
 *
 * Decoded with TextDecoder rather than Buffer, so the end to end tests need no
 * Node types and the project needs no new dependency to typecheck them.
 */
async function exported(page: Page): Promise<{ name: string; text: string }> {
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

  return {
    name: download.suggestedFilename(),
    text: new TextDecoder().decode(bytes),
  };
}

test('AC-24.1 an open item comes out as an event', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'CSE 110 midterm');

  const { text } = await exported(page);

  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text).toContain('BEGIN:VEVENT');
  expect(text.replace(/\r\n /g, '')).toContain('SUMMARY:CSE 110 midterm');
});

test('AC-24.2 a finished item is not in the file', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Already done');
  await page.getByRole('button', { name: 'Mark Already done done' }).click();

  const { text } = await exported(page);

  expect(text).not.toContain('Already done');
  expect(text).not.toContain('BEGIN:VEVENT');
});

test('AC-24.3 the event ends at the deadline, as a UTC instant', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Rent', '17:00');

  const { text } = await exported(page);

  // 5pm local, whatever zone the machine running this is in.
  const due = new Date(isoDate(1) + 'T17:00');
  const stamp = due
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  expect(text).toContain(`DTEND:${stamp}`);
  expect(text).not.toContain('VTIMEZONE');
});

test('AC-24.4 a title full of punctuation survives intact', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Lab 3: read ch. 4, 5; write up');

  const { text } = await exported(page);

  expect(text.replace(/\r\n /g, '')).toContain(
    'SUMMARY:Lab 3: read ch. 4\\, 5\\; write up',
  );
  // One event, not several, which is what bad escaping would produce.
  expect(text.split('BEGIN:VEVENT')).toHaveLength(2);
});

test('AC-24.5 a long title is folded, and no line is over 75 octets', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(
    page,
    'A deliberately long assignment title that runs well past the seventy five octet limit',
  );

  const { text } = await exported(page);

  for (const line of text.split('\r\n')) {
    expect(octets(line)).toBeLessThanOrEqual(75);
  }
});

test('AC-24.6 exporting twice gives the same uid', async ({ page }) => {
  await page.goto('/');
  await addItem(page, 'Rent');

  const uidOf = (text: string) =>
    text.split('\r\n').find((line) => line.startsWith('UID:'));

  const first = await exported(page);
  const second = await exported(page);

  expect(uidOf(first.text)).toBe(uidOf(second.text));
  expect(uidOf(first.text)).toBeTruthy();
});

test('AC-24.7 the file is CRLF throughout and carries an alarm', async ({
  page,
}) => {
  await page.goto('/');
  await addItem(page, 'Rent');

  const { text, name } = await exported(page);

  expect(text.replace(/\r\n/g, '')).not.toContain('\n');
  // US-46 made the timing depend on priority; there is still an alarm.
  expect(text).toMatch(/TRIGGER:-PT\d+M/);
  expect(text.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  expect(name).toMatch(/^personal-tracker-\d{4}-\d{2}-\d{2}\.ics$/);
});

test('AC-24.8 with nothing to export the file is still valid', async ({
  page,
}) => {
  await page.goto('/');

  const { text } = await exported(page);

  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text).toContain('END:VCALENDAR');
  expect(text).not.toContain('BEGIN:VEVENT');
});

test('the calendar export makes no network request', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/');
  await addItem(page, 'Rent');
  await exported(page);

  expect(offOrigin).toEqual([]);
});
