import { monthGrid, weekLoad } from './calendar';
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
    parentId: null,
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
      repeats: [],
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

describe('repeats', () => {
  /** Local day and time of an instant, so the tests read in wall-clock terms. */
  function local(iso: string) {
    const at = new Date(iso);
    return [at.getMonth() + 1, at.getDate(), at.getHours()];
  }

  test('AC-52.1 an open monthly item shows in the months after it, same day and time', () => {
    const rent = dueOn('2026-10-01', { title: 'Rent', repeat: 'monthly' });

    const november = cellFor('2026-11', '2026-11-01', [rent]);
    const december = cellFor('2026-12', '2026-12-01', [rent]);

    expect(november?.repeats.map((one) => one.title)).toEqual(['Rent']);
    expect(local(november!.repeats[0]!.dueAt)).toEqual([11, 1, 12]);
    expect(local(december!.repeats[0]!.dueAt)).toEqual([12, 1, 12]);
    expect(november?.items).toEqual([]);
  });

  test('AC-52.2 a weekly item shows on every week of a later month', () => {
    const standup = dueOn('2026-10-05', { repeat: 'weekly' });

    const days = monthGrid('2026-11', [standup])
      .filter((cell) => cell !== null && cell.repeats.length > 0)
      .map((cell) => cell!.day);

    expect(days).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
      '2026-11-30',
    ]);
  });

  test('AC-52.3 the real item shows once, and a done or one-off item projects nothing', () => {
    const rent = dueOn('2026-10-01', { repeat: 'monthly' });
    const paid = dueOn('2026-10-02', { repeat: 'monthly', status: 'done' });
    const once = dueOn('2026-10-03');

    const october = monthGrid('2026-10', [rent, paid, once]);
    const november = monthGrid('2026-11', [rent, paid, once]);

    expect(october.flatMap((cell) => cell?.repeats ?? [])).toEqual([]);
    expect(november.flatMap((cell) => cell?.repeats ?? [])).toHaveLength(1);
  });

  test('AC-52.4 a monthly item aimed at the 31st clamps in February and returns in March', () => {
    const end = dueOn('2027-01-31', { repeat: 'monthly' });

    expect(cellFor('2027-02', '2027-02-28', [end])?.repeats).toHaveLength(1);
    expect(cellFor('2027-03', '2027-03-31', [end])?.repeats).toHaveLength(1);
  });

  test('AC-52.4 a month before the item shows none of it', () => {
    const rent = dueOn('2026-10-01', { repeat: 'monthly' });

    expect(
      monthGrid('2026-09', [rent]).flatMap((cell) => cell?.repeats ?? []),
    ).toEqual([]);
  });
});

describe('weekLoad', () => {
  test('AC-52.5 a week counts the repeats that land in it', () => {
    const rent = dueOn('2026-10-01', { repeat: 'monthly' });
    const grid = monthGrid('2026-11', [rent, dueOn('2026-11-03')]);

    // November 2026 starts on a Sunday, so the first row is the 1st to 7th.
    expect(weekLoad(grid.slice(0, 7))).toBe(2);
  });

  test('AC-45.6 counts the open deadlines in one row of the grid', () => {
    const items = [
      dueOn('2026-09-14'),
      dueOn('2026-09-16'),
      dueOn('2026-09-16'),
      dueOn('2026-09-21'),
      dueOn('2026-09-15', { status: 'done' }),
    ];
    const grid = monthGrid('2026-09', items);
    // September 2026 starts on a Tuesday, so the row holding the 14th is the
    // third: 13th to 19th.
    const week = grid.slice(14, 21);

    expect(week[1]?.day).toBe('2026-09-14');
    expect(weekLoad(week)).toBe(3);
  });

  test('AC-45.6 a week of padding cells counts nothing', () => {
    expect(weekLoad([null, null, null])).toBe(0);
  });
});
