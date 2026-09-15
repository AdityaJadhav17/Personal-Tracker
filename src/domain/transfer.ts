import type { Database } from './types';

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
