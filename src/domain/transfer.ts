import { upgrade } from './migrate';
import type { Course, Database, Goal, Item, Reflection } from './types';

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

/** Top level keys each version is allowed to carry. */
const KEYS: Record<number, string[]> = {
  1: ['version', 'items'],
  2: ['version', 'items', 'goals', 'courses', 'reflections'],
};

export type ParseResult =
  { ok: true; db: Database } | { ok: false; error: string };

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isInstant(value: unknown): value is string {
  return isText(value) && !Number.isNaN(Date.parse(value));
}

function isLink(value: unknown): boolean {
  return value === null || value === undefined || isText(value);
}

function fields(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/** What is wrong with this item, or null when nothing is. */
function itemProblem(value: unknown): string | null {
  const raw = fields(value);
  if (!raw) return 'it is not an object';

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
  // Absent in version 1 files, which is why these are not required.
  if (!isLink(raw.goalId)) return 'its goal must be an id or null';
  if (!isLink(raw.courseId)) return 'its course must be an id or null';
  return null;
}

function goalProblem(value: unknown): string | null {
  const raw = fields(value);
  if (!raw) return 'it is not an object';

  if (!isText(raw.id) || raw.id === '') return 'it has no id';
  if (!isText(raw.name) || raw.name.trim() === '') return 'it has no name';
  if (!isText(raw.description)) return 'its description must be text';
  if (!isInstant(raw.targetAt)) return 'its target date is not a date';
  if (!isInstant(raw.createdAt)) return 'its created date is not a date';
  return null;
}

function courseProblem(value: unknown): string | null {
  const raw = fields(value);
  if (!raw) return 'it is not an object';

  if (!isText(raw.id) || raw.id === '') return 'it has no id';
  if (!isText(raw.name) || raw.name.trim() === '') return 'it has no name';
  if (!isText(raw.meetingLocation)) return 'its location must be text';
  if (!isText(raw.professorEmail)) return 'its professor email must be text';
  if (!isText(raw.officeHours)) return 'its office hours must be text';
  if (!isInstant(raw.createdAt)) return 'its created date is not a date';
  return null;
}

function reflectionProblem(value: unknown): string | null {
  const raw = fields(value);
  if (!raw) return 'it is not an object';

  if (!isText(raw.id) || raw.id === '') return 'it has no id';
  if (!isText(raw.day) || !/^\d{4}-\d{2}-\d{2}$/.test(raw.day)) {
    return 'its day must look like 2026-09-15';
  }
  if (
    typeof raw.score !== 'number' ||
    !Number.isInteger(raw.score) ||
    raw.score < 1 ||
    raw.score > 5
  ) {
    return 'its score must be a whole number from 1 to 5';
  }
  if (!isText(raw.note)) return 'its note must be text';
  if (!isInstant(raw.createdAt)) return 'its created date is not a date';
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
    goalId: (raw.goalId as string | null | undefined) ?? null,
    courseId: (raw.courseId as string | null | undefined) ?? null,
  };
}

function toGoal(value: unknown): Goal {
  const raw = value as Record<string, unknown>;
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string,
    targetAt: raw.targetAt as string,
    createdAt: raw.createdAt as string,
  };
}

function toCourse(value: unknown): Course {
  const raw = value as Record<string, unknown>;
  return {
    id: raw.id as string,
    name: raw.name as string,
    meetingLocation: raw.meetingLocation as string,
    professorEmail: raw.professorEmail as string,
    officeHours: raw.officeHours as string,
    createdAt: raw.createdAt as string,
  };
}

function toReflection(value: unknown): Reflection {
  const raw = value as Record<string, unknown>;
  return {
    id: raw.id as string,
    day: raw.day as string,
    score: raw.score as Reflection['score'],
    note: raw.note as string,
    createdAt: raw.createdAt as string,
  };
}

/** Validate one collection, reporting the first entry that is wrong. */
function collectionProblem(
  entries: unknown[],
  label: string,
  problemOf: (value: unknown) => string | null,
): string | null {
  const seen = new Set<string>();

  for (const [index, entry] of entries.entries()) {
    const problem = problemOf(entry);
    if (problem) return `${label} ${index + 1} cannot be read: ${problem}.`;

    const id = (entry as Record<string, unknown>).id as string;
    if (seen.has(id)) return `${label} id ${id} appears more than once.`;
    seen.add(id);
  }

  return null;
}

/**
 * Read an import file, treating it as hostile.
 *
 * Someone can hand you a JSON file, so every field is checked before anything
 * is returned, unknown top level keys are refused rather than ignored, and
 * fields inside a record that we do not know about are dropped rather than
 * carried into storage. Nothing here evaluates anything: the file is data.
 *
 * Version 1 files are accepted and upgraded, so an export taken before goals
 * and courses existed still imports. Returns the database at the current
 * version, or an error naming what was wrong. Never throws.
 */
export function parseImport(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  const raw = fields(parsed);
  if (!raw) {
    return { ok: false, error: 'That file is not a Personal Tracker export.' };
  }

  const version = raw.version;
  if (version !== 1 && version !== 2) {
    return {
      ok: false,
      error: 'That file is not a version this app can read.',
    };
  }

  if (!Array.isArray(raw.items)) {
    return { ok: false, error: 'That file has no items list.' };
  }

  const allowed = KEYS[version]!;
  const unknown = Object.keys(raw).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `That file has fields this app does not recognise: ${unknown.join(', ')}.`,
    };
  }

  const itemsProblem = collectionProblem(raw.items, 'Item', itemProblem);
  if (itemsProblem) return { ok: false, error: itemsProblem };

  if (version === 1) {
    return {
      ok: true,
      db: upgrade({ version: 1, items: raw.items.map(toItem) }),
    };
  }

  for (const [key, label, problemOf] of [
    ['goals', 'Goal', goalProblem],
    ['courses', 'Course', courseProblem],
    ['reflections', 'Reflection', reflectionProblem],
  ] as const) {
    if (!Array.isArray(raw[key])) {
      return { ok: false, error: `That file has no ${key} list.` };
    }
    const problem = collectionProblem(raw[key], label, problemOf);
    if (problem) return { ok: false, error: problem };
  }

  const days = new Set<string>();
  for (const entry of raw.reflections as Record<string, unknown>[]) {
    const day = entry.day as string;
    if (days.has(day)) {
      return { ok: false, error: `There are two reflections for ${day}.` };
    }
    days.add(day);
  }

  return {
    ok: true,
    db: {
      version: 2,
      items: raw.items.map(toItem),
      goals: (raw.goals as unknown[]).map(toGoal),
      courses: (raw.courses as unknown[]).map(toCourse),
      reflections: (raw.reflections as unknown[]).map(toReflection),
    },
  };
}
