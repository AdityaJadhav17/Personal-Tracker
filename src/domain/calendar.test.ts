import { monthGrid } from './calendar';
import type { Item } from './types';

let nextId = 0;

/** An item due at noon on the given local day. */
function dueOn(day: string, overrides: Partial<Item> = {}): Item {
  nextId += 1;
  const [year, month, date] = day.split('-').map(Number);
  return {
    id: `item-${nextId}`,
    title: `item-${nextId}`,
    dueAt: new Date(year!, month! - 1, date!, 12).toISOString(),
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    completedAt: null,
    goalId: null,
    courseId: null,
    repeatDay: null,
    repeat: 'none',
    ...overrides,
  };
}

/** The cell for a day, or undefined when the grid has no such day. */
function cellFor(month: string, day: string, items: Item[]) {
  return monthGrid(month, items).find((cell) => cell?.day === day);
}

describe('monthGrid', () => {
  test('AC-21.1 an item lands in the cell for the day it is due', () => {
    const midterm = dueOn('2026-09-16', { title: 'CSE 110 midterm' });

    expect(cellFor('2026-09', '2026-09-16', [midterm])?.items).toEqual([
      midterm,
    ]);
  });

  test('AC-21.1 two items due the same day share a cell', () => {
    const items = [dueOn('2026-09-16'), dueOn('2026-09-16')];

    expect(cellFor('2026-09', '2026-09-16', items)?.items).toHaveLength(2);
  });

  test('AC-21.1 a day with nothing due has an empty list, not a missing cell', () => {
    expect(cellFor('2026-09', '2026-09-17', [dueOn('2026-09-16')])).toEqual({
      day: '2026-09-17',
      date: 17,
      items: [],
      goals: [],
    });
  });

  test('AC-21.1 an item due in another month is not shown', () => {
    const october = dueOn('2026-10-05');

    const shown = monthGrid('2026-09', [october]).flatMap(
      (cell) => cell?.items ?? [],
    );
    expect(shown).toEqual([]);
  });

  test('AC-21.1 an item due at 11:59pm stays on its own day', () => {
    // The day it reads as locally is the day it belongs in, which is the same
    // rule the dashboard groups by.
    const late = dueOn('2026-09-30', {
      dueAt: new Date(2026, 8, 30, 23, 59).toISOString(),
    });

    expect(cellFor('2026-09', '2026-09-30', [late])?.items).toEqual([late]);
  });

  test('AC-21.6 a done item is not shown, matching the dashboard', () => {
    const finished = dueOn('2026-09-16', {
      status: 'done',
      completedAt: '2026-09-16T12:00:00.000Z',
    });

    expect(cellFor('2026-09', '2026-09-16', [finished])?.items).toEqual([]);
  });

  test('items in a cell come out earliest first', () => {
    const evening = dueOn('2026-09-16', {
      title: 'evening',
      dueAt: new Date(2026, 8, 16, 21).toISOString(),
    });
    const morning = dueOn('2026-09-16', {
      title: 'morning',
      dueAt: new Date(2026, 8, 16, 9).toISOString(),
    });

    const titles = cellFor('2026-09', '2026-09-16', [
      evening,
      morning,
    ])?.items.map((item) => item.title);
    expect(titles).toEqual(['morning', 'evening']);
  });

  test('AC-21.5 a month with no items still has a full grid', () => {
    const grid = monthGrid('2026-09', []);

    expect(grid.filter((cell) => cell !== null)).toHaveLength(30);
    expect(grid.length % 7).toBe(0);
  });

  test('AC-21.5 the padding before the first of the month stays empty', () => {
    // 1 September 2026 is a Tuesday.
    expect(monthGrid('2026-09', [dueOn('2026-09-01')]).slice(0, 2)).toEqual([
      null,
      null,
    ]);
  });

  test('AC-21.3 the same items produce a different grid for a different month', () => {
    const items = [dueOn('2026-09-16'), dueOn('2026-10-05')];

    expect(cellFor('2026-10', '2026-10-05', items)?.items).toHaveLength(1);
    expect(cellFor('2026-10', '2026-10-16', items)?.items).toEqual([]);
  });

  test('the date number is the day of the month, not the index of the cell', () => {
    expect(cellFor('2026-09', '2026-09-01', [])?.date).toBe(1);
    expect(cellFor('2026-09', '2026-09-30', [])?.date).toBe(30);
  });
});

describe('goals on the calendar', () => {
  const goal = {
    id: 'goal-1',
    name: 'AWS certification',
    description: '',
    targetAt: new Date(2026, 8, 20, 12).toISOString(),
    createdAt: '2026-09-01T00:00:00.000Z',
  };

  test('AC-41.1 a goal lands on the day of its target', () => {
    const cell = monthGrid('2026-09', [], [goal]).find(
      (one) => one?.day === '2026-09-20',
    );
    expect(cell?.goals).toEqual([goal]);
  });

  test('AC-41.1 a day with no goal has an empty list', () => {
    const cell = monthGrid('2026-09', [], [goal]).find(
      (one) => one?.day === '2026-09-21',
    );
    expect(cell?.goals).toEqual([]);
  });
});
