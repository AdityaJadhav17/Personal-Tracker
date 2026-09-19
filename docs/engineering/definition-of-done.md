# Definition of done

Two levels. A story is done when it passes the first checklist. Version 1 is
done when every in-scope story is done and the second checklist passes.

Nothing here is aspirational. Every line is something you can check by running
a command or opening a file, because a checklist you cannot verify is a
checklist you will lie to yourself about in week nine.

## A single user story is done when

**Tests**

- [ ] Every acceptance criterion in the story has a test whose name contains
      its ID, so `npm test -- AC-04.2` finds exactly one test.
- [ ] Those tests failed before the implementation existed, and you saw them
      fail. Red first, then green, not green on the first run.
- [ ] Pure logic such as date bucketing and ordering has unit tests that touch
      no DOM and no storage.
- [ ] Anything touching storage is tested against the real storage layer, not a
      hand-written stub of it.
- [ ] Screen tests drive the UI through visible text and ARIA roles. No test
      queries a CSS class, a test ID, or component internals.
- [ ] The story has a Playwright spec that drives it in a real browser, and I
      ran it and watched it pass before showing you the feature.
- [ ] Anything that Playwright surfaced is fixed, not noted for later.

**Code**

- [ ] `npm run lint` passes with zero warnings.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] No `dangerouslySetInnerHTML` anywhere. ESLint enforces this, so a passing
      lint is the proof.
- [ ] No dependency was added without you approving it by name first.
- [ ] Every changed line traces to this story. Nothing reformatted, nothing
      refactored in passing.
- [ ] No abstraction has exactly one caller.

**Process**

- [ ] The diff is under roughly 200 lines, or you saw and approved the plan for
      a larger one.
- [ ] The commit message contains the story ID.
- [ ] The branch holds this story and nothing else.

## A version is done when

**Functionality**

- [ ] Every story in scope passes the story-level checklist above. Version 1 was
      US-01 to US-06 and US-09 to US-12. Version 2 adds US-07, US-08 and US-13
      to US-29. US-08 was deferred out of both the MVP and the original version
      2 scope and was built on 18 September, once US-26 made a fifty item list
      a realistic thing to have.
- [ ] Export produces a file that import restores exactly, proven by a
      round-trip test that compares the full database before and after, not by
      spot-checking fields.
- [ ] Every screen has a designed empty state and a designed error state that a
      test renders.
- [ ] You can add an item and mark it done without touching the mouse.
- [ ] The four failure paths have tests: a due date in the past, an empty
      database on first launch, a malformed import file, and two items due at
      the same minute.

**Quality gates**

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run e2e`, and
      `npm run build` all pass locally.
- [ ] The same five pass in GitHub Actions on Node 20, and the job fails on
      lint warnings.
- [ ] The CI badge in the README is green.

**Security**

- [ ] `index.html` carries a Content Security Policy restricting scripts to
      `'self'`.
- [ ] The app makes zero network requests after load. Verify by opening the
      Network tab, using the app for two minutes, and seeing nothing beyond the
      initial asset load.
- [ ] Fonts are served from the project, not from a CDN.
- [ ] `.gitignore` blocks exported JSON by pattern, and `git status` after an
      export shows nothing new to commit.
- [ ] The dependency list is short enough that you can say out loud what each
      package does and why it is there.
- [ ] The audit in [security-audit.md](security-audit.md) has been re-run
      against anything that reads or writes a file, and its findings are fixed
      or recorded. The import file and the two exports are the whole untrusted
      surface, so a story that touches either of them re-opens this.

**Documentation**

- [ ] `README.md` covers what it is, a screenshot, how to run it, how to run
      the tests, the data ownership note, and the non-goals.
- [ ] A stranger can clone the repo and get it running without asking you a
      question. Test this by following your own README on a clean checkout.
- [ ] `CONTRIBUTING.md` states the test-first expectation.
- [ ] An MIT `LICENSE` file exists.
- [ ] `CLAUDE.md` matches how the project actually works, including the
      security rules.
- [ ] `docs/engineering/decisions.md` holds an entry for every architectural
      decision, each with a date, the options considered, the choice, and what
      would reverse it.
- [ ] The screenshot in the README shows the app as it is now, not as it was at
      the last release.

**Real use**

- [ ] You have used the app for three real school days with your actual
      deadlines in it.
- [ ] `docs/session-log.md` records what broke, what annoyed you, and what you
      reached for that was not there.

## What is deliberately not on these lists

**A coverage percentage.** Coverage runs in CI so you can see it, and it gates
nothing. Chasing a number produces tests that assert what the code does instead
of what you asked for.

**Performance targets.** You never named one, and "feels fast" is not
checkable. If something feels slow while you are using it for real, that goes
in `session-log.md` and becomes a story with a number attached.

**Browser support beyond the one you use.** You run this on your own laptop.
Testing Safari 14 is work for a user who does not exist.
