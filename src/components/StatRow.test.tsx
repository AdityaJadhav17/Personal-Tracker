import { render, screen } from '@testing-library/react';
import StatRow from './StatRow';
import type { Item } from '../domain/types';

const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function at(daysFromNow: number): string {
  return new Date(2026, 8, 15 + daysFromNow, 12, 0, 0, 0).toISOString();
}

let nextId = 0;

function anItem(overrides: Partial<Item> = {}): Item {
  nextId += 1;
  return {
    id: `item-${nextId}`,
    title: `item-${nextId}`,
    dueAt: at(0),
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: at(-5),
    completedAt: null,
    goalId: null,
    courseId: null,
    repeatDay: null,
    parentId: null,
    repeat: 'none',
    ...overrides,
  };
}

/**
 * The summary sentence as a screen reader has it. AC-73's bar repeats it for
 * the eye inside an aria-hidden block, which these tests are not about.
 */
function summary(text: string) {
  return screen.getByText(text, { ignore: '[aria-hidden="true"] *' });
}

// US-57 turned US-16's two numbers into the header's sentence. The facts are
// the same; each test names the criterion it carries forward.

test('AC-57.1 the heading is today, named in full', () => {
  render(<StatRow now={NOW} items={[]} />);

  expect(
    screen.getByRole('heading', { level: 1, name: 'Tuesday, September 15' }),
  ).toBeVisible();
});

test('AC-57.1 (was AC-16.1) it says how many are due today', () => {
  render(
    <StatRow
      now={NOW}
      items={[
        anItem(),
        anItem(),
        anItem(),
        anItem({ status: 'done', completedAt: at(0) }),
      ]}
    />,
  );

  expect(summary('3 due today')).toBeVisible();
});

test('AC-57.1 (was AC-16.2) it says how many were finished yesterday', () => {
  render(
    <StatRow
      now={NOW}
      items={[
        anItem({ status: 'done', completedAt: at(-1) }),
        anItem({ status: 'done', completedAt: at(-1) }),
      ]}
    />,
  );

  expect(summary('Nothing due today · 2 finished yesterday')).toBeVisible();
});

test('AC-57.1 (was AC-16.3) with nothing due today it says so rather than hiding', () => {
  render(<StatRow now={NOW} items={[]} />);

  expect(summary('Nothing due today')).toBeVisible();
});

test('AC-57.1 overdue and this week are counted too, and zeros are left out', () => {
  render(
    <StatRow
      now={NOW}
      items={[anItem(), anItem({ dueAt: at(-2) }), anItem({ dueAt: at(3) })]}
    />,
  );

  expect(summary('1 due today · 1 overdue · 1 this week')).toBeVisible();
});

test('AC-73.1 and AC-73.4 a slim bar repeats the date and two counts, for the eye only', () => {
  render(
    <StatRow
      now={NOW}
      items={[anItem({ dueAt: at(0) }), anItem({ dueAt: at(-1) })]}
    />,
  );

  // Once as the heading, once in the bar.
  expect(screen.getAllByText('Tuesday, September 15')).toHaveLength(2);
  expect(screen.getAllByRole('heading')).toHaveLength(1);
  const counts = screen.getAllByText('1 due today · 1 overdue').at(-1)!;
  expect(counts.closest('[aria-hidden="true"]')).not.toBeNull();
});
