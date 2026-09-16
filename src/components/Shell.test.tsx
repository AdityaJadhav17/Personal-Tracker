import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Shell, { VIEWS } from './Shell';

const noop = () => {};

test('AC-13.1 the sidebar lists every view that exists', () => {
  render(
    <Shell view="home" onNavigate={noop}>
      <p>content</p>
    </Shell>,
  );

  const nav = screen.getByRole('navigation', { name: 'Views' });
  for (const { label } of VIEWS) {
    expect(screen.getByRole('button', { name: label })).toBeVisible();
  }
  expect(nav).toBeVisible();
});

test('AC-13.1 the current view is marked as current, and only it', () => {
  render(
    <Shell view="courses" onNavigate={noop}>
      <p>content</p>
    </Shell>,
  );

  expect(screen.getByRole('button', { name: 'Courses' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('button', { name: 'Home' })).not.toHaveAttribute(
    'aria-current',
  );
});

test('AC-13.2 activating a view reports it', async () => {
  const user = userEvent.setup();
  const onNavigate = vi.fn<(view: string) => void>();

  render(
    <Shell view="home" onNavigate={onNavigate}>
      <p>content</p>
    </Shell>,
  );

  await user.click(screen.getByRole('button', { name: 'Courses' }));

  expect(onNavigate).toHaveBeenCalledWith('courses');
});

test('AC-13.2 activating the view you are already on reports it anyway', async () => {
  const user = userEvent.setup();
  const onNavigate = vi.fn<(view: string) => void>();

  render(
    <Shell view="home" onNavigate={onNavigate}>
      <p>content</p>
    </Shell>,
  );

  await user.click(screen.getByRole('button', { name: 'Home' }));

  // Harmless, and cheaper than special-casing it.
  expect(onNavigate).toHaveBeenCalledWith('home');
});

test('AC-13.3 Tab reaches every sidebar item, in the order displayed', async () => {
  const user = userEvent.setup();

  render(
    <Shell view="home" onNavigate={noop}>
      <p>content</p>
    </Shell>,
  );

  for (const { label } of VIEWS) {
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(label);
  }
});

test('AC-13.3 the sidebar comes before the content in the tab order', async () => {
  const user = userEvent.setup();

  render(
    <Shell view="home" onNavigate={noop}>
      <button type="button">Something in the content</button>
    </Shell>,
  );

  await user.tab();
  expect(document.activeElement).toHaveAccessibleName(VIEWS[0]!.label);
});

test('the app name is shown once, in the sidebar', () => {
  render(
    <Shell view="home" onNavigate={noop}>
      <p>content</p>
    </Shell>,
  );

  expect(
    screen.getByRole('heading', { name: 'Personal Tracker', level: 1 }),
  ).toBeVisible();
});

test('the content is rendered beside the sidebar', () => {
  render(
    <Shell view="home" onNavigate={noop}>
      <p>content goes here</p>
    </Shell>,
  );

  expect(screen.getByText('content goes here')).toBeVisible();
  expect(screen.getByRole('main')).toContainElement(
    screen.getByText('content goes here'),
  );
});

test('the icons are decorative and stay out of the accessible name', () => {
  render(
    <Shell view="home" onNavigate={noop}>
      <p>content</p>
    </Shell>,
  );

  // "Home" and nothing else: an icon that announced itself would read twice.
  expect(screen.getByRole('button', { name: 'Home' })).toHaveAccessibleName(
    'Home',
  );
});
