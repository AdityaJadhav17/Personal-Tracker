import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { APP_VERSION, dbProblem, readHub, writeHub } from './hub.mjs';

let dir;
const fresh = () => (dir = mkdtempSync(join(tmpdir(), 'pt-hub-')));
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test('AC-100.1 nothing stored reads as revision 0 and no database', () => {
  expect(readHub(fresh())).toEqual({ revision: 0, db: null });
});

test('AC-100.2 a write at the current revision stores it and moves the revision on', () => {
  fresh();
  expect(writeHub(dir, 0, { version: 11 })).toEqual({ ok: true, revision: 1 });
  expect(readHub(dir)).toEqual({ revision: 1, db: { version: 11 } });
});

test('AC-100.2 a write against an old revision changes nothing', () => {
  fresh();
  writeHub(dir, 0, { version: 11, n: 1 });
  expect(writeHub(dir, 0, { version: 11, n: 2 })).toEqual({ ok: false });
  expect(readHub(dir).db).toEqual({ version: 11, n: 1 });
});

test('AC-100.5 the previous copy is kept beside the new one', () => {
  fresh();
  writeHub(dir, 0, { version: 11, n: 1 });
  writeHub(dir, 1, { version: 11, n: 2 });
  expect(
    JSON.parse(readFileSync(join(dir, 'hub.prev.json'), 'utf8')).db,
  ).toEqual({ version: 11, n: 1 });
  expect(existsSync(join(dir, 'hub.json.tmp'))).toBe(false);
});

test('AC-100.5 a damaged current copy reads as the previous one', () => {
  fresh();
  writeHub(dir, 0, { version: 11, n: 1 });
  writeHub(dir, 1, { version: 11, n: 2 });
  writeFileSync(join(dir, 'hub.json'), '{"revision": 2, "db": ');
  expect(readHub(dir)).toEqual({ revision: 1, db: { version: 11, n: 1 } });
});

test('AC-100.5 a write over a damaged current copy keeps the last good copy as the previous one', () => {
  fresh();
  writeHub(dir, 0, { version: 11, n: 1 });
  writeHub(dir, 1, { version: 11, n: 2 });
  writeFileSync(join(dir, 'hub.json'), '{"revision": 2, "db": ');
  const { revision } = readHub(dir);
  expect(writeHub(dir, revision, { version: 11, n: 3 })).toEqual({
    ok: true,
    revision: 2,
  });
  expect(readHub(dir)).toEqual({ revision: 2, db: { version: 11, n: 3 } });
  expect(
    JSON.parse(readFileSync(join(dir, 'hub.prev.json'), 'utf8')).db,
  ).toEqual({ version: 11, n: 1 });
});

const good = {
  version: 11,
  items: [],
  goals: [],
  courses: [],
  reflections: [],
  notes: [],
  lastBackupAt: null,
  lock: null,
  tasks: [],
  deleted: [],
};

test('AC-100.5 a well-formed database has no problem', () => {
  expect(dbProblem(good, undefined)).toBeNull();
  expect(dbProblem(good, { version: 11 })).toBeNull();
  expect(
    dbProblem({ ...good, version: 11, lock: {} }, { version: 11 }),
  ).toBeNull();
});

test('AC-100.5 a value that is not a database is a problem', () => {
  for (const db of [null, undefined, [], 'x', 3]) {
    expect(dbProblem(db, undefined)).toEqual(expect.any(String));
  }
});

test('AC-100.5 a missing or wrong-kind key is a problem', () => {
  const bad = [
    { version: undefined },
    { version: 1.5 },
    { version: 10 },
    { items: {} },
    { goals: undefined },
    { courses: null },
    { reflections: 'x' },
    { notes: undefined },
    { tasks: {} },
    { deleted: null },
    { lock: undefined },
    { lock: [] },
    { lock: 'x' },
    { lastBackupAt: undefined },
    { lastBackupAt: 5 },
    { extra: 1 },
  ];
  for (const change of bad) {
    expect(dbProblem({ ...good, ...change }, undefined)).toEqual(
      expect.any(String),
    );
  }
});

test('AC-100.5 a database older than the held one is a problem', () => {
  expect(dbProblem({ ...good, version: 11 }, { version: 12 })).toEqual(
    expect.any(String),
  );
});

test('AC-100.5 a copy that parses but has the wrong shape reads as the previous one', () => {
  for (const text of [
    'null',
    '{}',
    '{"revision":-1,"db":null}',
    '{"revision":1,"db":3}',
  ]) {
    fresh();
    writeHub(dir, 0, { version: 11, n: 1 });
    writeHub(dir, 1, { version: 11, n: 2 });
    writeFileSync(join(dir, 'hub.json'), text);
    expect(readHub(dir)).toEqual({ revision: 1, db: { version: 11, n: 1 } });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('AC-100.5 two wrong-shaped copies read as nothing stored', () => {
  fresh();
  writeFileSync(join(dir, 'hub.json'), 'null');
  writeFileSync(join(dir, 'hub.prev.json'), '{}');
  expect(readHub(dir)).toEqual({ revision: 0, db: null });
});

const note = (id, sealed) => ({
  id,
  sealed: sealed ? { iv: 'a', data: 'b' } : null,
});
const withLock = (salt, notes) => ({ version: 11, lock: { salt }, notes });

test('AC-102.7 a newer version than the app is refused', () => {
  expect(
    dbProblem(
      {
        ...withLock('s', []),
        items: [],
        goals: [],
        courses: [],
        reflections: [],
        tasks: [],
        deleted: [],
        lastBackupAt: null,
        version: 12,
      },
      null,
    ),
  ).toBe('version');
});

test('AC-102.7 a changed lock salt keeps no previous copy', () => {
  fresh();
  writeHub(dir, 0, withLock('s1', []));
  writeHub(dir, 1, withLock('s1', []));
  expect(existsSync(join(dir, 'hub.prev.json'))).toBe(true);
  writeHub(dir, 2, withLock('s2', []));
  expect(existsSync(join(dir, 'hub.prev.json'))).toBe(false);
});

test('AC-102.7 a note sealed since the old copy keeps no previous copy', () => {
  fresh();
  writeHub(dir, 0, withLock('s', [note('n1', false)]));
  writeHub(dir, 1, withLock('s', [note('n1', false)]));
  expect(existsSync(join(dir, 'hub.prev.json'))).toBe(true);
  writeHub(dir, 2, withLock('s', [note('n1', true)]));
  expect(existsSync(join(dir, 'hub.prev.json'))).toBe(false);
});

test('AC-102.7 a note that was already sealed keeps the previous copy', () => {
  fresh();
  writeHub(dir, 0, withLock('s', [note('n1', true)]));
  writeHub(dir, 1, withLock('s', [note('n1', true), note('n2', false)]));
  expect(existsSync(join(dir, 'hub.prev.json'))).toBe(true);
});

test('AC-102.7 a previous copy that cannot be removed does not stop the write', () => {
  fresh();
  writeHub(dir, 0, withLock('s1', []));
  // A folder with something in it cannot be removed as a file.
  mkdirSync(join(dir, 'hub.prev.json'));
  writeFileSync(join(dir, 'hub.prev.json', 'x'), 'x');
  expect(writeHub(dir, 1, withLock('s2', []))).toEqual({
    ok: true,
    revision: 2,
  });
  expect(existsSync(join(dir, 'hub.json.tmp'))).toBe(false);
});

test('AC-102.7 the hub accepts exactly the database version the app writes', () => {
  // Tests run from the repository root.
  const text = readFileSync(join('src', 'storage', 'db.ts'), 'utf8');
  const found = /version: (\d+),/.exec(text);
  expect(found?.[1]).toBe(String(APP_VERSION));
});
