# Personal Tracker v1: implementation plan

**Goal.** A local-first page that shows every deadline you have entered, school
and life together, grouped by urgency and ordered by priority, with JSON export
and import so you keep your own data.

**Architecture.** A Vite single-page app with no server and no router. All
state lives in one `Database` object held in `App.tsx` and persisted to
`localStorage` as a single JSON string. Date bucketing, ordering, parsing, and
import validation are pure functions that take an explicit `now`, so they test
without a DOM and without a clock.

**Spec.** [mvp.md](mvp.md) and [user-research.md](user-research.md).
**Done means.** [definition-of-done.md](definition-of-done.md).
**Decisions.** [decisions.md](decisions.md).

---

## Global constraints

Copied from your section 0 and the security posture. Every task inherits these.

- No application code before you approve this plan.
- No dependency added without you approving it by name. The full list is in
  "Dependencies to approve" below; approve it once and I will not ask again
  unless something new comes up.
- No `dangerouslySetInnerHTML`. ESLint enforces `react/no-danger` as an error.
- No network request after initial load. No CDN, no analytics, no error
  reporting. Fonts are served from `public/fonts/`.
- `index.html` carries a CSP meta tag restricting scripts to `'self'`.
- Every changed line traces to a story ID. No drive-by refactoring.
- No abstraction with exactly one caller.
- Diffs stay under roughly 200 lines, or I show you the plan for a larger one.
- `localStorage` is written on submit and on blur, never on keystroke.
- One story per branch. One concern per commit. Commit messages carry the
  story ID.

---

## Milestones

Each one runs and is worth using before the next exists.

| Milestone          | Stories                           | You can                                                                   |
| ------------------ | --------------------------------- | ------------------------------------------------------------------------- |
| M0 Scaffold        | none                              | Run `npm run dev`, `lint`, `typecheck`, `test`, `build`, and see CI green |
| M1 Capture and see | US-01, US-02, US-03, US-04, US-11 | Add deadlines and see them grouped and ordered                            |
| M2 Run your week   | US-05, US-06, US-12               | Mark done from the keyboard, attach notes, see what is coming             |
| M3 Own your data   | US-09, US-10                      | Export and import, proven by a round-trip test                            |

M0 is your Phase 2. M1 through M3 are your Phase 3, one story at a time.

---

## Data model

All types live in `src/domain/types.ts`.

```ts
export type Priority = 'high' | 'normal' | 'low';
export type Category = 'academic' | 'personal';
export type ItemStatus = 'open' | 'done';

/** A thing with a date and a consequence. */
export interface Item {
  /** crypto.randomUUID(). Stable across export and import. */
  id: string;
  /** Non-empty after trimming. Rendered as text, never as HTML. */
  title: string;
  /**
   * UTC instant: "2026-10-04T06:59:00.000Z".
   * The moment the deadline falls, rendered in the device's current timezone.
   * See "The date decision".
   */
  dueAt: string;
  category: Category;
  priority: Priority;
  status: ItemStatus;
  /** Short memo. Empty string when absent, never null. */
  note: string;
  /** Instant, UTC: "2026-09-15T04:12:33.041Z". */
  createdAt: string;
  /** Instant, UTC. Null while status is "open". */
  completedAt: string | null;
}

/** Everything the app owns. This object is the export file. */
export interface Database {
  /** Bumped only when the shape changes in a way import must handle. */
  version: 1;
  items: Item[];
}

/** What the add form produces, before the app assigns identity and time. */
export interface ItemDraft {
  title: string;
  dueAt: string;
  category: Category;
  priority: Priority;
}
```

No `Course` type in v1. US-07 is deferred, and adding the type now would be an
abstraction with no caller. When courses arrive they become
`Database.version: 2` plus an import path that upgrades version 1 files.

### The date decision

Every timestamp in the database is a UTC instant. `dueAt` included.

A deadline is a fixed moment, not a floating time. A Canvas submission closes
at 11:59pm Pacific whether or not you are in California, and a doctor's
appointment at 2pm in San Diego does not become 2pm in Delhi. So the app stores
the moment and renders it in whatever timezone your laptop is currently set to.

What you type is interpreted in your device's zone at the time you type it.
Enter "Friday 11:59pm" at UCSD and the app stores `2026-10-04T06:59:00.000Z`.
Open the app in India and it renders as Saturday 12:29pm, which is the same
moment and the true cutoff.

This needs no extra field and no timezone picker. `parseDueDate` converts on
the way in, the UI formats on the way out.

**The trap.** JavaScript parses `new Date("2026-10-03")` as UTC midnight but
`new Date("2026-10-03T23:59")` as local time. Every string that reaches the
`Date` constructor during parsing carries a time component, so the local
interpretation is the one that applies. `src/domain/dates.ts` is the only file
allowed to construct a `Date`.

**Grouping still works in local calendar days.** `groupOf` converts the stored
instant into the device's local date before deciding Today versus Overdue, so
AC-02.4 holds: at 23:59 local, an item due today is still in Today.

**Known limitation, accepted.** An item is anchored to the zone your device was
in when you typed it, and you cannot override that per item. If someone tells
you a deadline in a zone you are not currently in, you have to do that math
yourself. Adding a per-item zone picker would fix it and is not worth the field
and the form control today.

`createdAt` and `completedAt` were already instants and are unchanged.

---

## Storage module

You chose `localStorage` with a plain module, so there is no `StorageAdapter`
interface and no `fake-indexeddb`. `src/storage/db.ts` holds two functions:

```ts
/**
 * Read the whole database.
 * Returns an empty database when the key is absent (first launch) or when the
 * stored string fails to parse. Never throws, so the dashboard always renders.
 */
export function load(): Database;

/** Write the whole database. Called on submit and on blur, never per keystroke. */
export function save(db: Database): void;
```

Storage key: `personal-tracker/v1`.

`load()` returning an empty database on corrupt JSON rather than throwing is
what makes AC-11.1 work without a try/catch in the component. The error state
in AC-11.2 covers the separate case where `localStorage` itself is unavailable,
which happens in a browser with site data blocked.

Domain transforms are pure functions over `Database` in `src/domain/`, so they
never touch storage and test with plain objects.

---

## Directory layout

Tests sit beside the code they test. Files that change together live together.

```
Personal-Tracker/
├── .github/workflows/ci.yml
├── .gitignore
├── CLAUDE.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── docs/
│   ├── user-research.md
│   ├── mvp.md
│   ├── plan.md
│   ├── definition-of-done.md
│   ├── decisions.md
│   └── session-log.md
├── public/
│   └── fonts/
├── e2e/
│   └── <story>.spec.ts       one spec per story, driven in a real browser
├── playwright.config.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── domain/
    │   ├── types.ts
    │   ├── dates.ts          + dates.test.ts
    │   ├── ordering.ts       + ordering.test.ts
    │   └── transfer.ts       + transfer.test.ts
    ├── storage/
    │   └── db.ts             + db.test.ts
    └── components/
        ├── Dashboard.tsx     + Dashboard.test.tsx
        ├── ItemRow.tsx
        ├── AddItemForm.tsx   + AddItemForm.test.tsx
        ├── EmptyState.tsx
        └── ErrorState.tsx
```

### What each file is responsible for

`domain/dates.ts` parses what you type into a `dueAt` string, and decides which
group an item belongs to. Both functions take `now` as an argument. Nothing
here calls `new Date()` with no arguments.

```ts
export type Group = 'overdue' | 'today' | 'week' | 'later';

/**
 * AC-01.4. Accepts "2026-10-03", "10/3", "oct 3".
 * Interprets the input in the device's current timezone and returns a UTC
 * instant. A bare date with no time means 23:59 local that day.
 * Returns null when unparseable.
 */
export function parseDueDate(input: string, now: Date): string | null;

/** AC-02.1 through AC-02.4. Buckets by local calendar day, not by UTC day. */
export function groupOf(dueAt: string, now: Date): Group;

/** AC-12.1 through AC-12.3. True when due within the next three days. */
export function isUpcoming(dueAt: string, now: Date): boolean;
```

`domain/ordering.ts` sorts within a group.

```ts
/** AC-04.1 through AC-04.3. High first, then earlier due time, then stable by id. */
export function sortWithinGroup(items: Item[]): Item[];

/** AC-03.3. Most overdue first. */
export function sortOverdue(items: Item[]): Item[];
```

`domain/transfer.ts` handles the export file in both directions.

```ts
/** AC-09.1, AC-09.2. */
export function serialize(db: Database): string;

/**
 * AC-10.2, AC-10.3. Treats the file as hostile.
 * Returns the database or an error naming what was wrong. Never throws,
 * never evals, rejects unknown top-level keys.
 */
export type ParseResult =
  { ok: true; db: Database } | { ok: false; error: string };

export function parseImport(text: string): ParseResult;
```

`App.tsx` holds the single `useState<Database>`, calls `save()` after each
change, and passes callbacks down. No context, no store library, no router. If
`App.tsx` grows past roughly 150 lines I will show you a plan for extracting a
`useDatabase` hook rather than doing it silently.

`App.tsx` also owns AC-10.4, the replace-or-merge choice. `parseImport` only
validates and returns data; it never decides what happens to what you already
have. The import flow is: parse, and if the file is valid and the current
database is non-empty, ask before writing anything. Replace swaps the database
outright. Merge keeps both sets and drops an incoming item whose `id` already
exists, which is what makes importing your own export twice a no-op rather than
a way to duplicate every deadline.

Components render and call callbacks. They hold no data of their own beyond
form field state.

---

## Dependencies to approve

Approve this list once and I will only come back for additions.

**Runtime, ships to the browser.** `react`, `react-dom`. Two packages, both
things you already chose.

**Build.** `vite`, `@vitejs/plugin-react`, `typescript`.

**Test.** `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`.

**End to end.** `@playwright/test`, plus the Chromium browser it downloads on
first install.

**Lint and format.** `eslint`, `typescript-eslint`, `eslint-plugin-react`,
`eslint-plugin-react-hooks`, `prettier`, `eslint-config-prettier`.

`eslint-plugin-react` is in the list specifically because `react/no-danger`
lives there, which is the rule that enforces the injection guard from the
security posture.

### What I am deliberately not installing

- **A date library.** `date-fns` or `dayjs` would each add a dependency to save
  roughly thirty lines in `dates.ts`, and the formats in AC-01.4 need custom
  handling either way. If hand-rolled parsing turns out to be fiddlier than I
  expect, this is the first place I will come back and ask.
- **A validation library.** `zod` is a good library. `parseImport` checks one
  object shape, which is a function, not a schema system.
- **A router.** One page.
- **A state library.** One `useState`.
- **A UI kit.** Phase 4 designs the interface with `ui-ux-pro-max` against your
  personas. A component library would decide those questions before you do.

---

## Risks

Each one lists the thing that tells you early that it is going wrong.

**The app does not change your behavior.** You build it, it works, and you keep
missing things because you never open it. This is the biggest risk in the
project and it is not a code risk.

_Early signal._ After three real school days, `session-log.md` shows you opened
the app fewer than three times. That is not a UI bug to fix. It means the
calendar export milestone, the one that reaches your phone, needs to move up,
and a non-goal needs to move with it.

**Date bugs that only appear at certain hours.** Local versus UTC parsing
produces tests that pass at 10am and fail at 11pm.

_Early signal._ Any test that behaves differently depending on when you run it.
The guard is that every domain function takes `now` as a parameter, so tests
pin it. If you find yourself writing `new Date()` inside `domain/`, stop.

**Tests written green.** Writing a test after the code, watching it pass, and
calling that TDD. The tests then assert what the code does rather than what you
asked for.

_Early signal._ A test that passes the first time you run it. The plan requires
running each test and seeing it fail with a specific message before writing the
implementation.

**Scope creeping back to deferred work.** Courses, filters, and recurrence are
out, and each is tempting to add while nearby code is open.

_Early signal._ A commit message with no story ID, or a file appearing in
`src/` that no in-scope story required.

**localStorage write amplification.** Every save rewrites the whole database.
Harmless at your data size, painful if it happens per keystroke.

_Early signal._ Typing in the note field feels laggy. The guard is writing on
blur and submit only.

**CI passing locally and failing on push.** Usually formatting or a
Node version difference.

_Early signal._ Your Phase 2 step 3 catches this on purpose, by pushing a
deliberately badly formatted file and watching the job fail before you trust it.

---

## When one story is done

The checklist lives in [definition-of-done.md](definition-of-done.md) rather
than being repeated here, so there is one copy to keep current. In short: every
acceptance criterion has a test named for its ID, those tests failed before the
code existed, lint and typecheck and the suite and the build all pass, no
dependency arrived unapproved, and the commit carries the story ID.

---

## How Phase 3 runs

I am not writing all forty-odd test bodies into this document. Your Phase 3
process is one story at a time, and the first step of each story is restating
its acceptance criteria as test names and showing you the tests running red.
Writing them now would duplicate that step and freeze decisions before the
preceding story has taught us anything.

For each story, in order:

1. Restate the acceptance criteria as a list of test names.
2. Write the failing tests. Show you red.
3. Write the minimum code to pass. Show you green.
4. Refactor only if something is genuinely duplicated three times or more.
5. Drive the story end to end in Playwright against the running app. Fix what
   that surfaces.
6. Run lint, typecheck, and the full suite. Commit with the story ID.

Step 5 is your rule from 2026-09-15: I exercise the feature in a real browser
and fix what breaks before showing it to you. Green unit tests are not the bar.
A component test renders `Dashboard` with props I chose; the Playwright spec
loads the actual page, types into the actual form, and reads what actually
persisted through `localStorage` after a reload. The second one catches wiring
bugs the first cannot see.

Each story gets one spec in `e2e/`, covering its happy path and the one failure
you would actually hit. These stay thin on purpose. Acceptance criteria are
tested at the unit and component level, where they run in milliseconds and
point at the broken line.

Story order within each milestone follows the dependency chain: `domain/dates`
and `domain/ordering` come before `Dashboard`, because the dashboard test
asserts grouping and ordering that must already work.

---

## What I need from you

1. Approve this plan, or tell me what to change.
2. Approve the dependency list.
3. Confirm M0 starts with `npm create vite@latest` in this directory, which is
   currently empty apart from `docs/`.

Nothing gets scaffolded until you say go.
