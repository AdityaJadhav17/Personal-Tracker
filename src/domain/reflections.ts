import type { Database, Reflection } from './types';

/**
 * Record how a day went, replacing that day's entry if there is one.
 *
 * AC-17.3. One entry per day is what keeps the Trends series honest: one point
 * per day, no double counting. The day string is the key, and a replacement
 * keeps the original id so nothing downstream sees a new record appear.
 */
export function recordReflection(
  db: Database,
  day: string,
  score: Reflection['score'],
  note: string,
  now: Date,
): Database {
  const existing = db.reflections.find((entry) => entry.day === day);

  const entry: Reflection = {
    id: existing?.id ?? crypto.randomUUID(),
    day,
    score,
    note,
    createdAt: existing?.createdAt ?? now.toISOString(),
  };

  return {
    ...db,
    reflections: existing
      ? db.reflections.map((old) => (old.day === day ? entry : old))
      : [...db.reflections, entry],
  };
}

/**
 * Newest day first, for the list of past reflections. AC-17.4.
 *
 * Days are "2026-09-15", a fixed-width format, so comparing them as strings
 * orders them by date without parsing.
 */
export function byNewest(reflections: Reflection[]): Reflection[] {
  return [...reflections].sort((a, b) => b.day.localeCompare(a.day));
}
