import { toDueAt } from './dates';
import type { ItemDraft } from './types';

/**
 * A date, an optional 24 hour time, then everything else as the title.
 *
 * Deliberately strict. US-19 removed typed dates from the daily path because
 * guessing at what you meant is worse than a picker, and this does not bring
 * the guessing back: a month name, a weekday or "next Tuesday" is reported as
 * unreadable rather than interpreted. What makes a strict format bearable here
 * is that a paste is reviewed before it is saved, which the daily path is not.
 */
const LINE = /^(\d{4}-\d{2}-\d{2})(?:[ \t]+(\d{1,2}:\d{2}))?[ \t]+(.+)$/;

/** Same defaults the add form starts with. */
const CATEGORY = 'academic';
const PRIORITY = 'normal';
// A pasted line says nothing about repeating, and inventing one would be a
// guess of exactly the kind US-26's strict format exists to avoid.
const REPEAT = 'none';

export interface Parsed {
  /** Lines that became items, in the order they were written. */
  drafts: ItemDraft[];
  /** Lines that did not, kept whole so you can see what was skipped. */
  unreadable: string[];
}

/**
 * Read a pasted block into drafts and leftovers.
 *
 * Nothing here writes anything. The caller shows both halves and asks, which
 * is AC-26.1 and the same parse, show, confirm shape the JSON import uses.
 *
 * Blank lines are skipped rather than reported: a pasted block usually has
 * them and calling them errors would bury the lines that are really wrong.
 */
export function parseLines(text: string): Parsed {
  const drafts: ItemDraft[] = [];
  const unreadable: string[] = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;

    const match = LINE.exec(line);
    // toDueAt does the rest of the rejecting: February 30th and 25:00 both
    // parse as text and are still not moments in time.
    const dueAt = match ? toDueAt(match[1]!, match[2] ?? '') : null;

    if (!match || !dueAt) {
      unreadable.push(line);
      continue;
    }

    drafts.push({
      title: match[3]!.trim(),
      dueAt,
      category: CATEGORY,
      priority: PRIORITY,
      repeat: REPEAT,
    });
  }

  return { drafts, unreadable };
}
