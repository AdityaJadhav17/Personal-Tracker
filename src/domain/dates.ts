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
