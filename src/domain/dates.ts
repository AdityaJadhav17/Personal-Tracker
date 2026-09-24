/**
 * The only module allowed to construct a Date. Every function takes `now`
 * explicitly so tests pin the clock and nothing behaves differently at 11pm
 * than at 10am. See the date decision in docs/engineering/plan.md.
 */

/** A deadline with no time given is due at the end of that day. */
const END_OF_DAY = { hours: 23, minutes: 59 };

/**
 * Combine what the date and time controls hold into a UTC instant.
 *
 * `date` is what `<input type="date">` produces, "2026-10-03", and `time` is
 * what `<input type="time">` produces, "17:00", or empty for none. Both are
 * read as local wall-clock and converted, which is what keeps 5pm reading as
 * 5pm on either side of a daylight saving change.
 *
 * Returns null when the date is missing or impossible, or when a time is
 * present but unreadable. A date already in the past is kept there rather than
 * rolled forward, because US-03 needs you to record what you already missed.
 */
export function toDueAt(date: string, time: string): string | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!day) return null;

  let { hours, minutes } = END_OF_DAY;
  if (time.trim() !== '') {
    const clock = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!clock) return null;
    hours = Number(clock[1]);
    minutes = Number(clock[2]);
    if (hours > 23 || minutes > 59) return null;
  }

  const year = Number(day[1]);
  const month = Number(day[2]);
  const date0 = Number(day[3]);
  const at = new Date(year, month - 1, date0, hours, minutes, 0, 0);

  // Date silently rolls impossible days forward, turning Feb 30 into Mar 2.
  // Reading the fields back is how we reject those.
  if (
    at.getFullYear() !== year ||
    at.getMonth() !== month - 1 ||
    at.getDate() !== date0
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

/** The local calendar day of an instant, as `<input type="date">` wants it. */
export function toDateValue(at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${month}-${day}`;
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

/** The local year and month of an instant, "2026-09". */
export function monthValue(at: Date): string {
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}`;
}

/** Year and month index from "2026-09", ready for the Date constructor. */
function parseMonth(month: string): [number, number] {
  const [year, ordinal] = month.split('-').map(Number);
  return [year!, ordinal! - 1];
}

/**
 * The month `by` months away. Rolling the year is left to Date, which handles
 * a month index of -1 or 12 correctly, rather than done by hand with modulo.
 */
export function shiftMonth(month: string, by: number): string {
  const [year, index] = parseMonth(month);
  return monthValue(new Date(year, index + by, 1));
}

/** A month named for a heading, "September 2026". */
export function monthLabel(month: string): string {
  const [year, index] = parseMonth(month);
  return new Date(year, index, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

const WEEK = 7;

/**
 * The cells of a month grid, in order, for a week that starts on Sunday.
 *
 * Days before the first of the month are null, and the array is padded to
 * whole weeks, so a seven column layout never has to reason about where a row
 * ends. Adjacent months are not shown: a blank cell says "not this month"
 * without inviting you to read it as a deadline you have.
 *
 * Day zero of the next month is the last day of this one, which is how the
 * length comes out right in February and in a leap year without a table.
 */
export function monthCells(month: string): (string | null)[] {
  const [year, index] = parseMonth(month);
  const blanks = new Date(year, index, 1).getDay();
  const length = new Date(year, index + 1, 0).getDate();

  const cells: (string | null)[] = Array(blanks).fill(null);
  for (let day = 1; day <= length; day += 1) {
    cells.push(toDateValue(new Date(year, index, day)));
  }
  while (cells.length % WEEK !== 0) cells.push(null);

  return cells;
}

/** A local calendar day named in full, "September 16, 2026". */
export function dayLabel(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year!, month! - 1, date!).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * An instant in iCalendar's UTC form, "20260916T235900Z".
 *
 * Pure string work on an ISO instant, so no timezone question arises. Every
 * `dueAt` is already a UTC instant, which is why an exported calendar needs no
 * VTIMEZONE block at all. See the date decision in docs/engineering/plan.md.
 */
export function toIcsStamp(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** The same instant, moved by `minutes`, still as an ISO instant. */
export function shiftMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

/**
 * US-39. The same wall-clock time on another local day, as an instant.
 *
 * Built from the local time rather than by adding days to the instant, so an
 * 8am exam dragged across the November clock change still reads 8am.
 * `day` comes from a calendar cell, so it is always a real day.
 */
export function moveToDay(iso: string, day: string): string {
  return toDueAt(day, toTimeValue(new Date(iso)))!;
}

/** The local time of an instant, as `<input type="time">` wants it, "17:00". */
export function toTimeValue(at: Date): string {
  const hours = String(at.getHours()).padStart(2, '0');
  return `${hours}:${String(at.getMinutes()).padStart(2, '0')}`;
}

/** How often an item comes back. */
export type Repeat = 'none' | 'weekly' | 'monthly';

/**
 * When a repeating item is next due, from when it was last due.
 *
 * Weekly is seven days on. Monthly is the same day of the next month, clamped
 * to the last day when that month is shorter: the 31st of January becomes the
 * 28th of February, not the 3rd of March.
 *
 * `day` is the day of the month the series aims for. Without it, the 28th of
 * February would lead to the 28th of March and stay there; with 31 it leads
 * back to the 31st. AC-40.6. It defaults to the day `iso` falls on.
 */
export function nextOccurrence(
  iso: string,
  repeat: Repeat,
  day?: number,
): string {
  const at = new Date(iso);

  if (repeat === 'weekly') {
    return new Date(
      at.getFullYear(),
      at.getMonth(),
      at.getDate() + 7,
      at.getHours(),
      at.getMinutes(),
    ).toISOString();
  }

  // Day zero of the month after next is the last day of the next month, which
  // is the clamp without a table of month lengths.
  const lastDay = new Date(at.getFullYear(), at.getMonth() + 2, 0).getDate();

  return new Date(
    at.getFullYear(),
    at.getMonth() + 1,
    Math.min(day ?? at.getDate(), lastDay),
    at.getHours(),
    at.getMinutes(),
  ).toISOString();
}

/** The local day of the month an instant falls on. */
export function dayOfMonth(iso: string): number {
  return new Date(iso).getDate();
}

/** Whole local calendar days from `iso` to `now`, so 11pm yesterday is 1. */
export function daysBetween(iso: string, now: Date): number {
  return localDaysBetween(new Date(iso), now);
}
