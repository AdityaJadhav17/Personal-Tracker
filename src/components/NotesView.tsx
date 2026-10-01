import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { editedLong, editedWhen } from '../domain/dates';
import {
  changePasscode,
  createLock,
  openSealed,
  seal,
  unlock,
} from '../domain/lock';
import type { Resealed } from '../domain/lock';
import { groupNotes, previewOf, searchNotes, titleOf } from '../domain/notes';
import type { Lock, Note, Sealed } from '../domain/types';
import { Icon } from './Shell';

/** AC-80.2. The open note before its first letter, which is when it is made. */
const DRAFT = 'draft';

/** AC-82.4. How long unlocked notes stay open without a keystroke. */
const RELOCK_AFTER = 5 * 60 * 1000;

const COMPOSE =
  'M12 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z';
const TRASH =
  'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3';
const BACK = 'M15 5l-7 7 7 7';
const PIN = 'M9 4h6l-1 6 4 4H6l4-4zM12 14v7';
const LOCK = 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3';

interface NotesViewProps {
  notes: Note[];
  now: Date;
  /** Makes a note from its first text; its id, or null if storage refused. */
  onAdd: (body: string) => string | null;
  /** AC-82.4. A locked note passes its title and its text sealed. */
  onChange: (id: string, body: string, sealed?: Sealed | null) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  lock: Lock | null;
  /** AC-82.1. `made` is the new lock, on the first note ever locked. */
  onLock: (id: string, title: string, sealed: Sealed, made?: Lock) => void;
  onUnlock: (id: string, body: string) => void;
  /** AC-86.3. Stores a new lock and every note under it; false if refused. */
  onRekey: (lock: Lock, notes: Resealed[]) => boolean;
}

/**
 * US-80. Apple Notes' layout: the list, grouped by when each note was last
 * edited, beside the open note. There is no title field and no Save: the
 * first line is the title, and every keystroke is kept.
 *
 * US-82. The key that opens locked notes lives here and nowhere else: in
 * memory, while this view is on screen. Leaving Notes or reloading drops it,
 * which is what locks them again.
 */
export default function NotesView({
  notes,
  now,
  onAdd,
  onChange,
  onDelete,
  onPin,
  lock,
  onLock,
  onUnlock,
  onRekey,
}: NotesViewProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  // AC-80.8. A phone shows one pane at a time; this says which.
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState('');
  const [key, setKey] = useState<CryptoKey | null>(null);
  // The open locked note's text, once decrypted.
  const [opened, setOpened] = useState<{ id: string; text: string } | null>(
    null,
  );
  const [asking, setAsking] = useState<'setup' | 'confirm' | 'change' | null>(
    null,
  );
  // AC-86.3. Said once the passcode has changed, until the next thing done.
  const [notice, setNotice] = useState('');
  // AC-86.6. A locked note the key in hand does not open.
  const [unopenable, setUnopenable] = useState<string | null>(null);
  const [activity, setActivity] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  // Whose text the editor holds. The editor is not controlled by React, so
  // its text is written only when a different note opens; rewriting it on
  // every keystroke would throw the cursor back to the start.
  const shown = useRef<string | null>(null);
  // AC-82.4. Seals finish out of order in principle; only the last one saves.
  const sealing = useRef(0);
  const id = useId();

  const drafting = openId === DRAFT;
  const open = drafting
    ? null
    : (notes.find((note) => note.id === openId) ??
      groupNotes(notes, now)[0]?.notes[0] ??
      null);
  const openKey = drafting ? DRAFT : (open?.id ?? null);
  const readable =
    drafting || (open !== null && (!open.sealed || opened?.id === open.id));

  // AC-82.3. With the key in hand, a locked note opens as soon as it is chosen.
  useEffect(() => {
    if (!key || !open?.sealed || opened?.id === open.id) return;
    let live = true;
    openSealed(key, open.sealed).then(
      (text) => {
        if (live) setOpened({ id: open.id, text });
      },
      // AC-86.6. Sealed under another passcode, as a note merged in from such
      // a backup is. Said, rather than left as a blank page and an error.
      () => {
        if (live) setUnopenable(open.id);
      },
    );
    return () => {
      live = false;
    };
  }, [key, open, opened]);

  // AC-82.4. Every keystroke restarts the five minutes.
  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(relock, RELOCK_AFTER);
    return () => clearTimeout(timer);
  }, [key, activity]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      shown.current = null;
      return;
    }
    if (shown.current === openKey) return;
    editor.textContent = open?.sealed
      ? (opened?.text ?? '')
      : (open?.body ?? '');
    shown.current = openKey;
    if (drafting) editor.focus();
  });

  function relock() {
    setKey(null);
    setOpened(null);
  }

  function input() {
    const editor = editorRef.current!;
    // innerText turns the browser's line breaks into "\n"; jsdom lacks it.
    const body = editor.innerText || editor.textContent || '';
    if (key) setActivity((count) => count + 1);

    if (open?.sealed) {
      if (!key) return;
      const note = open;
      setOpened({ id: note.id, text: body });
      const turn = ++sealing.current;
      void seal(key, body).then((sealed) => {
        if (turn === sealing.current) onChange(note.id, titleOf(body), sealed);
      });
      return;
    }
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

  /** AC-82.1. Seals the open ordinary note, and keeps it open. */
  async function lockOpen(with_: CryptoKey, made?: Lock) {
    if (!open) return;
    const text = open.body;
    onLock(open.id, titleOf(text), await seal(with_, text), made);
    setKey(with_);
    setOpened({ id: open.id, text });
    setAsking(null);
  }

  function choose(noteId: string) {
    setOpenId(noteId);
    setAsking(null);
    setNotice('');
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
          pinned: false,
          sealed: null,
        },
        ...found,
      ]
    : found;

  return (
    <section className={`notes ${reading ? 'notes--reading' : ''}`}>
      <div className="page-head notes__head">
        <h1 className="page-title">Notes</h1>
        <div className="notes__head-tools">
          {/* AC-86.1. Only once there is a passcode to change. */}
          {lock && (
            <button
              className="notes__text-tool"
              type="button"
              onClick={() => {
                setAsking('change');
                setNotice('');
                setReading(true);
              }}
            >
              Change passcode
            </button>
          )}
          <button
            className="notes__tool"
            type="button"
            aria-label="New note"
            title="New note"
            onClick={() => {
              setOpenId(DRAFT);
              setAsking(null);
              setNotice('');
              setReading(true);
            }}
          >
            <Icon path={COMPOSE} size={20} />
          </button>
        </div>
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
                          {note.pinned && (
                            <Icon path={PIN} size={12} weight={2.2} />
                          )}
                          {note.sealed && (
                            <Icon path={LOCK} size={12} weight={2.2} />
                          )}
                          {titleOf(note.body)}
                        </span>
                        <span className="note-row__meta">
                          <time dateTime={note.updatedAt}>
                            {editedWhen(note.updatedAt, now)}
                          </time>
                          <span className="note-row__preview">
                            {note.sealed ? 'Locked' : previewOf(note.body)}
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
          {notice && (
            <p className="notes__notice" role="status">
              {notice}
            </p>
          )}
          {asking === 'change' ? (
            <Passcode
              change
              intro="Every locked note will be encrypted again under the new passcode. Backups taken before now still open with the old one."
              action="Change"
              onCancel={() => setAsking(null)}
              onSubmit={async (next, current) => {
                const result = await changePasscode(
                  lock!,
                  notes.flatMap((note) =>
                    note.sealed ? [{ id: note.id, sealed: note.sealed }] : [],
                  ),
                  current,
                  next,
                );
                if (!result.ok) return result.error;
                if (!onRekey(result.lock, result.notes)) {
                  return 'A note changed while the passcode was changing, so nothing was changed. Try again.';
                }
                setKey(result.key);
                setAsking(null);
                setNotice('Passcode changed.');
                return null;
              }}
            />
          ) : (
            openKey !== null && (
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
                  {/* AC-82.5. Only once the passcode has opened it. */}
                  {open?.sealed && readable && (
                    <button
                      className="notes__text-tool"
                      type="button"
                      onClick={() => onUnlock(open.id, opened!.text)}
                    >
                      Remove lock
                    </button>
                  )}
                  {open && readable && !asking && (
                    <button
                      className={`notes__tool ${open.sealed ? 'notes__tool--on' : ''}`}
                      type="button"
                      aria-label={open.sealed ? 'Lock now' : 'Lock note'}
                      title={open.sealed ? 'Lock now' : 'Lock note'}
                      onClick={() => {
                        if (open.sealed) relock();
                        else if (!lock) setAsking('setup');
                        else if (key) void lockOpen(key);
                        else setAsking('confirm');
                      }}
                    >
                      <Icon path={LOCK} size={20} />
                    </button>
                  )}
                  {/* AC-81.1. Only a stored note can be pinned. */}
                  {open && (
                    <button
                      className={`notes__tool ${open.pinned ? 'notes__tool--on' : ''}`}
                      type="button"
                      aria-label={open.pinned ? 'Unpin note' : 'Pin note'}
                      title={open.pinned ? 'Unpin note' : 'Pin note'}
                      onClick={() => onPin(open.id)}
                    >
                      <Icon path={PIN} size={20} />
                    </button>
                  )}
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

                {asking === 'setup' ? (
                  <Passcode
                    setup
                    intro="Locked notes are encrypted with this passcode, and only it opens them. It cannot be recovered: forget it and the locked notes are lost for good."
                    action="Lock with this passcode"
                    onCancel={() => setAsking(null)}
                    onSubmit={async (passcode) => {
                      const made = await createLock(passcode);
                      await lockOpen(made.key, made.lock);
                      return null;
                    }}
                  />
                ) : asking === 'confirm' ? (
                  <Passcode
                    intro="Enter your passcode to lock this note."
                    action="Continue"
                    onCancel={() => setAsking(null)}
                    onSubmit={async (passcode) => {
                      const opens = await unlock(lock!, passcode);
                      if (!opens) return 'That passcode is not right.';
                      await lockOpen(opens);
                      return null;
                    }}
                  />
                ) : readable ? (
                  /* AC-80.3. Plain text only, read back as text, so
                   ::first-line can make the title large without a second
                   field. */
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
                ) : key ? (
                  unopenable === open?.id && (
                    <p className="notes__empty">
                      This note does not open with your passcode. It was locked
                      under a different one, most likely in a backup merged in
                      from elsewhere.
                    </p>
                  )
                ) : (
                  <Passcode
                    intro="This note is locked."
                    action="Open"
                    onSubmit={async (passcode) => {
                      const opens = await unlock(lock!, passcode);
                      if (!opens) return 'That passcode is not right.';
                      setKey(opens);
                      return null;
                    }}
                  />
                )}
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * AC-82.1 and AC-82.3. Asks for the passcode: once to open or confirm, twice
 * to set a new one. `onSubmit` answers with what is wrong, or null.
 */
function Passcode({
  intro,
  action,
  setup = false,
  change = false,
  onSubmit,
  onCancel,
}: {
  intro: string;
  action: string;
  setup?: boolean;
  /** AC-86.1. The current passcode first, then a new one twice. */
  change?: boolean;
  onSubmit: (passcode: string, current: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const twice = setup || change;

  useEffect(() => (currentRef.current ?? firstRef.current)?.focus(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (twice && first.length < 6) {
      setError('A passcode needs at least 6 characters.');
      return;
    }
    if (twice && first !== second) {
      setError('The two passcodes do not match.');
      return;
    }
    // Making the key takes a moment, on purpose; see domain/lock.ts.
    setBusy(true);
    const problem = await onSubmit(first, current);
    setBusy(false);
    setError(problem ?? '');
  }

  return (
    <form className="notes__lock" onSubmit={(event) => void submit(event)}>
      <Icon path={LOCK} size={28} />
      <p className="notes__lock-intro">{intro}</p>
      {change && (
        <>
          <label className="form__label" htmlFor={`${id}-current`}>
            Current passcode
          </label>
          <input
            className="form__input"
            id={`${id}-current`}
            ref={currentRef}
            type="password"
            autoComplete="off"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </>
      )}
      <label className="form__label" htmlFor={`${id}-first`}>
        {twice ? 'New passcode' : 'Passcode'}
      </label>
      <input
        className="form__input"
        id={`${id}-first`}
        ref={firstRef}
        type="password"
        // AC-83.2. Never offered to the browser's password manager.
        autoComplete="off"
        value={first}
        onChange={(event) => setFirst(event.target.value)}
      />
      {twice && (
        <>
          <label className="form__label" htmlFor={`${id}-second`}>
            Confirm passcode
          </label>
          <input
            className="form__input"
            id={`${id}-second`}
            type="password"
            autoComplete="off"
            value={second}
            onChange={(event) => setSecond(event.target.value)}
          />
        </>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      <div className="notes__lock-actions">
        <button className="prompt__button" type="submit" disabled={busy}>
          {action}
        </button>
        {onCancel && (
          <button
            className="prompt__button prompt__button--quiet"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
