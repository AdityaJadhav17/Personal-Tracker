import type { Database } from './types';
import { daysBetween, toDateValue } from './dates';

/** How old a backup can get before the app mentions it. */
const WEEK = 7;

/**
 * US-40. What to say about the last export, or null for nothing.
 *
 * The data lives in one browser's storage and nowhere else, so an export is
 * the only copy that survives clearing site data. Nothing is said while there
 * is nothing to lose, or while the last backup is under a week old: a reminder
 * that is always on screen is one you learn not to read.
 */
export function backupNotice(
  lastBackupAt: string | null,
  hasItems: boolean,
  now: Date,
): string | null {
  if (!hasItems) return null;
  if (lastBackupAt === null) return 'Not backed up yet.';

  const days = daysBetween(lastBackupAt, now);
  return days < WEEK ? null : `Last backup ${days} days ago.`;
}

/** AC-95.3. How many days of automatic backups are kept. */
const KEEP = 30;

const BACKUP = /^personal-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/;

/**
 * AC-95.2. The automatic backup's file for the local day `at` falls on. One a
 * day, rewritten through it, so a day is the most a lost browser costs.
 */
export function backupName(at: Date): string {
  return `personal-tracker-backup-${toDateValue(at)}.json`;
}

/**
 * AC-95.3. Of the names in the backup folder, the automatic backups past the
 * newest 30, newest first. Anything else in the folder is never a candidate:
 * the folder is the user's, and so is whatever else they keep there.
 *
 * AC-97.3. Nor is a backup named for a day after `at`'s. The app never wrote
 * one, and counting it would push the real backups out of the 30.
 */
export function staleBackups(names: string[], at: Date): string[] {
  const today = backupName(at);
  return names
    .filter((name) => BACKUP.test(name) && name <= today)
    .sort()
    .reverse()
    .slice(KEEP);
}

/** AC-102.3. The automatic backups in `names` other than the one for `at`'s day. */
export function olderBackups(names: string[], at: Date): string[] {
  const today = backupName(at);
  return names.filter((name) => BACKUP.test(name) && name !== today);
}

/**
 * AC-102.3. An older backup as it should be kept now: the current lock, and
 * every note that is locked in `current` as it is there.
 */
export function relock(file: Database, current: Database): Database {
  const sealed = new Map(
    current.notes.filter((n) => n.sealed).map((n) => [n.id, n]),
  );
  return {
    ...file,
    lock: current.lock,
    notes: file.notes.map((n) => sealed.get(n.id) ?? n),
  };
}
