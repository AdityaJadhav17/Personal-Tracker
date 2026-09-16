import { useState } from 'react';
import { formatDue, toDueAt } from '../domain/dates';
import { progressOf } from '../domain/goals';
import type { Goal, GoalDraft, Item } from '../domain/types';

const NAME_REQUIRED = 'Give the goal a name.';
const TARGET_REQUIRED = 'Pick a target date.';

interface GoalListProps {
  goals: Goal[];
  /** Every item, so each goal can count its own. Progress is never stored. */
  items: Item[];
  onAdd: (draft: GoalDraft) => void;
  onDelete: (id: string) => void;
}

export default function GoalList({
  goals,
  items,
  onAdd,
  onDelete,
}: GoalListProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [nameError, setNameError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    // A goal is a date you are aiming at, so it reads as the end of that day,
    // the same rule as an item with no time.
    const targetAt = toDueAt(target, '');

    setNameError(trimmed ? '' : NAME_REQUIRED);
    setTargetError(targetAt ? '' : TARGET_REQUIRED);
    if (!trimmed || !targetAt) return;

    onAdd({ name: trimmed, description: description.trim(), targetAt });
    setName('');
    setDescription('');
    setTarget('');
  }

  const pending = goals.find((goal) => goal.id === confirming);

  return (
    <section className="goals">
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__field form__field--title">
          <label className="form__label" htmlFor="goal-name">
            Goal name
          </label>
          <input
            className="form__input"
            id="goal-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={nameError ? 'goal-name-error' : undefined}
          />
          {nameError && (
            <p className="form__error" id="goal-name-error">
              {nameError}
            </p>
          )}
        </div>

        <div className="form__field form__field--title">
          <label className="form__label" htmlFor="goal-description">
            Description
          </label>
          <input
            className="form__input"
            id="goal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form__field">
          <label className="form__label" htmlFor="goal-target">
            Target date
          </label>
          <input
            className="form__input"
            id="goal-target"
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-describedby={targetError ? 'goal-target-error' : undefined}
          />
          {targetError && (
            <p className="form__error" id="goal-target-error">
              {targetError}
            </p>
          )}
        </div>

        <button className="form__submit" type="submit">
          Add goal
        </button>
      </form>

      <p className="status" role="status">
        {pending ? `Delete ${pending.name}? Its items stay.` : ''}
      </p>

      {pending && (
        <div className="prompt__actions">
          <button
            className="prompt__button"
            type="button"
            onClick={() => {
              onDelete(pending.id);
              setConfirming(null);
            }}
          >
            Yes, delete
          </button>
          <button
            className="prompt__button prompt__button--quiet"
            type="button"
            onClick={() => setConfirming(null)}
          >
            Keep
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <section className="empty">
          <p>No goals yet.</p>
          <p>
            A goal is something to aim at with a date on it. Items you add can
            belong to one, and each goal shows how much of its work is done.
          </p>
        </section>
      ) : (
        <ul className="goal-list">
          {goals.map((goal) => {
            const { done, total } = progressOf(items, goal.id);
            return (
              <li className="goal" key={goal.id}>
                <h3 className="goal__name">{goal.name}</h3>
                {goal.description && (
                  <p className="goal__description">{goal.description}</p>
                )}
                <p className="goal__target">{formatDue(goal.targetAt)}</p>

                <p className="goal__count">{`${done} of ${total} done`}</p>
                <progress
                  className="goal__bar"
                  aria-label={`${goal.name} progress`}
                  value={done}
                  /* A goal with no items still needs a bar to render, and max
                     cannot be zero, so it shows empty rather than busy. */
                  max={total || 1}
                />

                <button
                  className="data__button"
                  type="button"
                  aria-label={`Delete ${goal.name}`}
                  onClick={() => setConfirming(goal.id)}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
