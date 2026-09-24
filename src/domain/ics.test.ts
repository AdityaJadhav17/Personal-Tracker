import { calendarFilename, toCalendar } from './ics';
import type { Item } from './types';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

let nextId = 0;

function anItem(rest: Partial<Item> = {}): Item {
  nextId += 1;
  return {
    id: `item-${nextId}`,
    title: `item-${nextId}`,
    dueAt: '2026-09-16T23:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    completedAt: null,
    goalId: null,
    courseId: null,
    repeatDay: null,
    parentId: null,
    repeat: 'none',
    ...rest,
  };
}

/** The file as lines, with the CRLF taken off. */
function lines(text: string): string[] {
  return text.split('\r\n');
}

/** Unfold, which is what a parser does before reading a value. */
function unfold(text: string): string {
  return text.replace(/\r\n /g, '');
}

/** The octet length a folded line is measured against. */
function octets(text: string): number {
  return new TextEncoder().encode(text).length;
}

describe('AC-24.1 one event per open item', () => {
  test('an item becomes an event', () => {
    const ics = toCalendar([anItem({ title: 'CSE 110 midterm' })], NOW);

    expect(ics).toContain('BEGIN:VEVENT');
    expect(unfold(ics)).toContain('SUMMARY:CSE 110 midterm');
  });

  test('three items become three events', () => {
    const ics = toCalendar([anItem(), anItem(), anItem()], NOW);

    expect(lines(ics).filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(
      3,
    );
    expect(lines(ics).filter((line) => line === 'END:VEVENT')).toHaveLength(3);
  });

  test('a note rides along as the description', () => {
    const ics = toCalendar([anItem({ note: 'Chapters 4 to 7' })], NOW);

    expect(unfold(ics)).toContain('DESCRIPTION:Chapters 4 to 7');
  });

  test('an item with no note carries no empty description', () => {
    // The alarm always has one, because ACTION:DISPLAY requires it. What must
    // not appear is a property with nothing after the colon.
    const out = lines(toCalendar([anItem()], NOW));

    expect(out).not.toContain('DESCRIPTION:');
    expect(out.filter((line) => line.startsWith('DESCRIPTION:'))).toHaveLength(
      1,
    );
  });
});

describe('AC-24.2 done items are left out', () => {
  test('a finished item is not in the file', () => {
    const ics = toCalendar(
      [
        anItem({
          title: 'Already done',
          status: 'done',
          completedAt: '2026-09-15T12:00:00.000Z',
        }),
      ],
      NOW,
    );

    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).not.toContain('Already done');
  });

  test('the open ones survive alongside', () => {
    const ics = toCalendar(
      [
        anItem({ title: 'Open one' }),
        anItem({ title: 'Closed one', status: 'done' }),
      ],
      NOW,
    );

    expect(unfold(ics)).toContain('SUMMARY:Open one');
    expect(ics).not.toContain('Closed one');
  });
});

describe('AC-24.3 the event is an instant, not a wall clock', () => {
  test('the deadline is the end of the event, in UTC', () => {
    const ics = toCalendar(
      [anItem({ dueAt: '2026-09-16T23:59:00.000Z' })],
      NOW,
    );

    expect(ics).toContain('DTEND:20260916T235900Z');
  });

  test('the event is the half hour before the deadline', () => {
    const ics = toCalendar(
      [anItem({ dueAt: '2026-09-16T23:59:00.000Z' })],
      NOW,
    );

    expect(ics).toContain('DTSTART:20260916T232900Z');
  });

  test('no VTIMEZONE block, because instants need none', () => {
    expect(toCalendar([anItem()], NOW)).not.toContain('VTIMEZONE');
  });

  test('DTSTAMP is when the file was written', () => {
    const stamp = NOW.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

    expect(toCalendar([anItem()], NOW)).toContain(`DTSTAMP:${stamp}`);
  });
});

describe('AC-24.4 text that would corrupt the file is escaped', () => {
  test('a comma is escaped', () => {
    const ics = toCalendar([anItem({ title: 'Read ch. 4, 5 and 6' })], NOW);

    expect(unfold(ics)).toContain('SUMMARY:Read ch. 4\\, 5 and 6');
  });

  test('a semicolon is escaped', () => {
    const ics = toCalendar([anItem({ title: 'Lab 3; write up' })], NOW);

    expect(unfold(ics)).toContain('SUMMARY:Lab 3\\; write up');
  });

  test('a backslash is escaped first, so it does not double up the others', () => {
    const ics = toCalendar([anItem({ title: 'path\\to, thing' })], NOW);

    expect(unfold(ics)).toContain('SUMMARY:path\\\\to\\, thing');
  });

  test('a newline in a note becomes the literal escape', () => {
    const ics = toCalendar([anItem({ note: 'first\nsecond' })], NOW);

    expect(unfold(ics)).toContain('DESCRIPTION:first\\nsecond');
    // A real newline must not survive: it would end the property early.
    expect(unfold(ics)).not.toContain('first\nsecond');
  });

  test('a title that looks like a property does not become one', () => {
    const ics = toCalendar(
      [anItem({ title: 'x\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:injected' })],
      NOW,
    );

    expect(lines(ics).filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(
      1,
    );
    expect(lines(ics).filter((line) => line === 'END:VEVENT')).toHaveLength(1);
  });
});

describe('AC-24.5 long lines are folded', () => {
  const long = 'A very long assignment title that runs well past the limit';

  test('no line is longer than 75 octets', () => {
    const ics = toCalendar([anItem({ title: `${long} ${long} ${long}` })], NOW);

    for (const line of lines(ics)) {
      expect(octets(line)).toBeLessThanOrEqual(75);
    }
  });

  test('the title still reads correctly once unfolded', () => {
    const title = `${long} ${long}`;

    expect(unfold(toCalendar([anItem({ title })], NOW))).toContain(
      `SUMMARY:${title}`,
    );
  });

  test('a continuation line begins with a single space', () => {
    const ics = toCalendar([anItem({ title: `${long} ${long}` })], NOW);

    expect(
      lines(ics).filter((line) => line.startsWith(' ')).length,
    ).toBeGreaterThan(0);
  });

  test('a multibyte character is never split down the middle', () => {
    // Each of these is three bytes, so a naive 75-byte cut lands inside one of
    // them and writes a file no parser can read.
    const title = '★'.repeat(60);
    const ics = toCalendar([anItem({ title })], NOW);

    expect(unfold(ics)).toContain(`SUMMARY:${title}`);
    for (const line of lines(ics)) {
      expect(octets(line)).toBeLessThanOrEqual(75);
    }
  });
});

describe('AC-24.6 importing the same file twice is not a duplicate', () => {
  const uidIn = (text: string) =>
    lines(text).find((line) => line.startsWith('UID:'));

  test('the uid comes from the item, so it is stable', () => {
    const item = anItem();
    const first = toCalendar([item], NOW);
    const later = toCalendar([item], new Date(2026, 8, 20, 9));

    expect(uidIn(first)).toBe(`UID:${item.id}@personal-tracker`);
    expect(uidIn(later)).toBe(uidIn(first));
  });

  test('two items never share a uid', () => {
    const uids = lines(toCalendar([anItem(), anItem()], NOW)).filter((line) =>
      line.startsWith('UID:'),
    );

    expect(new Set(uids).size).toBe(2);
  });
});

describe('AC-24.7 the file is structurally valid', () => {
  test('it opens and closes a calendar', () => {
    const out = lines(toCalendar([anItem()], NOW));

    expect(out[0]).toBe('BEGIN:VCALENDAR');
    expect(out.filter((line) => line !== '').pop()).toBe('END:VCALENDAR');
  });

  test('it declares a version and a product', () => {
    const ics = toCalendar([anItem()], NOW);

    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');
  });

  test('every line ends CRLF, which the format requires', () => {
    const ics = toCalendar([anItem(), anItem()], NOW);

    // A bare newline anywhere is a file some clients reject outright.
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  test('every BEGIN has its END', () => {
    const out = lines(toCalendar([anItem(), anItem()], NOW));

    expect(out.filter((line) => line.startsWith('BEGIN:')).length).toBe(
      out.filter((line) => line.startsWith('END:')).length,
    );
  });

  test('a normal item has an alarm, so the file actually reminds you', () => {
    const ics = toCalendar([anItem()], NOW);

    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('ACTION:DISPLAY');
  });
});

/**
 * When each alarm in a one-event file goes off, as local clock readings.
 * Triggers are minutes before DTSTART, which is how every one is written.
 */
function alarmsAt(ics: string): string[] {
  const start = /DTSTART:(\d{8}T\d{6}Z)/.exec(ics)![1]!;
  const iso = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}T${start.slice(9, 11)}:${start.slice(11, 13)}:00Z`;
  return [...ics.matchAll(/TRIGGER:-PT(\d+)M/g)].map((match) => {
    const at = new Date(Date.parse(iso) - Number(match[1]) * 60_000);
    return `${at.getMonth() + 1}/${at.getDate()} ${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`;
  });
}

describe('US-46 alarms by priority', () => {
  // Due 8am on Tuesday 27 October, local.
  const exam = new Date(2026, 9, 27, 8, 0).toISOString();

  test('AC-46.1 a high priority item warns a day before and an hour before', () => {
    const ics = toCalendar([anItem({ priority: 'high', dueAt: exam })], NOW);

    expect(alarmsAt(ics)).toEqual(['10/26 8:00', '10/27 7:00']);
  });

  test('AC-46.2 a normal item warns once, at 8pm the evening before', () => {
    const ics = toCalendar([anItem({ priority: 'normal', dueAt: exam })], NOW);

    expect(alarmsAt(ics)).toEqual(['10/26 20:00']);
  });

  test('AC-46.2 the evening before stays 8pm across the November clock change', () => {
    // Due Monday 2 November; the evening before is Sunday 1st, the day the
    // clocks go back, so the gap is 25 hours of real time, not 24.
    const monday = new Date(2026, 10, 2, 17, 0).toISOString();
    const ics = toCalendar([anItem({ dueAt: monday })], NOW);

    expect(alarmsAt(ics)).toEqual(['11/1 20:00']);
  });

  test('AC-46.3 a low priority item has no alarm at all', () => {
    const ics = toCalendar([anItem({ priority: 'low', dueAt: exam })], NOW);

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).not.toContain('BEGIN:VALARM');
  });
});

describe('AC-24.8 nothing to export is still a valid file', () => {
  test('no items gives an empty calendar, not a broken one', () => {
    const ics = toCalendar([], NOW);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  test('only done items gives the same', () => {
    const ics = toCalendar([anItem({ status: 'done' })], NOW);

    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});

describe('calendarFilename', () => {
  test('names the file by the day it was written', () => {
    expect(calendarFilename(NOW)).toBe('personal-tracker-2026-09-15.ics');
  });

  test('matches the pattern .gitignore blocks', () => {
    expect(calendarFilename(NOW)).toMatch(/^personal-tracker-.*\.ics$/);
  });
});

describe('AC-24.4 control characters cannot break out of a value', () => {
  const CR = String.fromCharCode(13);
  const LF = String.fromCharCode(10);

  test('a lone carriage return is escaped, not passed through', () => {
    const title = `a${CR}END:VEVENT${CR}BEGIN:VEVENT${CR}SUMMARY:evil`;
    const ics = toCalendar([anItem({ title })], NOW);

    // RFC 5545 delimits content lines with CRLF and forbids control
    // characters inside a TEXT value. A lenient parser that splits on a bare
    // CR would otherwise read the rest of this title as its own properties.
    const summary = lines(ics).find((line) => line.startsWith('SUMMARY:'));
    expect(summary).not.toContain(CR);
    expect(unfold(ics)).toContain('SUMMARY:a\\nEND:VEVENT\\nBEGIN:VEVENT');
  });

  test('a carriage return in a title cannot add an event', () => {
    const title = `a${CR}END:VEVENT${CR}BEGIN:VEVENT${CR}SUMMARY:evil`;
    const ics = toCalendar([anItem({ title })], NOW);

    expect(lines(ics).filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(
      1,
    );
    expect(lines(ics).filter((line) => line === 'END:VEVENT')).toHaveLength(1);
  });

  test('CRLF, CR and LF all become the same single escape', () => {
    const ics = toCalendar([anItem({ note: `a${CR}${LF}b${CR}c${LF}d` })], NOW);

    expect(unfold(ics)).toContain('DESCRIPTION:a\\nb\\nc\\nd');
  });

  test('other control characters are dropped rather than emitted', () => {
    const title = 'a' + String.fromCharCode(0) + String.fromCharCode(7) + 'b';
    const ics = toCalendar([anItem({ title })], NOW);

    const summary = lines(ics).find((line) => line.startsWith('SUMMARY:'));
    expect(summary).toBe('SUMMARY:ab');
  });

  test('a tab survives, because TEXT allows it', () => {
    const tab = String.fromCharCode(9);
    const ics = toCalendar([anItem({ title: `a${tab}b` })], NOW);

    expect(unfold(ics)).toContain(`SUMMARY:a${tab}b`);
  });
});
