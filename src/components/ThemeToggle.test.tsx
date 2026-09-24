import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './ThemeToggle';
import { media } from '../test-setup';

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  media.systemDark = false;
});

test('AC-51.1 on a light page the button offers dark mode, and pressing it switches', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);

  await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(
    screen.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeVisible();
});

test('AC-51.1 it switches back', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);

  await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
  await user.click(
    screen.getByRole('button', { name: 'Switch to light mode' }),
  );

  expect(document.documentElement.dataset.theme).toBe('light');
});

test('AC-51.2 the choice is remembered for next time', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);

  await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

  expect(localStorage.getItem('personal-tracker/theme')).toBe('dark');
});

test('AC-51.3 with no choice made it follows the system, and forces nothing', () => {
  media.systemDark = true;
  render(<ThemeToggle />);

  expect(
    screen.getByRole('button', { name: 'Switch to light mode' }),
  ).toBeVisible();
  expect(document.documentElement.dataset.theme).toBeUndefined();
});

test('AC-51.2 a saved choice wins over the system', () => {
  media.systemDark = true;
  // What public/theme.js does before the page paints.
  document.documentElement.dataset.theme = 'light';
  render(<ThemeToggle />);

  expect(
    screen.getByRole('button', { name: 'Switch to dark mode' }),
  ).toBeVisible();
});
