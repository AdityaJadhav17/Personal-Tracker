import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalList from './GoalList';
import type { Goal, GoalDraft, Item } from '../domain/types';

const noop = () => {};

function aGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    name: 'Finish the quarter clean',
    description: 'No late submissions',
    targetAt: new Date(2026, 11, 15, 23, 59).toISOString(),
    createdAt: '2026-09-15T17:00:00.000Z',
    ...overrides,
  };
}

function anItem(id: string, goalId: string | null, done = false): Item {
  return {
    id,
    title: id,
    dueAt: '2026-10-04T06:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: done ? 'done' : 'open',
    note: '',
    createdAt: '2026-09-15T17:00:00.000Z',
    completedAt: done ? '2026-09-16T01:00:00.000Z' : null,
    goalId,
    courseId: null,
    repeatDay: null,
    repeat: 'none',
  };
}

function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

test('AC-14.1 the form offers a name, a description and a target date', () => {
  render(<GoalList goals={[]} items={[]} onAdd={noop} onDelete={noop} />);

  expect(screen.getByLabelText('Goal name')).toBeVisible();
  expect(screen.getByLabelText('Description')).toBeVisible();
  expect(screen.getByLabelText('Target date')).toBeVisible();
});

test('AC-14.1 saving reports all three', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: GoalDraft) => void>();
  render(<GoalList goals={[]} items={[]} onAdd={onAdd} onDelete={noop} />);

  await user.type(screen.getByLabelText('Goal name'), 'Finish the quarter');
  await user.type(screen.getByLabelText('Description'), 'No late work');
  setDate('Target date', '2026-12-15');
  await user.click(screen.getByRole('button', { name: 'Add goal' }));

  expect(onAdd).toHaveBeenCalledWith({
    name: 'Finish the quarter',
    description: 'No late work',
    targetAt: expect.any(String) as unknown as string,
  });
});

test('AC-14.1 the target date is the end of the day chosen, locally', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: GoalDraft) => void>();
  render(<GoalList goals={[]} items={[]} onAdd={onAdd} onDelete={noop} />);

  await user.type(screen.getByLabelText('Goal name'), 'Finish the quarter');
  setDate('Target date', '2026-12-15');
  await user.click(screen.getByRole('button', { name: 'Add goal' }));

  const target = new Date(onAdd.mock.calls[0]![0].targetAt);
  expect(target.getFullYear()).toBe(2026);
  expect(target.getMonth() + 1).toBe(12);
  expect(target.getDate()).toBe(15);
});

test('AC-14.1 a saved goal shows its name, description and target', () => {
  render(
    <GoalList goals={[aGoal()]} items={[]} onAdd={noop} onDelete={noop} />,
  );

  expect(
    screen.getByRole('heading', { name: 'Finish the quarter clean' }),
  ).toBeVisible();
  expect(screen.getByText('No late submissions')).toBeVisible();
  expect(screen.getByText(/Dec 15/)).toBeVisible();
});

test('AC-14.2 a goal with no name is refused, with a message', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: GoalDraft) => void>();
  render(<GoalList goals={[]} items={[]} onAdd={onAdd} onDelete={noop} />);

  setDate('Target date', '2026-12-15');
  await user.click(screen.getByRole('button', { name: 'Add goal' }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Goal name')).toHaveAccessibleDescription(
    'Give the goal a name.',
  );
});

test('AC-14.2 a goal with no target date is refused', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: GoalDraft) => void>();
  render(<GoalList goals={[]} items={[]} onAdd={onAdd} onDelete={noop} />);

  await user.type(screen.getByLabelText('Goal name'), 'Finish the quarter');
  await user.click(screen.getByRole('button', { name: 'Add goal' }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Target date')).toHaveAccessibleDescription(
    'Pick a target date.',
  );
});

test('AC-14.4 with no goals an empty state offers a way in', () => {
  render(<GoalList goals={[]} items={[]} onAdd={noop} onDelete={noop} />);

  expect(screen.getByText('No goals yet.')).toBeVisible();
});

test('AC-15.1 a goal shows how many of its items are done', () => {
  render(
    <GoalList
      goals={[aGoal()]}
      items={[
        anItem('a', 'g1', true),
        anItem('b', 'g1'),
        anItem('c', 'g1'),
        anItem('d', 'g1'),
      ]}
      onAdd={noop}
      onDelete={noop}
    />,
  );

  expect(screen.getByText('1 of 4 done')).toBeVisible();
  const bar = screen.getByRole('progressbar', {
    name: 'Finish the quarter clean progress',
  });
  expect(bar).toHaveAttribute('value', '1');
  expect(bar).toHaveAttribute('max', '4');
});

test('AC-15.2 a goal with no items reads zero of zero, not an error', () => {
  render(
    <GoalList goals={[aGoal()]} items={[]} onAdd={noop} onDelete={noop} />,
  );

  expect(screen.getByText('0 of 0 done')).toBeVisible();
  expect(
    screen.getByRole('progressbar', {
      name: 'Finish the quarter clean progress',
    }),
  ).toHaveAttribute('value', '0');
});

test('AC-15.1 items belonging to another goal do not count', () => {
  render(
    <GoalList
      goals={[aGoal()]}
      items={[anItem('a', 'g1', true), anItem('b', 'other'), anItem('c', null)]}
      onAdd={noop}
      onDelete={noop}
    />,
  );

  expect(screen.getByText('1 of 1 done')).toBeVisible();
});

test('AC-20.3 deleting asks before anything goes', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <GoalList goals={[aGoal()]} items={[]} onAdd={noop} onDelete={onDelete} />,
  );

  await user.click(
    screen.getByRole('button', { name: 'Delete Finish the quarter clean' }),
  );

  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Delete Finish the quarter clean? Its items stay.',
  );
});

test('AC-20.1 confirming reports the goal id', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <GoalList goals={[aGoal()]} items={[]} onAdd={noop} onDelete={onDelete} />,
  );

  await user.click(
    screen.getByRole('button', { name: 'Delete Finish the quarter clean' }),
  );
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

  expect(onDelete).toHaveBeenCalledWith('g1');
});

test('AC-20.3 keeping it removes nothing', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <GoalList goals={[aGoal()]} items={[]} onAdd={noop} onDelete={onDelete} />,
  );

  await user.click(
    screen.getByRole('button', { name: 'Delete Finish the quarter clean' }),
  );
  await user.click(screen.getByRole('button', { name: 'Keep' }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: 'Yes, delete' }),
  ).not.toBeInTheDocument();
});
