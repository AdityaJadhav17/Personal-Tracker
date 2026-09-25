import { useState } from 'react';
import { shortDay } from '../domain/dates';
import { byNewest } from '../domain/reflections';
import type { Reflection } from '../domain/types';

/** The five faces from the reference, as words rather than emoji. */
export const SCORES: { score: Reflection['score']; label: string }[] = [
  { score: 1, label: 'Terrible' },
  { score: 2, label: 'Sad' },
  { score: 3, label: 'Meh' },
  { score: 4, label: 'Good' },
  { score: 5, label: 'Awesome' },
];

const LABEL_OF = new Map(SCORES.map(({ score, label }) => [score, label]));

interface ReflectionViewProps {
  /** Today's local calendar day, "2026-09-15". */
  today: string;
  reflections: Reflection[];
  onRecord: (score: Reflection['score'], note: string) => void;
}

export default function ReflectionView({
  today,
  reflections,
  onRecord,
}: ReflectionViewProps) {
  const recorded = reflections.find((entry) => entry.day === today);
  const [note, setNote] = useState(recorded?.note ?? '');

  const past = byNewest(reflections.filter((entry) => entry.day !== today));

  return (
    <section className="reflections">
      <h2 className="reflections__question">How did today go?</h2>

      {/* AC-61.2. One segmented control: five joined buttons, each still a
          toggle that says whether it is the day's answer. */}
      <div className="scores" role="group" aria-label="How did today go?">
        {SCORES.map(({ score, label }) => (
          <button
            className={`score ${recorded?.score === score ? 'score--chosen' : ''}`}
            key={score}
            type="button"
            aria-pressed={recorded?.score === score}
            /* The note it already has rides along, so changing your mind about
               the day does not wipe what you wrote about it. */
            onClick={() => onRecord(score, recorded?.note ?? note)}
          >
            {label}
          </button>
        ))}
      </div>

      {recorded && (
        <div className="form__field form__field--title">
          <label className="form__label" htmlFor="today-note">
            Note for today
          </label>
          <textarea
            className="form__input"
            id="today-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => onRecord(recorded.score, note)}
          />
        </div>
      )}

      <h3 className="reflections__heading">Past days</h3>

      {past.length === 0 ? (
        <p className="reflections__empty">Nothing recorded yet.</p>
      ) : (
        <ul className="reflection-list">
          {past.map((entry) => (
            <li className="reflection" key={entry.id}>
              {/* AC-61.1. A date, not the stored form of one. */}
              <span className="reflection__day">{shortDay(entry.day)}</span>
              <span className="reflection__score">
                {LABEL_OF.get(entry.score)}
              </span>
              {entry.note && (
                <span className="reflection__note">{entry.note}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
