import { render, screen, within } from '@testing-library/react';
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

  // AC-42.2 put the skip link first, so the sidebar starts one Tab later.
  await user.tab();
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

  await user.tab(); // the skip link, AC-42.2
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

test('AC-42.2 the first thing Tab reaches is a link that skips the sidebar', async () => {
  const user = userEvent.setup();
  render(
    <Shell view="home" onNavigate={noop}>
      <p>content</p>
    </Shell>,
  );

  await user.tab();

  const skip = screen.getByRole('link', { name: 'Skip to content' });
  expect(skip).toHaveFocus();
  expect(skip).toHaveAttribute('href', '#main');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
});

describe('US-66 the phone tab bar', () => {
  test('AC-66.2 More opens a sheet of the other views, and choosing one goes there and closes it', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn<(view: string) => void>();
    render(
      <Shell view="home" onNavigate={onNavigate}>
        <p>content</p>
      </Shell>,
    );

    await user.click(screen.getByRole('button', { name: 'More' }));
    const sheet = screen.getByRole('dialog', { name: 'More views' });
    for (const name of ['Courses', 'Reflections', 'Trends', 'Data']) {
      expect(within(sheet).getByRole('button', { name })).toBeVisible();
    }

    await user.click(within(sheet).getByRole('button', { name: 'Trends' }));

    expect(onNavigate).toHaveBeenCalledWith('trends');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('AC-66.2 More is current on the views it holds, and carries the backup dot', () => {
    render(
      <Shell view="trends" onNavigate={noop} backupDue>
        <p>content</p>
      </Shell>,
    );

    const more = screen.getByRole('button', { name: 'More' });
    expect(more).toHaveAttribute('aria-current', 'page');
    expect(more).toHaveAttribute('aria-description', 'Backup due');
  });

  test('AC-66.2 More is not current on a view the bar shows itself', () => {
    render(
      <Shell view="goals" onNavigate={noop}>
        <p>content</p>
      </Shell>,
    );

    expect(screen.getByRole('button', { name: 'More' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  test('AC-66.3 + opens the add form, and adding closes it', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(() => true);
    render(
      <Shell view="calendar" onNavigate={noop} onAdd={onAdd}>
        <p>content</p>
      </Shell>,
    );

    await user.click(screen.getByRole('button', { name: 'Add a deadline' }));
    const sheet = screen.getByRole('dialog', { name: 'Add a deadline' });
    await user.type(within(sheet).getByLabelText('Title'), 'CSE 120 HW 1');
    await user.click(within(sheet).getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'CSE 120 HW 1' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('AC-66.3 with nowhere to add to, there is no + at all', () => {
    render(
      <Shell view="home" onNavigate={noop}>
        <p>content</p>
      </Shell>,
    );

    expect(
      screen.queryByRole('button', { name: 'Add a deadline' }),
    ).not.toBeInTheDocument();
  });
});
