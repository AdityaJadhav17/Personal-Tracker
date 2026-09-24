import { fromIcsDate } from './dates';
import { MAX_BYTES } from './transfer';
import type { Item, ItemDraft, Repeat } from './types';

export type CalendarResult =
  | { ok: true; drafts: ItemDraft[]; past: number }
  | { ok: false; error: string };

/** One VEVENT or VTODO, as the properties this reads and nothing else. */
interface Component {
  kind: 'VEVENT' | 'VTODO';
  /** Property name to raw value. Parameters are not needed: the value's
   * own shape says whether it is a date, a UTC time or a local one. */
  props: Map<string, string>;
}

/**
 * US-43. Read a calendar file into deadlines, treating it as hostile.
 *
 * The file comes from outside, from Canvas or a course website, so it is read
 * as text and nothing in it is evaluated. Only four properties are looked at:
 * the title, the date, whether it was cancelled, and a weekly or monthly rule.
 * An event missing a title or a readable date is skipped rather than guessed,
 * and anything already past is left out and counted, because a course feed
 * carries the whole term and a finished quiz is not a deadline.
 *
 * Returns drafts, not items: nothing is stored until the person has seen the
 * list and said yes.
 */
export function parseCalendar(text: string, now: Date): CalendarResult {
  if (text.length > MAX_BYTES) {
    return { ok: false, error: 'That file is too large to be a calendar.' };
  }
  if (!text.includes('BEGIN:VCALENDAR')) {
    return { ok: false, error: 'That file is not a calendar (.ics) file.' };
  }

  // RFC 5545 folds long lines with a break and one space or tab. LF alone is
  // accepted too, because plenty of generators write it.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);

  const drafts: ItemDraft[] = [];
  let past = 0;
  let current: Component | null = null;
  const cutoff = now.toISOString();

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT' || line === 'BEGIN:VTODO') {
      current = {
        kind: line === 'BEGIN:VEVENT' ? 'VEVENT' : 'VTODO',
        props: new Map(),
      };
      continue;
    }
    if (current && (line === 'END:VEVENT' || line === 'END:VTODO')) {
      const draft = toDraft(current);
      current = null;
      if (!draft) continue;
      // Both are ISO instants in UTC, so the strings order as the times do.
      if (draft.dueAt < cutoff) past += 1;
      else drafts.push(draft);
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const semicolon = head.indexOf(';');
    const name = (
      semicolon < 0 ? head : head.slice(0, semicolon)
    ).toUpperCase();
    current.props.set(name, line.slice(colon + 1));
  }

  return { ok: true, drafts, past };
}

function toDraft({ kind, props }: Component): ItemDraft | null {
  if (props.get('STATUS')?.toUpperCase() === 'CANCELLED') return null;

  const title = unescape(props.get('SUMMARY') ?? '').trim();
  if (title === '') return null;

  const when =
    kind === 'VTODO'
      ? (props.get('DUE') ?? props.get('DTSTART'))
      : props.get('DTSTART');
  const dueAt = when ? fromIcsDate(when.trim()) : null;
  if (!dueAt) return null;

  return {
    title,
    dueAt,
    category: 'academic',
    priority: 'normal',
    repeat: repeatOf(props.get('RRULE') ?? ''),
  };
}

/** TEXT escapes back to what they stand for. A line break becomes a space. */
function unescape(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, character: string) =>
    character === 'n' || character === 'N' ? ' ' : character,
  );
}

/** Only the two rules this app can express; anything else imports once. */
function repeatOf(rule: string): Repeat {
  const frequency = /(?:^|;)FREQ=([A-Z]+)/i.exec(rule)?.[1]?.toUpperCase();
  if (frequency === 'WEEKLY') return 'weekly';
  if (frequency === 'MONTHLY') return 'monthly';
  return 'none';
}

/**
 * AC-43.8. The drafts that are not already held, and how many were.
 *
 * Same title and same moment is the same deadline, so importing a course feed
 * a second time later in the term adds only what is new.
 */
export function newOnly(
  drafts: ItemDraft[],
  items: Item[],
): { fresh: ItemDraft[]; duplicates: number } {
  const held = new Set(items.map((item) => `${item.title}\n${item.dueAt}`));
  const fresh = drafts.filter((d) => !held.has(`${d.title}\n${d.dueAt}`));
  return { fresh, duplicates: drafts.length - fresh.length };
}
