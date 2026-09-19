import { parseImport } from './transfer';
import { upgrade } from './migrate';

/**
 * The import file is the only untrusted input this app has, and JSON is the
 * only thing it deserializes. These are the attacks that class of code gets:
 * a key that reaches Object.prototype rather than the object it appears in.
 *
 * Nothing here is currently exploitable. The tests exist so that stays true:
 * the protection is the top-level key allowlist in transfer.ts, and loosening
 * it is exactly the change that would open this back up.
 */

/** Built at runtime so the literal never appears where a linter rewrites it. */
const PROTO = ['__', 'proto', '__'].join('');

/** An item that would pass validation on its own. */
const VALID_ITEM =
  '{"id":"a","title":"t","dueAt":"2026-09-16T00:00:00.000Z",' +
  '"category":"academic","priority":"normal","status":"open","note":"",' +
  '"createdAt":"2026-09-01T00:00:00.000Z","completedAt":null}';

describe('an import file cannot reach Object.prototype', () => {
  afterEach(() => {
    // If any test here ever pollutes, do not let it leak into the next one.
    delete (Object.prototype as Record<string, unknown>).polluted;
  });

  test('a prototype key at the top level is refused as an unknown field', () => {
    const file = `{"version":1,"items":[],"${PROTO}":{"polluted":"yes"}}`;

    const result = parseImport(file);

    expect(result.ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test('a constructor key at the top level is refused too', () => {
    const file = '{"version":1,"items":[],"constructor":{"x":1}}';

    expect(parseImport(file).ok).toBe(false);
  });

  test('a prototype key inside an item does not survive the upgrade', () => {
    const item = JSON.parse(
      `${VALID_ITEM.slice(0, -1)},"${PROTO}":{"polluted":"yes"}}`,
    ) as unknown;

    upgrade({ version: 1, items: [item] });

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test('a prototype key inside an item does not survive the import', () => {
    const file = `{"version":1,"items":[${VALID_ITEM.slice(0, -1)},"${PROTO}":{"polluted":"yes"}}]}`;

    const result = parseImport(file);

    // The item itself is accepted; the extra key is simply never read, and
    // the mapper copies named fields rather than spreading what it was given.
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(result.ok && result.db.items[0]?.title).toBe('t');
  });

  test('an imported item carries only the fields this app knows', () => {
    const file = `{"version":1,"items":[${VALID_ITEM.slice(0, -1)},"extra":"smuggled"}]}`;

    const result = parseImport(file);

    expect(result.ok).toBe(true);
    const item = result.ok ? result.db.items[0] : null;
    expect(item && 'extra' in item).toBe(false);
  });
});
