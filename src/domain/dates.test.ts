import {
  dayHeading,
  shortDay,
  dayLabel,
  daysBetween,
  formatDue,
  groupOf,
  lateBy,
  monthCells,
  monthLabel,
  monthValue,
  moveToDay,
  nextOccurrence,
  shiftMinutes,
  shiftMonth,
  timeOf,
  toIcsStamp,
  toTimeValue,
  toDueAt,
  weekdayOf,
} from './dates';

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

describe('monthValue', () => {
  test('is the local year and month of an instant', () => {
    expect(monthValue(NOW)).toBe('2026-09');
  });

  test('pads a single digit month', () => {
    expect(monthValue(new Date(2026, 0, 5, 12))).toBe('2026-01');
  });

  test('is the local month, not the UTC one', () => {
    // 11pm local on the last day of September is already October in UTC for
    // anyone west of Greenwich. The calendar is a local thing.
    const lateOnTheLastDay = new Date(2026, 8, 30, 23, 30);
    expect(monthValue(lateOnTheLastDay)).toBe('2026-09');
  });
});

describe('shiftMonth', () => {
  test('AC-21.3 moves forward one month', () => {
    expect(shiftMonth('2026-09', 1)).toBe('2026-10');
  });

  test('AC-21.3 moves back one month', () => {
    expect(shiftMonth('2026-09', -1)).toBe('2026-08');
  });

  test('AC-21.3 forward from December rolls the year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  test('AC-21.3 back from January rolls the year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('monthLabel', () => {
  test('names the month and the year', () => {
    expect(monthLabel('2026-09')).toBe('September 2026');
  });

  test('a January label carries its own year, not the previous one', () => {
    expect(monthLabel('2027-01')).toBe('January 2027');
  });
});

describe('monthCells', () => {
  test('AC-21.1 every day of the month is present, in order', () => {
    const days = monthCells('2026-09').filter((cell) => cell !== null);

    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-09-01');
    expect(days[29]).toBe('2026-09-30');
  });

  test('the cells before the first of the month are empty', () => {
    // 1 September 2026 is a Tuesday, so Sunday and Monday come first.
    const cells = monthCells('2026-09');

    expect(cells.slice(0, 2)).toEqual([null, null]);
    expect(cells[2]).toBe('2026-09-01');
  });

  test('a month starting on Sunday has no empty cells at all', () => {
    // 1 November 2026 is a Sunday.
    expect(monthCells('2026-11')[0]).toBe('2026-11-01');
  });

  test('the grid is whole weeks, so a 7 column layout never leaves a gap', () => {
    expect(monthCells('2026-09').length % 7).toBe(0);
    expect(monthCells('2026-11').length % 7).toBe(0);
    expect(monthCells('2026-02').length % 7).toBe(0);
  });

  test('February in a leap year has 29 days', () => {
    expect(monthCells('2028-02').filter((cell) => cell !== null)).toHaveLength(
      29,
    );
  });

  test('February in a common year has 28', () => {
    expect(monthCells('2026-02').filter((cell) => cell !== null)).toHaveLength(
      28,
    );
  });

  test('a 31 day month keeps all 31', () => {
    expect(monthCells('2026-10').filter((cell) => cell !== null)).toHaveLength(
      31,
    );
  });
});

describe('dayLabel', () => {
  test('names the day in full', () => {
    expect(dayLabel('2026-09-16')).toBe('September 16, 2026');
  });

  test('does not pad the day number', () => {
    expect(dayLabel('2026-09-01')).toBe('September 1, 2026');
  });
});

describe('toIcsStamp', () => {
  test('AC-24.3 renders an instant in iCalendar UTC form', () => {
    expect(toIcsStamp('2026-09-16T23:59:00.000Z')).toBe('20260916T235900Z');
  });

  test('AC-24.3 the stamp is the instant, whatever the device zone', () => {
    // Built from local fields, so this test means the same thing in Pacific
    // and on a UTC runner: the stamp is whatever UTC that instant is.
    const iso = new Date(2026, 8, 16, 17, 0, 0, 0).toISOString();
    const expected = iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    expect(toIcsStamp(iso)).toBe(expected);
  });

  test('midnight keeps its zeroes rather than losing them', () => {
    expect(toIcsStamp('2027-01-01T00:00:00.000Z')).toBe('20270101T000000Z');
  });
});

describe('shiftMinutes', () => {
  test('goes back half an hour', () => {
    expect(shiftMinutes('2026-09-16T23:59:00.000Z', -30)).toBe(
      '2026-09-16T23:29:00.000Z',
    );
  });

  test('crosses midnight backwards without breaking the date', () => {
    expect(shiftMinutes('2026-09-17T00:10:00.000Z', -30)).toBe(
      '2026-09-16T23:40:00.000Z',
    );
  });

  test('crosses a month boundary backwards', () => {
    expect(shiftMinutes('2026-10-01T00:15:00.000Z', -30)).toBe(
      '2026-09-30T23:45:00.000Z',
    );
  });
});

describe('toTimeValue', () => {
  test('AC-25.2 the local time of an instant, as the time control wants it', () => {
    expect(toTimeValue(new Date(2026, 9, 3, 17, 0))).toBe('17:00');
  });

  test('pads the hour, which the control rejects without', () => {
    expect(toTimeValue(new Date(2026, 9, 3, 9, 5))).toBe('09:05');
  });

  test('midnight is 00:00, not blank', () => {
    expect(toTimeValue(new Date(2026, 9, 3, 0, 0))).toBe('00:00');
  });
});

describe('nextOccurrence', () => {
  /** Read an instant back as local fields, which is how it renders. */
  function fields(iso: string) {
    const d = new Date(iso);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }

  test('AC-28.2 weekly is seven days later, at the same local time', () => {
    const at = new Date(2026, 9, 1, 17, 0).toISOString();

    expect(fields(nextOccurrence(at, 'weekly'))).toEqual({
      year: 2026,
      month: 10,
      day: 8,
      hours: 17,
      minutes: 0,
    });
  });

  test('AC-28.1 monthly is the same day of the next month', () => {
    const at = new Date(2026, 9, 1, 17, 0).toISOString();

    expect(fields(nextOccurrence(at, 'monthly'))).toEqual({
      year: 2026,
      month: 11,
      day: 1,
      hours: 17,
      minutes: 0,
    });
  });

  test('AC-28.1 monthly crosses the year end', () => {
    const at = new Date(2026, 11, 1, 17, 0).toISOString();
    const next = fields(nextOccurrence(at, 'monthly'));

    expect(next.year).toBe(2027);
    expect(next.month).toBe(1);
    expect(next.day).toBe(1);
  });

  test('AC-28.5 the 31st clamps to the last day of a short month', () => {
    // 31 January plus one month is not the 3rd of March.
    const at = new Date(2027, 0, 31, 9, 0).toISOString();
    const next = fields(nextOccurrence(at, 'monthly'));

    expect(next.month).toBe(2);
    expect(next.day).toBe(28);
  });

  test('AC-40.6 a monthly item anchored to the 31st returns to the 31st after February', () => {
    // The clamp used to be permanent: 31 Jan, 28 Feb, then 28 Mar forever.
    const february = new Date(2027, 1, 28, 9, 0).toISOString();
    const next = fields(nextOccurrence(february, 'monthly', 31));

    expect(next.month).toBe(3);
    expect(next.day).toBe(31);
    expect(next.hours).toBe(9);
  });

  test('AC-40.6 the anchor still clamps when the next month is short too', () => {
    const march = new Date(2027, 2, 31, 9, 0).toISOString();
    const next = fields(nextOccurrence(march, 'monthly', 31));

    expect(next.month).toBe(4);
    expect(next.day).toBe(30);
  });

  test('AC-28.5 the 31st clamps to 29 February in a leap year', () => {
    const at = new Date(2028, 0, 31, 9, 0).toISOString();
    const next = fields(nextOccurrence(at, 'monthly'));

    expect(next.month).toBe(2);
    expect(next.day).toBe(29);
  });

  test('AC-28.5 the 31st clamps to 30 in a thirty day month', () => {
    const at = new Date(2026, 2, 31, 9, 0).toISOString();
    const next = fields(nextOccurrence(at, 'monthly'));

    expect(next.month).toBe(4);
    expect(next.day).toBe(30);
  });

  test('AC-28.5 a clamp is permanent, which is the documented limitation', () => {
    // January to February clamps to the 28th, and March then takes the 28th
    // rather than returning to the 31st, because the next date is computed
    // from the last one and nothing remembers the day it started on. An item
    // due on the 29th to 31st walks backwards the first time it crosses a
    // short month, and then stays there. Aditya's case is the 1st, which never
    // clamps. Anchoring the original day is a stored field and a story of its
    // own if that ever matters.
    const january = new Date(2027, 0, 31, 9, 0).toISOString();
    const february = nextOccurrence(january, 'monthly');

    expect(fields(february).day).toBe(28);
    expect(fields(nextOccurrence(february, 'monthly')).day).toBe(28);
  });

  test('weekly across a month boundary', () => {
    const at = new Date(2026, 8, 30, 12, 0).toISOString();
    const next = fields(nextOccurrence(at, 'weekly'));

    expect(next.month).toBe(10);
    expect(next.day).toBe(7);
  });
});

describe('moveToDay', () => {
  test('AC-39.1 the deadline lands on the new day at the same time', () => {
    const moved = local(
      moveToDay(toDueAt('2026-10-07', '23:59')!, '2026-10-08'),
    );
    expect(moved).toEqual({
      year: 2026,
      month: 10,
      day: 8,
      hours: 23,
      minutes: 59,
    });
  });

  test('AC-39.5 an 8am exam moved past the daylight saving change is still 8am', () => {
    // 1 November 2026 is when US daylight saving ends, so the same wall-clock
    // time is an hour further from UTC on the 2nd than on the 27th.
    const moved = local(
      moveToDay(toDueAt('2026-10-27', '08:00')!, '2026-11-02'),
    );
    expect(moved.day).toBe(2);
    expect(moved.hours).toBe(8);
    expect(moved.minutes).toBe(0);
  });
});

describe('daysBetween', () => {
  test('AC-40.3 counts local calendar days, not 24 hour blocks', () => {
    // 11pm on the 14th to 10am on the 15th is under a day, but it is yesterday.
    const lateOnThe14th = new Date(2026, 8, 14, 23, 0).toISOString();
    expect(daysBetween(lateOnThe14th, NOW)).toBe(1);
  });

  test('AC-40.3 the same day is zero', () => {
    expect(daysBetween(new Date(2026, 8, 15, 1, 0).toISOString(), NOW)).toBe(0);
  });

  test('AC-40.3 a week is seven, across the November clock change too', () => {
    const before = new Date(2026, 9, 29, 12, 0).toISOString();
    expect(daysBetween(before, new Date(2026, 10, 5, 12, 0))).toBe(7);
  });
});

describe('US-57 the words the timeline uses', () => {
  test('AC-57.1 the heading names the day in full', () => {
    expect(dayHeading(NOW)).toBe('Tuesday, September 15');
  });

  test('AC-57.4 a day is labelled with its short weekday', () => {
    expect(weekdayOf('2026-09-20')).toBe('Sun');
  });

  test('AC-57.5 a time is shown only when it is not 11:59pm', () => {
    expect(timeOf(new Date(2026, 8, 20, 17, 0).toISOString())).toBe('5:00 PM');
    expect(timeOf(new Date(2026, 8, 20, 23, 59).toISOString())).toBeNull();
  });

  test('AC-57.3 an overdue item says how late it is, in days', () => {
    const at = (days: number) =>
      new Date(2026, 8, 15 + days, 23, 59).toISOString();

    expect(lateBy(at(-1), NOW)).toBe('Yesterday');
    expect(lateBy(at(-3), NOW)).toBe('3 days ago');
  });
});

describe('US-61 a day in few words', () => {
  test('AC-61.1 a stored day reads as weekday, month and date', () => {
    expect(shortDay('2026-09-23')).toBe('Wed, Sep 23');
  });
});
