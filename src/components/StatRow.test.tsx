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

  expect(screen.getByText('3 due today')).toBeVisible();
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

  expect(
    screen.getByText('Nothing due today · 2 finished yesterday'),
  ).toBeVisible();
});

test('AC-57.1 (was AC-16.3) with nothing due today it says so rather than hiding', () => {
  render(<StatRow now={NOW} items={[]} />);

  expect(screen.getByText('Nothing due today')).toBeVisible();
});

test('AC-57.1 overdue and this week are counted too, and zeros are left out', () => {
  render(
    <StatRow
      now={NOW}
      items={[anItem(), anItem({ dueAt: at(-2) }), anItem({ dueAt: at(3) })]}
    />,
  );

  expect(
    screen.getByText('1 due today · 1 overdue · 1 this week'),
  ).toBeVisible();
});
