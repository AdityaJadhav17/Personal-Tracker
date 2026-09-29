import { daysBetween, noteMonth } from './dates';
import type { Note } from './types';

function lines(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** AC-80.3. The first line with words on it, as Apple Notes titles a note. */
export function titleOf(body: string): string {
  return lines(body)[0] ?? 'New Note';
}

/** AC-80.4. What the list shows under the title. */
export function previewOf(body: string): string {
  return lines(body)[1] ?? 'No additional text';
}

/**
 * AC-80.4. Newest edit first, in Apple Notes' groups: Today, the previous
 * seven days, the previous thirty, then one group per month.
 */
export function groupNotes(
  notes: Note[],
  now: Date,
): { label: string; notes: Note[] }[] {
  const groups: { label: string; notes: Note[] }[] = [];
  const newest = [...notes].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  for (const note of newest) {
    const days = daysBetween(note.updatedAt, now);
    const label =
      days <= 0
        ? 'Today'
        : days <= 7
          ? 'Previous 7 Days'
          : days <= 30
            ? 'Previous 30 Days'
            : noteMonth(note.updatedAt, now);
    const last = groups.at(-1);
    // Sorted, so a group's notes are always next to each other.
    if (last?.label === label) last.notes.push(note);
    else groups.push({ label, notes: [note] });
  }

  return groups;
}

/** AC-80.5. The notes containing the query, ignoring case. */
export function searchNotes(notes: Note[], query: string): Note[] {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') return notes;
  return notes.filter((note) => note.body.toLowerCase().includes(wanted));
}
