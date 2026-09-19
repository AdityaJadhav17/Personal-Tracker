import { load, save, STORAGE_KEY } from './db';
import type { Database, Item } from '../domain/types';

function anItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    title: 'CSE 100 project',
    dueAt: '2026-10-04T06:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: '2026-09-15T17:00:00.000Z',
    completedAt: null,
    goalId: null,
    courseId: null,
    repeat: 'none',
    ...overrides,
  };
}

function aDatabase(items: Item[] = [anItem()]): Database {
  return { version: 3, items, goals: [], courses: [], reflections: [] };
}

beforeEach(() => {
  localStorage.clear();
});

describe('load', () => {
  test('AC-11.1 returns an empty database on first launch', () => {
    expect(load()).toEqual(aDatabase([]));
  });

  test('returns an empty database when the stored value is not JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json at all');
    expect(load()).toEqual(aDatabase([]));
  });

  test('returns an empty database when the stored JSON is the wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: 'world' }));
    expect(load()).toEqual(aDatabase([]));
  });

  test('returns an empty database when items is not an array', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, items: 'nope' }),
    );
    expect(load()).toEqual(aDatabase([]));
  });
});

describe('save', () => {
  test('what save writes is what load reads back', () => {
    const db: Database = aDatabase();
    save(db);
    expect(load()).toEqual(db);
  });

  test('saving replaces the previous database rather than appending', () => {
    save(aDatabase([anItem({ id: 'first' })]));
    save(aDatabase([anItem({ id: 'second' })]));

    const items = load().items;
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('second');
  });

  test('a title containing markup survives a round trip unchanged', () => {
    const title = '<script>alert(1)</script> & "quotes"';
    save(aDatabase([anItem({ title })]));
    expect(load().items[0]?.title).toBe(title);
  });
});

describe('a stored database with collections of the wrong shape', () => {
  test('reflections that are not an array come back empty rather than crashing', () => {
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 3,
        items: [],
        goals: [],
        courses: [],
        reflections: 'nope',
      }),
    );

    expect(load().reflections).toEqual([]);
  });

  test('goals and courses of the wrong shape come back empty too', () => {
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 3,
        items: [],
        goals: 1,
        courses: null,
        reflections: [],
      }),
    );

    const db = load();
    expect(db.goals).toEqual([]);
    expect(db.courses).toEqual([]);
  });

  test('a database with no version at all is read as the oldest one', () => {
    localStorage.setItem('personal-tracker/v1', JSON.stringify({ items: [] }));

    // No version means version 1, which upgrade carries forward.
    expect(load().version).toBe(3);
  });
});
