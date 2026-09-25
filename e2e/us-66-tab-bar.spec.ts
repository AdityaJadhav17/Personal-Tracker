import { test, expect, type Page } from '@playwright/test';
import { isoDate } from './helpers';

test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Views' });
const tab = (page: Page, name: string) =>
  tabs(page).getByRole('button', { name, exact: true });
const plus = (page: Page) =>
  page.getByRole('button', { name: 'Add a deadline', exact: true });

/** Adds through the + sheet, the phone's way in once Home has something. */
async function addFromSheet(page: Page, title: string, daysFromToday = 0) {
  await plus(page).click();
  const sheet = page.getByRole('dialog', { name: 'Add a deadline' });
  await sheet.getByLabel('Title', { exact: true }).fill(title);
  await sheet.getByLabel('Due', { exact: true }).fill(isoDate(daysFromToday));
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(sheet).toBeHidden();
}

async function firstItem(page: Page) {
  await page.goto('/');
  await page.getByLabel('Title', { exact: true }).fill('Rent');
  await page.getByLabel('Due', { exact: true }).fill(isoDate(1));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test('AC-66.1 four labelled tabs float at the foot of the screen', async ({
  page,
}) => {
  await page.goto('/');

  for (const name of ['Home', 'Calendar', 'Goals', 'More']) {
    await expect(tab(page, name)).toBeVisible();
    await expect(tab(page, name)).toContainText(name);
  }
  await expect(tab(page, 'Courses')).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Personal Tracker' }),
  ).toBeHidden();

  const bar = (await tabs(page).boundingBox())!;
  expect(bar.y + bar.height).toBeGreaterThan(844 - 24);
  expect(bar.height).toBe(60);
});

test('AC-66.2 More holds the other views and the theme, and marks itself current', async ({
  page,
}) => {
  await page.goto('/');

  await tab(page, 'More').click();
  const sheet = page.getByRole('dialog', { name: 'More views' });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole('button', { name: 'Switch to dark mode', exact: true }),
  ).toBeVisible();

  await sheet.getByRole('button', { name: 'Trends', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1 }),
  ).toHaveText('Trends');
  await expect(tab(page, 'More')).toHaveAttribute('aria-current', 'page');

  // Escape closes it too, leaving you where you were.
  await tab(page, 'More').click();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('AC-66.3 Home keeps its field only while empty; after that the + adds from any view', async ({
  page,
}) => {
  await firstItem(page);
  await expect(page.getByLabel('Title', { exact: true })).toBeHidden();

  await tab(page, 'Calendar').click();
  await addFromSheet(page, 'CSE 120 HW 1', 2);

  await tab(page, 'Home').click();
  await expect(
    page.getByRole('button', { name: 'CSE 120 HW 1', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'CSE 120 HW 1', exact: true }),
  ).toBeVisible();
});

test('AC-66.5 the last row and the undo message both clear the dock', async ({
  page,
}) => {
  await firstItem(page);
  for (let day = 2; day <= 12; day += 1) {
    await addFromSheet(page, `Item ${day}`, day);
  }
  const bar = (await tabs(page).boundingBox())!;

  await page.mouse.wheel(0, 5000);
  const last = page.getByRole('button', { name: 'Mark Item 10 done' });
  await expect(last).toBeInViewport();
  expect((await last.boundingBox())!.y).toBeLessThan(bar.y);

  await last.click();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const box = (await undo.boundingBox())!;
  expect(box.y + box.height).toBeLessThan(bar.y);
});

test('AC-66.6 fields are 16px, so iOS does not zoom into them', async ({
  page,
}) => {
  await firstItem(page);
  await plus(page).click();
  const sheet = page.getByRole('dialog', { name: 'Add a deadline' });

  for (const label of ['Title', 'Due', 'Time']) {
    const size = await sheet
      .getByLabel(label, { exact: true })
      .evaluate((el) => getComputedStyle(el).fontSize);
    expect(size, label).toBe('16px');
  }
});

test.describe('wide', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('AC-66.7 a wide screen keeps the sidebar, with no More and no +', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(tab(page, 'Courses')).toBeVisible();
    await expect(tab(page, 'More')).toBeHidden();
    await expect(plus(page)).toBeHidden();
  });
});
