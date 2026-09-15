# Personal Tracker

A local-first deadline and notes tracker Aditya runs on his own laptop. School
and life in one list. No accounts, no server, no data leaving the machine.

Read [docs/mvp.md](docs/mvp.md) for scope, [docs/plan.md](docs/plan.md) for the
data model and architecture, [docs/decisions.md](docs/decisions.md) for why
things are the way they are, and
[docs/definition-of-done.md](docs/definition-of-done.md) for the bar.

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run lint         # eslint, fails on any warning
npm run format       # prettier --write
npm run format:check # prettier --check, what CI runs
npm test             # vitest run with coverage
npm run test:watch   # vitest in watch mode
npm run e2e          # playwright, starts the dev server itself
npm run build        # typecheck then vite build
```

## Stack

React 18 and TypeScript on Vite. Vitest with React Testing Library for unit and
component tests, Playwright for end to end. ESLint and Prettier. GitHub Actions
on Node 20.

Storage is `localStorage`, reached through two functions in `src/storage/db.ts`.
There is no `StorageAdapter` interface and no IndexedDB. See the decision log
for why.

## How we work

These are Aditya's rules, not suggestions.

- No application code before he approves a plan.
- State assumptions before any non-trivial change. Where two readings exist,
  show both and let him pick.
- Smallest thing that works. No speculative abstractions, no config options he
  did not ask for, no error handling for impossible cases.
- Delete any abstraction with exactly one caller.
- Every changed line traces to a story ID. Never refactor or reformat code the
  current task does not require touching.
- Ask before adding any dependency. Name what it does and what it replaces.
- One story per branch, one concern per commit, story ID in the message.
- Stop and show the plan before any change over roughly 200 lines.
- Say so when two of his requests contradict each other, rather than guessing.
- He runs the git commands and presses the buttons on GitHub.

## Testing

Test-first. Write the test, watch it fail with a specific message, then write
the minimum code that passes. A test that passes the first time you run it has
not tested anything yet.

Every acceptance criterion gets a test whose name contains its ID, so
`npm test -- AC-04.2` finds exactly one test.

Layering:

- Pure logic in `src/domain/` gets fast unit tests with no DOM and no storage.
- `src/storage/db.ts` gets tested against real `localStorage` in jsdom.
- Components get React Testing Library tests driven through visible text and
  ARIA roles. Never query a CSS class, a test ID, or component internals.
- Each story gets one thin Playwright spec covering its happy path and the one
  failure that would actually happen.

Before showing Aditya a feature, run it in Playwright and fix what that
surfaces. Green unit tests are not the bar. Component tests render with props
you chose; the Playwright spec loads the real page and reads what actually
survived a reload.

Do not chase a coverage percentage. Coverage runs in CI so you can see it, and
it gates nothing. Every bug Aditya reports becomes a failing test before it
gets fixed.

## Dates

Every timestamp in the database is a UTC instant, `dueAt` included. A deadline
is a fixed moment, not a floating wall-clock time: a Canvas submission closes
at 11:59pm Pacific whether or not you are in California.

What the user types is interpreted in the device's current zone and stored as
an instant. The UI formats it back into the device's current zone.

Three rules that keep this working:

1. `src/domain/dates.ts` is the only file allowed to construct a `Date`.
2. Every domain function takes `now` as a parameter. Nothing in `src/domain/`
   calls `new Date()` with no arguments, so tests pin the clock and never
   behave differently at 11pm than at 10am.
3. `groupOf` converts the instant to a local calendar day before bucketing.
   UTC-day bucketing silently breaks AC-02.4.

Watch for this: JavaScript parses `new Date("2026-10-03")` as UTC midnight but
`new Date("2026-10-03T23:59")` as local time.

## Security

The app holds personal information. A doctor's appointment title is health
information and a rent due date says where Aditya lives. Personal, not secret.

Non-negotiable:

- Never use `dangerouslySetInnerHTML`. ESLint enforces `react/no-danger` as an
  error, so a passing lint is the proof.
- Treat the import file as hostile. Validate every field before writing
  anything, reject unknown top-level keys, never pass file contents to `eval`
  or `Function`.
- No network request after load. No CDN, no analytics, no error reporting, no
  remote fonts. `index.html` carries a CSP restricting scripts to `'self'` and
  a Playwright spec asserts that nothing off-origin is requested.
- `.gitignore` blocks exported JSON by pattern. Never commit app data.
- Every dependency can read the user's deadlines. That is a second reason to
  keep the list short.

There is deliberately no encryption at rest. BitLocker covers the realistic
threat, and a passphrase prompt on every launch would wreck an app whose value
is being fast to check. See the decision log.

## Not in v1

Phone notifications, calendar export, recurring items, course reference cards,
category filtering. Items still carry a `category` field so that v1 export
files stay importable once filtering arrives.

Do not build toward these. When one becomes real it gets its own story.
