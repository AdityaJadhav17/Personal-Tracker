import { test, expect, type Page } from '@playwright/test';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

async function newNote(page: Page, text: string) {
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type(text);
}

test('AC-81.1, AC-81.2 and AC-81.4 a pinned note stays on top after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Notes').click();
  await newNote(page, 'Groceries');
  await newNote(page, 'Ideas');

  await page.getByRole('button', { name: /^Groceries/ }).click();
  await page.getByRole('button', { name: 'Pin note', exact: true }).click();

  await page.reload();
  await nav(page, 'Notes').click();

  const pinned = page.getByRole('list', { name: 'Pinned', exact: true });
  await expect(pinned.getByRole('button')).toContainText('Groceries');
  const today = page.getByRole('list', { name: 'Today', exact: true });
  await expect(today.getByRole('button')).toHaveCount(1);
  await expect(today.getByRole('button')).toContainText('Ideas');

  // The one that failed first: unpinning puts it back among the dates.
  await pinned.getByRole('button').click();
  await page.getByRole('button', { name: 'Unpin note', exact: true }).click();
  await expect(pinned).toBeHidden();
  await expect(today.getByRole('button')).toHaveCount(2);
});
