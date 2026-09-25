import { test, expect } from '@playwright/test';
import { add, doneControls, open, openData } from './helpers';

test.use({ colorScheme: 'light' });

const DANGER = 'rgb(185, 28, 28)';
const ACCENT = 'rgb(15, 118, 110)';

test('AC-64.1 Undo is a button in a message floating at the foot of the window', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await page
    .getByRole('button', { name: 'Mark Rent done', exact: true })
    .click();

  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(page.getByRole('status').first()).toContainText(
    'Marked Rent done.',
  );
  expect(
    await undo.evaluate(
      (el) => getComputedStyle(el.closest('[role="status"]')!).position,
    ),
  ).toBe('fixed');

  await undo.click();
  await expect(doneControls(page)).toHaveCount(1);
  await page.reload();
  await expect(doneControls(page)).toHaveCount(1);
});

test('AC-64.2 Overdue is a red heading over plain rows', async ({ page }) => {
  await page.goto('/');
  await add(page, 'Late thing', -2);

  const heading = page.getByRole('heading', { name: 'Overdue', exact: true });
  expect(await heading.evaluate((el) => getComputedStyle(el).color)).toBe(
    DANGER,
  );
  const box = await heading.evaluate((el) => {
    const style = getComputedStyle(el.closest('section')!);
    return { background: style.backgroundColor, border: style.borderTopWidth };
  });
  expect(box).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px' });
});

test('AC-64.3 a due backup makes Export the primary button, and exporting settles it', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await openData(page);

  const exportButton = page.getByRole('button', {
    name: 'Export',
    exact: true,
  });
  const background = () =>
    exportButton.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background()).toBe(ACCENT);
  expect(
    await page
      .getByText('Not backed up yet.', { exact: true })
      .evaluate((el) => getComputedStyle(el).color),
  ).toBe(DANGER);

  await Promise.all([page.waitForEvent('download'), exportButton.click()]);
  expect(await background()).toBe('rgb(255, 255, 255)');
});

test('AC-64.4 Delete is red text at the far end, and its confirm is a red button', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);
  await open(page, 'Rent');

  const save = (await page
    .getByRole('button', { name: 'Save Rent', exact: true })
    .boundingBox())!;
  const remove = page.getByRole('button', { name: 'Delete Rent', exact: true });
  const box = (await remove.boundingBox())!;
  expect(await remove.evaluate((el) => getComputedStyle(el).color)).toBe(
    DANGER,
  );
  expect(box.x - (save.x + save.width)).toBeGreaterThan(200);

  await remove.click();
  const yes = page.getByRole('button', { name: 'Yes, delete', exact: true });
  expect(await yes.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    DANGER,
  );
});
