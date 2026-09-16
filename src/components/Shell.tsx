import type { ReactNode } from 'react';

export type View = 'home' | 'courses';

/**
 * Every destination the sidebar offers.
 *
 * Only views that exist are listed. A nav item leading to "not built yet" is
 * chrome pointing nowhere, which is the reason the sidebar waited until there
 * was a second real view. Goals and Reflections join this list when M5 and M6
 * land, one entry each.
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
    id: 'courses',
    label: 'Courses',
    icon: 'M4 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 6v14a2 2 0 0 0-2-2',
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
