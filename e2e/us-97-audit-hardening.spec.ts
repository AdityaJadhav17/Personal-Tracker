import type { Page } from '@playwright/test';
import { test, expect } from './clock';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const label = (page: Page, name: string) =>
  page.getByLabel(name, { exact: true });

async function lockedNote(page: Page) {
  await page.goto('/');
  await nav(page, 'Notes').click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type('Bank details');
  await page.keyboard.press('Enter');
  await page.keyboard.type('PIN 4412');
  await page.getByRole('button', { name: 'Lock note', exact: true }).click();
  await label(page, 'New passcode').fill('hunter22');
  await label(page, 'Confirm passcode').fill('hunter22');
  await page
    .getByRole('button', { name: 'Lock with this passcode', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Remove lock', exact: true }),
  ).toBeVisible();
}

async function change(page: Page, current: string, next: string) {
  await page
    .getByRole('button', { name: 'Change passcode', exact: true })
    .click();
  await label(page, 'Current passcode').fill(current);
  await label(page, 'New passcode').fill(next);
  await label(page, 'Confirm passcode').fill(next);
  await page.getByRole('button', { name: 'Change', exact: true }).click();
}

test('AC-97.1 a locked note deleted before the passcode changed does not come back with Undo', async ({
  page,
}) => {
  await lockedNote(page);
  await page.getByRole('button', { name: 'Delete note', exact: true }).click();
  await expect(page.getByText(/Deleted/)).toBeVisible();

  await change(page, 'hunter22', 'sesame99');
  await expect(page.getByText('Passcode changed.')).toBeVisible();

  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('u');
  await expect(page.getByRole('button', { name: /Bank details/ })).toHaveCount(
    0,
  );
});
