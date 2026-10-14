import { act, renderHook, waitFor } from '@testing-library/react';
import { useAutoBackup } from './useAutoBackup';
import * as folders from '../storage/folder';
import type { Folder } from '../storage/folder';
import { serialize } from '../domain/transfer';
import type { Database, Note } from '../domain/types';

vi.mock('../storage/folder');
const mocked = vi.mocked(folders);

const DB: Database = {
  version: 11,
  items: [],
  goals: [],
  courses: [],
  reflections: [],
  notes: [],
  lastBackupAt: null,
  lock: null,
  tasks: [],
  deleted: [],
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
  mocked.readFile.mockImplementation((_, name) =>
    Promise.resolve(files.get(name) ?? ''),
  );
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
  expect(written).toMatchObject({ version: 11, items: [] });
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

describe('US-102 backups follow a lock change', () => {
  const OLD = 'personal-tracker-backup-2026-09-14.json';
  const LOCK = {
    salt: 's',
    check: { iv: 'i', data: 'd' },
    changedAt: '2026-09-15T08:00:00.000Z',
  };
  const note = (body: string, sealed: Note['sealed']): Note => ({
    id: 'n',
    body,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    changedAt: '2026-09-01T00:00:00.000Z',
    pinned: false,
    sealed,
  });
  const plain: Database = { ...DB, notes: [note('secret text', null)] };
  const locked: Database = {
    ...DB,
    lock: LOCK,
    notes: [note('Title', { iv: 'x', data: 'y' })],
  };

  /** Mounted on `plain`, today's backup written, then the note is locked. */
  async function lockAfterwards(files: Map<string, string>) {
    const { result, rerender } = renderHook(
      ({ db, n }) => useAutoBackup(db, vi.fn(), 0, n),
      { initialProps: { db: plain, n: 0 } },
    );
    await waitFor(() => expect(result.current.state).toBe('on'));
    await waitFor(() => expect(files.size).toBeGreaterThan(1));
    rerender({ db: locked, n: 1 });
    return result;
  }

  test('AC-102.3 a lock change rewrites older backups with the locked note', async () => {
    const { folder, files } = aFolder();
    files.set(OLD, serialize(plain));
    mocked.savedFolder.mockResolvedValue(folder);
    await lockAfterwards(files);

    await waitFor(() => expect(files.get(OLD)).not.toContain('secret text'));
    const out = JSON.parse(files.get(OLD)!) as Database;
    expect(out.lock).toEqual(LOCK);
    expect(out.notes[0]?.sealed).toEqual({ iv: 'x', data: 'y' });
  });

  test('AC-102.3 without a lock change older backups are left alone', async () => {
    const { folder, files } = aFolder();
    files.set(OLD, serialize(plain));
    mocked.savedFolder.mockResolvedValue(folder);
    renderHook(() => useAutoBackup(plain, vi.fn(), 0, 0));

    await waitFor(() => expect(files.size).toBe(2));
    expect(files.get(OLD)).toBe(serialize(plain));
  });

  test('AC-102.3 a backup that does not parse is left as it is and the rest are still rewritten', async () => {
    const { folder, files } = aFolder();
    files.set('personal-tracker-backup-2026-09-13.json', 'not json');
    files.set(OLD, serialize(plain));
    mocked.savedFolder.mockResolvedValue(folder);
    const result = await lockAfterwards(files);

    await waitFor(() => expect(files.get(OLD)).not.toContain('secret text'));
    expect(files.get('personal-tracker-backup-2026-09-13.json')).toBe(
      'not json',
    );
    expect(result.current.state).toBe('on');
  });

  test('AC-102.3 a file that cannot be rewritten does not stop the others, and backups pause', async () => {
    const { folder, files } = aFolder();
    const first = 'personal-tracker-backup-2026-09-13.json';
    files.set(first, serialize(plain));
    files.set(OLD, serialize(plain));
    mocked.savedFolder.mockResolvedValue(folder);
    const write = mocked.writeFile.getMockImplementation()!;
    mocked.writeFile.mockImplementation((f, name, text) =>
      name === first && !text.includes('secret text')
        ? Promise.reject(new DOMException('gone', 'NotFoundError'))
        : write(f, name, text),
    );
    const result = await lockAfterwards(files);

    await waitFor(() => expect(files.get(OLD)).not.toContain('secret text'));
    expect(files.get(first)).toBe(serialize(plain));
    await waitFor(() => expect(result.current.state).toBe('paused'));
    expect(result.current.reason).toMatch(/flash drive/);
  });

  test('AC-102.3 a rewrite that failed is tried again once backups are allowed', async () => {
    const { folder, files } = aFolder();
    files.set(OLD, serialize(plain));
    mocked.savedFolder.mockResolvedValue(folder);
    const write = mocked.writeFile.getMockImplementation()!;
    let broken = true;
    mocked.writeFile.mockImplementation((f, name, text, create) =>
      broken && name === OLD
        ? Promise.reject(new DOMException('gone', 'NotFoundError'))
        : write(f, name, text, create),
    );
    const result = await lockAfterwards(files);
    await waitFor(() => expect(result.current.state).toBe('paused'));
    expect(files.get(OLD)).toContain('secret text');

    broken = false;
    await act(() => result.current.allow());

    await waitFor(() => expect(files.get(OLD)).not.toContain('secret text'));
  });

  test('AC-102.3 a backup pruned meanwhile is not created again by the rewrite', async () => {
    const { folder, files } = aFolder();
    files.set(OLD, serialize(plain));
    mocked.savedFolder.mockResolvedValue(folder);
    await lockAfterwards(files);
    await waitFor(() => expect(files.get(OLD)).not.toContain('secret text'));
    expect(mocked.writeFile).toHaveBeenCalledWith(
      folder,
      OLD,
      expect.any(String),
      false,
    );
  });

  test('AC-102.3 a fresh session relocks an older backup that still holds a now-sealed note, and leaves an unchanged one unwritten', async () => {
    const { folder, files } = aFolder();
    const same = 'personal-tracker-backup-2026-09-13.json';
    files.set(OLD, serialize(plain));
    files.set(same, serialize(locked));
    mocked.savedFolder.mockResolvedValue(folder);
    renderHook(() => useAutoBackup(locked, vi.fn(), 0, 0));

    await waitFor(() => expect(files.get(OLD)).not.toContain('secret text'));
    expect(mocked.writeFile).not.toHaveBeenCalledWith(
      folder,
      same,
      expect.any(String),
      false,
    );
  });
});
