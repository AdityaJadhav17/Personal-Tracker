import { test, expect, type Page } from '@playwright/test';
import { add } from './helpers';

test.use({ colorScheme: 'light' });

const calendar = (page: Page) =>
  page
    .getByRole('navigation')
    .getByRole('button', { name: 'Calendar', exact: true })
    .click();

test('AC-75.1 and AC-75.2 an item ticked on Home stays on the calendar, done, after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Essay draft', 0);
  await add(page, 'Quiz', 0);
  await page
    .getByRole('button', { name: 'Mark Essay draft done', exact: true })
    .click();
  // AC-75.5. Home still lets it go.
  await expect(
    page.getByRole('button', { name: 'Essay draft', exact: true }),
  ).toHaveCount(0);

  await page.reload();
  await calendar(page);

  const done = page.getByRole('button', {
    name: 'Essay draft, done',
    exact: true,
  });
  await expect(done).toBeVisible();
  await expect(done).toHaveCSS('text-decoration-line', 'line-through');
  await expect(done).not.toHaveAttribute('draggable', 'true');
  // AC-75.3. The week counts only what is still due.
  await expect(page.getByRole('cell', { name: '1 due' })).toBeVisible();

  // AC-75.4. The day lists it under the open work.
  await done.click();
  const day = page.getByRole('dialog');
  await expect(day.getByRole('list', { name: 'Done' })).toContainText(
    'Essay draft',
  );
});

// AC-75.5, the export: AC-24.2 in us-24-calendar-export.spec.ts already checks
// a finished item is left out of the file.
