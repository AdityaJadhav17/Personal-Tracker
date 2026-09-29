import { groupNotes, previewOf, searchNotes, titleOf } from './notes';
import type { Note } from './types';

// Monday 28 September 2026, 3pm local.
const NOW = new Date(2026, 8, 28, 15, 0, 0, 0);

function aNote(id: string, body: string, updated: Date, pinned = false): Note {
  return {
    id,
    body,
    createdAt: updated.toISOString(),
    updatedAt: updated.toISOString(),
    pinned,
    sealed: null,
  };
}

describe('titleOf', () => {
  test('AC-80.3 the first line is the title', () => {
    expect(titleOf('Groceries\nmilk\neggs')).toBe('Groceries');
  });

  test('AC-80.3 blank leading lines and edge spaces are skipped', () => {
    expect(titleOf('\n  \n  Landlord  \nsink')).toBe('Landlord');
  });

  test('AC-80.3 a note with no words is a New Note', () => {
    expect(titleOf('  \n ')).toBe('New Note');
  });
});

describe('previewOf', () => {
  test('AC-80.4 the preview is the first line after the title', () => {
    expect(previewOf('Groceries\n\n milk, eggs \nbread')).toBe('milk, eggs');
  });

  test('AC-80.4 a title alone says there is nothing more', () => {
    expect(previewOf('Groceries')).toBe('No additional text');
  });
});

describe('groupNotes', () => {
  test('AC-80.4 newest edit first, grouped Today, 7 days, 30 days, then month', () => {
    const groups = groupNotes(
      [
        aNote('march', 'March', new Date(2026, 2, 3, 9)),
        aNote('today-early', 'Early', new Date(2026, 8, 28, 8)),
        aNote('week', 'Week', new Date(2026, 8, 23, 9)),
        aNote('today-late', 'Late', new Date(2026, 8, 28, 14)),
        aNote('month', 'Month', new Date(2026, 8, 5, 9)),
        aNote('last-year', 'Old', new Date(2025, 11, 1, 9)),
      ],
      NOW,
    );

    expect(
      groups.map((group) => [group.label, group.notes.map((n) => n.id)]),
    ).toEqual([
      ['Today', ['today-late', 'today-early']],
      ['Previous 7 Days', ['week']],
      ['Previous 30 Days', ['month']],
      ['March', ['march']],
      ['December 2025', ['last-year']],
    ]);
  });

  test('AC-81.2 pinned notes sit in their own group above Today, newest first', () => {
    const groups = groupNotes(
      [
        aNote('today', 'Today', new Date(2026, 8, 28, 9)),
        aNote('old-pin', 'Old', new Date(2026, 2, 3, 9), true),
        aNote('new-pin', 'New', new Date(2026, 8, 28, 8), true),
      ],
      NOW,
    );

    expect(
      groups.map((group) => [group.label, group.notes.map((n) => n.id)]),
    ).toEqual([
      ['Pinned', ['new-pin', 'old-pin']],
      ['Today', ['today']],
    ]);
  });

  test('AC-80.4 no notes, no groups', () => {
    expect(groupNotes([], NOW)).toEqual([]);
  });
});

describe('searchNotes', () => {
  const notes = [
    aNote('a', 'Groceries\nOat milk', NOW),
    aNote('b', 'Landlord\nsink', NOW),
  ];

  test('AC-80.5 keeps only notes containing the words, ignoring case', () => {
    expect(searchNotes(notes, 'MILK').map((n) => n.id)).toEqual(['a']);
  });

  test('AC-80.5 an empty search keeps everything', () => {
    expect(searchNotes(notes, '  ')).toHaveLength(2);
  });
});
