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

  test('an alarm an hour before, so the file actually reminds you', () => {
    const ics = toCalendar([anItem()], NOW);

    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('ACTION:DISPLAY');
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
