import { monthCells, toDateValue } from './dates';
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
}

/**
 * A month laid out as cells, with each open item on the day it is due.
 *
 * Null cells are the padding before the first of the month and after the last,
 * so the array is whole weeks and a seven column grid needs no arithmetic.
 *
 * Done items are left out, matching the dashboard: the calendar answers "what
 * is coming", and something already finished is not coming. Nothing is stored
 * here, it is the same items read a second way.
 */
export function monthGrid(
  month: string,
  items: Item[],
  goals: Goal[] = [],
): (DayCell | null)[] {
  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    if (item.status !== 'open') continue;
    const day = toDateValue(new Date(item.dueAt));
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  // AC-41.1. A goal's target is a date that matters, so it belongs here even
  // though nothing is due on it.
  const goalsByDay = new Map<string, Goal[]>();
  for (const goal of goals) {
    const day = toDateValue(new Date(goal.targetAt));
    goalsByDay.set(day, [...(goalsByDay.get(day) ?? []), goal]);
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
        },
  );
}
