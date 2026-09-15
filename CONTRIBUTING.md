# Contributing

This is a personal tool, so the bar is not ceremony. It is that the next person
to open the repo, which is usually its author six months later, can tell what
the code is supposed to do.

## Write the test first

Write the test, run it, and watch it fail with a message that names the thing
you are about to build. Then write the smallest code that makes it pass.

A test that passes the first time you run it has not tested anything yet. You
have no evidence it would catch the bug it exists for.

Every acceptance criterion in [docs/product/user-research.md](docs/product/user-research.md) has
an ID, and its tests carry that ID in the name, so `npm test -- AC-04.2` finds
exactly one test.

## Where tests go

- Pure logic under `src/domain/` gets fast unit tests with no DOM and no
  storage. Pass `now` in rather than reading the clock, so a test never behaves
  differently at 11pm than at 10am.
- `src/storage/db.ts` runs against real `localStorage` in jsdom.
- Components get React Testing Library tests driven through visible text and
  ARIA roles. Do not query a CSS class, a test ID, or component internals.
- Each story gets one thin Playwright spec covering its happy path and the
  failure you would actually hit.

Run the Playwright suite before you call something finished. Component tests
render with props you chose; the browser spec loads the real page and reads what
survived a reload. Four separate bugs in this repo showed up only in the browser
while every unit test stayed green.

Coverage runs in CI so you can look at it. It gates nothing. Chasing a number
produces tests that assert what the code does instead of what someone asked for.

## Before you push

```bash
npm run lint
npm run typecheck
npm test
npm run e2e
npm run build
```

CI runs the same five on Node 20 and fails on any lint warning.

## Adding a dependency

Ask first, and say what it does and what it replaces. Every package that ships
to the browser can read the user's deadlines, which is a second reason to keep
the list short. So far the runtime dependencies are React and React DOM.

## Commits

One concern per commit, and the story ID in the message when there is one:

```
feat(US-04): order every group by priority then due time
```

## Reporting a bug

Turn it into a failing test before fixing it. The test is the part that stops it
coming back.
