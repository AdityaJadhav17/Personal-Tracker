import { toDateValue } from './dates';
import type { Item, Reflection } from './types';

export interface DayPoint {
  /** Local calendar day, "2026-09-15". */
  day: string;
  /** 1 to 5, or null on a day with no reflection. */
  score: number | null;
  completed: number;
}

/** The next local calendar day after this one. */
function nextDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return toDateValue(new Date(year!, month! - 1, date! + 1));
}

/**
 * One point per day from the earliest piece of data to the latest.
 *
 * Every day in the range is present, so a chart can plot by position and have
 * equal spacing mean equal time. Days without a reflection carry a null score
 * rather than a zero, because "no entry" and "a terrible day" are different
 * things and a zero would draw a line through the floor.
 *
 * Completions are counted on the day the work was finished, matching the stat
 * row, and an item still open never counts.
 */
export function dailySeries(
  items: Item[],
  reflections: Reflection[],
): DayPoint[] {
  const scores = new Map(reflections.map((entry) => [entry.day, entry.score]));

  const completions = new Map<string, number>();
  for (const item of items) {
    if (item.completedAt === null) continue;
    const day = toDateValue(new Date(item.completedAt));
    completions.set(day, (completions.get(day) ?? 0) + 1);
  }

  const days = [...scores.keys(), ...completions.keys()].sort();
  if (days.length === 0) return [];

  const last = days[days.length - 1]!;
  const series: DayPoint[] = [];
  for (let day = days[0]!; day <= last; day = nextDay(day)) {
    series.push({
      day,
      score: scores.get(day) ?? null,
      completed: completions.get(day) ?? 0,
    });
  }

  return series;
}

/**
 * How many days in the series actually carry something. AC-18.3 uses this to
 * decide whether there is enough to draw, and the answer is not the length of
 * the range: two entries a fortnight apart are two days of data, not fifteen.
 */
export function daysWithData(series: DayPoint[]): number {
  return series.filter((point) => point.score !== null || point.completed > 0)
    .length;
}
