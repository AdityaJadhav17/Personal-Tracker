import { act, renderHook, waitFor } from '@testing-library/react';
import { useAutoBackup } from './useAutoBackup';
import * as folders from '../storage/folder';
import type { Folder } from '../storage/folder';
import type { Database } from '../domain/types';

vi.mock('../storage/folder');
const mocked = vi.mocked(folders);

const DB: Database = {
  version: 9,
  items: [],
  goals: [],
  courses: [],
  reflections: [],
  notes: [],
  lastBackupAt: null,
  lock: null,
  tasks: [],
};

/** A folder holding `files`, whose permission is `permission`. */
function aFolder(permission: 'granted' | 'prompt' = 'granted') {
  const files = new Map<string, string>();
  // As in a browser: once granted, asking again says granted.
  let allowed = permission;
  const folder = {
    name: 'PersonalTracker-Backups',
    queryPermission: vi.fn(() => Promise.resolve(allowed)),
    requestPermission: vi.fn(() => {
      allowed = 'granted';
      return Promise.resolve(allowed);
    }),
  } as unknown as Folder;
  mocked.writeFile.mockImplementation((_, name, text) => {
    files.set(name, text);
    return Promise.resolve();
  });
  mocked.namesIn.mockImplementation(() => Promise.resolve([...files.keys()]));
  mocked.removeFile.mockImplementation((_, name) => {
    files.delete(name);
    return Promise.resolve();
  });
  return { folder, files };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.canBackUp.mockReturnValue(true);
  mocked.savedFolder.mockResolvedValue(null);
});

test('AC-95.6 where folders cannot be written, nothing is offered', () => {
  mocked.canBackUp.mockReturnValue(false);
  const { result } = renderHook(() => useAutoBackup(DB, vi.fn(), 0));
  expect(result.current.supported).toBe(false);
});

test("AC-95.1 and AC-95.2 a chosen folder gets today's backup, in Export's format", async () => {
  const { folder, files } = aFolder();
  mocked.chooseFolder.mockResolvedValue(folder);
  const recorded = vi.fn();
  const { result } = renderHook(() => useAutoBackup(DB, recorded, 0));

  await act(() => result.current.choose());

  await waitFor(() =>
    expect(files.has('personal-tracker-backup-2026-09-15.json')).toBe(true),
  );
  const written = JSON.parse(
    files.get('personal-tracker-backup-2026-09-15.json')!,
  ) as Database;
  expect(written).toMatchObject({ version: 9, items: [] });
  expect(result.current).toMatchObject({
    state: 'on',
    folder: 'PersonalTracker-Backups',
  });
  // AC-95.4. It counts as a backup.
  expect(recorded).toHaveBeenCalledWith(written.lastBackupAt);
});

test('AC-95.2 a folder chosen before is used again on open', async () => {
  const { folder, files } = aFolder();
  mocked.savedFolder.mockResolvedValue(folder);
  renderHook(() => useAutoBackup(DB, vi.fn(), 0));

  await waitFor(() => expect(files.size).toBe(1));
});

test('AC-95.4 a backup already counted today is not counted again', async () => {
  const { folder, files } = aFolder();
  mocked.savedFolder.mockResolvedValue(folder);
  const recorded = vi.fn();
  renderHook(() =>
    useAutoBackup(
      { ...DB, lastBackupAt: '2026-09-15T08:00:00.000Z' },
      recorded,
      0,
    ),
  );

  await waitFor(() => expect(files.size).toBe(1));
  expect(recorded).not.toHaveBeenCalled();
});

test('AC-95.3 days past the newest 30 are deleted after writing', async () => {
  const { folder, files } = aFolder();
  for (let day = 1; day <= 31; day += 1) {
    files.set(
      `personal-tracker-backup-2026-08-${String(day).padStart(2, '0')}.json`,
      '{}',
    );
  }
  files.set('mine.txt', 'not a backup');
  mocked.savedFolder.mockResolvedValue(folder);
  renderHook(() => useAutoBackup(DB, vi.fn(), 0));

  await waitFor(() =>
    expect(files.has('personal-tracker-backup-2026-08-02.json')).toBe(false),
  );
  expect(files.has('personal-tracker-backup-2026-08-03.json')).toBe(true);
  expect(files.has('mine.txt')).toBe(true);
});

test('AC-95.5 without permission, backups pause until allowed again', async () => {
  const { folder, files } = aFolder('prompt');
  mocked.savedFolder.mockResolvedValue(folder);
  const { result } = renderHook(() => useAutoBackup(DB, vi.fn(), 0));

  await waitFor(() => expect(result.current.state).toBe('paused'));
  expect(result.current.reason).toMatch(/permission/);
  expect(files.size).toBe(0);

  await act(() => result.current.allow());
  await waitFor(() => expect(files.size).toBe(1));
  expect(result.current.state).toBe('on');
});

test('AC-95.5 a folder that cannot be written pauses backups and says why', async () => {
  const { folder } = aFolder();
  mocked.savedFolder.mockResolvedValue(folder);
  mocked.writeFile.mockRejectedValue(new DOMException('gone', 'NotFoundError'));
  const { result } = renderHook(() => useAutoBackup(DB, vi.fn(), 0));

  await waitFor(() => expect(result.current.state).toBe('paused'));
  expect(result.current.reason).toMatch(/flash drive/);
});
