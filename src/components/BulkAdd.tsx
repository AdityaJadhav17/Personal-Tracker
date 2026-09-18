import { useState } from 'react';
import { parseLines } from '../domain/bulk';
import { formatDue } from '../domain/dates';
import type { ItemDraft } from '../domain/types';

interface BulkAddProps {
  onAdd: (drafts: ItemDraft[]) => void;
  onClose: () => void;
}

/**
 * Fill a term in one paste.
 *
 * The preview is derived from what is in the box rather than produced by a
 * Preview button, so there is one less control and AC-26.1 holds by
 * construction: you cannot reach the Add button without the preview having
 * already rendered what every line was understood as.
 *
 * Nothing is written until the Add button, which is the same parse, show,
 * confirm shape the JSON import uses, and the reason a strict format is
 * bearable here when US-19 rejected typed dates on the daily path.
 */
export default function BulkAdd({ onAdd, onClose }: BulkAddProps) {
  const [text, setText] = useState('');
  const { drafts, unreadable } = parseLines(text);

  return (
    <section className="bulk">
      <div className="form__field form__field--title">
        <label className="form__label" htmlFor="bulk-text">
          Paste a list
        </label>
        <textarea
          className="form__input bulk__box"
          id="bulk-text"
          rows={6}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {/* A strict format has to say what it is, or it is just a rejection. */}
        <p className="bulk__format">
          One per line: a date, an optional time, then the title.
          <br />
          <code>2026-10-03 Read chapter 4</code>
          <br />
          <code>2026-10-03 17:00 Rent</code>
        </p>
      </div>

      {drafts.length > 0 && (
        <>
          <h3 className="bulk__heading">Understood</h3>
          <ul className="bulk__list">
            {drafts.map((draft, index) => (
              // A draft has no id yet, and the list is rebuilt from the text on
              // every keystroke, so position is the only key available.
              // The title is a direct text node rather than a span, so it
              // matches one element and not two nested ones.
              <li className="bulk__row" key={index}>
                {draft.title}{' '}
                <span className="item__due">{formatDue(draft.dueAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {unreadable.length > 0 && (
        <>
          <h3 className="bulk__heading">Not understood</h3>
          <ul className="bulk__list">
            {unreadable.map((line, index) => (
              <li className="bulk__row bulk__row--skipped" key={index}>
                {line}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* AC-26.6. Said once, when there is text and none of it worked. */}
      {drafts.length === 0 && unreadable.length > 0 && (
        <p className="alert" role="alert">
          Nothing here could be read as a deadline. Each line needs a date
          first, like 2026-10-03.
        </p>
      )}

      <div className="prompt__actions">
        {drafts.length > 0 && (
          <button
            className="prompt__button"
            type="button"
            onClick={() => {
              onAdd(drafts);
              setText('');
              onClose();
            }}
          >
            Add {drafts.length} {drafts.length === 1 ? 'item' : 'items'}
          </button>
        )}
        <button
          className="prompt__button prompt__button--quiet"
          type="button"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
