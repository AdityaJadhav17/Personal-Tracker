import { test, expect } from './clock';
import { add, openData } from './helpers';

test('AC-102.1 a backup holding an item due in 1960 is refused and changes nothing', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await openData(page);
  const file = JSON.stringify({
    version: 1,
    items: [
      {
        id: 'old',
        title: 'Birthday',
        dueAt: '1960-05-01T12:00:00.000Z',
        category: 'personal',
        priority: 'normal',
        status: 'open',
        note: '',
        createdAt: '2026-09-01T00:00:00.000Z',
        completedAt: null,
      },
    ],
  });
  await page.getByLabel('Import').evaluate((node, contents: string) => {
    const input = node as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(new File([contents], 'old.json'));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, file);

  await expect(page.getByRole('alert')).toContainText(/due date/i);
  const titles = await page.evaluate(() =>
    (
      JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
        items: { title: string }[];
      }
    ).items.map((i) => i.title),
  );
  expect(titles).toEqual(['Rent']);
});
