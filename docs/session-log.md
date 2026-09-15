# Session log

Newest first. What happened, what broke, what to pick up next.

During the three days of real use required by
[definition-of-done.md](definition-of-done.md), this is also where you record
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
Written up in [ui-reference.md](ui-reference.md) with what transfers, what does
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
