import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { now, toDateValue } from '../domain/dates';
import type { ItemDraft } from '../domain/types';
import AddItemForm from './AddItemForm';
import ThemeToggle from './ThemeToggle';

export type View =
  'home' | 'calendar' | 'goals' | 'courses' | 'reflections' | 'trends' | 'data';

/**
 * Every destination the sidebar offers.
 *
 * Only views that exist are listed. A nav item leading to "not built yet" is
 * chrome pointing nowhere, which is the reason the sidebar waited until there
 * was a second real view.
 *
 * Icons are single paths on a 24x24 grid, drawn inline so nothing is fetched.
 */
export const VIEWS: { id: View; label: string; icon: string }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9h16M8 3v3M16 3v3',
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: 'M12 2v20M2 12h20M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: 'M4 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 6v14a2 2 0 0 0-2-2',
  },
  {
    id: 'reflections',
    label: 'Reflections',
    icon: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01',
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: 'M3 17l5-6 4 3 5-7M21 7h-4M21 7v4',
  },
  // US-58. Export, import and the calendar tools, which belong to no one view.
  {
    id: 'data',
    label: 'Data',
    icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  },
];

/**
 * AC-66.1. The views a phone's tab bar has no room for. They stay in the
 * sidebar on a wide screen and move behind More on a phone.
 */
const TUCKED: View[] = ['courses', 'reflections', 'trends', 'data'];

const MORE = 'M5 12h.01M12 12h.01M19 12h.01';
const PLUS = 'M12 5v14M5 12h14';

interface ShellProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
  /**
   * AC-58.2. A backup is due. The reminder lives on the Data view, so the
   * sidebar marks Data wherever you are.
   */
  backupDue?: boolean;
  /** AC-66.3. Adds from the phone's + button. Without it there is no +. */
  onAdd?: (draft: ItemDraft) => boolean;
}

export default function Shell({
  view,
  onNavigate,
  children,
  backupDue = false,
  onAdd,
}: ShellProps) {
  // AC-66.2 and AC-66.3. Which of the phone's two sheets is open, if any.
  const [sheet, setSheet] = useState<'more' | 'add' | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tucked = TUCKED.includes(view);

  return (
    <div className="shell">
      {/* AC-42.2. Six sidebar buttons stand between a keyboard and the work
          on every view; this is the way past them. Hidden until focused. */}
      <a className="skip" href="#main">
        Skip to content
      </a>

      <div className="sidebar">
        <h1 className="sidebar__title">Personal Tracker</h1>

        <nav className="sidebar__nav" aria-label="Views">
          {VIEWS.map(({ id, label, icon }) => (
            <button
              className={`sidebar__item ${
                view === id ? 'sidebar__item--current' : ''
              } ${TUCKED.includes(id) ? 'sidebar__item--tucked' : ''}`}
              key={id}
              type="button"
              aria-current={view === id ? 'page' : undefined}
              // The name stays "Data"; the reminder is its description.
              aria-description={
                id === 'data' && backupDue ? 'Backup due' : undefined
              }
              onClick={() => onNavigate(id)}
            >
              <Icon path={icon} />
              {/*
                Wrapped so a narrow screen can style the words apart from the
                icon. A bare text node cannot be targeted by CSS.
              */}
              <span className="sidebar__label">{label}</span>
              {id === 'data' && backupDue && (
                <span className="sidebar__dot" aria-hidden="true" />
              )}
            </button>
          ))}
          {/* AC-66.2. A phone's fourth tab; a wide screen hides it. Current
              while you are on any view it holds, and it carries Data's dot. */}
          <button
            className={`sidebar__item sidebar__more ${
              tucked ? 'sidebar__item--current' : ''
            }`}
            type="button"
            aria-current={tucked ? 'page' : undefined}
            aria-description={backupDue ? 'Backup due' : undefined}
            onClick={() => setSheet('more')}
          >
            <Icon path={MORE} weight={3} />
            <span className="sidebar__label">More</span>
            {backupDue && <span className="sidebar__dot" aria-hidden="true" />}
          </button>
        </nav>

        {/* US-51. Outside the nav: it changes how things look, not where you are. */}
        <ThemeToggle />

        {/* AC-66.3. Adding, one tap from any view on a phone. */}
        {onAdd && (
          <button
            className="sidebar__add"
            type="button"
            aria-label="Add a deadline"
            onClick={() => setSheet('add')}
          >
            <Icon path={PLUS} size={26} weight={2.2} />
          </button>
        )}
      </div>

      {/* tabIndex lets the skip link move focus here, not only scroll. */}
      <main className="shell__main" id="main" tabIndex={-1}>
        {children}
      </main>

      {sheet === 'more' && (
        <Sheet label="More views" onClosed={() => setSheet(null)}>
          {(close) => (
            <>
              <ul className="sheet__links">
                {VIEWS.filter(({ id }) => TUCKED.includes(id)).map(
                  ({ id, label, icon }) => (
                    <li key={id}>
                      <button
                        className="sheet__link"
                        type="button"
                        aria-current={view === id ? 'page' : undefined}
                        aria-description={
                          id === 'data' && backupDue ? 'Backup due' : undefined
                        }
                        onClick={() => {
                          onNavigate(id);
                          close();
                        }}
                      >
                        <Icon path={icon} size={22} />
                        {label}
                        {id === 'data' && backupDue && (
                          <span className="sidebar__dot" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  ),
                )}
              </ul>
              {/* A phone has no sidebar corner for it, so it lives here. */}
              <ThemeToggle />
            </>
          )}
        </Sheet>
      )}

      {sheet === 'add' && onAdd && (
        <Sheet label="Add a deadline" onClosed={() => setSheet(null)}>
          {(close) => (
            <AddItemForm
              onAdd={(draft) => {
                const added = onAdd(draft);
                if (added) close();
                return added;
              }}
              titleRef={titleRef}
              from={toDateValue(now())}
            />
          )}
        </Sheet>
      )}
    </div>
  );
}

/** A 24px-grid icon, drawn inline so nothing is fetched. Decorative. */
function Icon({
  path,
  size = 16,
  weight = 1.8,
}: {
  path: string;
  size?: number;
  weight?: number;
}) {
  return (
    <svg
      className="sidebar__icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * AC-66.4. A sheet that rises from the foot of the screen. A native popover,
 * like the calendar's day: Escape and a tap outside close it for free. Focus
 * moves into it on open and back to what opened it after.
 *
 * However it closes, it leaves the page only once its exit has run, so it
 * goes back down the way it came instead of vanishing.
 */
function Sheet({
  label,
  onClosed,
  children,
}: {
  label: string;
  onClosed: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const opener = document.activeElement;
    el.setAttribute('popover', 'auto');
    el.showPopover();
    el.querySelector<HTMLElement>('input, button')?.focus();

    const toggled = (event: Event) => {
      if ((event as ToggleEvent).newState !== 'closed') return;
      const running = el.getAnimations?.() ?? [];
      void Promise.allSettled(running.map((a) => a.finished)).then(onClosed);
    };
    el.addEventListener('toggle', toggled);
    return () => {
      el.removeEventListener('toggle', toggled);
      const lost = document.activeElement;
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        (lost === document.body || lost === null || el.contains(lost))
      ) {
        opener.focus();
      }
    };
    // Opened once per mount; the parent unmounts it to close it for good.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="sheet" ref={ref} role="dialog" aria-label={label}>
      {children(() => ref.current?.hidePopover())}
    </section>
  );
}
