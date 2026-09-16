import type { ReactNode } from 'react';

export type View = 'home' | 'goals' | 'courses' | 'reflections' | 'trends';

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
];

interface ShellProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

export default function Shell({ view, onNavigate, children }: ShellProps) {
  return (
    <div className="shell">
      <div className="sidebar">
        <h1 className="sidebar__title">Personal Tracker</h1>

        <nav className="sidebar__nav" aria-label="Views">
          {VIEWS.map(({ id, label, icon }) => (
            <button
              className={`sidebar__item ${
                view === id ? 'sidebar__item--current' : ''
              }`}
              key={id}
              type="button"
              aria-current={view === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              <svg
                className="sidebar__icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={icon} />
              </svg>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <main className="shell__main">{children}</main>
    </div>
  );
}
