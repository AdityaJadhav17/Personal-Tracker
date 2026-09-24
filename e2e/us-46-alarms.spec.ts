import { test, expect, type Page } from '@playwright/test';

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

async function addWithPriority(page: Page, title: string, priority: string) {
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due', { exact: true }).fill(tomorrow());
  await page.getByLabel('Time', { exact: true }).fill('17:00');
  await page.getByLabel('Priority', { exact: true }).selectOption(priority);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

test('AC-46.1 and AC-46.3 an exam gets two alarms and a low priority chore none', async ({
  page,
}) => {
  await page.goto('/');
  await addWithPriority(page, 'CSE 120 Midterm', 'high');
  await addWithPriority(page, 'Water plants', 'low');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export calendar' }).click(),
  ]);
  const stream = await download.createReadStream();
  let text = '';
  for await (const chunk of stream) text += String(chunk);

  const events = text.split('BEGIN:VEVENT').slice(1);
  const exam = events.find((e) => e.includes('SUMMARY:CSE 120 Midterm'))!;
  const chore = events.find((e) => e.includes('SUMMARY:Water plants'))!;
  expect(exam.match(/BEGIN:VALARM/g)).toHaveLength(2);
  expect(chore).not.toContain('BEGIN:VALARM');
});
