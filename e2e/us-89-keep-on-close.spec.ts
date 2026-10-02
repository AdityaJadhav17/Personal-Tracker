import type { Page } from '@playwright/test';
import { test, expect } from './clock';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

test('AC-89.1 a deadline typed into a calendar day is kept when you click outside it', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Calendar').click();

  // An empty part of the 17th, as a person clicks it.
  await page
    .getByRole('cell', { name: /September 17, 2026/ })
    .click({ position: { x: 8, y: 60 } });
  await page.keyboard.type('Dentist');
  // The bug as reported: click away, never press Add.
  await page.mouse.click(5, 5);
  await expect(page.getByRole('dialog')).toBeHidden();
  // The popover hides at once; the save follows as the form leaves. Wait for
  // what matters, the deadline stored, before reloading.
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem('personal-tracker/v1') ?? ''),
    )
    .toContain('Dentist');

  await page.reload();
  await nav(page, 'Calendar').click();
  await expect(
    page.getByRole('cell', { name: /September 17, 2026/ }),
  ).toContainText('Dentist');
});

test('AC-89.2 a day opened and left with nothing typed adds nothing', async ({
  page,
}) => {
  await page.goto('/');
  await nav(page, 'Calendar').click();
  await page
    .getByRole('cell', { name: /September 17, 2026/ })
    .click({ position: { x: 8, y: 60 } });
  await page.mouse.click(5, 5);

  const items = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}') as {
          items?: unknown[];
        }
      ).items?.length ?? 0,
  );
  expect(items).toBe(0);
});

test('AC-89.3 the phone sheet keeps what was typed when tapped away', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await nav(page, 'Calendar').click();

  await page
    .getByRole('button', { name: 'Add a deadline', exact: true })
    .click();
  await page.keyboard.type('CSE 120 HW 1');
  await page.mouse.click(20, 20);
  await expect(page.getByRole('dialog')).toBeHidden();

  await nav(page, 'Home').click();
  await expect(
    page.getByRole('button', { name: 'CSE 120 HW 1', exact: true }),
  ).toBeVisible();
});
