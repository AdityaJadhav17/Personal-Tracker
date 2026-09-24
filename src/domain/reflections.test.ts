import { byNewest, recordReflection } from './reflections';
import type { Database, Reflection } from './types';

const NOW = new Date(2026, 8, 15, 21, 0, 0, 0);

function aReflection(day: string, score: Reflection['score'] = 3): Reflection {
  return {
    id: day,
    day,
    score,
    note: '',
    createdAt: NOW.toISOString(),
  };
}

function aDatabase(reflections: Reflection[]): Database {
  return {
    version: 5,
    items: [],
    goals: [],
    courses: [],
    reflections,
    lastBackupAt: null,
  };
}

describe('recordReflection', () => {
  test('AC-17.2 records today with the score and note given', () => {
    const next = recordReflection(
      aDatabase([]),
      '2026-09-15',
      4,
      'long lab',
      NOW,
    );

    expect(next.reflections).toHaveLength(1);
    expect(next.reflections[0]).toMatchObject({
      day: '2026-09-15',
      score: 4,
      note: 'long lab',
    });
  });

  test('AC-17.3 recording the same day again replaces it', () => {
    const db = aDatabase([aReflection('2026-09-15', 2)]);

    const next = recordReflection(db, '2026-09-15', 5, 'better', NOW);

    expect(next.reflections).toHaveLength(1);
    expect(next.reflections[0]).toMatchObject({ score: 5, note: 'better' });
  });

  test('AC-17.3 replacing keeps the original id, so nothing duplicates', () => {
    const db = aDatabase([aReflection('2026-09-15', 2)]);

    const next = recordReflection(db, '2026-09-15', 5, '', NOW);

    expect(next.reflections[0]?.id).toBe('2026-09-15');
  });

  test('AC-17.3 another day is untouched', () => {
    const db = aDatabase([
      aReflection('2026-09-14', 2),
      aReflection('2026-09-15', 2),
    ]);

    const next = recordReflection(db, '2026-09-15', 5, '', NOW);

    expect(next.reflections).toHaveLength(2);
    expect(next.reflections.find((r) => r.day === '2026-09-14')?.score).toBe(2);
  });

  test('the other collections are carried through', () => {
    const next = recordReflection(aDatabase([]), '2026-09-15', 3, '', NOW);

    expect(next.version).toBe(5);
    expect(next.items).toEqual([]);
    expect(next.goals).toEqual([]);
    expect(next.courses).toEqual([]);
  });

  test('recording does not mutate the database it was given', () => {
    const db = aDatabase([aReflection('2026-09-15', 2)]);
    const snapshot = JSON.stringify(db);

    recordReflection(db, '2026-09-15', 5, '', NOW);

    expect(JSON.stringify(db)).toBe(snapshot);
  });
});

describe('byNewest', () => {
  test('AC-17.4 the most recent day comes first', () => {
    const sorted = byNewest([
      aReflection('2026-09-13'),
      aReflection('2026-09-15'),
      aReflection('2026-09-14'),
    ]);

    expect(sorted.map((r) => r.day)).toEqual([
      '2026-09-15',
      '2026-09-14',
      '2026-09-13',
    ]);
  });

  test('AC-17.4 days sort by date, not by string length or month alone', () => {
    const sorted = byNewest([
      aReflection('2026-09-02'),
      aReflection('2026-10-01'),
      aReflection('2025-12-31'),
    ]);

    expect(sorted.map((r) => r.day)).toEqual([
      '2026-10-01',
      '2026-09-02',
      '2025-12-31',
    ]);
  });

  test('sorting does not mutate the array it was given', () => {
    const list = [aReflection('2026-09-13'), aReflection('2026-09-15')];

    byNewest(list);

    expect(list.map((r) => r.day)).toEqual(['2026-09-13', '2026-09-15']);
  });

  test('an empty list sorts to an empty list', () => {
    expect(byNewest([])).toEqual([]);
  });
});
