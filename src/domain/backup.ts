import { daysBetween } from './dates';

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
