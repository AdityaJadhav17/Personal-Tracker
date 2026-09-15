import { useState } from 'react';
import { formatDue, isUpcoming } from '../domain/dates';
import type { Item } from '../domain/types';

interface ItemRowProps {
  item: Item;
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
  onDone: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}

export default function ItemRow({
  item,
  now,
  onDone,
  onNoteChange,
}: ItemRowProps) {
  // The note is held locally while you type and reported on blur, so a save
  // does not run on every keystroke. See the storage note in docs/plan.md.
  const [note, setNote] = useState(item.note);

  return (
    <li>
      {/*
        The done control comes first so Tab walks the list in the order it is
        displayed. Both labels carry the title, because "Done" and "Note" on
        their own say nothing out of context.
      */}
      <button
        type="button"
        aria-label={`Mark ${item.title} done`}
        onClick={() => onDone(item.id)}
      >
        Done
      </button>{' '}
      <span>{item.title}</span> <span>{formatDue(item.dueAt)}</span>
      {isUpcoming(item.dueAt, now) && <span> Soon</span>}
      <textarea
        aria-label={`Note for ${item.title}`}
        placeholder="Note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => onNoteChange(item.id, note)}
      />
    </li>
  );
}
