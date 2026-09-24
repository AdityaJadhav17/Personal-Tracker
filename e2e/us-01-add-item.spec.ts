import { test, expect } from '@playwright/test';
import { add, doneControls, isoDate, open } from './helpers';

test('AC-01.1 adding an item puts it in the list', async ({ page }) => {
  await page.goto('/');

  await add(page, 'CSE 100 project', 3, { priority: 'high' });

  await expect(doneControls(page)).toHaveCount(1);
  await expect(page.getByText('CSE 100 project')).toBeVisible();
});

test('AC-01.1 an item survives a real page reload', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Rent');
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();

  await page.reload();

  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
});

test('AC-01.1 school and life items sit in one list', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Midterm', 5, { category: 'academic' });
  await add(page, 'Tuition payment', 6, { category: 'personal' });

  await expect(doneControls(page)).toHaveCount(2);
});

test('AC-19.2 a date with no time is due at the end of that day', async ({
  page,
}) => {
  await page.goto('/');

  await add(page, 'Rent', 0);

  // AC-57.5. 11:59pm is what no time means, so the row leaves it unsaid;
  // the item itself holds it.
  await expect(page.getByText('11:59 PM')).toHaveCount(0);
  await open(page, 'Rent');
  await expect(page.getByLabel('Time for Rent')).toHaveValue('23:59');
});

test('AC-19.3 picking a time uses that time instead', async ({ page }) => {
  await page.goto('/');

  await add(page, 'Dentist', 2, { time: '14:30' });

  await expect(page.getByText('2:30 PM')).toBeVisible();
});

test('AC-01.2 submitting with no title adds nothing and says why', async ({
  page,
}) => {
  await page.goto('/');

  // AC-57.2. The form is one line until used.
  await page.getByLabel('Title', { exact: true }).click();
  await page.getByLabel('Due', { exact: true }).fill(isoDate(0));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Give it a title.')).toBeVisible();
  await expect(doneControls(page)).toHaveCount(0);
});

test('AC-19.4 submitting with no date adds nothing and says why', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByLabel('Title', { exact: true }).fill('Dentist');
  // AC-57.2. The date starts on today, so no date means clearing it.
  await page.getByLabel('Due', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByText('Pick a date.')).toBeVisible();
  await expect(doneControls(page)).toHaveCount(0);
});

test('a title containing markup is shown as text, not executed', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });

  await page.goto('/');

  await add(page, '<img src=x onerror=alert(1)>', 3);

  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
  await page.reload();
  await expect(page.getByText('<img src=x onerror=alert(1)>')).toBeVisible();

  expect(dialogs).toEqual([]);
  expect(await page.locator('img').count()).toBe(0);
});
