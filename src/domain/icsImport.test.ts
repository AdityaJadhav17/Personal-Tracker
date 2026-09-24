import { newOnly, parseCalendar } from './icsImport';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

/** A calendar file around these event bodies, CRLF as the format wants. */
function calendar(...events: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Test//EN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function event(...lines: string[]): string {
  return ['BEGIN:VEVENT', 'UID:x', ...lines, 'END:VEVENT'].join('\r\n');
}

/** Read an instant back in local time, which is how the app shows it. */
function local(iso: string) {
  const d = new Date(iso);
  return [d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
}

function drafts(text: string) {
  const result = parseCalendar(text, NOW);
  if (!result.ok) throw new Error(result.error);
  return result.drafts;
}

describe('parseCalendar', () => {
  test('AC-43.1 an event in UTC becomes a deadline at that exact moment', () => {
    const [draft] = drafts(
      calendar(event('SUMMARY:CSE 123 HW 1', 'DTSTART:20261008T065900Z')),
    );

    expect(draft?.title).toBe('CSE 123 HW 1');
    expect(draft?.dueAt).toBe('2026-10-08T06:59:00.000Z');
    expect(draft).toMatchObject({
      category: 'academic',
      priority: 'normal',
      repeat: 'none',
    });
  });

  test('AC-43.2 an all day event is due at 11:59pm that day', () => {
    const [draft] = drafts(
      calendar(event('SUMMARY:Essay', 'DTSTART;VALUE=DATE:20261018')),
    );

    expect(local(draft!.dueAt)).toEqual([10, 18, 23, 59]);
  });

  test('AC-43.2 a time with a named zone is read as local wall clock', () => {
    const [draft] = drafts(
      calendar(
        event(
          'SUMMARY:Midterm',
          'DTSTART;TZID=America/Los_Angeles:20261027T080000',
        ),
      ),
    );

    expect(local(draft!.dueAt)).toEqual([10, 27, 8, 0]);
  });

  test('AC-43.2 a to-do uses its due date', () => {
    const [draft] = drafts(
      calendar(
        [
          'BEGIN:VTODO',
          'SUMMARY:Project 1a',
          'DUE:20261013T065900Z',
          'END:VTODO',
        ].join('\r\n'),
      ),
    );

    expect(draft?.dueAt).toBe('2026-10-13T06:59:00.000Z');
  });

  test('AC-43.3 folded lines and escaped text come back whole', () => {
    const [draft] = drafts(
      calendar(
        event(
          'SUMMARY:Team essay\\, part one\\; draft',
          // Unfolding drops the line break and exactly one space.
          '  two',
          'DTSTART:20261018T065900Z',
        ),
      ),
    );

    expect(draft?.title).toBe('Team essay, part one; draft two');
  });

  test('AC-43.3 a file with bare LF line endings still reads', () => {
    const text = calendar(
      event('SUMMARY:Rent', 'DTSTART:20261001T170000Z'),
    ).replace(/\r\n/g, '\n');

    expect(drafts(text)).toHaveLength(1);
  });

  test('AC-43.4 events already past are left out and counted', () => {
    const result = parseCalendar(
      calendar(
        event('SUMMARY:Old quiz', 'DTSTART:20260901T170000Z'),
        event('SUMMARY:New quiz', 'DTSTART:20261001T170000Z'),
      ),
      NOW,
    );

    expect(result.ok && result.drafts.map((d) => d.title)).toEqual([
      'New quiz',
    ]);
    expect(result.ok && result.past).toBe(1);
  });

  test('AC-43.4 cancelled events are left out', () => {
    expect(
      drafts(
        calendar(
          event(
            'SUMMARY:Class cancelled',
            'STATUS:CANCELLED',
            'DTSTART:20261001T170000Z',
          ),
        ),
      ),
    ).toEqual([]);
  });

  test('AC-43.5 an event with no title or no date is skipped, not guessed', () => {
    expect(
      drafts(
        calendar(
          event('DTSTART:20261001T170000Z'),
          event('SUMMARY:No date at all'),
          event('SUMMARY:   ', 'DTSTART:20261001T170000Z'),
        ),
      ),
    ).toEqual([]);
  });

  test('AC-43.5 an unreadable date is skipped', () => {
    expect(
      drafts(calendar(event('SUMMARY:Broken', 'DTSTART:2026-10-01'))),
    ).toEqual([]);
  });

  test('AC-43.6 a weekly or monthly rule carries over as a repeat', () => {
    const result = drafts(
      calendar(
        event(
          'SUMMARY:Quiz',
          'DTSTART:20261002T065900Z',
          'RRULE:FREQ=WEEKLY;COUNT=10',
        ),
        event('SUMMARY:Rent', 'DTSTART:20261001T170000Z', 'RRULE:FREQ=MONTHLY'),
        event('SUMMARY:Daily', 'DTSTART:20261001T170000Z', 'RRULE:FREQ=DAILY'),
      ),
    );

    expect(result.map((d) => d.repeat)).toEqual(['weekly', 'monthly', 'none']);
  });

  test('AC-43.7 a file that is not a calendar is refused, saying so', () => {
    const result = parseCalendar('{"version": 4}', NOW);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/calendar/i);
  });

  test('AC-43.7 a file too large to be a calendar is refused before reading', () => {
    const result = parseCalendar('x'.repeat(6 * 1024 * 1024), NOW);

    expect(!result.ok && result.error).toMatch(/too large/i);
  });

  test('AC-43.7 markup in a title stays text', () => {
    const [draft] = drafts(
      calendar(
        event(
          'SUMMARY:<img src=x onerror=alert(1)>',
          'DTSTART:20261001T170000Z',
        ),
      ),
    );

    expect(draft?.title).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('newOnly', () => {
  const held = {
    id: 'held',
    title: 'CSE 123 HW 1',
    dueAt: '2026-10-08T06:59:00.000Z',
    category: 'academic' as const,
    priority: 'normal' as const,
    status: 'open' as const,
    note: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    completedAt: null,
    goalId: null,
    courseId: null,
    repeat: 'none' as const,
    repeatDay: null,
    parentId: null,
  };

  test('AC-43.8 a deadline already in the list is not added twice', () => {
    const [first, second] = drafts(
      calendar(
        event('SUMMARY:CSE 123 HW 1', 'DTSTART:20261008T065900Z'),
        event('SUMMARY:CSE 123 HW 2', 'DTSTART:20261022T065900Z'),
      ),
    );

    const result = newOnly([first!, second!], [held]);

    expect(result.fresh.map((d) => d.title)).toEqual(['CSE 123 HW 2']);
    expect(result.duplicates).toBe(1);
  });

  test('AC-43.8 the same title on another date is a different deadline', () => {
    const [draft] = drafts(
      calendar(event('SUMMARY:CSE 123 HW 1', 'DTSTART:20261009T065900Z')),
    );

    expect(newOnly([draft!], [held]).fresh).toHaveLength(1);
  });
});
