import { holidaysIn } from './holidays';

/** The holidays of a year as "day name" lines, in date order. */
function names(year: number, month?: string): string[] {
  return holidaysIn(year)
    .filter((holiday) => !month || holiday.day.startsWith(month))
    .map((holiday) => `${holiday.day} ${holiday.name}`);
}

test('AC-90.2 the federal holidays of 2026 fall where the calendar has them', () => {
  const federal = [
    '2026-01-01 New Year’s Day',
    '2026-01-19 Martin Luther King Jr. Day',
    '2026-02-16 Presidents’ Day',
    '2026-05-25 Memorial Day',
    '2026-06-19 Juneteenth',
    '2026-07-04 Independence Day',
    '2026-09-07 Labor Day',
    '2026-10-12 Indigenous Peoples’ Day',
    '2026-11-11 Veterans Day',
    '2026-11-26 Thanksgiving',
    '2026-12-25 Christmas Day',
  ];
  for (const line of federal) expect(names(2026)).toContain(line);
});

test('AC-90.4 the common days of 2026, which are not days off', () => {
  const common = [
    '2026-02-14 Valentine’s Day',
    '2026-05-10 Mother’s Day',
    '2026-06-21 Father’s Day',
    '2026-10-31 Halloween',
    '2026-12-24 Christmas Eve',
    '2026-12-31 New Year’s Eve',
  ];
  for (const line of common) expect(names(2026)).toContain(line);
});

test('AC-90.3 a Saturday holiday is observed on the Friday before', () => {
  // 4 July 2026 is a Saturday.
  expect(names(2026, '2026-07')).toEqual([
    '2026-07-03 Independence Day (observed)',
    '2026-07-04 Independence Day',
  ]);
});

test('AC-90.3 a Sunday holiday is observed on the Monday after', () => {
  // 4 July 2027 is a Sunday.
  expect(names(2027, '2027-07')).toEqual([
    '2027-07-04 Independence Day',
    '2027-07-05 Independence Day (observed)',
  ]);
});

test('AC-90.3 New Year’s Day on a Saturday is observed on the last day of the year before', () => {
  // 1 January 2028 is a Saturday.
  expect(names(2028)).toContain('2027-12-31 New Year’s Day (observed)');
});

test('AC-90.2 the moving holidays are right in other years too', () => {
  expect(names(2031)).toContain('2031-11-27 Thanksgiving');
  expect(names(2031)).toContain('2031-05-26 Memorial Day');
});

test('AC-90.1 the list is in date order', () => {
  const days = holidaysIn(2026).map((holiday) => holiday.day);
  expect(days).toEqual([...days].sort());
});
