import type { Database } from '../domain/types';

export const STORAGE_KEY = 'personal-tracker/v1';

function emptyDatabase(): Database {
  return { version: 1, items: [] };
}

/**
 * Read the whole database.
 *
 * Returns an empty database when the key is absent, when the stored string
 * does not parse, or when it parses into something that is not shaped like a
 * database. A stale or hand-edited key should give you an empty dashboard,
 * never a crash.
 *
 * This deliberately does not catch a localStorage that is itself unavailable,
 * which happens in a browser with site data blocked. US-11 handles that as the
 * error state, and swallowing it here would hide it.
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

  // A shallow shape check, not validation. US-10 introduces the real
  // validator for import, where the file comes from outside and is hostile.
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('items' in parsed) ||
    !Array.isArray(parsed.items)
  ) {
    return emptyDatabase();
  }

  return parsed as Database;
}

/** Write the whole database. Called on submit and on blur, never per keystroke. */
export function save(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
