import { serialize, exportFilename } from './transfer';
import type { Database, Item } from './types';

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
    ...overrides,
  };
}

describe('serialize', () => {
  test('AC-09.1 the output parses as JSON', () => {
    const text = serialize({ version: 1, items: [anItem()] });
    expect(() => JSON.parse(text) as unknown).not.toThrow();
  });

  test('AC-09.1 every item survives with every field intact', () => {
    const db: Database = {
      version: 1,
      items: [
        anItem({ id: 'a', note: 'Zelle, not Venmo' }),
        anItem({
          id: 'b',
          status: 'done',
          completedAt: '2026-09-16T01:00:00.000Z',
          priority: 'high',
          category: 'personal',
        }),
      ],
    };

    expect(JSON.parse(serialize(db))).toEqual(db);
  });

  test('AC-09.1 done items are exported too, not only open ones', () => {
    const db: Database = {
      version: 1,
      items: [anItem({ id: 'done-one', status: 'done' })],
    };

    const parsed = JSON.parse(serialize(db)) as Database;
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.status).toBe('done');
  });

  test('AC-09.1 the version is carried so import can tell what it is reading', () => {
    const parsed = JSON.parse(serialize({ version: 1, items: [] })) as Database;
    expect(parsed.version).toBe(1);
  });

  test('AC-09.2 an empty database exports an empty collection, not a failure', () => {
    const text = serialize({ version: 1, items: [] });
    expect(JSON.parse(text)).toEqual({ version: 1, items: [] });
  });

  test('AC-09.1 titles containing quotes and markup survive', () => {
    const title = '<script>alert("x")</script> & "quotes" \\ backslash';
    const parsed = JSON.parse(
      serialize({ version: 1, items: [anItem({ title })] }),
    ) as Database;

    expect(parsed.items[0]?.title).toBe(title);
  });

  test('the file is indented, because you are meant to be able to read it', () => {
    expect(serialize({ version: 1, items: [anItem()] })).toContain('\n  ');
  });
});

describe('exportFilename', () => {
  test('names the file by the local date it was exported', () => {
    expect(exportFilename(new Date(2026, 8, 15, 10, 0, 0))).toBe(
      'personal-tracker-2026-09-15.json',
    );
  });

  test('pads single digit months and days', () => {
    expect(exportFilename(new Date(2026, 0, 5, 10, 0, 0))).toBe(
      'personal-tracker-2026-01-05.json',
    );
  });

  test('matches the pattern .gitignore blocks, so exports are never committed', () => {
    expect(exportFilename(new Date(2026, 8, 15))).toMatch(
      /^personal-tracker-.*\.json$/,
    );
  });
});
