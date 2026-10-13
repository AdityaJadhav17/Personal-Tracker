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
 */
export function staleBackups(names: string[]): string[] {
  return names
    .filter((name) => BACKUP.test(name))
    .sort()
    .reverse()
    .slice(KEEP);
}
