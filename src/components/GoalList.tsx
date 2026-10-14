import { useState } from 'react';
import { localDay, monthDay, toDueAt } from '../domain/dates';
import { progressOf, timeLeft } from '../domain/goals';
import type { Goal, GoalDraft, Item } from '../domain/types';
import MoreButton from './MoreButton';

const NAME_REQUIRED = 'Give the goal a name.';
const TARGET_REQUIRED = 'Pick a target date.';

interface GoalListProps {
  goals: Goal[];
  /** Every item, so each goal can count its own. Progress is never stored. */
  items: Item[];
  onAdd: (draft: GoalDraft) => void;
  onDelete: (id: string) => void;
  /** AC-98.1 and AC-98.2. Mark achieved, or not achieved again. */
  onAchieve: (id: string, achieved: boolean) => void;
  /** AC-65.1. For how long is left. */
  now: Date;
}

export default function GoalList({
  now,
  goals,
  items,
  onAdd,
  onDelete,
  onAchieve,
}: GoalListProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [nameError, setNameError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  // US-60. Which card has its More open, showing Delete. One at a time.
  const [more, setMore] = useState<string | null>(null);
  // US-60. The list comes first; the form waits behind a button, except when
  // there is nothing to list yet.
  const [adding, setAdding] = useState(false);
  const showForm = adding || goals.length === 0;

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
    setAdding(false);
  }

  const pending = goals.find((goal) => goal.id === confirming);
  // AC-98.1. What is still being worked towards first, then what was
  // reached, the most recent first. Nothing is hidden.
  const active = goals.filter((goal) => goal.achievedAt === null);
  const achieved = goals
    .filter((goal) => goal.achievedAt !== null)
    .sort((a, b) => b.achievedAt!.localeCompare(a.achievedAt!));

  function card(goal: Goal) {
    const { done, total } = progressOf(items, goal.id);
    return (
      <li
        className={goal.achievedAt ? 'goal goal--achieved' : 'goal'}
        key={goal.id}
      >
        <div className="card__head">
          <h3 className="goal__name">{goal.name}</h3>
          <MoreButton
            name={goal.name}
            open={more === goal.id}
            onToggle={() => setMore(more === goal.id ? null : goal.id)}
          />
        </div>
        {goal.description && (
          <p className="goal__description">{goal.description}</p>
        )}
        <p className="goal__target">
          {goal.achievedAt ? (
            <>
              <span className="goal__check" aria-hidden="true">
                ✓{' '}
              </span>
              {`Achieved ${monthDay(localDay(goal.achievedAt))}`}
            </>
          ) : (
            timeLeft(goal.targetAt, now)
          )}
        </p>

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
          aria-label={
            goal.achievedAt
              ? `Mark ${goal.name} not achieved`
              : `Mark ${goal.name} achieved`
          }
          onClick={() => onAchieve(goal.id, goal.achievedAt === null)}
        >
          {goal.achievedAt ? 'Mark not achieved' : 'Mark achieved'}
        </button>

        {more === goal.id && (
          <button
            className="data__button"
            type="button"
            aria-label={`Delete ${goal.name}`}
            onClick={() => setConfirming(goal.id)}
          >
            Delete
          </button>
        )}
      </li>
    );
  }

  return (
    <section className="goals">
      {/* AC-69.1. The title and its one action on a row, as the calendar
          has them: the action at the far end, quiet, since this page is
          read far more than it is added to. */}
      <div className="page-head">
        <h1 className="page-title">Goals</h1>
        {!showForm && (
          <button
            className="page-head__action"
            type="button"
            onClick={() => setAdding(true)}
          >
            New goal
          </button>
        )}
      </div>

      {showForm && (
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
          {goals.length > 0 && (
            <button
              className="prompt__button prompt__button--quiet"
              type="button"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          )}
        </form>
      )}

      <p className="status" role="status">
        {pending ? `Delete ${pending.name}? Its items stay.` : ''}
      </p>

      {pending && (
        <div className="prompt__actions">
          <button
            className="prompt__button prompt__button--danger"
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
        <>
          {active.length > 0 && (
            <ul className="goal-list">{active.map(card)}</ul>
          )}
          {achieved.length > 0 && (
            <>
              <h2 className="goals__achieved">Achieved</h2>
              <ul className="goal-list">{achieved.map(card)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
