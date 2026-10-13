import { backupName, backupNotice, staleBackups } from './backup';

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

    expect(staleBackups([...others, ...days].reverse())).toEqual([
      'personal-tracker-backup-2026-09-02.json',
      'personal-tracker-backup-2026-09-01.json',
    ]);
  });

  test('AC-95.3 thirty or fewer files means nothing to delete', () => {
    expect(staleBackups(['personal-tracker-backup-2026-10-12.json'])).toEqual(
      [],
    );
  });
});
