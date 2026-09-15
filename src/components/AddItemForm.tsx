import { useState } from 'react';
import { parseDueDate } from '../domain/dates';
import type { Category, ItemDraft, Priority } from '../domain/types';

const TITLE_REQUIRED = 'Give it a title.';
const DUE_UNREADABLE = 'Try "oct 3", "10/3", or "oct 3 2pm".';

interface AddItemFormProps {
  onAdd: (draft: ItemDraft) => void;
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
  /** Lets the empty state hand focus to the first field. */
  titleRef: React.RefObject<HTMLInputElement>;
}

export default function AddItemForm({
  onAdd,
  now,
  titleRef,
}: AddItemFormProps) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [category, setCategory] = useState<Category>('academic');
  const [priority, setPriority] = useState<Priority>('normal');
  const [titleError, setTitleError] = useState('');
  const [dueError, setDueError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = title.trim();
    const dueAt = parseDueDate(due, now);

    setTitleError(trimmed ? '' : TITLE_REQUIRED);
    setDueError(dueAt ? '' : DUE_UNREADABLE);
    if (!trimmed || !dueAt) return;

    onAdd({ title: trimmed, dueAt, category, priority });

    // Every field resets, not just the text ones. Leaving the selects on their
    // last values means the next item silently inherits them.
    setTitle('');
    setDue('');
    setCategory('academic');
    setPriority('normal');
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-describedby={titleError ? 'title-error' : undefined}
        />
        {titleError && <p id="title-error">{titleError}</p>}
      </div>

      <div>
        <label htmlFor="due">Due</label>
        <input
          id="due"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          placeholder="oct 3 2pm"
          aria-describedby={dueError ? 'due-error' : undefined}
        />
        {dueError && <p id="due-error">{dueError}</p>}
      </div>

      <div>
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          <option value="academic">Academic</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      <div>
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      <button type="submit">Add</button>
    </form>
  );
}
