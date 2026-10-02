import { nthWeekday, shiftDay, weekdayNumber } from './dates';

/** US-90. A named day on the calendar. Not a deadline: nothing to tick. */
export interface Holiday {
  /** Local calendar day, "2026-11-26". */
  day: string;
  name: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * US-90. A year's US holidays, worked out from their rules rather than looked
 * up, so the list is right in any year and nothing is fetched.
 *
 * Federal holidays on a fixed date are also marked on the weekday they are
 * observed when they fall on a weekend (AC-90.3): a Saturday's on the Friday
 * before, a Sunday's on the Monday after. New Year's Day on a Saturday is
 * observed on 31 December of the year before, which is why a calendar showing
 * December asks for the next year's list too.
 */
export function holidaysIn(year: number): Holiday[] {
  const on = (month: number, date: number) =>
    `${year}-${pad(month)}-${pad(date)}`;

  // AC-90.2. Federal: banks and government close.
  const fixed: Holiday[] = [
    { day: on(1, 1), name: 'New Year’s Day' },
    { day: on(6, 19), name: 'Juneteenth' },
    { day: on(7, 4), name: 'Independence Day' },
    { day: on(11, 11), name: 'Veterans Day' },
    { day: on(12, 25), name: 'Christmas Day' },
  ];
  const moving: Holiday[] = [
    { day: nthWeekday(year, 1, 1, 3), name: 'Martin Luther King Jr. Day' },
    { day: nthWeekday(year, 2, 1, 3), name: 'Presidents’ Day' },
    { day: nthWeekday(year, 5, 1, -1), name: 'Memorial Day' },
    { day: nthWeekday(year, 9, 1, 1), name: 'Labor Day' },
    // The federal name is Columbus Day; California and UCSD use this one.
    { day: nthWeekday(year, 10, 1, 2), name: 'Indigenous Peoples’ Day' },
    { day: nthWeekday(year, 11, 4, 4), name: 'Thanksgiving' },
  ];
  // AC-90.3.
  const observed: Holiday[] = fixed.flatMap(({ day, name }) => {
    const weekday = weekdayNumber(day);
    if (weekday === 6)
      return [{ day: shiftDay(day, -1), name: `${name} (observed)` }];
    if (weekday === 0)
      return [{ day: shiftDay(day, 1), name: `${name} (observed)` }];
    return [];
  });
  // AC-90.4. Common, and not days off.
  const common: Holiday[] = [
    { day: on(2, 14), name: 'Valentine’s Day' },
    { day: nthWeekday(year, 5, 0, 2), name: 'Mother’s Day' },
    { day: nthWeekday(year, 6, 0, 3), name: 'Father’s Day' },
    { day: on(10, 31), name: 'Halloween' },
    { day: on(12, 24), name: 'Christmas Eve' },
    { day: on(12, 31), name: 'New Year’s Eve' },
  ];

  return [...fixed, ...moving, ...observed, ...common].sort((a, b) =>
    a.day.localeCompare(b.day),
  );
}
