/**
 * US-100. The one shared copy of the database that the laptop and the phone
 * meet at, with a revision so two writers cannot overwrite each other.
 * Written to a new file and renamed over the old, so a crash mid-write
 * leaves the last good copy; the one before is kept too.
 */
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const HUB = 'hub.json';

// Undefined when the file is missing or does not parse.
function readCopy(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

const isObject = (x) =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

// A copy counts only if it has the shape writeHub gives it.
const isCopy = (c) =>
  isObject(c) &&
  Number.isInteger(c.revision) &&
  c.revision >= 0 &&
  (c.db === null || isObject(c.db));

export function readHub(dir) {
  // A damaged copy, or one of the wrong shape, falls back to the one before
  // it, rather than failing the request in the process that serves the app
  // (council, 13 October).
  for (const name of [HUB, 'hub.prev.json']) {
    const copy = readCopy(join(dir, name));
    if (isCopy(copy)) return copy;
  }
  return { revision: 0, db: null };
}

export function writeHub(dir, revision, db) {
  if (readHub(dir).revision !== revision) return { ok: false };
  mkdirSync(dir, { recursive: true });
  const file = join(dir, HUB);
  const next = { revision: revision + 1, db };
  writeFileSync(`${file}.tmp`, JSON.stringify(next), { flush: true });
  // Only a copy that parses may become the previous one, so a damaged
  // current copy never replaces the last good one.
  if (isCopy(readCopy(file))) {
    copyFileSync(file, join(dir, 'hub.prev.json'));
  }
  renameSync(`${file}.tmp`, file);
  return { ok: true, revision: next.revision };
}

// A new top-level database key must be added here too, or every sync is refused.
const KEYS = [
  'version',
  'items',
  'goals',
  'courses',
  'reflections',
  'notes',
  'lastBackupAt',
  'lock',
  'tasks',
  'deleted',
];
const LISTS = [
  'items',
  'goals',
  'courses',
  'reflections',
  'notes',
  'tasks',
  'deleted',
];

/**
 * A short reason this database may not be stored, or null. Shape only: the
 * app's parseImport does the full validation when it reads the copy back.
 * `held` is the stored copy's database, or null.
 */
export function dbProblem(db, held) {
  if (!isObject(db)) return 'not an object';
  if (!Number.isInteger(db.version) || db.version < 11) return 'version';
  for (const key of LISTS) {
    if (!Array.isArray(db[key])) return `${key} is not a list`;
  }
  if (db.lock !== null && !isObject(db.lock)) return 'lock';
  if (db.lastBackupAt !== null && typeof db.lastBackupAt !== 'string') {
    return 'lastBackupAt';
  }
  for (const key of Object.keys(db)) {
    if (!KEYS.includes(key)) return `unknown key ${key}`;
  }
  if (held && db.version < held.version) return 'older than the stored copy';
  return null;
}
