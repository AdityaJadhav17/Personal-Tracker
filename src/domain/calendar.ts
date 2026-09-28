import { dayOfMonth, monthCells, nextOccurrence, toDateValue } from './dates';
import type { Goal, Item } from './types';

export interface DayCell {
  /** Local calendar day, "2026-09-16". */
  day: string;
  /** The day of the month, which is what the cell prints. */
  date: number;
  /** Open items due that day, earliest first. */
  items: Item[];
  /** Goals whose target falls that day. AC-41.1. */
  goals: Goal[];
  /**
   * AC-52.1. Later rounds of a repeating item, each a copy with the date it
   * would fall due. Worked out for display and never stored: the real one only
   * appears when the one before it is finished (US-28).
   */
  repeats: Item[];
  /** AC-75.1. Finished items that were due that day. */
  done: Item[];
}

/**
 * A month laid out as cells, with each item on the day it is due.
 *
 * Null cells are the padding before the first of the month and after the last,
 * so the array is whole weeks and a seven column grid needs no arithmetic.
 *
 * Open items and finished ones are kept apart. US-75 put finished items back
 * on the calendar, as a record of the month, but "items" still means open
 * work, so the week's count and anything else reading it is unchanged.
 * Nothing is stored here, it is the same items read a second way.
 */
export function monthGrid(
  month: string,
  items: Item[],
  goals: Goal[] = [],
): (DayCell | null)[] {
  const byDay = new Map<string, Item[]>();
  // AC-75.1. Finished items stay on the day they were due, kept apart so
  // nothing that counts open work has to filter them back out.
  const doneByDay = new Map<string, Item[]>();
  for (const item of items) {
    const day = toDateValue(new Date(item.dueAt));
    const into = item.status === 'open' ? byDay : doneByDay;
    into.set(day, [...(into.get(day) ?? []), item]);
  }

  // AC-41.1. A goal's target is a date that matters, so it belongs here even
  // though nothing is due on it.
  const goalsByDay = new Map<string, Goal[]>();
  for (const goal of goals) {
    const day = toDateValue(new Date(goal.targetAt));
    goalsByDay.set(day, [...(goalsByDay.get(day) ?? []), goal]);
  }

  const repeatsByDay = new Map<string, Item[]>();
  for (const item of items) {
    if (item.status !== 'open' || item.repeat === 'none') continue;
    // Same arguments markDone uses, so the preview is where the real one lands.
    const aim =
      item.repeat === 'monthly'
        ? (item.repeatDay ?? dayOfMonth(item.dueAt))
        : undefined;
    let dueAt = nextOccurrence(item.dueAt, item.repeat, aim);
    let day = toDateValue(new Date(dueAt));
    // Day strings sort as dates, so this stops at the end of the month shown.
    while (day.slice(0, 7) <= month) {
      if (day.startsWith(month)) {
        repeatsByDay.set(day, [
          ...(repeatsByDay.get(day) ?? []),
          { ...item, dueAt },
        ]);
      }
      dueAt = nextOccurrence(dueAt, item.repeat, aim);
      day = toDateValue(new Date(dueAt));
    }
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  return monthCells(month).map((day) =>
    day === null
      ? null
      : {
          day,
          date: Number(day.slice(-2)),
          items: byDay.get(day) ?? [],
          goals: goalsByDay.get(day) ?? [],
          repeats: repeatsByDay.get(day) ?? [],
          done: doneByDay.get(day) ?? [],
        },
  );
}

/** AC-45.6. From this many deadlines in one week, the calendar calls it heavy. */
export const HEAVY_WEEK = 6;

/**
 * AC-45.6. How many open deadlines fall in one row of the grid.
 *
 * A plain count rather than a weighted score: "6 due" needs no explanation,
 * and a heavy week is heavy because of how many things land in it.
 */
export function weekLoad(week: (DayCell | null)[]): number {
  // AC-52.5. Rent is due that week whether or not last month's is ticked off.
  return week.reduce(
    (total, cell) =>
      total + (cell ? cell.items.length + cell.repeats.length : 0),
    0,
  );
}
