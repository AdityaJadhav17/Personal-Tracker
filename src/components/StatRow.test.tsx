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
    ...overrides,
  };
}

test('AC-16.1 it says how many are left today', () => {
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

  expect(screen.getByText('3')).toBeVisible();
  expect(screen.getByText('remaining today')).toBeVisible();
});

test('AC-16.2 it says how many were finished yesterday', () => {
  render(
    <StatRow
      now={NOW}
      items={[
        anItem({ status: 'done', completedAt: at(-1) }),
        anItem({ status: 'done', completedAt: at(-1) }),
      ]}
    />,
  );

  expect(screen.getByText('2')).toBeVisible();
  expect(screen.getByText('completed yesterday')).toBeVisible();
});

test('AC-16.3 with nothing due today it shows zero rather than hiding', () => {
  render(<StatRow now={NOW} items={[anItem({ dueAt: at(5) })]} />);

  expect(screen.getByText('remaining today')).toBeVisible();
  expect(screen.getAllByText('0').length).toBeGreaterThan(0);
});

test('AC-16.3 an empty database still renders both numbers', () => {
  render(<StatRow now={NOW} items={[]} />);

  expect(screen.getByText('remaining today')).toBeVisible();
  expect(screen.getByText('completed yesterday')).toBeVisible();
  expect(screen.getAllByText('0')).toHaveLength(2);
});
