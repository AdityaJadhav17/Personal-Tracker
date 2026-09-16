# Refactor: extract `useDatabase` from `App.tsx`

A refactor, not a feature. No behaviour changes, no acceptance criteria change.

## Why this is owed

[plan.md](plan.md) says: "If `App.tsx` grows past roughly 150 lines I will show
you a plan for extracting a `useDatabase` hook rather than doing it silently."

`App.tsx` is 359 lines with fourteen handler functions. It crossed the line
somewhere in M4 and nobody raised it. This is that plan, late.

## The seam

The split is between **changing the data** and **working with the browser**.

**Into `src/state/useDatabase.ts`:** everything that reads or writes the
database and nothing else.

- The `db` state, loading it, and the null case when storage cannot be read
- `commit`, which sets state and saves in one step
- `addItem`, `markDone`, `setNote`, `setCourse`, `setGoal`
- `addCourse`, `removeCourse`, `addGoal`, `removeGoal`
- `recordReflection`
- `replaceAll` and `merge`, which import calls once it has a parsed database
- The `undoable` id and the `u` keydown listener, because undo only exists as
  the inverse of `markDone` and the two drift if they live apart

**Staying in `App.tsx`:** everything that touches the DOM or is about what is on
screen.

- Which view is showing
- The export: building a Blob, an object URL and an anchor click
- Reading the chosen file with `FileReader`
- `importError` and the replace-or-merge prompt, which are UI flow rather than
  data
- The render

The test for "does this belong in the hook" is whether it would still make
sense with no browser at all. `markDone` would. Clicking an anchor would not.

## Shape

```ts
export interface DatabaseActions {
  addItem: (draft: ItemDraft) => void;
  markDone: (id: string) => void;
  setNote: (id: string, note: string) => void;
  setCourse: (id: string, courseId: string | null) => void;
  setGoal: (id: string, goalId: string | null) => void;
  addCourse: (draft: CourseDraft) => void;
  removeCourse: (id: string) => void;
  addGoal: (draft: GoalDraft) => void;
  removeGoal: (id: string) => void;
  recordToday: (score: Reflection['score'], note: string) => void;
  replaceAll: (next: Database) => void;
  merge: (next: Database) => void;
}

/**
 * `db` is null only when storage itself cannot be read, which is AC-11.2.
 * `undoableTitle` is the item most recently finished, or null.
 */
export function useDatabase(): {
  db: Database | null;
  undoableTitle: string | null;
  actions: DatabaseActions;
};
```

`App.tsx` should land near 150 lines: the view switch, the export and import
plumbing, and the render.

## How we know it worked

**Zero test changes.** There are 328 unit and component tests and 95 Playwright
specs covering every acceptance criterion. A behaviour-preserving refactor
changes none of them.

If a test goes red, I changed behaviour and I stop and say so rather than
editing the test. That is the whole point of doing this now, while the suite is
dense, rather than later.

Two extra checks worth running because the hook owns persistence:

- The export and import round trip, which is the widest single assertion in the
  suite.
- The `u` undo path, which moves into the hook and is the piece most likely to
  break quietly.

## Cost

Roughly 200 lines move between two files. Nothing is added except the hook's own
declaration, and `App.tsx` loses more than the hook gains, because fourteen
handlers that each close over `commit` become one object built once.

No new dependency. No new test file: the hook is covered by the App tests that
already drive it through the interface.

## What this does not fix

The item row still carries four controls per item. That is a design question
about what a row should show, not a code-organisation one, and it needs an
answer from Aditya rather than a refactor.
