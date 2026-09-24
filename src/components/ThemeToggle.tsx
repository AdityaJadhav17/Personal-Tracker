import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Where the choice is kept. A display setting for this browser, not app data,
 * so it lives beside the database rather than in it and is never exported.
 * public/theme.js reads the same key before the page paints.
 */
const KEY = 'personal-tracker/theme';

const SUN =
  'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4';
const MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z';

/** The scheme on screen: a saved choice if there is one, else the system's. */
function shownTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * US-51. One button that switches between light and dark.
 *
 * The page's colours come from light-dark() tokens, so switching is one
 * attribute on <html>: data-theme sets color-scheme, and every token follows.
 * Until the button is pressed nothing is forced and the system decides.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(shownTheme);

  // With no choice saved, the system can change scheme while the app is
  // open; the label has to follow it or it offers the mode already showing.
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const follow = () => setTheme(shownTheme());
    query.addEventListener('change', follow);
    return () => query.removeEventListener('change', follow);
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage refused (site data blocked): the switch still applies until
      // the window closes, it just is not remembered.
    }
    const apply = () => {
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    // apple-design: ease a change between light and dark rather than jump.
    // A view transition crossfades the whole page in Chrome with no library;
    // it is an opacity change, which reduced motion keeps. Elsewhere it jumps.
    if (document.startViewTransition) document.startViewTransition(apply);
    else apply();
  }

  return (
    <button
      className="sidebar__item sidebar__theme"
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={toggle}
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
        <path d={next === 'dark' ? MOON : SUN} />
      </svg>
      <span className="sidebar__label">
        {next === 'dark' ? 'Dark mode' : 'Light mode'}
      </span>
    </button>
  );
}
