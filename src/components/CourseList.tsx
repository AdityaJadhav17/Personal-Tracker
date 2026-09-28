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
  /** AC-77.2. The same course, with new details; its items stay linked. */
  onEdit: (id: string, draft: CourseDraft) => void;
  onDelete: (id: string) => void;
}

export default function CourseList({
  courses,
  onAdd,
  onEdit,
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
  // AC-77.1. The course whose card is the form right now, if any. One form
  // at a time, so adding and editing never share the same fields.
  const [editing, setEditing] = useState<string | null>(null);
  const showForm = editing === null && (adding || courses.length === 0);

  function set(field: keyof CourseDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function startEdit(course: Course) {
    setDraft({
      name: course.name,
      meetingLocation: course.meetingLocation,
      professorEmail: course.professorEmail,
      officeHours: course.officeHours,
    });
    setNameError('');
    setMore(null);
    setAdding(false);
    setEditing(course.id);
  }

  function close() {
    setDraft(EMPTY);
    setNameError('');
    setAdding(false);
    setEditing(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const name = draft.name.trim();
    // AC-77.3. Editing keeps the one rule adding has.
    setNameError(name ? '' : NAME_REQUIRED);
    if (!name) return;

    // Only the name is required. The rest is what you happen to know today.
    if (editing) onEdit(editing, { ...draft, name });
    else onAdd({ ...draft, name });
    close();
  }

  // The course form, for adding at the top of the page or editing inside a
  // card. Only one is ever on screen, so the field ids never repeat.
  const form = (submit: string, canCancel: boolean) => (
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
        {submit}
      </button>
      {canCancel && (
        <button
          className="prompt__button prompt__button--quiet"
          type="button"
          onClick={close}
        >
          Cancel
        </button>
      )}
    </form>
  );

  const pending = courses.find((course) => course.id === confirming);

  return (
    <section className="courses">
      {/* AC-69.1. The title and its one action on a row, as the calendar
          has them: the action at the far end, quiet, since this page is
          read far more than it is added to. */}
      <div className="page-head">
        <h1 className="page-title">Courses</h1>
        {!showForm && (
          <button
            className="page-head__action"
            type="button"
            onClick={() => {
              close();
              setAdding(true);
            }}
          >
            New course
          </button>
        )}
      </div>

      {showForm && form('Add course', courses.length > 0)}

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
              {editing === course.id ? (
                // AC-77.1. The card becomes its form, so it is plain which
                // course is changing.
                form('Save course', true)
              ) : (
                <>
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
                    <div className="card__actions">
                      {/* AC-77.1. Edit first: the everyday one. */}
                      <button
                        className="data__button"
                        type="button"
                        aria-label={`Edit ${course.name}`}
                        onClick={() => startEdit(course)}
                      >
                        Edit
                      </button>
                      <button
                        className="data__button"
                        type="button"
                        aria-label={`Delete ${course.name}`}
                        onClick={() => setConfirming(course.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
