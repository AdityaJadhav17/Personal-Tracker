import { test, expect } from './clock';

test('the app loads with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Personal Tracker' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * AC-83.1. Same origin by URL, not by prefix: a request to
 * "http://localhost:5173@evil.example" starts with the right text and goes
 * to evil.example. Vite's own reload socket is the one WebSocket allowed, on
 * the same host.
 */
function offOrigin(url: string): boolean {
  const { protocol, host } = new URL(url);
  return host !== 'localhost:5173' || !['http:', 'ws:'].includes(protocol);
}

test('AC-83.1 the app makes no third-party requests, through its busiest flows', async ({
  page,
}) => {
  const seen: string[] = [];
  page.on('request', (req) => {
    if (offOrigin(req.url())) seen.push(req.url());
  });
  page.on('websocket', (socket) => {
    if (offOrigin(socket.url())) seen.push(socket.url());
  });

  await page.goto('/');

  // A note written, a backup imported, the calendar opened: the places that
  // read user input or hand data around.
  const nav = page.getByRole('navigation');
  await nav.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.keyboard.type('Groceries');

  await nav.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByLabel('Import').evaluate((node) => {
    const input = node as HTMLInputElement;
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['{"version": 1, "items": []}'], 'backup.json', {
        type: 'application/json',
      }),
    );
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(
    page.getByRole('button', { name: 'Replace', exact: true }),
  ).toBeVisible();

  await nav.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.waitForLoadState('networkidle');

  expect(seen).toEqual([]);
});

test('AC-83.1 the policy that blocks other origins is on the page', async ({
  page,
}) => {
  await page.goto('/');

  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  for (const rule of [
    "default-src 'self'",
    "script-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
  ]) {
    expect(policy).toContain(rule);
  }
  expect(policy).not.toContain('unsafe-eval');
});
