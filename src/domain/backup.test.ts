import {
  backupName,
  backupNotice,
  olderBackups,
  relock,
  staleBackups,
} from './backup';
import type { Database, Lock, Note } from './types';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function daysAgo(days: number): string {
  return new Date(2026, 8, 15 - days, 10, 0).toISOString();
}

test('AC-40.2 nothing to lose means nothing to say', () => {
  expect(backupNotice(null, false, NOW)).toBeNull();
});

test('AC-40.2 items that have never been exported say so', () => {
  expect(backupNotice(null, true, NOW)).toBe('Not backed up yet.');
});

test('AC-40.3 a backup under a week old says nothing', () => {
  expect(backupNotice(daysAgo(6), true, NOW)).toBeNull();
});

test('AC-40.3 a backup a week or more old says how old', () => {
  expect(backupNotice(daysAgo(7), true, NOW)).toBe('Last backup 7 days ago.');
  expect(backupNotice(daysAgo(30), true, NOW)).toBe('Last backup 30 days ago.');
});

describe('US-95 automatic backup files', () => {
  test('AC-95.2 one file per local day, named for that day', () => {
    expect(backupName(new Date(2026, 9, 12, 23, 30))).toBe(
      'personal-tracker-backup-2026-10-12.json',
    );
    expect(backupName(new Date(2026, 9, 13, 0, 5))).toBe(
      'personal-tracker-backup-2026-10-13.json',
    );
  });

  test('AC-95.3 only the newest 30 days are kept, and nothing else is touched', () => {
    const days = Array.from(
      { length: 32 },
      (_, i) =>
        `personal-tracker-backup-2026-09-${String(i + 1).padStart(2, '0')}.json`,
    ).map((name, i) => (i >= 30 ? name.replace('-09-', '-10-') : name));
    const others = [
      'notes.txt',
      'personal-tracker-2026-09-01.json',
      'personal-tracker-backup-2026-09-01.json.bak',
    ];

    expect(
      staleBackups([...others, ...days].reverse(), new Date(2026, 10, 30)),
    ).toEqual([
      'personal-tracker-backup-2026-09-02.json',
      'personal-tracker-backup-2026-09-01.json',
    ]);
  });

  test('AC-95.3 thirty or fewer files means nothing to delete', () => {
    expect(
      staleBackups(['personal-tracker-backup-2026-10-12.json'], NOW),
    ).toEqual([]);
  });
});

describe('US-97 a backup named for a future day', () => {
  const day = (d: string) => `personal-tracker-backup-${d}.json`;
  const TODAY = new Date(2026, 8, 15, 10);

  test('AC-97.3 is neither counted among the 30 kept nor deleted', () => {
    const real = Array.from({ length: 30 }, (_, i) =>
      day(`2026-08-${String(i + 1).padStart(2, '0')}`),
    ).concat(day('2026-09-15'));
    const planted = [day('2099-01-01'), day('2099-01-02')];

    // 31 real backups: only the oldest goes, whatever is dated later.
    expect(staleBackups([...planted, ...real], TODAY)).toEqual([
      day('2026-08-01'),
    ]);
  });
});

describe('US-102 backups follow a lock change', () => {
  const base: Database = {
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
  const note = (id: string, body: string, sealed: Note['sealed']): Note => ({
    id,
    body,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    changedAt: '2026-09-01T00:00:00.000Z',
    pinned: false,
    sealed,
  });
  const lock = (salt: string): Lock => ({
    salt,
    check: { iv: salt, data: salt },
    changedAt: '2026-09-02T00:00:00.000Z',
  });

  test('AC-102.3 a note locked now is the locked one in an older file, and the lock is current', () => {
    const file: Database = {
      ...base,
      lock: lock('old'),
      notes: [note('a', 'plain text', null), note('b', 'other', null)],
    };
    const current: Database = {
      ...base,
      lock: lock('new'),
      notes: [
        note('a', 'Title', { iv: 'x', data: 'y' }),
        note('b', 'other', null),
      ],
    };
    const out = relock(file, current);
    expect(out.lock).toEqual(current.lock);
    expect(out.notes[0]).toEqual(current.notes[0]);
    expect(out.notes[1]).toEqual(file.notes[1]);
  });

  test('AC-102.3 a note the current database no longer has is left as the file has it', () => {
    const file: Database = { ...base, notes: [note('gone', 'text', null)] };
    expect(relock(file, base).notes).toEqual(file.notes);
  });

  test('AC-102.3 only backups from other days are candidates', () => {
    expect(
      olderBackups(
        [
          'personal-tracker-backup-2026-09-14.json',
          'personal-tracker-backup-2026-09-15.json',
          'mine.txt',
        ],
        NOW,
      ),
    ).toEqual(['personal-tracker-backup-2026-09-14.json']);
  });
});
