import { test, expect, type Page } from '@playwright/test';

test.use({ colorScheme: 'light' });

// "Notes" is inside "Back to notes", so the sidebar is always named exactly.
const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const editor = (page: Page) =>
  page.getByRole('textbox', { name: 'Note', exact: true });

test('AC-80.2, AC-80.3 and AC-80.7 a note written in Notes is there after a reload', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Notes').click();
  await expect(page.getByText('No notes yet.')).toBeVisible();

  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await expect(editor(page)).toBeFocused();
  // Typed as a person types, u included: a letter here, never Undo.
  await page.keyboard.type('Groceries');
  await page.keyboard.press('Enter');
  await page.keyboard.type('oat milk, sourdough');

  await page.reload();
  await nav(page, 'Notes').click();

  const today = page.getByRole('list', { name: 'Today', exact: true });
  await expect(today.getByRole('button')).toContainText('Groceries');
  await expect(today.getByRole('button')).toContainText('oat milk, sourdough');
  await expect(editor(page)).toHaveText(/^Groceries\s+oat milk, sourdough$/);

  // AC-80.3. The first line is the title, set larger than the rest.
  const sizes = await editor(page).evaluate((el) => [
    parseFloat(getComputedStyle(el, '::first-line').fontSize),
    parseFloat(getComputedStyle(el).fontSize),
  ]);
  expect(sizes[0]).toBeGreaterThan(sizes[1]!);
});

test('AC-80.6 a deleted note comes back with Undo', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'Notes').click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type('Ask landlord');

  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await expect(page.getByText('No notes yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Ask landlord/ }),
  ).toBeVisible();
});

test('AC-80.8 on a phone the list and the note take turns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await nav(page, 'More').click();
  await page
    .getByRole('dialog', { name: 'More views' })
    .getByRole('button', { name: 'Notes', exact: true })
    .click();

  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type('Ideas');
  await expect(
    page.getByRole('searchbox', { name: 'Search notes' }),
  ).toBeHidden();

  await page
    .getByRole('button', { name: 'Back to notes', exact: true })
    .click();
  await expect(editor(page)).toBeHidden();
  await page.getByRole('button', { name: /^Ideas/ }).click();
  await expect(editor(page)).toHaveText('Ideas');
});
