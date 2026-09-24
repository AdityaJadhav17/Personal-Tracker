import { upgrade } from '../domain/migrate';
import type { Course, Database, Goal, Item, Reflection } from '../domain/types';

export const STORAGE_KEY = 'personal-tracker/v1';

function emptyDatabase(): Database {
  return {
    version: 5,
    items: [],
    goals: [],
    courses: [],
    reflections: [],
    lastBackupAt: null,
  };
}

/**
 * Read the whole database, upgrading it if it was written by an older version.
 *
 * Returns an empty database when the key is absent, when the stored string
 * does not parse, or when it parses into something that is not shaped like a
 * database. A stale or hand-edited key should give you an empty dashboard,
 * never a crash.
 *
 * This deliberately does not catch a localStorage that is itself unavailable,
 * which happens in a browser with site data blocked. US-11 handles that as the
 * error state, and swallowing it here would hide it.
 *
 * The storage key still says v1. Renaming it would orphan every database
 * already written, which is the one thing a migration exists to avoid.
 */
export function load(): Database {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return emptyDatabase();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyDatabase();
  }

  // A shallow shape check, not validation. US-10 has the real validator for
  // import, where the file comes from outside and is hostile.
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('items' in parsed) ||
    !Array.isArray(parsed.items)
  ) {
    return emptyDatabase();
  }

  const stored = parsed as Record<string, unknown>;
  const items = stored.items as Item[];

  // Read each collection explicitly and hand the whole thing to upgrade.
  // Rebuilding the object from version and items alone silently dropped goals,
  // courses and reflections, and branching on the version here meant db.ts had
  // an opinion about schema versions that only migrate.ts should hold.
  return upgrade({
    version: typeof stored.version === 'number' ? stored.version : 1,
    items,
    goals: Array.isArray(stored.goals) ? (stored.goals as Goal[]) : [],
    courses: Array.isArray(stored.courses) ? (stored.courses as Course[]) : [],
    reflections: Array.isArray(stored.reflections)
      ? (stored.reflections as Reflection[])
      : [],
    lastBackupAt:
      typeof stored.lastBackupAt === 'string' ? stored.lastBackupAt : null,
  });
}

/**
 * Write the whole database. Called on submit and on blur, never per keystroke.
 *
 * Returns whether it worked instead of throwing. A write can fail for a reason
 * the person cannot be expected to predict: the quota is a few megabytes, an
 * import can arrive larger than that, and Safari refuses to write at all in a
 * private window. Throwing from here escaped the click handler and left the
 * screen showing items that were never stored, which is worse than refusing
 * the change, because the lie only surfaces on the next reload.
 */
export function save(db: Database): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}
