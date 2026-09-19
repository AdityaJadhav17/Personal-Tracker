import { sortWithinGroup } from './ordering';
import type { Item, Priority } from './types';

const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function anItem(
  title: string,
  daysFromNow: number,
  priority: Priority = 'normal',
  hours = 12,
): Item {
  return {
    id: title,
    title,
    dueAt: new Date(2026, 8, 15 + daysFromNow, hours, 0, 0, 0).toISOString(),
    category: 'academic',
    priority,
    status: 'open',
    note: '',
    createdAt: NOW.toISOString(),
    completedAt: null,
    goalId: null,
    courseId: null,
    repeat: 'none',
  };
}

const titles = (items: Item[]) => items.map((item) => item.title);

test('AC-04.1 high, then normal, then low', () => {
  const sorted = sortWithinGroup([
    anItem('normal one', 3, 'normal'),
    anItem('low one', 3, 'low'),
    anItem('high one', 3, 'high'),
  ]);

  expect(titles(sorted)).toEqual(['high one', 'normal one', 'low one']);
});

test('AC-04.1 priority outranks how soon something is due', () => {
  const sorted = sortWithinGroup([
    anItem('normal, due tomorrow', 1, 'normal'),
    anItem('high, due in six days', 6, 'high'),
  ]);

  expect(titles(sorted)).toEqual([
    'high, due in six days',
    'normal, due tomorrow',
  ]);
});

test('AC-04.2 same priority and day, the earlier time comes first', () => {
  const sorted = sortWithinGroup([
    anItem('five pm', 3, 'normal', 17),
    anItem('nine am', 3, 'normal', 9),
  ]);

  expect(titles(sorted)).toEqual(['nine am', 'five pm']);
});

test('AC-04.3 two items due at the same minute both survive the sort', () => {
  const sorted = sortWithinGroup([
    anItem('first', 3, 'normal', 9),
    anItem('second', 3, 'normal', 9),
  ]);

  expect(sorted).toHaveLength(2);
  expect(titles(sorted)).toEqual(['first', 'second']);
});

test('AC-04.3 identical items keep a stable order across repeated sorts', () => {
  const a = anItem('first', 3, 'normal', 9);
  const b = anItem('second', 3, 'normal', 9);

  // Sorting the same input twice must not shuffle it, which is what makes the
  // rendered order the same after every reload.
  expect(titles(sortWithinGroup([a, b]))).toEqual(
    titles(sortWithinGroup([a, b])),
  );
  expect(titles(sortWithinGroup([b, a]))).toEqual(['second', 'first']);
});

test('AC-03.3 with priority equal, the most overdue comes first', () => {
  const sorted = sortWithinGroup([
    anItem('one day late', -1),
    anItem('twelve days late', -12),
    anItem('five days late', -5),
  ]);

  expect(titles(sorted)).toEqual([
    'twelve days late',
    'five days late',
    'one day late',
  ]);
});

test('AC-03.3 two items late on the same day order by time of day', () => {
  const sorted = sortWithinGroup([
    anItem('evening', -2, 'normal', 17),
    anItem('morning', -2, 'normal', 9),
  ]);

  expect(titles(sorted)).toEqual(['morning', 'evening']);
});

test('sorting does not mutate the array it was given', () => {
  const items = [anItem('low', 3, 'low'), anItem('high', 3, 'high')];
  const before = titles(items);

  sortWithinGroup(items);

  expect(titles(items)).toEqual(before);
});

test('sorting an empty list gives an empty list', () => {
  expect(sortWithinGroup([])).toEqual([]);
});
