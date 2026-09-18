import { parseLines } from './bulk';

/** The local instant a date and time describe, for comparing against. */
function at(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): string {
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

describe('AC-26.1 a line becomes something you can check before it is saved', () => {
  test('a date and a title', () => {
    const { drafts, unreadable } = parseLines('2026-10-03 Read chapter 4');

    expect(unreadable).toEqual([]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.title).toBe('Read chapter 4');
  });

  test('several lines become several drafts, in the order written', () => {
    const { drafts } = parseLines(
      ['2026-10-01 Rent', '2026-10-03 Midterm', '2026-10-09 Lab 3'].join('\n'),
    );

    expect(drafts.map((d) => d.title)).toEqual(['Rent', 'Midterm', 'Lab 3']);
  });

  test('a title keeps its own spaces and punctuation', () => {
    const { drafts } = parseLines('2026-10-03 Lab 3: read ch. 4, 5; write up');

    expect(drafts[0]?.title).toBe('Lab 3: read ch. 4, 5; write up');
  });

  test('category and priority take the same defaults as the add form', () => {
    const { drafts } = parseLines('2026-10-03 Rent');

    expect(drafts[0]?.category).toBe('academic');
    expect(drafts[0]?.priority).toBe('normal');
  });
});

describe('AC-26.5 a time is optional and a missing one means end of day', () => {
  test('a time is read when given', () => {
    const { drafts } = parseLines('2026-10-03 17:00 Rent');

    expect(drafts[0]?.dueAt).toBe(at(2026, 10, 3, 17, 0));
    expect(drafts[0]?.title).toBe('Rent');
  });

  test('no time means 23:59 local, matching the add form', () => {
    const { drafts } = parseLines('2026-10-03 Read chapter 4');

    expect(drafts[0]?.dueAt).toBe(at(2026, 10, 3, 23, 59));
  });

  test('a title that starts with a number is not mistaken for a time', () => {
    const { drafts } = parseLines('2026-10-03 5 problems from chapter 4');

    expect(drafts[0]?.title).toBe('5 problems from chapter 4');
    expect(drafts[0]?.dueAt).toBe(at(2026, 10, 3, 23, 59));
  });

  test('a single digit hour is accepted', () => {
    const { drafts } = parseLines('2026-10-03 9:30 Dentist');

    expect(drafts[0]?.dueAt).toBe(at(2026, 10, 3, 9, 30));
  });
});

describe('AC-26.3 a line that cannot be read is reported, not guessed at', () => {
  test('a line with no date at all', () => {
    const { drafts, unreadable } = parseLines('buy milk');

    expect(drafts).toEqual([]);
    expect(unreadable).toEqual(['buy milk']);
  });

  test('a month name is not a date, because US-19 removed that', () => {
    const { unreadable } = parseLines('oct 3 Read chapter 4');

    expect(unreadable).toEqual(['oct 3 Read chapter 4']);
  });

  test('a date with nothing after it has no title', () => {
    const { drafts, unreadable } = parseLines('2026-10-03');

    expect(drafts).toEqual([]);
    expect(unreadable).toEqual(['2026-10-03']);
  });

  test('a date that does not exist is rejected rather than rolled forward', () => {
    const { drafts, unreadable } = parseLines('2026-02-30 Midterm');

    expect(drafts).toEqual([]);
    expect(unreadable).toEqual(['2026-02-30 Midterm']);
  });

  test('an impossible time is rejected', () => {
    const { drafts, unreadable } = parseLines('2026-10-03 25:00 Rent');

    expect(drafts).toEqual([]);
    expect(unreadable).toEqual(['2026-10-03 25:00 Rent']);
  });

  test('the readable lines still work alongside the broken ones', () => {
    const { drafts, unreadable } = parseLines(
      ['2026-10-01 Rent', 'next tuesday something', '2026-10-09 Lab 3'].join(
        '\n',
      ),
    );

    expect(drafts.map((d) => d.title)).toEqual(['Rent', 'Lab 3']);
    expect(unreadable).toEqual(['next tuesday something']);
  });
});

describe('AC-26.6 text that is not a list at all', () => {
  test('nothing is understood and nothing is offered', () => {
    const { drafts, unreadable } = parseLines(
      'Welcome to CSE 110. Office hours are Tuesday.',
    );

    expect(drafts).toEqual([]);
    expect(unreadable).toHaveLength(1);
  });

  test('empty text gives nothing at all, not an error', () => {
    expect(parseLines('')).toEqual({ drafts: [], unreadable: [] });
  });

  test('whitespace only gives nothing at all', () => {
    expect(parseLines('   \n\n  \n')).toEqual({ drafts: [], unreadable: [] });
  });
});

describe('the shape of a pasted block', () => {
  test('blank lines between entries are skipped, not reported', () => {
    const { drafts, unreadable } = parseLines(
      '2026-10-01 Rent\n\n\n2026-10-03 Midterm\n',
    );

    expect(drafts).toHaveLength(2);
    expect(unreadable).toEqual([]);
  });

  test('carriage returns from a pasted file do not break a line', () => {
    const { drafts, unreadable } = parseLines(
      '2026-10-01 Rent\r\n2026-10-03 Midterm',
    );

    expect(drafts.map((d) => d.title)).toEqual(['Rent', 'Midterm']);
    expect(unreadable).toEqual([]);
  });

  test('surrounding whitespace on a line is ignored', () => {
    const { drafts } = parseLines('   2026-10-03   Read chapter 4   ');

    expect(drafts[0]?.title).toBe('Read chapter 4');
  });

  test('a tab between the date and the title works like a space', () => {
    const { drafts } = parseLines('2026-10-03\tRead chapter 4');

    expect(drafts[0]?.title).toBe('Read chapter 4');
  });
});
