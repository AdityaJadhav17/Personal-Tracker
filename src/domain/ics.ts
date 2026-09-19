import { shiftMinutes, toDateValue, toIcsStamp } from './dates';
import type { Item } from './types';

/**
 * The format wants CRLF, and says so rather than implying it. Clients do
 * reject a file with bare newlines, and this repository runs with
 * `core.autocrlf=true` and Prettier's `endOfLine: auto`, so the line ending is
 * written here explicitly rather than inherited from whatever the platform
 * feels like. See AC-24.7.
 */
const CRLF = '\r\n';

/** RFC 5545 counts octets, not characters, and the limit is 75. */
const LINE_LIMIT = 75;

/**
 * How long a deadline lasts on a calendar.
 *
 * A due date is a moment, not a span, but a zero length event is rendered badly
 * by several clients and dropped by some. Half an hour ending at the deadline
 * keeps the time visible, which is what matters for rent at 5pm; an all day
 * event would lose it.
 */
const MINUTES = 30;

/** Long enough to act on, early enough not to be noise. */
const ALARM = '-PT1H';

/** The horizontal tab is the only control character a TEXT value may carry. */
const TAB = 9;
const LAST_CONTROL = 31;
const DELETE = 127;

/**
 * Escape a value so it cannot end its own property.
 *
 * The backslash goes first. Doing it later would escape the backslashes this
 * function just added and double everything.
 *
 * Every line break becomes the literal two characters, and that means a bare
 * carriage return as well as CRLF and LF. RFC 5545 delimits content lines with
 * CRLF, but a parser that also breaks on a lone CR would read the rest of a
 * title as its own properties, and a title is the one part of this file a
 * person types. Escaping only CRLF and LF left that open.
 *
 * Whatever control characters remain are dropped rather than escaped, because
 * the TEXT type forbids all of them except the tab and offers no escape to put
 * them in. The check is written against character codes so that none of them
 * has to appear literally in this file.
 */
function escape(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    // CRLF first, so a Windows line ending yields one escape and not two.
    .replace(/\r\n|\r|\n/g, '\\n');

  let out = '';
  for (const character of escaped) {
    const code = character.codePointAt(0)!;
    if (code === TAB || (code > LAST_CONTROL && code !== DELETE)) {
      out += character;
    }
  }
  return out;
}

/**
 * Break a line so no piece exceeds 75 octets, continuing with a leading space.
 *
 * Measured in octets and cut on character boundaries: a star is three bytes, so
 * cutting at byte 75 would land inside one and produce a file no parser can
 * read. Walking code points and counting their encoded length is slower than
 * slicing the string and is the only version that is correct for a title that
 * is not plain ASCII.
 */
function fold(line: string): string {
  const pieces: string[] = [];
  let current = '';
  let width = 0;
  // A continuation carries a leading space, so it has one octet less to spend.
  let limit = LINE_LIMIT;

  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (width + size > limit) {
      pieces.push(current);
      current = '';
      width = 0;
      limit = LINE_LIMIT - 1;
    }
    current += character;
    width += size;
  }
  pieces.push(current);

  return pieces.join(`${CRLF} `);
}

/** One property, escaped and folded. */
function property(name: string, value: string): string {
  return fold(`${name}:${escape(value)}`);
}

function event(item: Item, stamp: string): string[] {
  const lines = [
    'BEGIN:VEVENT',
    // The item's own id, so importing the same file twice updates the event
    // rather than making a second one. Same property that makes importing your
    // own JSON export twice a no-op. AC-24.6.
    property('UID', `${item.id}@personal-tracker`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${toIcsStamp(shiftMinutes(item.dueAt, -MINUTES))}`,
    `DTEND:${toIcsStamp(item.dueAt)}`,
    property('SUMMARY', item.title),
  ];

  if (item.note !== '') lines.push(property('DESCRIPTION', item.note));

  lines.push(
    'BEGIN:VALARM',
    `TRIGGER:${ALARM}`,
    'ACTION:DISPLAY',
    property('DESCRIPTION', item.title),
    'END:VALARM',
    'END:VEVENT',
  );

  return lines;
}

/**
 * Every open deadline as a calendar file.
 *
 * Done items are left out, matching the dashboard and the calendar view:
 * something finished is not something coming.
 *
 * There is no VTIMEZONE block anywhere in here, and that is the payoff from
 * storing instants rather than wall clock times. Every `dueAt` is already UTC,
 * so each event carries a UTC stamp and means the same moment wherever the
 * phone reading it happens to be. AC-24.3.
 */
export function toCalendar(items: Item[], now: Date): string {
  const stamp = toIcsStamp(now.toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Personal Tracker//Deadlines//EN',
    'CALSCALE:GREGORIAN',
    ...items
      .filter((item) => item.status === 'open')
      .flatMap((item) => event(item, stamp)),
    'END:VCALENDAR',
  ];

  return lines.join(CRLF) + CRLF;
}

/**
 * Name the file by the local day it was written, matching the JSON export.
 *
 * The `personal-tracker-` prefix is what `.gitignore` blocks by pattern, which
 * keeps a file naming your doctor's appointment out of the repository by
 * construction rather than by remembering.
 */
export function calendarFilename(now: Date): string {
  return `personal-tracker-${toDateValue(now)}.ics`;
}
