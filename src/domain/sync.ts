import { daysBetween } from './dates';
import type { Collection, Database, Deletion, Note } from './types';

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

/** JSON with keys sorted at every level, so key order never matters. */
function canon(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)),
        )
      : v,
  );
}

/** The side whose lock survives a merge: the newer, ties by canonical text. */
function lockWinner(local: Database, shared: Database): Database {
  const time = (db: Database) => db.lock?.changedAt ?? '';
  return time(shared) !== time(local)
    ? time(shared) > time(local)
      ? shared
      : local
    : canon(shared.lock) > canon(local.lock)
      ? shared
      : local;
}

/**
 * US-101. How many sealed notes on the side whose lock would lose (`here` when
 * that is `local`) are missing from the winning side, when the two locks were made separately (salts
 * differ). Merged, those notes open under neither passcode.
 */
export function lockConflict(
  local: Database,
  shared: Database,
): { count: number; here: boolean } {
  if (!local.lock || !shared.lock || local.lock.salt === shared.lock.salt)
    return { count: 0, here: false };
  const [win, lose] =
    lockWinner(local, shared) === shared ? [shared, local] : [local, shared];
  // AC-102.4. Missing from the winner, or readable there while sealed here.
  const kept = new Map(win.notes.map((n) => [n.id, n]));
  const count = lose.notes.filter(
    (n) => n.sealed && !kept.get(n.id)?.sealed,
  ).length;
  return { count, here: lose === local };
}

/**
 * US-101. One database from two: per record the newer change wins, a
 * deletion beats an older change, and locked notes follow the newer lock.
 * Equal times are broken by canonical JSON text, the same on both devices, so
 * merge(a, b) and merge(b, a) hold the same records. Clocks are trusted: a
 * time far ahead wins until real time catches up.
 * `lastBackupAt` stays `local`'s (AC-101.6).
 */
export function merge(local: Database, shared: Database): Database {
  const newer = (a: Keyed, b: Keyed) =>
    a.changedAt !== b.changedAt
      ? a.changedAt > b.changedAt
      : canon(a) > canon(b);

  const marks = new Map<string, Deletion>();
  for (const mark of [...local.deleted, ...shared.deleted]) {
    const key = `${mark.kind}:${mark.id}`;
    const held = marks.get(key);
    if (!held || mark.at > held.at) marks.set(key, mark);
  }

  const lockSide = lockWinner(local, shared);
  // Under one lock, locked notes merge like any other record.
  const sameLock = canon(local.lock) === canon(shared.lock);
  const out = { ...local, lock: lockSide.lock } as Record<Collection, Keyed[]> &
    Database;

  for (const kind of COLLECTIONS) {
    const byKey = new Map<string, Keyed>();
    for (const record of local[kind] as Keyed[])
      byKey.set(keyOf(kind, record), record);
    for (const record of shared[kind] as Keyed[]) {
      const key = keyOf(kind, record);
      const held = byKey.get(key);
      if (!held || newer(record, held)) byKey.set(key, record);
    }
    let records = [...byKey.values()].filter((record) => {
      const key = `${kind}:${keyOf(kind, record)}`;
      const mark = marks.get(key);
      if (!mark) return true;
      if (mark.at >= record.changedAt) return false;
      marks.delete(key);
      return true;
    });
    if (kind === 'notes' && !sameLock) {
      // AC-101.3, AC-105.1: a sealed note is only meaningful under its own
      // lock, so the lock side's copy is taken whole, and a sealed copy there
      // beats a newer readable one. A note only the other side has stays as
      // it was (AC-101.7).
      const sealedFrom = new Map(
        (lockSide.notes as unknown as Note[]).map((n) => [n.id, n]),
      );
      records = (records as unknown as Note[]).map((note) =>
        note.sealed || sealedFrom.get(note.id)?.sealed
          ? (sealedFrom.get(note.id) ?? note)
          : note,
      ) as unknown as Keyed[];
    }
    (out as Record<Collection, Keyed[]>)[kind] = records;
  }

  out.deleted = [...marks.values()];
  out.lastBackupAt = local.lastBackupAt;
  return out;
}

/**
 * US-101. True when two databases hold the same records as far as sync can
 * tell: every collection has the same keys with the same content (and so the
 * same `changedAt`), the lock is the same, and the deletion markers are the
 * same. `lastBackupAt` is ignored.
 */
export function sameRecords(a: Database, b: Database): boolean {
  for (const kind of COLLECTIONS) {
    const ra = a[kind] as Keyed[];
    const rb = b[kind] as Keyed[];
    if (ra.length !== rb.length) return false;
    const texts = new Map(ra.map((r) => [keyOf(kind, r), canon(r)]));
    if (texts.size !== ra.length) return false;
    if (rb.some((r) => texts.get(keyOf(kind, r)) !== canon(r))) return false;
  }
  if (canon(a.lock) !== canon(b.lock)) return false;
  const marks = (db: Database) =>
    new Set(db.deleted.map((m) => `${m.kind}:${m.id}:${m.at}`));
  const ma = marks(a);
  const mb = marks(b);
  return ma.size === mb.size && [...ma].every((m) => mb.has(m));
}
