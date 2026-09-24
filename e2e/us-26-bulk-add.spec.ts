import { test, expect, type Page } from '@playwright/test';
import { isoDate } from './helpers';

async function paste(page: Page, text: string) {
  await page.getByRole('button', { name: 'Paste a list' }).click();
  await page.getByLabel('Paste a list').fill(text);
}

/**
 * A row of the preview.
 *
 * Scoped to the list rather than the page, because the box you pasted into
 * holds the same words and would match a bare text locator too.
 */
function previewRow(page: Page, text: string) {
  return page.getByRole('listitem').filter({ hasText: text });
}

test('AC-26.1 and AC-26.2 a pasted term is previewed, then added in one go', async ({
  page,
}) => {
  await page.goto('/');
  await paste(
    page,
    [
      `${isoDate(1)} Read chapter 4`,
      `${isoDate(3)} 17:00 Rent`,
      `${isoDate(9)} CSE 110 midterm`,
    ].join('\n'),
  );

  // Seen before saved.
  await expect(previewRow(page, 'Read chapter 4')).toBeVisible();
  await expect(previewRow(page, 'CSE 110 midterm')).toBeVisible();

  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}').items,
  );
  expect(before ?? []).toEqual([]);

  await page.getByRole('button', { name: 'Add 3 items' }).click();

  await expect(
    page.getByRole('button', { name: 'Read chapter 4', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Read chapter 4', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Rent', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'CSE 110 midterm', exact: true }),
  ).toBeVisible();
});

test('AC-26.2 every pasted item really lands, not just the last one', async ({
  page,
}) => {
  await page.goto('/');
  const lines = Array.from(
    { length: 12 },
    (_, i) => `${isoDate(i + 1)} Item number ${i + 1}`,
  );
  await paste(page, lines.join('\n'));
  await page.getByRole('button', { name: 'Add 12 items' }).click();

  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}').items,
  );
  expect(stored).toHaveLength(12);
  // Ids have to be distinct or a later delete would take several at once.
  expect(new Set(stored.map((i: { id: string }) => i.id)).size).toBe(12);
});

test('AC-26.5 a line with no time is due at the end of that day', async ({
  page,
}) => {
  await page.goto('/');
  await paste(page, `${isoDate(1)} Read chapter 4`);
  // The preview says so before anything is saved.
  await expect(page.getByText(/11:59 PM/)).toBeVisible();
  await page.getByRole('button', { name: 'Add 1 item' }).click();

  // AC-57.5. The row leaves 11:59pm unsaid; the item holds it.
  await page
    .getByRole('button', { name: 'Read chapter 4', exact: true })
    .click();
  await expect(page.getByLabel('Time for Read chapter 4')).toHaveValue('23:59');
});

test('AC-26.3 an unreadable line is listed and the rest still go', async ({
  page,
}) => {
  await page.goto('/');
  await paste(
    page,
    [`${isoDate(1)} Rent`, 'next tuesday something', 'oct 3 Midterm'].join(
      '\n',
    ),
  );

  await expect(previewRow(page, 'next tuesday something')).toBeVisible();
  await expect(previewRow(page, 'oct 3 Midterm')).toBeVisible();

  await page.getByRole('button', { name: 'Add 1 item' }).click();

  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}').items,
  );
  expect(stored).toHaveLength(1);
  expect(stored[0].title).toBe('Rent');
});

test('AC-26.4 cancelling writes nothing and closes the box', async ({
  page,
}) => {
  await page.goto('/');
  await paste(page, `${isoDate(1)} Rent`);
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.getByLabel('Paste a list')).toHaveCount(0);

  await page.reload();
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}').items,
  );
  expect(stored ?? []).toEqual([]);
});

test('AC-26.6 prose is refused, with nothing offered and nothing written', async ({
  page,
}) => {
  await page.goto('/');
  await paste(page, 'Welcome to CSE 110. Office hours are Tuesday at 2pm.');

  await expect(page.getByText(/Nothing here could be read/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add \d+ item/ })).toHaveCount(
    0,
  );
});

test('a pasted item behaves like a typed one: done, undo, and the calendar', async ({
  page,
}) => {
  await page.goto('/');
  await paste(page, `${isoDate(1)} Lab 3`);
  await page.getByRole('button', { name: 'Add 1 item' }).click();

  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByText('Lab 3', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Mark Lab 3 done' }).click();
  await expect(
    page.getByRole('button', { name: 'Lab 3', exact: true }),
  ).toHaveCount(0);

  await page.keyboard.press('u');
  await expect(
    page.getByRole('button', { name: 'Lab 3', exact: true }),
  ).toBeVisible();
});

test('pasting a list sends nothing off-origin', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost:5173')) {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/');
  await paste(page, `${isoDate(1)} Rent`);
  await page.getByRole('button', { name: 'Add 1 item' }).click();

  expect(offOrigin).toEqual([]);
});
