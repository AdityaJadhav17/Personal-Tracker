import { test, expect, type Page } from '@playwright/test';

/** A UTC iCalendar stamp `days` from now at 06:59Z, like Canvas writes. */
function stamp(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T065900Z`;
}

function feed(): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'SUMMARY:CSE 123 HW 3',
    `DTSTART:${stamp(10)}`,
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Long gone quiz',
    `DTSTART:${stamp(-10)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Hand text to the file input without touching the filesystem. */
async function choose(page: Page, text: string, name: string) {
  await page.getByLabel('Add from calendar file').evaluate(
    (node, [contents, filename]) => {
      const input = node as HTMLInputElement;
      const transfer = new DataTransfer();
      transfer.items.add(new File([contents!], filename!));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [text, name],
  );
}

test('AC-43.9 and AC-43.10 a calendar file is previewed, then added under a course, and it survives a reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 4,
        lastBackupAt: null,
        items: [],
        goals: [],
        reflections: [],
        courses: [
          {
            id: 'cse123',
            name: 'CSE 123',
            meetingLocation: '',
            professorEmail: '',
            officeHours: '',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    );
  });
  await page.reload();

  await choose(page, feed(), 'cse123.ics');
  const preview = page.getByRole('region', { name: 'Deadlines from the file' });
  await expect(preview).toContainText('CSE 123 HW 3');
  await expect(preview).not.toContainText('Long gone quiz');
  await expect(preview).toContainText('1 already past are left out.');

  await preview
    .getByRole('combobox', { name: 'Course for these' })
    .selectOption('cse123');
  await preview.getByRole('button', { name: 'Add 1' }).click();

  await page.reload();
  await expect(page.getByText('CSE 123 HW 3', { exact: true })).toBeVisible();
  const courseId = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
          items: { courseId: string | null }[];
        }
      ).items[0]!.courseId,
  );
  expect(courseId).toBe('cse123');
});

test('AC-43.7 a backup chosen by mistake is refused and changes nothing', async ({
  page,
}) => {
  await page.goto('/');

  await choose(page, '{"version": 4, "items": []}', 'backup.json');

  await expect(page.getByRole('alert')).toContainText('not a calendar');
  await expect(page.getByText('Nothing due yet.')).toBeVisible();
});
