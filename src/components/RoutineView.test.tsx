import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import RoutineView from './RoutineView';
import type { Task } from '../domain/types';

// Tuesday 15 September 2026, 10:00 local, as every test runs (US-84).
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);
const TODAY = '2026-09-15';

function aTask(id: string, title: string, doneOn: string | null = null): Task {
  return { id, title, doneOn, createdAt: NOW.toISOString() };
}

/** The view with the app's actions done in memory, so lines really appear. */
function Harness({
  start,
  onRemove = () => {},
}: {
  start: Task[];
  onRemove?: (id: string) => void;
}) {
  const [tasks, setTasks] = useState(start);
  let next = tasks.length;
  return (
    <RoutineView
      tasks={tasks}
      now={NOW}
      onAdd={(after) => {
        const made = aTask(`new-${(next += 1)}`, '');
        setTasks((list) => {
          const at = after
            ? list.findIndex((t) => t.id === after) + 1
            : list.length;
          return [...list.slice(0, at), made, ...list.slice(at)];
        });
        return made.id;
      }}
      onRename={(id, title) =>
        setTasks((list) => list.map((t) => (t.id === id ? { ...t, title } : t)))
      }
      onToggle={(id) =>
        setTasks((list) =>
          list.map((t) =>
            t.id === id
              ? { ...t, doneOn: t.doneOn === TODAY ? null : TODAY }
              : t,
          ),
        )
      }
      onRemove={(id) => {
        onRemove(id);
        setTasks((list) => list.filter((t) => t.id !== id));
      }}
    />
  );
}

const lines = () =>
  screen
    .getAllByRole('textbox', { name: 'Task' })
    .map((input) => (input as HTMLInputElement).value);

test('AC-88.1 the page is named, and says which day it is', () => {
  render(<Harness start={[]} />);

  expect(screen.getByRole('heading', { name: 'Routine' })).toBeVisible();
  expect(screen.getByText('Tuesday, September 15')).toBeVisible();
});

test('AC-88.3 ticking a task marks it done today, and ticking again unticks it', async () => {
  const user = userEvent.setup();
  render(<Harness start={[aTask('gym', 'Gym')]} />);

  const box = screen.getByRole('checkbox', { name: 'Gym' });
  await user.click(box);
  expect(box).toBeChecked();
  await user.click(box);
  expect(box).not.toBeChecked();
});

test('AC-88.4 a task ticked yesterday is unticked today', () => {
  render(<Harness start={[aTask('gym', 'Gym', '2026-09-14')]} />);

  expect(screen.getByRole('checkbox', { name: 'Gym' })).not.toBeChecked();
  expect(screen.getByText('0 of 1 done today')).toBeVisible();
});

test('AC-88.5 it counts what is done today', () => {
  render(
    <Harness
      start={[
        aTask('a', 'Vitamins', TODAY),
        aTask('b', 'Gym', TODAY),
        aTask('c', 'Read'),
        aTask('d', 'Duolingo', '2026-09-14'),
      ]}
    />,
  );

  expect(screen.getByText('2 of 4 done today')).toBeVisible();
});

test('AC-88.2 typing renames, and Enter makes a new line below and moves to it', async () => {
  const user = userEvent.setup();
  render(<Harness start={[aTask('a', 'Vitamins'), aTask('b', 'Read')]} />);

  await user.click(screen.getAllByRole('textbox', { name: 'Task' })[0]!);
  await user.keyboard('{End} D{Enter}Gym');

  expect(lines()).toEqual(['Vitamins D', 'Gym', 'Read']);
});

test('AC-88.2 Backspace in an empty line removes it and moves up', async () => {
  const user = userEvent.setup();
  render(<Harness start={[aTask('a', 'Vitamins')]} />);

  await user.click(screen.getByRole('textbox', { name: 'Task' }));
  await user.keyboard('{End}{Enter}{Backspace}');

  expect(lines()).toEqual(['Vitamins']);
  expect(screen.getByRole('textbox', { name: 'Task' })).toHaveFocus();
});

test('AC-88.2 New task adds a line at the end, ready to type', async () => {
  const user = userEvent.setup();
  render(<Harness start={[aTask('a', 'Vitamins')]} />);

  await user.click(screen.getByRole('button', { name: 'New task' }));
  await user.keyboard('Gym');

  expect(lines()).toEqual(['Vitamins', 'Gym']);
});

test('AC-88.2 a line left empty is removed when you move away', async () => {
  const user = userEvent.setup();
  render(<Harness start={[aTask('a', 'Vitamins')]} />);

  await user.click(screen.getByRole('button', { name: 'New task' }));
  await user.click(screen.getByRole('heading', { name: 'Routine' }));

  expect(lines()).toEqual(['Vitamins']);
});

test('AC-88.6 Delete removes a task that has words in it', async () => {
  const user = userEvent.setup();
  const onRemove = vi.fn<(id: string) => void>();
  render(<Harness start={[aTask('gym', 'Gym')]} onRemove={onRemove} />);

  await user.click(screen.getByRole('button', { name: 'Delete Gym' }));

  expect(onRemove).toHaveBeenCalledWith('gym');
  expect(screen.queryByRole('textbox', { name: 'Task' })).toBeNull();
});

test('AC-88.1 with nothing yet, it says what the page is for', () => {
  render(<Harness start={[]} />);

  expect(screen.getByText(/Add what you do most days/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'New task' })).toBeVisible();
});
