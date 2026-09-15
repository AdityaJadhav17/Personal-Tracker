import { formatDue, groupOf, isUpcoming, toDueAt } from './dates';

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

describe('formatDue', () => {
  test('renders an instant in the device zone, month day and time', () => {
    const iso = toDueAt('2026-10-03', '')!;
    expect(formatDue(iso)).toBe('Oct 3, 11:59 PM');
  });

  test('renders a morning time without a leading zero on the hour', () => {
    const morning = new Date(2026, 9, 3, 9, 5, 0, 0).toISOString();
    expect(formatDue(morning)).toBe('Oct 3, 9:05 AM');
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

describe('toDueAt', () => {
  test('AC-19.2 a date with no time means 23:59 local that day', () => {
    expect(local(toDueAt('2026-10-03', '')!)).toMatchObject({
      year: 2026,
      month: 10,
      day: 3,
      hours: 23,
      minutes: 59,
    });
  });

  test('AC-19.3 a date and a time mean that local time', () => {
    expect(local(toDueAt('2026-10-03', '14:30')!)).toMatchObject({
      day: 3,
      hours: 14,
      minutes: 30,
    });
  });

  test('AC-19.3 the result is a UTC instant, not a local string', () => {
    expect(toDueAt('2026-10-03', '14:30')).toMatch(/Z$/);
  });

  test('AC-19.3 midnight and one minute to midnight both survive', () => {
    expect(local(toDueAt('2026-10-03', '00:00')!).hours).toBe(0);
    expect(local(toDueAt('2026-10-03', '23:59')!).minutes).toBe(59);
  });

  test('AC-19.3 5pm stays 5pm across the daylight saving change', () => {
    // 1 November 2026 is the Sunday US daylight saving ends, and rent is due
    // 5pm on the 1st of every month. These two are an hour apart in real time
    // and both must read as 5pm.
    expect(local(toDueAt('2026-10-01', '17:00')!).hours).toBe(17);
    expect(local(toDueAt('2026-11-01', '17:00')!).hours).toBe(17);
  });

  test('AC-19.4 an empty date has no answer', () => {
    expect(toDueAt('', '')).toBeNull();
    expect(toDueAt('', '14:30')).toBeNull();
  });

  test('AC-19.4 a malformed date has no answer', () => {
    expect(toDueAt('tomorrow', '')).toBeNull();
    expect(toDueAt('2026-10', '')).toBeNull();
  });

  test('AC-19.4 a day that does not exist has no answer', () => {
    expect(toDueAt('2026-02-30', '')).toBeNull();
    expect(toDueAt('2026-13-01', '')).toBeNull();
  });

  test('AC-19.4 a malformed time has no answer, rather than falling back', () => {
    expect(toDueAt('2026-10-03', 'lunchtime')).toBeNull();
    expect(toDueAt('2026-10-03', '25:00')).toBeNull();
    expect(toDueAt('2026-10-03', '10:75')).toBeNull();
  });

  test('a date already in the past is kept there, not rolled forward', () => {
    // US-03 needs you to be able to record something you already missed.
    expect(local(toDueAt('2020-01-05', '')!)).toMatchObject({
      year: 2020,
      month: 1,
      day: 5,
    });
  });
});
