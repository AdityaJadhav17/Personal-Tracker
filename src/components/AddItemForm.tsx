import { useId, useState } from 'react';
import { toDueAt } from '../domain/dates';
import type { Category, ItemDraft, Priority, Repeat } from '../domain/types';

const TITLE_REQUIRED = 'Give it a title.';
const DUE_REQUIRED = 'Pick a date.';

interface AddItemFormProps {
  /** False when storage refused it. AC-40.5 keeps the form as it was. */
  onAdd: (draft: ItemDraft) => boolean;
  /** Lets the empty state hand focus to the first field. */
  titleRef: React.RefObject<HTMLInputElement>;
  /**
   * US-53. The calendar day this adds to. The date is already chosen, so the
   * Due field is left out rather than shown pre-filled.
   */
  day?: string;
  /**
   * US-57. Home's one-line form, starting on this day (today). It shows only
   * the title until you use it, since the list below is read far more often
   * than this is filled in.
   */
  quickFrom?: string;
  /**
   * AC-66.3. The day Due starts on, with every field showing: the phone's
   * add sheet, which is already a step you chose to take.
   */
  from?: string;
}

export default function AddItemForm({
  onAdd,
  titleRef,
  day,
  quickFrom,
  from,
}: AddItemFormProps) {
  // AC-66.3. Home's form and the phone's add sheet can share a page, so each
  // form's labels point at its own fields.
  const id = useId();
  const quick = quickFrom !== undefined;
  const [open, setOpen] = useState(!quick);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(day ?? quickFrom ?? from ?? '');
  const [dueTime, setDueTime] = useState('');
  const [category, setCategory] = useState<Category>('academic');
  const [priority, setPriority] = useState<Priority>('normal');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [titleError, setTitleError] = useState('');
  const [dueError, setDueError] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = title.trim();
    const dueAt = toDueAt(dueDate, dueTime);

    setTitleError(trimmed ? '' : TITLE_REQUIRED);
    setDueError(dueAt ? '' : DUE_REQUIRED);
    if (!trimmed || !dueAt) return;

    if (!onAdd({ title: trimmed, dueAt, category, priority, repeat })) return;

    // Every field resets, not just the text ones. Leaving the selects on their
    // last values means the next item silently inherits them.
    setTitle('');
    setDueDate(day ?? quickFrom ?? from ?? '');
    setDueTime('');
    setCategory('academic');
    setRepeat('none');
    setPriority('normal');
    // AC-57.2. Done adding: fold back, so the panel stops covering the rows
    // below, the new one included.
    if (quick) {
      setOpen(false);
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  return (
    <form
      className={`form ${quick ? 'form--quick' : ''}`}
      onSubmit={handleSubmit}
      onFocus={() => setOpen(true)}
      // AC-57.2. Folds back when you leave it, or on Escape. What you typed
      // stays; only the extra fields fold away, and they float over the list
      // rather than push it down, so folding never moves what you clicked.
      onBlur={(event) => {
        if (quick && !event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (quick && event.key === 'Escape') {
          setOpen(false);
          (document.activeElement as HTMLElement | null)?.blur();
        }
      }}
    >
      <div className="form__field form__field--title">
        <label
          className={quick ? 'visually-hidden' : 'form__label'}
          htmlFor={`${id}-title`}
        >
          Title
        </label>
        <input
          className="form__input"
          id={`${id}-title`}
          ref={titleRef}
          placeholder={quick ? 'Add a deadline…' : undefined}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-describedby={titleError ? `${id}-title-error` : undefined}
        />
        {titleError && (
          <p className="form__error" id={`${id}-title-error`}>
            {titleError}
          </p>
        )}
      </div>

      {open && (
        // Laid out in the form's own row normally; on Home it is the panel
        // that floats under the one-line field.
        <div className="form__more">
          {day === undefined && (
            <div className="form__field">
              <label className="form__label" htmlFor={`${id}-due`}>
                Due
              </label>
              <input
                className="form__input"
                id={`${id}-due`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-describedby={dueError ? `${id}-due-error` : undefined}
              />
              {dueError && (
                <p className="form__error" id={`${id}-due-error`}>
                  {dueError}
                </p>
              )}
            </div>
          )}

          {/*
            Optional, because most deadlines are a day rather than a moment.
            Left empty it means 23:59, which is what AC-19.2 asks for.
          */}
          <div className="form__field form__field--time">
            <label className="form__label" htmlFor={`${id}-due-time`}>
              Time
            </label>
            <input
              className="form__input"
              id={`${id}-due-time`}
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>

          <div className="form__field">
            <label className="form__label" htmlFor={`${id}-category`}>
              Category
            </label>
            <select
              className="form__select"
              id={`${id}-category`}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              <option value="academic">Academic</option>
              <option value="personal">Personal</option>
            </select>
          </div>

          <div className="form__field">
            <label className="form__label" htmlFor={`${id}-priority`}>
              Priority
            </label>
            <select
              className="form__select"
              id={`${id}-priority`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="form__field">
            <label className="form__label" htmlFor={`${id}-repeat`}>
              Repeat
            </label>
            <select
              className="form__select"
              id={`${id}-repeat`}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as Repeat)}
            >
              <option value="none">Never</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <button className="form__submit" type="submit">
            Add
          </button>
        </div>
      )}
    </form>
  );
}
