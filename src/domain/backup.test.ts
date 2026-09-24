import { backupNotice } from './backup';

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
