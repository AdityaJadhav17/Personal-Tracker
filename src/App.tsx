import { useEffect, useRef, useState } from 'react';
import AddItemForm from './components/AddItemForm';
import Dashboard from './components/Dashboard';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import { now } from './domain/dates';
import { exportFilename, serialize } from './domain/transfer';
import type { Database, Item, ItemDraft } from './domain/types';
import { load, save } from './storage/db';

/** Undo is a plain letter, so it must not fire while you are typing. */
function isTyping(element: Element | null): boolean {
  if (!element) return false;
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
}

export default function App() {
  // null means storage itself could not be read, which is AC-11.2. A corrupt
  // or absent key is not this case: load() returns an empty database for that.
  const [db, setDb] = useState<Database | null>(() => {
    try {
      return load();
    } catch {
      return null;
    }
  });
  const [undoable, setUndoable] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function commit(next: Database) {
    setDb(next);
    save(next);
  }

  // AC-05.2. The handler lives inside the effect so it always closes over the
  // current database rather than a stale one.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'u') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(document.activeElement)) return;
      if (!db || !undoable) return;

      commit({
        version: 1,
        items: db.items.map((item) =>
          item.id === undoable
            ? { ...item, status: 'open', completedAt: null }
            : item,
        ),
      });
      setUndoable(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [db, undoable]);

  if (db === null) {
    return (
      <main>
        <h1>Personal Tracker</h1>
        <ErrorState />
      </main>
    );
  }

  function handleAdd(draft: ItemDraft) {
    const item: Item = {
      id: crypto.randomUUID(),
      title: draft.title,
      dueAt: draft.dueAt,
      category: draft.category,
      priority: draft.priority,
      status: 'open',
      note: '',
      createdAt: now().toISOString(),
      completedAt: null,
    };

    commit({ version: 1, items: [...(db?.items ?? []), item] });
  }

  function handleDone(id: string) {
    commit({
      version: 1,
      items: (db?.items ?? []).map((item) =>
        item.id === id
          ? { ...item, status: 'done', completedAt: now().toISOString() }
          : item,
      ),
    });
    setUndoable(id);
  }

  function handleNoteChange(id: string, note: string) {
    commit({
      version: 1,
      items: (db?.items ?? []).map((item) =>
        item.id === id ? { ...item, note } : item,
      ),
    });
  }

  function handleExport() {
    const blob = new Blob([serialize(db ?? { version: 1, items: [] })], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    // The anchor is appended before clicking because some browsers ignore a
    // click on an element that is not in the document.
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename(now());
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const current = now();
  const undoableTitle = db.items.find((item) => item.id === undoable)?.title;

  // Based on open items rather than on the array being empty, so finishing
  // everything shows the empty state instead of a blank page.
  const hasOpen = db.items.some((item) => item.status === 'open');

  return (
    <main>
      <h1>Personal Tracker</h1>

      <AddItemForm onAdd={handleAdd} now={current} titleRef={titleRef} />

      <p role="status">
        {undoableTitle ? `Marked ${undoableTitle} done. Press u to undo.` : ''}
      </p>

      {hasOpen ? (
        <Dashboard
          items={db.items}
          now={current}
          onDone={handleDone}
          onNoteChange={handleNoteChange}
        />
      ) : (
        <EmptyState onAddFirst={() => titleRef.current?.focus()} />
      )}

      {/*
        Export sits after the list so it stays out of the add-then-finish
        keyboard path, which is the one used every day.
      */}
      <button type="button" onClick={handleExport}>
        Export
      </button>
    </main>
  );
}
