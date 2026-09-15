import type { Database, Item } from './types';

/**
 * Turn the whole database into the export file.
 *
 * Indented, because the point of owning your data is being able to read it.
 * Everything goes in, done items included: this is a backup, not a view.
 */
export function serialize(db: Database): string {
  return JSON.stringify(db, null, 2);
}

/**
 * Name the file by the local date it was exported, so two exports on
 * different days do not overwrite each other in your Downloads folder.
 *
 * The `personal-tracker-` prefix is the pattern .gitignore blocks, which is
 * what keeps an export out of the repository by construction rather than by
 * remembering.
 */
export function exportFilename(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `personal-tracker-${now.getFullYear()}-${month}-${day}.json`;
}

const CATEGORIES = ['academic', 'personal'];
const PRIORITIES = ['high', 'normal', 'low'];
const STATUSES = ['open', 'done'];

export type ParseResult =
  { ok: true; db: Database } | { ok: false; error: string };

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isInstant(value: unknown): value is string {
  return isText(value) && !Number.isNaN(Date.parse(value));
}

/** What is wrong with this item, or null when nothing is. */
function itemProblem(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'it is not an object';
  }
  const raw = value as Record<string, unknown>;

  if (!isText(raw.id) || raw.id === '') return 'it has no id';
  if (!isText(raw.title) || raw.title.trim() === '') return 'it has no title';
  if (!isInstant(raw.dueAt)) return 'its due date is not a date';
  if (!isText(raw.category) || !CATEGORIES.includes(raw.category)) {
    return 'its category must be academic or personal';
  }
  if (!isText(raw.priority) || !PRIORITIES.includes(raw.priority)) {
    return 'its priority must be high, normal or low';
  }
  if (!isText(raw.status) || !STATUSES.includes(raw.status)) {
    return 'its status must be open or done';
  }
  if (!isText(raw.note)) return 'its note must be text';
  if (!isInstant(raw.createdAt)) return 'its created date is not a date';
  if (raw.completedAt !== null && !isInstant(raw.completedAt)) {
    return 'its completed date must be a date or null';
  }
  return null;
}

/** Copy across only the fields we know about, so nothing else rides along. */
function toItem(value: unknown): Item {
  const raw = value as Record<string, unknown>;
  return {
    id: raw.id as string,
    title: raw.title as string,
    dueAt: raw.dueAt as string,
    category: raw.category as Item['category'],
    priority: raw.priority as Item['priority'],
    status: raw.status as Item['status'],
    note: raw.note as string,
    createdAt: raw.createdAt as string,
    completedAt: raw.completedAt as string | null,
  };
}

/**
 * Read an import file, treating it as hostile.
 *
 * Someone can hand you a JSON file, so every field is checked before anything
 * is returned, unknown top level keys are refused rather than ignored, and
 * fields inside an item that we do not know about are dropped rather than
 * carried into storage. Nothing here evaluates anything: the file is data.
 *
 * Returns the database or an error naming what was wrong. Never throws, so
 * the caller has no reason to wrap it.
 */
export function parseImport(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'That file is not a Personal Tracker export.' };
  }
  const raw = parsed as Record<string, unknown>;

  if (raw.version !== 1) {
    return {
      ok: false,
      error: 'That file is not a version 1 export, so it cannot be read.',
    };
  }

  if (!Array.isArray(raw.items)) {
    return { ok: false, error: 'That file has no items list.' };
  }

  const unknown = Object.keys(raw).filter(
    (key) => key !== 'version' && key !== 'items',
  );
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `That file has fields this app does not recognise: ${unknown.join(', ')}.`,
    };
  }

  const seen = new Set<string>();
  for (const [index, entry] of raw.items.entries()) {
    const problem = itemProblem(entry);
    if (problem) {
      return {
        ok: false,
        error: `Item ${index + 1} cannot be read: ${problem}.`,
      };
    }

    const id = (entry as Record<string, unknown>).id as string;
    if (seen.has(id)) {
      return { ok: false, error: `Item id ${id} appears more than once.` };
    }
    seen.add(id);
  }

  return { ok: true, db: { version: 1, items: raw.items.map(toItem) } };
}
