import { useState } from 'react';
import type { Course, CourseDraft } from '../domain/types';
import MoreButton from './MoreButton';

const NAME_REQUIRED = 'Give the course a name.';

const EMPTY: CourseDraft = {
  name: '',
  meetingLocation: '',
  professorEmail: '',
  officeHours: '',
};

interface CourseListProps {
  courses: Course[];
  onAdd: (draft: CourseDraft) => void;
  onDelete: (id: string) => void;
}

export default function CourseList({
  courses,
  onAdd,
  onDelete,
}: CourseListProps) {
  const [draft, setDraft] = useState<CourseDraft>(EMPTY);
  const [nameError, setNameError] = useState('');
  // Which course is waiting on a yes. AC-20.3: nothing goes until it does.
  const [confirming, setConfirming] = useState<string | null>(null);
  // US-60. Which card has its More open, showing Delete. One at a time.
  const [more, setMore] = useState<string | null>(null);
  // US-60. The list comes first; the form waits behind a button, except when
  // there is nothing to list yet.
  const [adding, setAdding] = useState(false);
  const showForm = adding || courses.length === 0;

  function set(field: keyof CourseDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const name = draft.name.trim();
    setNameError(name ? '' : NAME_REQUIRED);
    if (!name) return;

    // Only the name is required. The rest is what you happen to know today.
    onAdd({ ...draft, name });
    setDraft(EMPTY);
    setAdding(false);
  }

  const pending = courses.find((course) => course.id === confirming);

  return (
    <section className="courses">
      {!showForm && (
        <button
          className="prompt__button list__new"
          type="button"
          onClick={() => setAdding(true)}
        >
          New course
        </button>
      )}

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <div className="form__field form__field--title">
            <label className="form__label" htmlFor="course-name">
              Course name
            </label>
            <input
              className="form__input"
              id="course-name"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              aria-describedby={nameError ? 'course-name-error' : undefined}
            />
            {nameError && (
              <p className="form__error" id="course-name-error">
                {nameError}
              </p>
            )}
          </div>

          <div className="form__field form__field--title">
            <label className="form__label" htmlFor="course-location">
              Location
            </label>
            <input
              className="form__input"
              id="course-location"
              value={draft.meetingLocation}
              onChange={(e) => set('meetingLocation', e.target.value)}
            />
          </div>

          <div className="form__field form__field--title">
            <label className="form__label" htmlFor="course-email">
              Professor email
            </label>
            <input
              className="form__input"
              id="course-email"
              type="email"
              value={draft.professorEmail}
              onChange={(e) => set('professorEmail', e.target.value)}
            />
          </div>

          <div className="form__field form__field--title">
            <label className="form__label" htmlFor="course-hours">
              Office hours
            </label>
            <input
              className="form__input"
              id="course-hours"
              value={draft.officeHours}
              onChange={(e) => set('officeHours', e.target.value)}
            />
          </div>

          <button className="form__submit" type="submit">
            Add course
          </button>
          {courses.length > 0 && (
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

      {courses.length === 0 ? (
        <section className="empty">
          <p>No courses yet.</p>
          <p>
            Keep the details you would otherwise dig out of email every week:
            where it meets, your professor&rsquo;s address, when office hours
            are.
          </p>
        </section>
      ) : (
        <ul className="course-list">
          {courses.map((course) => (
            <li className="course" key={course.id}>
              <div className="card__head">
                <h3 className="course__name">
                  {/* AC-60.3. The colour it has on Home and the calendar. */}
                  <span
                    className={`item__dot item__dot--${(courses.indexOf(course) % 4) + 1}`}
                    aria-hidden="true"
                  />
                  {course.name}
                </h3>
                <MoreButton
                  name={course.name}
                  open={more === course.id}
                  onToggle={() =>
                    setMore(more === course.id ? null : course.id)
                  }
                />
              </div>
              <dl className="course__details">
                <dt>Location</dt>
                <dd>{course.meetingLocation || '—'}</dd>
                <dt>Professor</dt>
                <dd>{course.professorEmail || '—'}</dd>
                <dt>Office hours</dt>
                <dd>{course.officeHours || '—'}</dd>
              </dl>
              {more === course.id && (
                <button
                  className="data__button"
                  type="button"
                  aria-label={`Delete ${course.name}`}
                  onClick={() => setConfirming(course.id)}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
