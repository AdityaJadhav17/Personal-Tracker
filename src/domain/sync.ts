import { daysBetween } from './dates';
import type { Collection, Database, Deletion } from './types';

/** US-99. What sync merges, and how each record is known. */
export const COLLECTIONS: Collection[] = [
  'items',
  'goals',
  'courses',
  'reflections',
  'notes',
  'tasks',
];

/** A reflection is one per day; everything else has an id. */
export function keyOf(
  kind: Collection,
  record: { id: string; day?: string },
): string {
  return kind === 'reflections' ? record.day! : record.id;
}

/** AC-99.3. Long enough for any device to have synced since. */
const KEEP_MARKERS_DAYS = 60;

type Keyed = { id: string; day?: string; changedAt: string };

/**
 * US-99. `next`, with every record that is not the very object it was in
 * `previous` dated `now`, and every record that went missing marked deleted.
 * Actions only rebuild what they change, so identity is the change.
 */
export function stamp(previous: Database, next: Database, now: Date): Database {
  const at = now.toISOString();
  const out = { ...next } as Record<Collection, Keyed[]> & Database;
  const marks: Deletion[] = [];
  const present = new Set<string>();

  for (const kind of COLLECTIONS) {
    const before = new Map(
      (previous[kind] as Keyed[]).map((r) => [keyOf(kind, r), r]),
    );
    // A union key cannot be written through the intersection type; the
    // records are only re-dated, so the element type is the same.
    (out as Record<Collection, Keyed[]>)[kind] = (next[kind] as Keyed[]).map(
      (record) => {
        const key = keyOf(kind, record);
        present.add(`${kind}:${key}`);
        return before.get(key) === record
          ? record
          : { ...record, changedAt: at };
      },
    );
    for (const key of before.keys()) {
      if (!present.has(`${kind}:${key}`)) marks.push({ kind, id: key, at });
    }
  }

  out.deleted = [
    ...next.deleted.filter(
      (mark) =>
        !present.has(`${mark.kind}:${mark.id}`) &&
        daysBetween(mark.at, now) <= KEEP_MARKERS_DAYS,
    ),
    ...marks,
  ];
  out.lock =
    next.lock && next.lock !== previous.lock
      ? { ...next.lock, changedAt: at }
      : next.lock;
  return out;
}
