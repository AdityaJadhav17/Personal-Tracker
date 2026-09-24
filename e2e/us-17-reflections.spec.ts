import { test, expect, type Page } from '@playwright/test';
import { isoDate } from './helpers';

async function goTo(page: Page, view: string) {
  await page.getByRole('button', { name: view }).click();
}

test('AC-17.1 it asks how today went, with five choices', async ({ page }) => {
  await page.goto('/');
  await goTo(page, 'Reflections');

  await expect(page.getByText('How did today go?')).toBeVisible();
  for (const label of ['Terrible', 'Sad', 'Meh', 'Good', 'Awesome']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});

test('AC-17.2 a chosen score survives a reload', async ({ page }) => {
  await page.goto('/');
  await goTo(page, 'Reflections');

  await page.getByRole('button', { name: 'Good' }).click();
  await page.reload();
  await goTo(page, 'Reflections');

  await expect(page.getByRole('button', { name: 'Good' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('AC-17.2 a note on today survives a reload', async ({ page }) => {
  await page.goto('/');
  await goTo(page, 'Reflections');

  await page.getByRole('button', { name: 'Good' }).click();
  await page.getByLabel('Note for today').fill('long lab, went fine');
  await page.getByLabel('Note for today').blur();
  await page.reload();
  await goTo(page, 'Reflections');

  await expect(page.getByLabel('Note for today')).toHaveValue(
    'long lab, went fine',
  );
});

test('AC-17.3 changing your mind replaces today, it does not add a day', async ({
  page,
}) => {
  await page.goto('/');
  await goTo(page, 'Reflections');

  await page.getByRole('button', { name: 'Sad' }).click();
  await page.getByRole('button', { name: 'Awesome' }).click();

  await expect(page.getByRole('button', { name: 'Awesome' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Sad' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  const days = await page.evaluate(() => {
    const raw = localStorage.getItem('personal-tracker/v1') ?? '{}';
    return (JSON.parse(raw) as { reflections: unknown[] }).reflections.length;
  });
  expect(days).toBe(1);
});

test('AC-17.3 changing the score keeps the note already written', async ({
  page,
}) => {
  await page.goto('/');
  await goTo(page, 'Reflections');

  await page.getByRole('button', { name: 'Sad' }).click();
  await page.getByLabel('Note for today').fill('rough morning');
  await page.getByLabel('Note for today').blur();
  await page.getByRole('button', { name: 'Awesome' }).click();

  await expect(page.getByLabel('Note for today')).toHaveValue('rough morning');
});

test('AC-17.4 past days are listed newest first', async ({ page }) => {
  await page.goto('/');

  // Seed two earlier days directly; the UI only ever records today.
  await page.evaluate(
    ([older, newer]) => {
      const raw = localStorage.getItem('personal-tracker/v1');
      const db = raw
        ? (JSON.parse(raw) as Record<string, unknown>)
        : {
            version: 2,
            items: [],
            goals: [],
            courses: [],
            reflections: [],
          };
      db.reflections = [
        {
          id: 'a',
          day: older,
          score: 2,
          note: 'bad day',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'b',
          day: newer,
          score: 5,
          note: 'good day',
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('personal-tracker/v1', JSON.stringify(db));
    },
    [isoDate(-3), isoDate(-1)],
  );
  await page.reload();
  await goTo(page, 'Reflections');

  const entries = page.getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toContainText('good day');
  await expect(entries.last()).toContainText('bad day');
});

test('AC-17.4 with nothing recorded it says so', async ({ page }) => {
  await page.goto('/');
  await goTo(page, 'Reflections');

  await expect(page.getByText('Nothing recorded yet.')).toBeVisible();
});

test('AC-16.1 and AC-16.2 Home shows what is left and what was finished', async ({
  page,
}) => {
  await page.goto('/');

  for (const title of ['Pset 1', 'Pset 2', 'Pset 3']) {
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByLabel('Due', { exact: true }).fill(isoDate(0));
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  await expect(page.getByText('remaining today')).toBeVisible();
  await expect(
    page.locator('.stat', { hasText: 'remaining today' }),
  ).toContainText('3');

  await page.getByRole('button', { name: 'Mark Pset 1 done' }).click();
  await expect(
    page.locator('.stat', { hasText: 'remaining today' }),
  ).toContainText('2');
});

test('AC-16.3 an empty day still shows both numbers as zero', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.locator('.stat', { hasText: 'remaining today' }),
  ).toContainText('0');
  await expect(
    page.locator('.stat', { hasText: 'completed yesterday' }),
  ).toContainText('0');
});
