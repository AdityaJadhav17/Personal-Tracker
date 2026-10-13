import type { Page } from '@playwright/test';
import { test, expect } from './clock';
import { add, openData, openHome } from './helpers';

const FILE = 'personal-tracker-backup-2026-09-15.json';

/**
 * The folder picker opens a native dialog Playwright cannot drive. It is
 * swapped for a folder in the browser's own private file system, which is a
 * real FileSystemDirectoryHandle: the app writes, lists and deletes through
 * the same calls it makes on a folder on disk. `deny` in sessionStorage
 * stands for a browser that wants permission asked again.
 *
 * No test reloads with a folder remembered. Playwright's own Chromium closes
 * the page when it reads a folder handle back out of IndexedDB; Edge and
 * Chrome do not (checked by hand, 12 October 2026). Remembering is covered
 * by useAutoBackup.test.ts.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle(
        'PersonalTracker-Backups',
        { create: true },
      );
    const proto = FileSystemHandle.prototype as unknown as {
      queryPermission: () => Promise<string>;
      requestPermission: () => Promise<string>;
    };
    proto.queryPermission = () =>
      Promise.resolve(sessionStorage.getItem('deny') ? 'prompt' : 'granted');
    proto.requestPermission = () => {
      sessionStorage.removeItem('deny');
      return Promise.resolve('granted');
    };
  });
});

/** What the app wrote into the folder today, or null before it has. */
const backup = (page: Page) =>
  page.evaluate(async (name) => {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('PersonalTracker-Backups', {
      create: true,
    });
    try {
      return await (
        await folder.getFileHandle(name)
      )
        .getFile()
        .then((f) => f.text());
    } catch {
      return null;
    }
  }, FILE);

async function chooseFolder(page: Page) {
  await openData(page);
  await page
    .getByRole('button', { name: 'Choose backup folder', exact: true })
    .click();
  await expect(
    page.getByText(/Backing up to PersonalTracker-Backups/),
  ).toBeVisible();
}

test('AC-95.1, AC-95.2 and AC-95.4 a chosen folder gets a backup that Import brings back', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await chooseFolder(page);

  await expect.poll(() => backup(page), { timeout: 15_000 }).toContain('Rent');
  // AC-95.4. Counted as a backup, so no reminder.
  await expect(page.getByText('Not backed up yet.')).toBeHidden();

  // The restore drill: something added since, then the backup put back.
  const text = (await backup(page))!;
  await openHome(page);
  await add(page, 'Midterm');
  await openData(page);
  // Handed to the file input as a file, the way choosing it would.
  await page.getByLabel('Import', { exact: true }).evaluate(
    (input, [name, body]) => {
      const files = new DataTransfer();
      files.items.add(new File([body], name, { type: 'application/json' }));
      (input as HTMLInputElement).files = files.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [FILE, text] as const,
  );
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await openHome(page);
  await expect(page.getByText('Rent', { exact: true })).toBeVisible();
  await expect(page.getByText('Midterm', { exact: true })).toBeHidden();
});

test('AC-95.5 when the browser wants permission again, backups pause until it is given', async ({
  page,
}) => {
  await page.goto('/');
  await chooseFolder(page);
  await expect.poll(() => backup(page), { timeout: 15_000 }).not.toBeNull();

  // The next change finds the permission gone.
  await page.evaluate(() => sessionStorage.setItem('deny', '1'));
  await openHome(page);
  await add(page, 'Rent');
  await openData(page);
  await expect(
    page.getByText(/Backups to PersonalTracker-Backups are paused/),
  ).toBeVisible({ timeout: 15_000 });

  await page
    .getByRole('button', { name: 'Allow backups again', exact: true })
    .click();
  await expect(
    page.getByText(/Backing up to PersonalTracker-Backups/),
  ).toBeVisible();
  await expect.poll(() => backup(page), { timeout: 15_000 }).toContain('Rent');
});
