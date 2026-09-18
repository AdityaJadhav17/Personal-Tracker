import { test, expect } from '@playwright/test';

test('AC-11.1 first launch shows the empty state and no group headings', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Nothing due yet.')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('AC-11.1 the add action puts the cursor in the title field', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add your first item' }).click();

  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
});

test('AC-11.1 you can type straight after the add action, no mouse', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add your first item' }).click();
  await page.keyboard.type('Rent');

  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Rent');
});

test('AC-11.1 the empty state is replaced once an item exists', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Title', { exact: true }).fill('Rent');
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  await page
    .getByLabel('Due', { exact: true })
    .fill(`${today.getFullYear()}-${month}-${day}`);
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Nothing due yet.')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
});

test('AC-11.2 a browser that blocks site data gets an error state', async ({
  page,
}) => {
  // Reproduce a browser with site data blocked, which is the real case this
  // state exists for. Reading window.localStorage throws before any method
  // on it is called.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  });

  await page.goto('/');

  await expect(page.getByText('Your data could not be loaded.')).toBeVisible();
  await expect(page.getByText(/site data is probably blocked/i)).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Nothing due yet.')).toHaveCount(0);
});
