/**
 * The only module allowed to construct a Date. Every function takes `now`
 * explicitly so tests pin the clock and nothing behaves differently at 11pm
 * than at 10am. See the date decision in docs/plan.md.
 */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

interface Ymd {
  year: number;
  month: number;
  day: number;
}

function monthFromName(name: string): number | null {
  const index = MONTHS.findIndex(
    (month) => month === name || month.slice(0, 3) === name,
  );
  return index === -1 ? null : index + 1;
}

function expandYear(digits: string): number {
  return digits.length <= 2 ? 2000 + Number(digits) : Number(digits);
}

function readDate(text: string, now: Date): Ymd | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) {
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
  }

  const numeric = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(text);
  if (numeric) {
    const year = numeric[3];
    return {
      year: year === undefined ? now.getFullYear() : expandYear(year),
      month: Number(numeric[1]),
      day: Number(numeric[2]),
    };
  }

  const named = /^([a-z]+)\.?\s+(\d{1,2})$/.exec(text);
  if (named) {
    const month = monthFromName(String(named[1]));
    if (month === null) return null;
    return { year: now.getFullYear(), month, day: Number(named[2]) };
  }

  return null;
}

interface Hm {
  hours: number;
  minutes: number;
}

/** A deadline with no time given is due at the end of that day. */
const END_OF_DAY: Hm = { hours: 23, minutes: 59 };

function to24Hour(hour: number, meridiem: string | undefined): number | null {
  if (meridiem === undefined) return hour <= 23 ? hour : null;
  if (hour < 1 || hour > 12) return null;
  if (meridiem === 'am') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

/**
 * Split a trailing time off the input, or return null when there is none.
 *
 * A bare trailing number is deliberately not a time. In "oct 3 3" the second
 * number could be a day or an hour, so it takes a colon or an am/pm to count.
 */
function splitTime(text: string): { date: string; time: Hm } | null {
  const withMinutes = /^(.+?)\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(text);
  if (withMinutes) {
    const hours = to24Hour(Number(withMinutes[2]), withMinutes[4]);
    const minutes = Number(withMinutes[3]);
    if (hours === null || minutes > 59) return null;
    return { date: String(withMinutes[1]), time: { hours, minutes } };
  }

  const hourOnly = /^(.+?)\s+(\d{1,2})\s*(am|pm)$/.exec(text);
  if (hourOnly) {
    const hours = to24Hour(Number(hourOnly[2]), hourOnly[3]);
    if (hours === null) return null;
    return { date: String(hourOnly[1]), time: { hours, minutes: 0 } };
  }

  return null;
}

/**
 * Turn what the user typed into a UTC instant.
 *
 * Dates: "2026-10-03", "10/3", "10/3/2027", "oct 3", "october 3".
 * Optional trailing time: "oct 3 2pm", "10/3 2:30pm", "2026-10-03 14:00".
 * With no time the deadline is 23:59 local on that day.
 *
 * Everything is interpreted in the device's current timezone and returned as
 * an instant. Returns null when the input cannot be read.
 *
 * A date that has already passed is kept in the past rather than rolled to
 * next year, because US-03 needs you to be able to record something overdue.
 */
export function parseDueDate(input: string, now: Date): string | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;

  let dateText = text;
  let time = END_OF_DAY;

  // Try the whole string as a date first, so "oct 3" is not misread as a
  // month with an hour.
  if (!readDate(text, now)) {
    const split = splitTime(text);
    if (split) {
      dateText = split.date;
      time = split.time;
    }
  }

  const parts = readDate(dateText, now);
  if (!parts) return null;

  const at = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    time.hours,
    time.minutes,
    0,
    0,
  );

  // Date silently rolls impossible days forward, turning Feb 30 into Mar 2.
  // Reading the fields back is how we reject those.
  if (
    at.getFullYear() !== parts.year ||
    at.getMonth() !== parts.month - 1 ||
    at.getDate() !== parts.day
  ) {
    return null;
  }

  return at.toISOString();
}

/**
 * Render an instant for display, in the device's current timezone.
 * The locale is pinned so the output does not drift between your laptop and
 * a CI runner.
 */
export function formatDue(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** The current instant. The one sanctioned way for the app to read the clock. */
export function now(): Date {
  return new Date();
}

export type Group = 'overdue' | 'today' | 'week' | 'later';

/** Days between two instants, counted in whole local calendar days. */
function localDaysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Which dashboard group an item belongs to.
 *
 * Comparison is by local calendar day, not by instant. That is what keeps an
 * item due at 23:59 in Today right up to midnight instead of flipping to
 * Overdue partway through the evening, and it means a 9am item is still
 * today's work at 10am. Comparing instants, or comparing UTC days, breaks
 * AC-02.4.
 *
 * "This week" is a rolling seven days rather than the calendar week, so a
 * deadline on Monday does not read as Later when you check on Sunday.
 */
export function groupOf(dueAt: string, now: Date): Group {
  const days = localDaysBetween(now, new Date(dueAt));
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'week';
  return 'later';
}

/** How many days ahead still counts as coming up. */
const UPCOMING_DAYS = 3;

/**
 * Whether an item is close enough to warrant a nudge.
 *
 * Deliberately excludes today and anything overdue. Both already sit under a
 * heading that says so more loudly than a badge would, and calling something
 * already late "upcoming" reads wrong. So the window is tomorrow through three
 * days out.
 *
 * Priority is not consulted. A low-priority thing still gets the warning,
 * which is AC-12.3 and matches what Aditya asked for: priority ordering does
 * not mean low-priority items stop being reminders.
 */
export function isUpcoming(dueAt: string, now: Date): boolean {
  const days = localDaysBetween(now, new Date(dueAt));
  return days >= 1 && days <= UPCOMING_DAYS;
}
