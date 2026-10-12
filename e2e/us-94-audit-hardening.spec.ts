import { test, expect } from './clock';
import { add } from './helpers';

test('AC-94.9 what one tab saves, the other builds on instead of overwriting', async ({
  page,
}) => {
  await page.goto('/');
  const other = await page.context().newPage();
  await other.goto('/');

  await add(other, 'Rent');
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();

  await add(page, 'Midterm');
  await page.reload();
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
  await expect(page.getByText('Midterm', { exact: true })).toBeVisible();
});

test('AC-94.10 a 7-character passcode is refused when locking a note', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Notes', exact: true })
    .click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type('Wifi');
  await page.getByRole('button', { name: 'Lock note', exact: true }).click();
  await page.getByLabel('New passcode', { exact: true }).fill('hunter2');
  await page.getByLabel('Confirm passcode', { exact: true }).fill('hunter2');
  await page
    .getByRole('button', { name: 'Lock with this passcode', exact: true })
    .click();

  await expect(page.getByRole('alert')).toContainText('at least 8');
});
