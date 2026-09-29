import { useId, useLayoutEffect, useRef, useState } from 'react';
import { editedLong, editedWhen } from '../domain/dates';
import { groupNotes, previewOf, searchNotes, titleOf } from '../domain/notes';
import type { Note } from '../domain/types';
import { Icon } from './Shell';

/** AC-80.2. The open note before its first letter, which is when it is made. */
const DRAFT = 'draft';

const COMPOSE =
  'M12 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z';
const TRASH =
  'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3';
const BACK = 'M15 5l-7 7 7 7';

interface NotesViewProps {
  notes: Note[];
  now: Date;
  /** Makes a note from its first text; its id, or null if storage refused. */
  onAdd: (body: string) => string | null;
  onChange: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

/**
 * US-80. Apple Notes' layout: the list, grouped by when each note was last
 * edited, beside the open note. There is no title field and no Save: the
 * first line is the title, and every keystroke is kept.
 */
export default function NotesView({
  notes,
  now,
  onAdd,
  onChange,
  onDelete,
}: NotesViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  // AC-80.8. A phone shows one pane at a time; this says which.
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  // Whose text the editor holds. The editor is not controlled by React, so
  // its text is written only when a different note opens; rewriting it on
  // every keystroke would throw the cursor back to the start.
  const shown = useRef<string | null>(null);
  const id = useId();

  const drafting = openId === DRAFT;
  const open = drafting
    ? null
    : (notes.find((note) => note.id === openId) ??
      groupNotes(notes, now)[0]?.notes[0] ??
      null);
  const openKey = drafting ? DRAFT : (open?.id ?? null);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      shown.current = null;
      return;
    }
    if (shown.current === openKey) return;
    editor.textContent = open?.body ?? '';
    shown.current = openKey;
    if (drafting) editor.focus();
  });

  function input() {
    const editor = editorRef.current!;
    // innerText turns the browser's line breaks into "\n"; jsdom lacks it.
    const body = editor.innerText || editor.textContent || '';
    if (!drafting) {
      if (open) onChange(open.id, body);
      return;
    }
    if (body.trim() === '') return;
    const made = onAdd(body);
    if (made === null) return;
    shown.current = made;
    setOpenId(made);
  }

  function choose(noteId: string) {
    setOpenId(noteId);
    setReading(true);
  }

  const found = searchNotes(notes, query);
  const listed: Note[] = drafting
    ? [
        {
          id: DRAFT,
          body: '',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        ...found,
      ]
    : found;

  return (
    <section className={`notes ${reading ? 'notes--reading' : ''}`}>
      <div className="page-head notes__head">
        <h1 className="page-title">Notes</h1>
        <button
          className="notes__tool"
          type="button"
          aria-label="New note"
          title="New note"
          onClick={() => {
            setOpenId(DRAFT);
            setReading(true);
          }}
        >
          <Icon path={COMPOSE} size={20} />
        </button>
      </div>

      <div className="notes__panes">
        <div className="notes__list">
          <input
            className="notes__search"
            type="search"
            placeholder="Search"
            aria-label="Search notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {listed.length === 0 ? (
            <p className="notes__empty">
              {notes.length === 0 ? 'No notes yet.' : 'No Results'}
            </p>
          ) : (
            groupNotes(listed, now).map((group, index) => (
              <section className="notes__group" key={group.label}>
                <h2 className="notes__group-name" id={`${id}-${index}`}>
                  {group.label}
                </h2>
                <ul className="notes__rows" aria-labelledby={`${id}-${index}`}>
                  {group.notes.map((note) => (
                    <li key={note.id}>
                      <button
                        className="note-row"
                        type="button"
                        aria-current={note.id === openKey ? 'true' : undefined}
                        onClick={() => choose(note.id)}
                      >
                        <span className="note-row__title">
                          {titleOf(note.body)}
                        </span>
                        <span className="note-row__meta">
                          <time dateTime={note.updatedAt}>
                            {editedWhen(note.updatedAt, now)}
                          </time>
                          <span className="note-row__preview">
                            {previewOf(note.body)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="notes__page">
          {openKey !== null && (
            <>
              <div className="notes__bar">
                <button
                  className="notes__back"
                  type="button"
                  aria-label="Back to notes"
                  onClick={() => setReading(false)}
                >
                  <Icon path={BACK} size={20} weight={2.2} />
                  Notes
                </button>
                <button
                  className="notes__tool"
                  type="button"
                  aria-label="Delete note"
                  title="Delete note"
                  onClick={() => {
                    // AC-80.6. No question; the undo toast is the way back.
                    if (open) onDelete(open.id);
                    setOpenId(null);
                    setReading(false);
                  }}
                >
                  <Icon path={TRASH} size={20} />
                </button>
              </div>
              {open && (
                <p className="notes__stamp">{editedLong(open.updatedAt)}</p>
              )}
              {/* AC-80.3. Plain text only, read back as text, so ::first-line
                  can make the title large without a second field. */}
              <div
                className="notes__editor"
                ref={editorRef}
                contentEditable="plaintext-only"
                role="textbox"
                aria-multiline="true"
                aria-label="Note"
                tabIndex={0}
                spellCheck
                onInput={input}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
