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

async function open(page: Page, passcode: string) {
  await label(page, 'Passcode').fill(passcode);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
}

test('AC-86.2 and AC-86.3 after a typo, the change goes through, and only the new passcode opens the note after a reload', async ({
  page,
}) => {
  await lockedNote(page);

  // The one that would actually happen: the current passcode mistyped.
  await change(page, 'hunter2', 'sesame99');
  await expect(page.getByRole('alert')).toHaveText(
    'That passcode is not right.',
  );
  await label(page, 'Current passcode').fill('hunter22');
  await page.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(
    page.getByRole('status').getByText('Passcode changed.'),
  ).toBeVisible();

  await page.reload();
  await nav(page, 'Notes').click();
  await open(page, 'hunter22');
  await expect(page.getByRole('alert')).toHaveText(
    'That passcode is not right.',
  );
  await open(page, 'sesame99');
  await expect(
    page.getByRole('textbox', { name: 'Note', exact: true }),
  ).toHaveText(/^Bank details\s+PIN 4412$/);
});
