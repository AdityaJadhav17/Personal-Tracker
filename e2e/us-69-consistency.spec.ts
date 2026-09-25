import { test, expect, type Page } from '@playwright/test';
import { add, isoDate } from './helpers';

test.use({ colorScheme: 'light', viewport: { width: 1280, height: 900 } });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

const radius = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).borderTopLeftRadius);

test('AC-69.1 New goal and New course sit on the title row, at its end, unfilled', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Goals').click();
  await page.getByLabel('Goal name', { exact: true }).fill('AWS cert');
  await page.getByLabel('Target date', { exact: true }).fill(isoDate(20));
  await page.getByRole('button', { name: 'Add goal', exact: true }).click();

  await nav(page, 'Courses').click();
  await page.getByLabel('Course name', { exact: true }).fill('CSE 120');
  await page.getByRole('button', { name: 'Add course', exact: true }).click();

  for (const [view, action] of [
    ['Goals', 'New goal'],
    ['Courses', 'New course'],
  ] as const) {
    await nav(page, view).click();
    const title = (await page
      .getByRole('main')
      .getByRole('heading', { level: 1 })
      .boundingBox())!;
    const button = page.getByRole('button', { name: action, exact: true });
    const box = (await button.boundingBox())!;
    const main = (await page.getByRole('main').boundingBox())!;

    const middle = (b: typeof box) => b.y + b.height / 2;
    expect(Math.abs(middle(box) - middle(title)), view).toBeLessThan(8);
    expect(main.x + main.width - (box.x + box.width), view).toBeLessThan(48);
    await expect(button).not.toHaveCSS('background-color', 'rgb(15, 118, 110)');
  }
});

test('AC-69.2 controls take the small corner and containers the large one', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 1);

  expect(await radius(page, 'form')).toBe('10px');
  await nav(page, 'Data').click();
  expect(
    await page
      .getByRole('button', { name: 'Export calendar', exact: true })
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
  ).toBe('6px');

  await nav(page, 'Courses').click();
  await page.getByLabel('Course name', { exact: true }).fill('CSE 120');
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  expect(
    await page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'CSE 120' }) })
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
  ).toBe('10px');
});

test('AC-69.4 the undo button and a calendar item press in', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent', 0);
  await add(page, 'Dentist', 1);
  await page
    .getByRole('button', { name: 'Mark Rent done', exact: true })
    .click();

  const pressed = async (name: string) => {
    const button = page.getByRole('button', { name, exact: true }).first();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const scale = await button.evaluate((el) => getComputedStyle(el).scale);
    await page.mouse.up();
    return scale;
  };

  expect(await pressed('Undo')).toBe('0.97');
  await nav(page, 'Calendar').click();
  expect(await pressed('Dentist')).toBe('0.97');
});
