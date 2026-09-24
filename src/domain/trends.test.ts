import { dailySeries, daysWithData } from './trends';
import type { Item, Reflection } from './types';

function aReflection(day: string, score: Reflection['score']): Reflection {
  return { id: day, day, score, note: '', createdAt: '2026-09-15T21:00:00Z' };
}

let nextId = 0;

/** An item completed on the given local day, at noon. */
function completedOn(day: string): Item {
  nextId += 1;
  const [y, m, d] = day.split('-').map(Number);
  return {
    id: `item-${nextId}`,
    title: `item-${nextId}`,
    dueAt: new Date(y!, m! - 1, d!, 12).toISOString(),
    category: 'academic',
    priority: 'normal',
    status: 'done',
    note: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    completedAt: new Date(y!, m! - 1, d!, 12).toISOString(),
    goalId: null,
    courseId: null,
    repeatDay: null,
    repeat: 'none',
  };
}

function anOpenItem(): Item {
  nextId += 1;
  return {
    ...completedOn('2026-09-15'),
    id: `open-${nextId}`,
    status: 'open',
    completedAt: null,
  };
}

describe('dailySeries', () => {
  test('AC-18.1 one point per day that has a reflection', () => {
    const series = dailySeries([], [aReflection('2026-09-13', 2)]);

    expect(series).toEqual([{ day: '2026-09-13', score: 2, completed: 0 }]);
  });

  test('AC-18.1 days between two entries are present, with no score', () => {
    const series = dailySeries(
      [],
      [aReflection('2026-09-13', 2), aReflection('2026-09-15', 5)],
    );

    expect(series.map((p) => p.day)).toEqual([
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
    ]);
    expect(series[1]?.score).toBeNull();
  });

  test('AC-18.2 completions are counted per day', () => {
    const series = dailySeries(
      [completedOn('2026-09-13'), completedOn('2026-09-13')],
      [],
    );

    expect(series).toEqual([{ day: '2026-09-13', score: null, completed: 2 }]);
  });

  test('AC-18.2 a day with no completions is zero, not missing', () => {
    const series = dailySeries(
      [completedOn('2026-09-13'), completedOn('2026-09-15')],
      [],
    );

    expect(series[1]).toEqual({
      day: '2026-09-14',
      score: null,
      completed: 0,
    });
  });

  test('AC-18.2 items still open never count', () => {
    expect(dailySeries([anOpenItem()], [])).toEqual([]);
  });

  test('the range spans both sources, earliest to latest', () => {
    const series = dailySeries(
      [completedOn('2026-09-16')],
      [aReflection('2026-09-14', 3)],
    );

    expect(series.map((p) => p.day)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });

  test('a day carries both its score and its completions', () => {
    const series = dailySeries(
      [completedOn('2026-09-14')],
      [aReflection('2026-09-14', 4)],
    );

    expect(series).toEqual([{ day: '2026-09-14', score: 4, completed: 1 }]);
  });

  test('days come out oldest first, so a chart reads left to right', () => {
    const series = dailySeries(
      [],
      [aReflection('2026-09-15', 5), aReflection('2026-09-13', 2)],
    );

    expect(series[0]?.day).toBe('2026-09-13');
  });

  test('the range crosses a month boundary correctly', () => {
    const series = dailySeries(
      [],
      [aReflection('2026-09-30', 3), aReflection('2026-10-02', 4)],
    );

    expect(series.map((p) => p.day)).toEqual([
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  test('no data at all is an empty series, not a range of nothing', () => {
    expect(dailySeries([], [])).toEqual([]);
  });
});

describe('daysWithData', () => {
  test('AC-18.3 counts only days that actually carry something', () => {
    const series = dailySeries(
      [completedOn('2026-09-16')],
      [aReflection('2026-09-14', 3)],
    );

    // Three days in the range, two of them with data.
    expect(series).toHaveLength(3);
    expect(daysWithData(series)).toBe(2);
  });

  test('AC-18.3 one day of data is one', () => {
    expect(daysWithData(dailySeries([], [aReflection('2026-09-14', 3)]))).toBe(
      1,
    );
  });

  test('AC-18.3 nothing at all is zero', () => {
    expect(daysWithData([])).toBe(0);
  });
});
