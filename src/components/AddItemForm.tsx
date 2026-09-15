import { useState } from 'react';
import { toDueAt } from '../domain/dates';
import type { Category, ItemDraft, Priority } from '../domain/types';

const TITLE_REQUIRED = 'Give it a title.';
const DUE_REQUIRED = 'Pick a date.';

interface AddItemFormProps {
  onAdd: (draft: ItemDraft) => void;
  /** Lets the empty state hand focus to the first field. */
  titleRef: React.RefObject<HTMLInputElement>;
}

export default function AddItemForm({ onAdd, titleRef }: AddItemFormProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [category, setCategory] = useState<Category>('academic');
  const [priority, setPriority] = useState<Priority>('normal');
  const [titleError, setTitleError] = useState('');
  const [dueError, setDueError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = title.trim();
    const dueAt = toDueAt(dueDate, dueTime);

    setTitleError(trimmed ? '' : TITLE_REQUIRED);
    setDueError(dueAt ? '' : DUE_REQUIRED);
    if (!trimmed || !dueAt) return;

    onAdd({ title: trimmed, dueAt, category, priority });

    // Every field resets, not just the text ones. Leaving the selects on their
    // last values means the next item silently inherits them.
    setTitle('');
    setDueDate('');
    setDueTime('');
    setCategory('academic');
    setPriority('normal');
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__field form__field--title">
        <label className="form__label" htmlFor="title">
          Title
        </label>
        <input
          className="form__input"
          id="title"
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-describedby={titleError ? 'title-error' : undefined}
        />
        {titleError && (
          <p className="form__error" id="title-error">
            {titleError}
          </p>
        )}
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="due">
          Due
        </label>
        <input
          className="form__input"
          id="due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-describedby={dueError ? 'due-error' : undefined}
        />
        {dueError && (
          <p className="form__error" id="due-error">
            {dueError}
          </p>
        )}
      </div>

      {/*
        Optional, because most deadlines are a day rather than a moment. Left
        empty it means 23:59, which is what AC-19.2 asks for.
      */}
      <div className="form__field form__field--time">
        <label className="form__label" htmlFor="due-time">
          Time
        </label>
        <input
          className="form__input"
          id="due-time"
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
        />
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="category">
          Category
        </label>
        <select
          className="form__select"
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          <option value="academic">Academic</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      <div className="form__field">
        <label className="form__label" htmlFor="priority">
          Priority
        </label>
        <select
          className="form__select"
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      <button className="form__submit" type="submit">
        Add
      </button>
    </form>
  );
}
