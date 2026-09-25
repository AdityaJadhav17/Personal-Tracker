import { test, expect, type Page } from '@playwright/test';

/** Six days of reflections ending yesterday, so Trends has a shape to draw. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 5,
        lastBackupAt: new Date().toISOString(),
        items: [],
        goals: [],
        courses: [],
        reflections: [3, 4, 2, 4, 5, 4].map((score, n) => ({
          id: `r${n}`,
          day: day(n - 6),
          score,
          note: '',
          createdAt: new Date().toISOString(),
        })),
      }),
    );
  });
  await page.reload();
}

const nav = (page: Page, name: string) =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

test('AC-61.2 the five answers read as one control', async ({ page }) => {
  await seed(page);
  await nav(page, 'Reflections').click();

  const boxes = await Promise.all(
    ['Terrible', 'Sad', 'Meh', 'Good', 'Awesome'].map(
      async (name) =>
        (await page.getByRole('button', { name, exact: true }).boundingBox())!,
    ),
  );
  for (let i = 1; i < boxes.length; i += 1) {
    expect(boxes[i]!.y).toBe(boxes[0]!.y);
    // Joined: each segment starts where the last one ends.
    expect(
      Math.abs(boxes[i]!.x - (boxes[i - 1]!.x + boxes[i - 1]!.width)),
    ).toBeLessThanOrEqual(1);
  }
});

test('AC-61.3 a chart shows its scale and dates, and reads out the day under the pointer', async ({
  page,
}) => {
  await seed(page);
  await nav(page, 'Trends').click();

  const chart = page.getByRole('figure', { name: 'How the day went' });
  await expect(chart.getByText('5', { exact: true })).toBeVisible();
  await expect(chart.getByText('1', { exact: true })).toBeVisible();
  const first = new Date();
  first.setDate(first.getDate() - 6);
  await expect(
    chart.getByText(
      first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      { exact: true },
    ),
  ).toBeVisible();

  const box = (await chart.getByRole('img').boundingBox())!;
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await expect(chart.getByText(/Good, 4$/)).toBeVisible();
});
