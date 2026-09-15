import { serialize, exportFilename, parseImport } from './transfer';
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

describe('parseImport', () => {
  const good: Database = { version: 1, items: [anItem()] };

  function reject(text: string) {
    const result = parseImport(text);
    expect(result.ok).toBe(false);
    return result.ok ? '' : result.error;
  }

  test('AC-10.1 a serialized database parses back to exactly itself', () => {
    const result = parseImport(serialize(good));
    expect(result.ok).toBe(true);
    expect(result.ok && result.db).toEqual(good);
  });

  test('AC-10.1 a database with every field populated round trips', () => {
    const db: Database = {
      version: 1,
      items: [
        anItem({ id: 'a', note: 'Zelle, not Venmo', priority: 'high' }),
        anItem({
          id: 'b',
          status: 'done',
          completedAt: '2026-09-16T01:00:00.000Z',
          category: 'personal',
          priority: 'low',
        }),
      ],
    };

    const result = parseImport(serialize(db));
    expect(result.ok && result.db).toEqual(db);
  });

  test('AC-10.1 an empty database round trips', () => {
    const result = parseImport(serialize({ version: 1, items: [] }));
    expect(result.ok && result.db).toEqual({ version: 1, items: [] });
  });

  test('AC-10.2 a file that is not JSON is refused, saying so', () => {
    expect(reject('not json at all')).toMatch(/not valid JSON/i);
  });

  test('AC-10.2 an empty file is refused', () => {
    expect(reject('')).toMatch(/not valid JSON/i);
  });

  test('AC-10.2 truncated JSON is refused', () => {
    expect(reject('{"version": 1, "items": [')).toMatch(/not valid JSON/i);
  });

  test('AC-10.3 valid JSON with no items list is refused, naming items', () => {
    expect(reject('{"version": 1}')).toMatch(/items/i);
  });

  test('AC-10.3 items that is not an array is refused, naming items', () => {
    expect(reject('{"version": 1, "items": "nope"}')).toMatch(/items/i);
  });

  test('a bare array is refused', () => {
    expect(reject('[]')).toMatch(/not a Personal Tracker export/i);
  });

  test('null is refused', () => {
    expect(reject('null')).toMatch(/not a Personal Tracker export/i);
  });

  test('a file from a different version is refused, naming the version', () => {
    expect(reject('{"version": 2, "items": []}')).toMatch(/version/i);
  });

  test('unknown top level fields are refused and named', () => {
    const error = reject('{"version": 1, "items": [], "courses": []}');
    expect(error).toMatch(/courses/);
  });

  test('an item that is not an object is refused, naming which one', () => {
    expect(reject('{"version": 1, "items": [1]}')).toMatch(/item 1/i);
  });

  test('an item with no title is refused, naming which one', () => {
    const items = [anItem({ id: 'a' }), { ...anItem({ id: 'b' }), title: '' }];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(
      /item 2.*title/i,
    );
  });

  test('an item with an unknown priority is refused', () => {
    const items = [{ ...anItem(), priority: 'urgent' }];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(/priority/i);
  });

  test('an item with an unknown category is refused', () => {
    const items = [{ ...anItem(), category: 'work' }];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(/category/i);
  });

  test('an item with an unknown status is refused', () => {
    const items = [{ ...anItem(), status: 'maybe' }];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(/status/i);
  });

  test('an item whose due date is not a date is refused', () => {
    const items = [{ ...anItem(), dueAt: 'whenever' }];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(/due/i);
  });

  test('an item whose note is not text is refused', () => {
    const items = [{ ...anItem(), note: 42 }];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(/note/i);
  });

  test('an item with a missing field is refused rather than defaulted', () => {
    const withoutNote: Record<string, unknown> = { ...anItem() };
    delete withoutNote.note;
    expect(
      reject(JSON.stringify({ version: 1, items: [withoutNote] })),
    ).toMatch(/note/i);
  });

  test('two items sharing an id are refused', () => {
    const items = [anItem({ id: 'same' }), anItem({ id: 'same' })];
    expect(reject(JSON.stringify({ version: 1, items }))).toMatch(/same/);
  });

  test('extra fields inside an item are dropped, not carried through', () => {
    const items = [{ ...anItem(), evil: 'payload' }];
    const result = parseImport(JSON.stringify({ version: 1, items }));

    expect(result.ok).toBe(true);
    expect(result.ok && result.db.items[0]).not.toHaveProperty('evil');
  });

  test('a string that looks like code is data, never executed', () => {
    const title = '{{constructor.constructor("return 1")()}}';
    const result = parseImport(
      JSON.stringify({ version: 1, items: [anItem({ title })] }),
    );

    expect(result.ok && result.db.items[0]?.title).toBe(title);
  });
});
