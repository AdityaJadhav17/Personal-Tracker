import { test, expect, type Page } from '@playwright/test';
import { isoDate, row } from './helpers';

test.use({ colorScheme: 'light' });

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

async function addCourse(page: Page, name: string) {
  await nav(page, 'Courses').click();
  const more = page.getByRole('button', { name: 'New course', exact: true });
  if (await more.count()) await more.click();
  await page.getByLabel('Course name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
}

test('AC-77.1 and AC-77.2 a course is edited in its card, and keeps its items', async ({
  page,
}) => {
  await page.goto('/');
  await addCourse(page, 'CSE 158R');

  // An item filed under it before the edit.
  await nav(page, 'Home').click();
  await page.getByLabel('Title', { exact: true }).fill('Homework 1');
  await page.getByLabel('Course', { exact: true }).selectOption('CSE 158R');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await nav(page, 'Courses').click();
  await page
    .getByRole('button', { name: 'More for CSE 158R', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Edit CSE 158R', exact: true })
    .click();
  await expect(page.getByLabel('Course name', { exact: true })).toHaveValue(
    'CSE 158R',
  );
  await page
    .getByLabel('Office hours', { exact: true })
    .fill('Thu 1-2pm, Zoom');
  await page.getByRole('button', { name: 'Save course', exact: true }).click();

  await page.reload();
  await nav(page, 'Courses').click();
  await expect(
    page.getByText('Thu 1-2pm, Zoom', { exact: true }),
  ).toBeVisible();

  // Still filed under the course, colour and all.
  await nav(page, 'Home').click();
  await expect(row(page, 'Homework 1')).toContainText('CSE 158R');
});

test('AC-78.1 and AC-78.2 the course is picked while adding, from Home and from the phone sheet', async ({
  page,
}) => {
  await page.goto('/');
  await addCourse(page, 'CSE 120');
  await nav(page, 'Home').click();

  await page.getByLabel('Title', { exact: true }).fill('Project 0');
  await expect(page.getByLabel('Course', { exact: true })).toHaveValue('');
  await page.getByLabel('Course', { exact: true }).selectOption('CSE 120');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(row(page, 'Project 0')).toContainText('CSE 120');

  // The phone's + sheet offers it too.
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Add a deadline', exact: true })
    .click();
  const sheet = page.getByRole('dialog', { name: 'Add a deadline' });
  await sheet.getByLabel('Title', { exact: true }).fill('Lab 1');
  await sheet.getByLabel('Due', { exact: true }).fill(isoDate(2));
  await sheet.getByLabel('Course', { exact: true }).selectOption('CSE 120');
  await sheet.getByRole('button', { name: 'Add', exact: true }).click();

  await page.reload();
  await expect(row(page, 'Lab 1')).toContainText('CSE 120');
});
