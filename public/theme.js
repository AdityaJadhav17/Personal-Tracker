/*
 * US-51. Apply a saved light or dark choice before the page paints.
 *
 * A classic script in <head>, not a module, because modules run after first
 * paint and a dark choice would flash white on every open. Served from this
 * origin, so the Content-Security-Policy's script-src 'self' allows it.
 * ThemeToggle writes the same key.
 */
try {
  var theme = localStorage.getItem('personal-tracker/theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  }
} catch {
  // Storage blocked: follow the system, as with no choice made.
}
