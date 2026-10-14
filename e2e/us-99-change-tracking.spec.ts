import { test, expect } from './clock';
import { add } from './helpers';

test('AC-99.2 a deleted item leaves a marker that survives a reload', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await page.getByRole('button', { name: 'Rent', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Rent', exact: true }).click();
  // The row folds before it goes (AC-71.1); reload once it has.
  await expect(
    page.getByRole('button', { name: 'Rent', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  const db = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}'),
  );
  expect(db.version).toBe(11);
  expect(db.deleted).toHaveLength(1);
  expect(db.deleted[0].kind).toBe('items');
});
