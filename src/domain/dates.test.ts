import { formatDue, groupOf, isUpcoming, parseDueDate } from './dates';

/** Tuesday 15 September 2026, 10:00 local. Every test pins the clock here. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

/** Read an instant back in the device's local zone, which is how it renders. */
function local(iso: string) {
  const d = new Date(iso);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}

describe('parseDueDate', () => {
  test('AC-01.4 parses the ISO form "2026-10-03"', () => {
    const iso = parseDueDate('2026-10-03', NOW);
    expect(iso).not.toBeNull();
    expect(local(iso!)).toMatchObject({ year: 2026, month: 10, day: 3 });
  });

  test('AC-01.4 parses the numeric form "10/3" using the current year', () => {
    const iso = parseDueDate('10/3', NOW);
    expect(iso).not.toBeNull();
    expect(local(iso!)).toMatchObject({ year: 2026, month: 10, day: 3 });
  });

  test('AC-01.4 parses the month-name form "oct 3"', () => {
    const iso = parseDueDate('oct 3', NOW);
    expect(iso).not.toBeNull();
    expect(local(iso!)).toMatchObject({ year: 2026, month: 10, day: 3 });
  });

  test('AC-01.4 the three accepted forms produce the same instant', () => {
    expect(parseDueDate('10/3', NOW)).toBe(parseDueDate('2026-10-03', NOW));
    expect(parseDueDate('oct 3', NOW)).toBe(parseDueDate('2026-10-03', NOW));
  });

  test('AC-01.4 a date with no time means 23:59 local that day', () => {
    const iso = parseDueDate('2026-10-03', NOW);
    expect(local(iso!)).toMatchObject({ hours: 23, minutes: 59 });
  });

  test('AC-01.4 returns a UTC instant, not a local wall-clock string', () => {
    expect(parseDueDate('2026-10-03', NOW)).toMatch(/Z$/);
  });

  test('AC-01.4 accepts the full month name "october 3"', () => {
    expect(parseDueDate('october 3', NOW)).toBe(
      parseDueDate('2026-10-03', NOW),
    );
  });

  test('AC-01.4 ignores surrounding whitespace and case', () => {
    expect(parseDueDate('  OCT 3  ', NOW)).toBe(
      parseDueDate('2026-10-03', NOW),
    );
  });

  test('AC-01.4 returns null for empty input', () => {
    expect(parseDueDate('', NOW)).toBeNull();
    expect(parseDueDate('   ', NOW)).toBeNull();
  });

  test('AC-01.4 returns null for unparseable input', () => {
    expect(parseDueDate('sometime next week', NOW)).toBeNull();
    expect(parseDueDate('tomorrow', NOW)).toBeNull();
  });

  test('AC-01.4 returns null for a day that does not exist', () => {
    expect(parseDueDate('2026-02-30', NOW)).toBeNull();
    expect(parseDueDate('13/1', NOW)).toBeNull();
    expect(parseDueDate('feb 30', NOW)).toBeNull();
  });

  test('AC-01.4 keeps a past date in the past rather than rolling it forward', () => {
    // US-03 needs overdue items, so entering a date that has already passed
    // must record that date, not silently jump to next year.
    const iso = parseDueDate('1/5', NOW);
    expect(local(iso!)).toMatchObject({ year: 2026, month: 1, day: 5 });
    expect(new Date(iso!).getTime()).toBeLessThan(NOW.getTime());
  });

  test('AC-01.4 accepts an explicit year in the numeric form', () => {
    const iso = parseDueDate('10/3/2027', NOW);
    expect(local(iso!)).toMatchObject({ year: 2027, month: 10, day: 3 });
  });
});

describe('formatDue', () => {
  test('renders an instant in the device zone, month day and time', () => {
    const iso = parseDueDate('2026-10-03', NOW)!;
    expect(formatDue(iso)).toBe('Oct 3, 11:59 PM');
  });

  test('renders a morning time without a leading zero on the hour', () => {
    const morning = new Date(2026, 9, 3, 9, 5, 0, 0).toISOString();
    expect(formatDue(morning)).toBe('Oct 3, 9:05 AM');
  });
});

describe('parseDueDate with a time', () => {
  test('AC-01.4 accepts a 24-hour time after the date', () => {
    expect(local(parseDueDate('2026-10-03 14:00', NOW)!)).toMatchObject({
      year: 2026,
      month: 10,
      day: 3,
      hours: 14,
      minutes: 0,
    });
  });

  test('AC-01.4 accepts a bare hour with am or pm', () => {
    expect(local(parseDueDate('oct 3 2pm', NOW)!)).toMatchObject({
      day: 3,
      hours: 14,
      minutes: 0,
    });
  });

  test('AC-01.4 accepts minutes with am or pm', () => {
    expect(local(parseDueDate('10/3 2:30pm', NOW)!)).toMatchObject({
      day: 3,
      hours: 14,
      minutes: 30,
    });
  });

  test('AC-01.4 accepts a morning time', () => {
    expect(local(parseDueDate('oct 3 9:05am', NOW)!)).toMatchObject({
      hours: 9,
      minutes: 5,
    });
  });

  test('AC-01.4 reads 12am as midnight and 12pm as noon', () => {
    expect(local(parseDueDate('oct 3 12am', NOW)!).hours).toBe(0);
    expect(local(parseDueDate('oct 3 12pm', NOW)!).hours).toBe(12);
  });

  test('AC-01.4 tolerates a space before am or pm and mixed case', () => {
    expect(parseDueDate('oct 3 2 PM', NOW)).toBe(
      parseDueDate('oct 3 14:00', NOW),
    );
  });

  test('AC-01.4 still defaults to 23:59 when no time is given', () => {
    expect(local(parseDueDate('oct 3', NOW)!)).toMatchObject({
      hours: 23,
      minutes: 59,
    });
  });

  test('AC-01.4 rejects a trailing number that is not clearly a time', () => {
    // "oct 3 3" could be a day or an hour. Refuse rather than guess.
    expect(parseDueDate('oct 3 3', NOW)).toBeNull();
  });

  test('AC-01.4 rejects an impossible time', () => {
    expect(parseDueDate('oct 3 25:00', NOW)).toBeNull();
    expect(parseDueDate('oct 3 10:75', NOW)).toBeNull();
    expect(parseDueDate('oct 3 13pm', NOW)).toBeNull();
  });
});

describe('groupOf', () => {
  /** An instant `days` from NOW, at the given local time. */
  function at(days: number, hours = 12, minutes = 0): string {
    return new Date(2026, 8, 15 + days, hours, minutes, 0, 0).toISOString();
  }

  test('AC-02.1 yesterday is overdue', () => {
    expect(groupOf(at(-1), NOW)).toBe('overdue');
  });

  test('AC-02.1 today is today', () => {
    expect(groupOf(at(0), NOW)).toBe('today');
  });

  test('AC-02.1 three days out is this week', () => {
    expect(groupOf(at(3), NOW)).toBe('week');
  });

  test('AC-02.1 three weeks out is later', () => {
    expect(groupOf(at(21), NOW)).toBe('later');
  });

  test('AC-02.1 tomorrow is this week, not today', () => {
    expect(groupOf(at(1), NOW)).toBe('week');
  });

  test('AC-02.4 an item due at 23:59 today is in today, not overdue', () => {
    const lateTonight = new Date(2026, 8, 15, 23, 59, 0, 0);
    expect(groupOf(at(0, 23, 59), lateTonight)).toBe('today');
  });

  test('AC-02.4 an hour that has already passed today stays in today', () => {
    // Grouping compares local calendar days, so a 9am item does not jump to
    // Overdue at 10am. It is still today's work until midnight.
    expect(groupOf(at(0, 9, 0), NOW)).toBe('today');
  });

  test('AC-02.4 a minute past midnight moves yesterday into overdue', () => {
    const justAfterMidnight = new Date(2026, 8, 16, 0, 1, 0, 0);
    expect(groupOf(at(0, 23, 59), justAfterMidnight)).toBe('overdue');
  });

  test('seven days out is still this week and eight days is later', () => {
    expect(groupOf(at(7), NOW)).toBe('week');
    expect(groupOf(at(8), NOW)).toBe('later');
  });

  test('grouping does not change with the hour of day', () => {
    const morning = new Date(2026, 8, 15, 6, 0, 0, 0);
    const night = new Date(2026, 8, 15, 22, 0, 0, 0);
    expect(groupOf(at(3), morning)).toBe(groupOf(at(3), night));
    expect(groupOf(at(-2), morning)).toBe(groupOf(at(-2), night));
  });
});

describe('isUpcoming', () => {
  function at(days: number, hours = 12): string {
    return new Date(2026, 8, 15 + days, hours, 0, 0, 0).toISOString();
  }

  test('AC-12.1 an item due in two days is upcoming', () => {
    expect(isUpcoming(at(2), NOW)).toBe(true);
  });

  test('AC-12.2 an item due in nine days is not upcoming', () => {
    expect(isUpcoming(at(9), NOW)).toBe(false);
  });

  test('AC-12.1 tomorrow and three days out are both upcoming', () => {
    expect(isUpcoming(at(1), NOW)).toBe(true);
    expect(isUpcoming(at(3), NOW)).toBe(true);
  });

  test('AC-12.2 four days out is past the window', () => {
    expect(isUpcoming(at(4), NOW)).toBe(false);
  });

  test('AC-12.2 today is not marked, the Today heading already says so', () => {
    expect(isUpcoming(at(0), NOW)).toBe(false);
  });

  test('AC-12.2 something overdue is not upcoming, it is late', () => {
    expect(isUpcoming(at(-1), NOW)).toBe(false);
  });

  test('AC-12.1 the window does not shift with the hour of day', () => {
    const morning = new Date(2026, 8, 15, 6, 0, 0, 0);
    const night = new Date(2026, 8, 15, 22, 0, 0, 0);
    expect(isUpcoming(at(2), morning)).toBe(isUpcoming(at(2), night));
  });
});
