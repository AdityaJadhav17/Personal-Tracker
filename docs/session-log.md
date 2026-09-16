# Session log

Newest first. What happened, what broke, what to pick up next.

During the three days of real use required by
[engineering/definition-of-done.md](engineering/definition-of-done.md), this is also where you record
what annoyed you and what you reached for that was not there.

---

## 2026-09-15: Phase 0 through M0 scaffold

**Done.** Interview, personas, twelve user stories with IDed acceptance
criteria, MVP cut to ten stories across three milestones, definition of done,
implementation plan, and the M0 scaffold.

**Scaffold is green on all six gates:** typecheck, lint, format check, unit
tests with coverage, Playwright end to end, and production build.

**Two things went wrong during the scaffold and were fixed.**

`vitest@2` pins Vite 5 while the plan specified Vite 6, so npm installed two
Vite trees and their types collided under `exactOptionalPropertyTypes`.
Upgrading to `vitest@3` left one Vite tree. The alternative was relaxing
TypeScript strictness, which would have been the wrong fix.

`vite.config.ts` used a triple-slash reference for the Vitest types, which the
explicit `types` array in `tsconfig.json` overrode. Importing `defineConfig`
from `vitest/config` instead is the documented approach.

**Open question carried forward.** The CSP in `index.html` allows
`connect-src 'self'`, and the Vite HMR websocket works under it in Chromium.
Worth re-checking if HMR ever breaks after a Vite upgrade.

**Next.** US-01, the add-item form, starting with `parseDueDate` in
`src/domain/dates.ts`. That function is the dependency for the US-02 grouping
work that follows it.

---

## 2026-09-15: US-01, add an item

**Shipped.** `parseDueDate` and `formatDue` in `src/domain/dates.ts`, the
`Item` and `Database` types, the `localStorage` module, the add form, and the
App wiring. 36 unit and component tests, 8 Playwright specs, all six gates
green.

**Scoping call.** AC-01.1 says the item appears "in the group matching its due
date," but grouping is US-02 and AC-02.1 already tests it. US-01 was read as:
submitting creates the item, it is visible, and it survives a reload. The list
is flat until US-02 lands.

**A test bug the clock caught.** The first version of the form test asserted
`dueAt === '2026-10-03T23:59:00.000Z'`. That literal is only correct in
Pacific, so it passed locally and would have failed on a UTC CI runner. The
fix asserts the local calendar fields instead. This is exactly the failure
mode the date decision predicted, and it showed up on the first story.

**Known gap, needs a decision.** `parseDueDate` accepts dates only, so every
item lands at 23:59. You cannot enter "doctor at 2pm" yet, and AC-04.2 in US-04
expects items with due times of 09:00 and 17:00. No acceptance criterion in
US-01 asks for time entry, so it was not built. Roughly fifteen lines to add.

**Next.** US-02, grouping into Overdue, Today, This week, and Later.

---

## 2026-09-15: time entry, then US-02 grouping

**Time entry, closing the gap flagged at the end of US-01.** `parseDueDate`
now takes an optional trailing time: "oct 3 2pm", "10/3 2:30pm",
"2026-10-03 14:00". With no time the deadline is still 23:59 local. A bare
trailing number is deliberately refused, because in "oct 3 3" the second
number could be a day or an hour, so it takes a colon or an am/pm to count.
The hint under the Due field now reads: Try "oct 3", "10/3", or "oct 3 2pm".

**US-02 grouping.** `groupOf` in `src/domain/dates.ts` plus a `Dashboard`
component rendering Overdue, Today, This week and Later, skipping empty groups
and hiding items marked done.

**The grouping decision worth knowing.** Comparison is by local calendar day,
not by instant. Two consequences. An item due at 23:59 stays in Today right up
to midnight rather than flipping to Overdue partway through the evening, which
is what AC-02.4 asks for. And a 9am item is still today's work at 10am rather
than going Overdue mid-morning. If that second one turns out to be wrong when
you use it for real, it is a one-line change and it belongs in this log.

**"This week" is a rolling seven days,** not the calendar week, so a Monday
deadline does not read as Later when you check on Sunday. Seven days out is
This week, eight is Later.

**Verified in a real browser,** not just in tests. Four items entered through
the form landed in the four right groups in the right order, and "9/18 2pm"
rendered as "Sep 18, 2:00 PM".

**Counts.** 62 unit and component tests, 13 Playwright specs, coverage 87.53%.
All six gates green.

**Next.** US-03, pinning overdue and ordering most-overdue first. The heading
order already satisfies AC-03.1; US-03 adds AC-03.3 ordering and its own tests.

---

## 2026-09-15: US-03, overdue pinned and ordered

**Shipped.** `sortOverdue` in the new `src/domain/ordering.ts`, applied to the
Overdue group in `Dashboard`. 71 unit and component tests, 17 Playwright
specs, coverage 87.73%. All six gates green.

**Only one of the three criteria was new.** AC-03.1, overdue above Today, and
AC-03.2, no group when nothing is overdue, both already worked from the US-02
grouping. Their tests went green on the first run rather than red first. That
is honest TDD for behavior a previous story already built: the tests are
regression cover, not a driver. AC-03.3, most overdue first, was the real work
and did go red.

**Ordering compares the stored instants as strings.** They all come out of
`toISOString`, so a single format means lexicographic order is chronological
order. `Array.sort` is stable, which is what holds two items due at the same
minute in a fixed order between reloads. That is the "two items due at the
same minute" failure path from the definition of done, covered in
`ordering.test.ts`.

**Only Overdue is sorted so far.** The other three groups render in insertion
order until US-04 brings priority ordering. `Dashboard` has a conditional
saying so, which US-04 should delete rather than extend.

**Verified in a real browser.** Three overdue items entered as 1 day, 12 days,
5 days late rendered as 12, 5, 1 above the Today group.

**Next.** US-04, priority then due-time ordering inside every group. That
story deletes the Overdue-only conditional in `Dashboard`.

---

## 2026-09-15: US-04, priority ordering

**Shipped.** `sortOverdue` became `sortWithinGroup`, now ordering by priority
first and due time second, applied to every group. The Overdue-only
conditional in `Dashboard` is gone. 80 unit and component tests, 21 Playwright
specs, coverage 87.91%. All six gates green.

**A decision that changed US-03's behavior.** Priority now applies inside
Overdue too, so a high-priority item one day late reads above a low-priority
one twelve days late. AC-03.3 only specifies the equal-priority case and its
tests use uniform priority, so it stayed green. The reasoning: being late is
already carried by the group itself, and within a group the question is what
to do first. Flip it by giving Overdue its own comparator if real use says
otherwise.

**A UI problem that only showed up by looking at it.** Category and Priority
keep their last values after a submit, while Title and Due clear. Add one
high-priority item and the next item you type silently becomes high priority
too. That arguably breaks what AC-01.3 is reaching for. No acceptance
criterion covers it either way, so nothing was changed. Sticky selects help
batch entry and hurt everything else. Needs a decision.

**Verified in a real browser.** Five items across three groups. The clearest
case: in This week, a high-priority item due 5pm sits above a normal-priority
one due 9am, which is priority beating time exactly as AC-04.1 and AC-04.2
specify together.

**Next.** US-11, the empty state and the error state, which closes M1.

---

## 2026-09-15: sticky-select fix and US-11, closing M1

**Sticky selects fixed.** Category and Priority now reset to Academic and
Normal on submit, alongside Title and Due. Aditya chose resetting over sticky
after it surfaced in the US-04 browser pass.

**US-11 shipped.** `EmptyState` with an action that moves focus to the Title
field, and `ErrorState` for a browser that will not let the page read its own
storage. `App` now holds `Database | null`, where null means storage itself
failed rather than the key being absent.

**One deliberate widening of AC-11.1.** The criterion says "given no items
exist", but the empty state triggers on no _open_ items. Following the letter
would mean that finishing everything leaves a blank page with no headings and
no empty state. One line, and it makes US-05 behave when it arrives.

**A real collision the browser caught.** Adding a button named "Add your first
item" broke ten existing Playwright specs, because Playwright matches
accessible names as a case-insensitive substring, so `{ name: 'Add' }` started
matching both buttons. React Testing Library matches the full name, which is
why every unit test stayed green and only the e2e run failed. Every e2e
selector for the submit button now passes `exact: true`. Worth remembering:
the two libraries disagree on this default.

**AC-11.2 is tested against a real browser with storage actually blocked,**
using `addInitScript` to redefine `window.localStorage` so that reading it
throws, which is what a browser with site data blocked does.

**Counts.** 88 unit and component tests, 26 Playwright specs, coverage 89.38%.
All six gates green. M1 is complete: US-01, US-02, US-03, US-04, US-11.

**Next.** M2 starts with US-05, marking done and undo from the keyboard.

---

## 2026-09-15: US-05, done and undo from the keyboard

**Shipped.** A per-item Done button, an undo bound to `u`, and a status line
announcing that undo is available. 101 unit and component tests, 32 Playwright
specs, coverage 90.33%. All six gates green.

**Three design calls, none of them dictated by the acceptance criteria.**

The done control is a real button per item rather than a custom key binding.
Tab order then follows DOM order, which satisfies AC-05.3 without any
tabindex, and the item label is carried in `aria-label` because "Done" alone
says nothing out of context.

Undo is the plain letter `u`, ignored whenever focus sits in an input, select
or textarea. Ctrl+Z was rejected because inside a text field it belongs to the
browser.

The status line is not in any acceptance criterion. A keyboard shortcut nobody
can discover is not a feature, so marking something done now renders
"Marked X done. Press u to undo." in an `aria-live` region. The paragraph is
always present, empty when there is nothing to undo, so the live region stays
stable and the layout does not jump.

**Undo reaches back exactly one step.** Pressing `u` twice does not keep
walking backwards. No criterion asks for a history, and a one-step undo covers
the misclick it exists for.

**A second selector collision, same root cause as US-11.** The status line
contains the item title, so Playwright's substring-matching `getByText('Rent')`
started matching both the list entry and "Marked Rent done." Three specs went
red while all 101 unit tests stayed green. Item titles in the US-05 specs now
use `{ exact: true }`. That is twice now that adding user-visible text broke
e2e selectors and nothing else: worth assuming any new copy containing a
title or a verb will do it again.

**Verified in a real browser,** including the whole flow with no mouse: type a
title, Tab to the date, Tab to the Add button, Enter, Tab to the item, Enter
to finish it.

**Next.** US-06, a short note on an item.

---

## 2026-09-15: US-06, a note on an item

**Shipped.** A new `ItemRow` component holding the done control and a note
field per item, saved on blur. 107 unit and component tests, 38 Playwright
specs, coverage 91.12%. All six gates green.

**Why the note is not in the add form.** The Phase 4 constraint caps the add
form at four fields and Title, Due, Category and Priority already fill it. So
the note is edited on the item itself. The field is always visible rather than
behind a toggle, which needs no extra state and shows the note at a glance.
That is visually noisy with many items and Phase 4 should decide whether it
collapses.

**Saved on blur, not per keystroke,** which is the rule from the plan for
avoiding a full database rewrite on every character. The consequence is real
and now has a test: type a note, reload without leaving the field, and the
draft is gone.

**`ItemRow` was extracted because the note needs local draft state,** not for
tidiness. It is the first component in this project with state of its own.

**AC-06.2 stayed deleted.** The MVP turned notes into a field rather than an
entity, so nothing cascades when an item is removed. An e2e spec confirms a
note survives being marked done and undone.

**A third selector lesson, a new one.** The tab order changed: each item now
contributes a done control and then a note field, so the US-05 AC-05.3 test
had to be rewritten from "two buttons in order" to the full four-stop
sequence. AC-05.3 still holds, since each item's controls stay contiguous and
the items stay in display order.

**Verified in a real browser.** Typed a note on Rent, clicked away to blur,
reloaded the page, and the note came back.

**Known rough edge, for Phase 4.** The note field renders to the right of the
title and wraps badly. It is unstyled markup, not a logic problem.

**Next.** US-12, marking items due in the next few days, which closes M2.

---

## 2026-09-15: UI reference logged, then US-12, closing M2

**UI reference recorded.** Aditya supplied four dashboard screenshots as a
visual direction and asked about using Motion (motion.dev) for animation.
Written up in [design/ui-reference.md](design/ui-reference.md) with what transfers, what does
not, and the Motion tradeoff. Motion is not installed and not approved: it is a
dependency with no caller yet, and the recommendation is CSS first, Motion only
if a specific transition still feels wrong once the page is styled.

**US-12 shipped.** `isUpcoming` in `src/domain/dates.ts` and a Soon marker in
`ItemRow`. 118 unit and component tests, 44 Playwright specs, coverage 91.35%.
All six gates green. M2 is complete: US-05, US-06, US-12.

**The window is tomorrow through three days out.** Today and anything overdue
are deliberately excluded, because both already sit under a heading that says
so more loudly than a badge would, and calling something already late
"upcoming" reads wrong. AC-12.1 and AC-12.2 only pin the window between two and
nine days, so three was a choice, not a derivation.

**A fourth selector collision, and this one was a real defect.** The marker
carried `aria-label={`${item.title} is due soon`}`, so the string contained the
word "due" and Playwright's `getByLabel('Due')` matched both the form input and
the badge.

Rather than adding `exact: true` for the fourth time, the `aria-label` came
off. It should not have been there: `aria-label` on a plain `span` with no role
is not reliably announced by screen readers, so it was buying nothing while
causing collisions. The visible "Soon" sits inside the item's own list row,
which is where the context comes from. One component test that asserted the
label was deleted, because the behaviour it described was wrong.

The lesson generalises: interactive controls need labels carrying the item
title, and decorative text does not. Every collision this session came from
putting free text somewhere a test selector could reach it.

**Verified in a real browser.** Five items across all four groups. In This
week, a normal-priority item due in six days sits above a low-priority one due
in two, and only the low-priority one carries Soon, which is AC-04.1 and
AC-12.3 holding at the same time.

**Next.** M3: US-09 export, then US-10 import with the round-trip test.

---

## 2026-09-15: US-09, export

**Shipped.** `serialize` and `exportFilename` in `src/domain/transfer.ts`, and
an Export button that downloads the file. 133 unit and component tests, 49
Playwright specs, coverage 91.76%. All six gates green.

**The risk this story carried was the CSP.** `index.html` restricts everything
to `'self'`, and a download goes through a `blob:` URL. Whether that is blocked
cannot be answered in jsdom, where object URLs do not exist at all. The
Playwright specs click Export, catch the real download event, and read the
bytes Chromium actually wrote. It works, and now there is a test that says so
if a future CSP change breaks it.

**Export moved below the list after the first run.** It was originally placed
between the form and the dashboard, which put a once-a-term control in the
middle of the add-then-finish keyboard path used every day. The AC-05.3 tab
order test going red is what surfaced it. Moving the button below the list
fixed both the ergonomics and the test.

**@types/node was avoided.** The e2e helper originally used `Buffer` to
assemble the downloaded stream, which does not typecheck without `@types/node`.
Reading the chunks as strings instead keeps the dependency list where it is.
Fine here because the export arrives in one chunk; a genuinely large file split
mid-character would need the real thing.

**The filename is `personal-tracker-YYYY-MM-DD.json`,** which is deliberately
the pattern `.gitignore` blocks. An export cannot be committed by accident
rather than by remembering not to. A unit test pins the prefix to that pattern.

**An e2e spec asserts the export makes no off-origin request,** so "you own
this file and nobody else sees it" is checked rather than asserted.

**Next.** US-10, import, with the round-trip test that makes the export worth
having. That story closes M3 and finishes the v1 feature set.

---

## 2026-09-15: US-10, import, closing M3 and the v1 feature set

**Shipped.** `parseImport` in `src/domain/transfer.ts`, a file input, an error
line, and the replace-or-merge prompt. 165 unit and component tests, 58
Playwright specs, coverage 93.36%. All six gates green. Every MVP story is now
built: US-01 through US-06, US-09 through US-12.

**The round trip is proven against a real file.** The e2e spec adds items,
notes and a completion, clicks Export, takes the path of the file Chromium
actually wrote, clears storage, reloads, imports that exact file, and compares
the stored database byte for byte against what it was. That is the acceptance
criterion this milestone exists for, and nothing short of a real download and a
real upload would have tested it.

**The import file is treated as hostile.** Twenty-three unit tests cover what
gets refused: text that is not JSON, truncated JSON, a bare array, null, a
version that is not 1, unknown top level fields (named in the message), items
that are not objects, and every field on an item being the wrong type or
missing. Fields inside an item that we do not recognise are dropped rather than
copied into storage, so a file cannot smuggle anything in. Nothing is evaluated;
a title containing template syntax is stored as characters.

**Merge drops incoming ids we already hold.** That is what makes importing your
own export twice a no-op instead of a way to duplicate every deadline, and
there is a test for exactly that at both the component and browser level.

**@types/node avoided a second time.** Playwright's `setInputFiles` takes a
Buffer for synthetic files, so the malformed-file specs build a `File` inside
the page with `DataTransfer` and dispatch a change event. The round trip does
not need it at all, since `download.path()` hands back a real path.

**One lint failure at the end,** from destructuring a field off an object to
omit it, which leaves an unused binding. Rewritten as a copy and a delete.

**Verified in a real browser.** Seeded two items, uploaded a malformed file and
saw the refusal with the data intact, then uploaded a valid one, chose Merge,
and watched the imported high-priority item slot in above the existing
low-priority one.

**Next.** The feature set is complete but v1 is not done. Outstanding against
[engineering/definition-of-done.md](engineering/definition-of-done.md): Phase 4 styling with the
`ui-ux-pro-max` skill against [design/ui-reference.md](design/ui-reference.md), Phase 5
documentation, self-hosted fonts, three real school days of use logged here,
and CI proven green on a push.

---

## 2026-09-15: Phase 4, the interface

**Shipped.** A token-based stylesheet, class names through every component, a
group count beside each heading, and a contrast gate. 193 unit and component
tests, 58 Playwright specs, coverage 93.64%. All six gates green. The CSS
bundle is 6.05kB, 1.61kB gzipped.

**Zero existing tests changed.** The count was expected to break about ten
assertions by changing heading names from "Overdue" to "Overdue 2". Putting the
count in a sibling span rather than inside the `h2` keeps the heading's
accessible name and `textContent` exactly "Overdue", and the span is
`aria-hidden` because a screen reader can count the list itself. Nothing went
red.

**The contrast gate paid for itself on its first run.** `src/design/contrast.test.ts`
reads the colour tokens straight out of `index.css` and checks twelve
foreground and background pairs in both palettes. It failed immediately:
`#dc2626` on `#fef2f2` is 4.41 to 1, under the 4.5 AA floor. My own hand
calculation had said 4.62. The light-mode danger colour is now `#b91c1c`.

Making it read the real CSS matters. A test with its own copy of the palette
would have passed while the app failed.

**Vitest replaces CSS imports with an empty string by default,** so
`import css from '../index.css?raw'` silently returned nothing and the whole
gate passed while checking zero pairs. `css: true` in the Vitest config fixes
it. Worth remembering: a test that reads a file through the bundler can be
quietly disarmed by the bundler.

**Three of the skill's recommendations were rejected, with reasons in
[design/ui-plan.md](design/ui-plan.md).** Its layout pattern was for a marketing landing page.
Inter is served from Google Fonts, which the security posture forbids and an
existing spec would have caught. GSAP is a dependency. The system font stack is
used instead and `public/` is gone, since it only held an empty fonts folder.

**One thing the browser caught that the plan got wrong.** The note field was
specified as one line always, but at `flex: 1 1 100%` an empty note still
forced every row onto two lines, which defeated the density the three-second
test needed. `:placeholder-shown:not(:focus)` collapses an empty note to a
small inline affordance on the item's own row, and a note with text or focus
takes a line. No extra state, no extra markup. Eight items across four groups
now fit on one screen.

**Checked in the browser:** light and dark, 390px and desktop, no horizontal
scroll at either width, the focus ring visible on keyboard navigation, and the
note expanding to a full editor on focus.

**Next.** Phase 5: README with a screenshot, CONTRIBUTING, MIT LICENSE, CI
badge, all run through `stop-slop`. Then the three real school days, and
proving CI green on a push.

---

## 2026-09-15: Phase 5, documentation

**Shipped.** `README.md`, `CONTRIBUTING.md`, an MIT `LICENSE`, a CI badge, and
`docs/screenshot.png`. All prose run through `stop-slop`. 193 unit and
component tests, 58 Playwright specs, all six gates still green.

**The screenshot is seeded demo data, not Aditya's.** Captured with Playwright
at a 2x device scale so it stays sharp, eight items across all four groups,
showing the priority bar, the Soon marker, category tags and two notes. Replace
it with real data whenever that feels less like a stranger's list.

**`.gitignore` was verified rather than assumed.** Wrote a file matching the
export pattern, confirmed `git status` does not show it, deleted it.

**Two placeholders that need Aditya's confirmation.** The CI badge URL assumes
`AdityaJadhav17/Personal-Tracker`, and the `LICENSE` copyright reads "Aditya
Jadhav". Neither is verified, and there is no git remote yet to check against.

**The README states the limitation plainly** rather than burying it: a browser
tab on a laptop cannot reach a phone without a server, so this version reminds
you only while it is open. That is the thing most likely to make the app fail
in real use, and a stranger reading the README deserves to know it before
cloning.

**Left for Aditya.** Add the GitHub remote and push. Prove CI by pushing a
deliberately badly formatted file and watching the job go red. Then three real
school days with actual deadlines, logged here.

---

## 2026-09-15: first push, CI green

Aditya pushed to GitHub. The `check` job passed on the first run in 1m23s:
checkout, setup-node, install, typecheck, lint, format check, unit tests,
Playwright browser install, end-to-end, build. The Playwright report upload
step correctly skipped, since it only runs on failure.

**Green is half the proof.** A job that has never been seen to fail has not
been shown to gate anything. Phase 2 step 3 asks for a deliberately badly
formatted push that turns the Format check step red, and that is still
outstanding.

**One unexplained warning** appeared under Annotations on the run. Not yet
read. Worth reading once rather than learning to ignore it.

**Badge showed "no status" because the repo was private.** The URL was correct:
owner, repository, workflow filename and default branch all matched the remote.
GitHub renders README images through its camo proxy, which fetches without
credentials, so a private repository's badge endpoint returns 404 and the badge
falls back to "no status" for everyone, including the owner. Aditya is making
the repository public, which fixes it with no change to the README.

Checked before recommending that: nothing sensitive is committed. No `.env`, no
keys or tokens, and no exported data. The only tracked JSON is `tsconfig.json`.
Deadlines never reach the repository by design.

---

## 2026-09-15: CI proven to fail, and a papercut it exposed

**The badge was confirmed rather than trusted.** Once the repository went
public, fetching the badge endpoint anonymously returned "passing", which is
what "no status" had been hiding.

**CI was then proven to gate, not just to run.** A one-line whitespace change
was pushed on purpose. The GitHub API for that run reports: Typecheck green,
Lint green, **Format check failed**, and unit tests, Playwright install,
end-to-end and build all skipped. The failure-only report upload ran.

The change was whitespace inside an existing used line rather than a stray
`const`, deliberately. A stray `const` trips `noUnusedLocals` in Typecheck,
which runs first, so the job would have died before Format check executed and
proven nothing about the formatting gate.

Reverted in `a3ce48e`.

**The revert exposed a real local papercut.** `format:check` still failed after
reverting, and the cause was line endings, not the revert. `core.autocrlf=true`
plus `* text=auto` in `.gitattributes` means git hands Windows a CRLF working
copy, while Prettier defaults to `endOfLine: "lf"`. CI never saw it, because
Linux checks out LF. Locally it would have failed after every revert, branch
switch and merge.

Fixed with `"endOfLine": "auto"` in `.prettierrc`. The repository still stores
LF, because `.gitattributes` normalises on commit, so Prettier checking line
endings as well was redundant and was the thing producing the false failure.

Worth noting how this surfaced: the CI failure test found a bug that was not
the bug it was testing for.

---

## 2026-09-15: version 2 begins, with the migration

Aditya widened the product: goals, activities, class information, a date
selector and a sidebar, with the four dashboard screenshots as the
specification. Written up as eight new stories with IDed acceptance criteria in
[product/v2-plan.md](product/v2-plan.md). "Activities" reads as the daily reflection log, which
is the series the reference app's Trends screen plots.

**The migration landed first, before any feature that needs it.** `Database`
goes to version 2 with `goals`, `courses` and `reflections`, and items gain
`goalId` and `courseId`. `upgrade` in `src/domain/migrate.ts` is pure and
idempotent, with seven tests of its own. Both `load` and `parseImport` route
through it, so a version 1 database in the browser and a version 1 export file
taken this morning both still open.

212 unit and component tests, 58 Playwright specs, all six gates green.

**A real bug, caught by an existing test.** The first version of `load`
rebuilt the database from `version` and `items` alone, which silently discarded
goals, courses and reflections on every read. The round-trip test in
`db.test.ts` failed immediately: save wrote five collections, load returned two.
`load` now reads each collection explicitly.

That test was written for US-09 and had nothing to do with migrations. It
caught this anyway, which is the argument for round-trip tests over field-by-field
ones.

**Tests that changed, and why each was legitimate.** Four unit tests and two
Playwright specs asserted `version: 1` or built v1 database literals. Those
encode the old data model, and the model changed by an approved story, so
updating them is correct rather than convenient. One is worth naming: a test
called "a file from a different version is refused" used version 2 as its
example of an unreadable version. Version 2 is now the current version, so the
test needed a genuinely unknown one and moved to version 3.

**Next in M4.** US-13 the sidebar, US-07 courses, US-19 the date picker.

---

## 2026-09-15: US-19, the date picker

**Shipped.** The typed due-date field is now a native date control with an
optional time control beside it. `toDueAt` replaces `parseDueDate`, which is
deleted along with its month-name table, its time splitter and about twenty of
its tests. 202 unit and component tests, 60 Playwright specs, all six gates
green.

Net effect on the codebase is a deletion. `dates.ts` lost more than it gained.

**AC-01.4 is superseded by AC-19.1 through AC-19.4,** which is recorded in
[v2-plan.md](product/v2-plan.md). Typing "oct 3 2pm" no longer works, and that
was a deliberate trade Aditya asked for.

**The form is five controls now, not four.** Phase 4 capped it at four, and the
time control breaks that cap. The constraint existed so adding an item stays one
screen and stays fast, which five controls on one row still satisfies. The
alternative was `datetime-local`, a single control, but it forces a time on
every item and most deadlines are a day rather than a moment.

**A real finding from the browser, not from a test.** Chromium exposes each
segment of a date or time control as its own tab stop, so the picker added
roughly six stops to the keyboard path between the title and the Add button.
The US-05 keyboard spec had counted tabs; it now presses Tab until the control
it wants has focus and asserts reachability, because a fixed count encodes a
browser detail rather than the requirement. Worth watching: US-05 exists because
Aditya wants to add and finish an item without the mouse, and the picker made
that path longer.

**Three smaller things the browser caught.** The five fields wrapped Priority
and Add onto a second row until the flex basis stopped the controls stretching.
`<input type="time">` rejects "9:00" and needs "09:00". And a native date
control takes locale-ordered digits rather than an ISO string, so the keyboard
spec types month, day, year.

**Next in M4.** US-07 courses, then US-13 the sidebar.

---

## 2026-09-15: US-07, course reference cards

**Shipped.** A courses view with a card per course, a course control on every
item, and deletion that keeps the work. 230 unit and component tests, 67
Playwright specs, all six gates green.

**Deleting a course is the only part with real logic,** so `deleteCourse` in
`src/domain/courses.ts` is pure and tested without a DOM: the course goes, its
items stay, and their `courseId` returns to null, which is exactly the state an
item has before it is assigned. Adding a course is a one-liner in `App` and did
not earn a module.

**AC-20.3 arrived early,** because deleting without asking is how you lose a
term's work to a misclick. The trigger names the course, the confirmation says
"Delete CSE 100? Its items stay.", and nothing is removed until you answer.

**The course control only renders once a course exists.** An empty select on
every row would join the tab order and lengthen the keyboard path for someone
who never uses courses, which is the same cost US-19 just paid with the date
picker.

**Navigation is a plain tab row for now,** not the sidebar. US-13 replaces it
once Goals and Reflections exist to put in it. The view state it introduces is
the part that survives.

**A fifth selector collision, same family as the others.** The confirmation
line contains the course name, so `getByText('CSE 100')` matched both the card
heading and the question. Course names in the specs now go through
`getByRole('heading')`. Every collision this session has come from adding
user-visible text that contains something a selector already matched.

**Still open from the interview.** The class schedule is not built. AC-07.1
lists four details and a weekly schedule is recurrence machinery, which is
deferred.

**Next in M4.** US-13, the sidebar.

---

## 2026-09-15: US-13, the sidebar, closing M4

**Shipped.** A `Shell` component with the dark sidebar from the reference
screenshots: app name, inline SVG icons, an accent bar on the current item, and
content beside it. 243 unit and component tests, 73 Playwright specs, all six
gates green. M4 is complete: US-19, US-07, US-13.

**AC-13.1 is met for the views that exist, not for four.** The criterion lists
Home, Goals, Courses and Reflections. Goals and Reflections are M5 and M6. A nav
item leading to "not built yet" is chrome pointing nowhere, which is exactly why
[ui-reference.md](../design/ui-reference.md) rejected the sidebar in v1. Adding
each one is a single entry in `VIEWS` when its view lands.

**No test changed when the tab row became a sidebar.** The Shell kept every
accessible name and the nav's position in the tab order, so all 239 tests that
existed beforehand stayed green. That was the point of building the view state
during US-07 and the chrome separately.

**The sidebar has its own colour tokens** and stays dark in both schemes, as in
the reference. They are real tokens rather than inline hex, so
`contrast.test.ts` now checks the sidebar's two text colours against its
background along with everything else. Thirty-two pairs pass.

**The icons are decorative.** Inline SVG paths, `aria-hidden`, nothing fetched,
and a test asserts the accessible name of each item is just its label. An icon
that announced itself would read the item twice.

**Verified in both schemes and checked in the DOM rather than by eye.** A
screenshot appeared to show Home still highlighted while Courses was open;
reading `aria-current` back showed Courses correctly marked, and the highlight
was the mouse hover state.

**Next.** M5: US-14 goals, US-15 progress, US-20 deletion.
