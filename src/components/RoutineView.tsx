import { useLayoutEffect, useRef, useState } from 'react';
import { dayHeading, toDateValue } from '../domain/dates';
import type { Task } from '../domain/types';

interface RoutineViewProps {
  tasks: Task[];
  now: Date;
  /** A new, empty line after `after`, or at the end; its id. */
  onAdd: (after: string | null) => string | null;
  onRename: (id: string, title: string) => void;
  /** Done today, or not done today. */
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

/**
 * US-88. The daily routine: Notion's checkbox lines, typed into directly, that
 * start unticked every morning. A task is done when it was ticked today, so
 * yesterday's ticks simply stop counting at midnight.
 */
export default function RoutineView({
  tasks,
  now,
  onAdd,
  onRename,
  onToggle,
  onRemove,
}: RoutineViewProps) {
  const today = toDateValue(now);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  // The line to put the cursor in once it is on screen.
  const [focus, setFocus] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!focus) return;
    const input = inputs.current.get(focus);
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    setFocus(null);
  }, [focus, tasks]);

  function add(after: string | null) {
    const made = onAdd(after);
    if (made) setFocus(made);
  }

  const done = tasks.filter((task) => task.doneOn === today).length;

  return (
    <section className="routine">
      <h1 className="page-title">Routine</h1>
      <p className="routine__day">{dayHeading(now)}</p>

      {tasks.length === 0 && (
        <p className="routine__empty">
          Nothing yet. Add what you do most days; it starts fresh every morning.
        </p>
      )}

      <ul className="routine__list" aria-label="Routine">
        {tasks.map((task, index) => {
          const ticked = task.doneOn === today;
          return (
            <li className={`task ${ticked ? 'task--done' : ''}`} key={task.id}>
              <input
                className="task__box"
                type="checkbox"
                aria-label={task.title || 'Untitled task'}
                checked={ticked}
                onChange={() => onToggle(task.id)}
              />
              <input
                className="task__title"
                aria-label="Task"
                value={task.title}
                ref={(node) => {
                  if (node) inputs.current.set(task.id, node);
                  else inputs.current.delete(task.id);
                }}
                onChange={(event) => onRename(task.id, event.target.value)}
                onKeyDown={(event) => {
                  // AC-88.2. Enter starts the next line, as in Notion.
                  if (event.key === 'Enter' && task.title.trim() !== '') {
                    event.preventDefault();
                    add(task.id);
                  }
                  // AC-88.2. Backspace in an empty line takes it away.
                  if (event.key === 'Backspace' && task.title === '') {
                    event.preventDefault();
                    const above = tasks[index - 1];
                    onRemove(task.id);
                    if (above) setFocus(above.id);
                  }
                }}
                // A line left empty is not a task; it goes when you leave it.
                onBlur={() => {
                  if (task.title.trim() === '') onRemove(task.id);
                }}
              />
              {task.title.trim() !== '' && (
                <button
                  className="task__delete"
                  type="button"
                  aria-label={`Delete ${task.title}`}
                  title="Delete"
                  onClick={() => onRemove(task.id)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button
        className="routine__new"
        type="button"
        // Down on press, so the empty line it adds is not the one that just
        // lost focus to this button and was taken away.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => add(null)}
      >
        <span aria-hidden="true">+</span>New task
      </button>

      {tasks.length > 0 && (
        <p className="routine__count">
          {done} of {tasks.length} done today
        </p>
      )}
    </section>
  );
}
