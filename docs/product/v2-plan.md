# Version 2: the personal dashboard

Scope derived from the four dashboard screenshots in
[../design/ui-reference.md](../design/ui-reference.md) plus Aditya's brief: goals, activities, class
information, a date selector, and a sidebar. All of it is built.

Version 1 tracked deadlines. Version 2 is the dashboard those screenshots show.

## Reading the screenshots as a specification

| Screen in the reference | What it is                                                                                        | What it becomes here                              |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Home                    | Tasks remaining today, completed yesterday, today's task list                                     | The v1 dashboard plus a stat row                  |
| Goals                   | Goal cards with a target date, description and progress bar; tasks belonging to the selected goal | Goals, with items attached                        |
| Health                  | "How are you today?" on a five point scale, past reflections                                      | A daily reflection: how the day went, plus a note |
| Trends                  | Series plotted over time against goals                                                            | Reflections and completions over time             |

"Activities" reads as the reflection log: the thing you add to daily and look
back at, which is what the Trends screen plots. That is the reading the
screenshots support, so it is the one being built.

The quote of the day, time until sunset, productivity donut and "Want Advice?"
are not being built. Each needs data the app does not have, and two of them need
a network request, which the security posture forbids.

## New data

```ts
export interface Goal {
  id: string;
  name: string; // "SAAS"
  description: string; // "Passive income generating software company"
  targetAt: string; // UTC instant
  createdAt: string;
  archivedAt: string | null;
}

export interface Course {
  id: string;
  name: string; // "CSE 100"
  meetingLocation: string; // "Center Hall 101"
  professorEmail: string;
  officeHours: string; // "Tue 2-4pm, CSE 3108"
  createdAt: string;
}

export interface Reflection {
  id: string;
  /** Local calendar day, "2026-09-15". One per day, so this is the key. */
  day: string;
  /** 1 terrible to 5 great, matching the five faces in the reference. */
  score: 1 | 2 | 3 | 4 | 5;
  note: string;
  createdAt: string;
}

export interface Item {
  // ...every v1 field, plus:
  goalId: string | null;
  courseId: string | null;
}

export interface Database {
  version: 2;
  items: Item[];
  goals: Goal[];
  courses: Course[];
  reflections: Reflection[];
}
```

Goal progress is derived, never stored: done items over total items for that
goal. Storing it would let it drift.

## The migration

Version 1 files and version 1 databases already exist, including any export
Aditya has taken. Import and load both upgrade them: add three empty
collections, and `goalId` and `courseId` as null on every item.

This is the project's first migration. It gets tests before any feature does,
and the round-trip test grows a case that imports a v1 file into a v2 app.

## New stories

Existing v1 stories keep their IDs. US-08, the category filter, stays deferred.

---

```
US-13  As someone with four things to look at instead of one,
       I want a sidebar I can move between,
       so that goals, courses and reflections each have a home.

Priority: Must
Acceptance criteria:
  AC-13.1  Given the app is open,
           when I look at the sidebar,
           then I see Home, Goals, Courses and Reflections, and the current
           one is marked as current.
  AC-13.2  Given I am on Home,
           when I activate Goals,
           then the goals view replaces the dashboard and the sidebar marks
           Goals as current.
  AC-13.3  Given any view is open,
           when I press Tab from the top of the page,
           then focus reaches every sidebar item in the order displayed.
  AC-13.4  Given I reload the page,
           when it opens,
           then I am on Home.
```

---

```
US-14  As someone who wants to get somewhere this term, not just survive it,
       I want to record a goal with a description and a target date,
       so that the work has something to belong to.

Priority: Must
Acceptance criteria:
  AC-14.1  Given the goals view is open,
           when I save a name, a description and a target date,
           then the goal appears in the list with all three shown.
  AC-14.2  Given the goals view is open,
           when I submit with no name,
           then no goal is created and the name field shows a message.
  AC-14.3  Given a goal exists,
           when I reload the page,
           then the goal is still there.
  AC-14.4  Given no goals exist,
           when I open the goals view,
           then an empty state with an add action is shown.
```

---

```
US-15  As someone who cannot tell progress from a list of tasks,
       I want each goal to show how much of its work is finished,
       so that I can see which goal is stalling.

Priority: Must
Acceptance criteria:
  AC-15.1  Given a goal with four items, one of them done,
           when I open the goals view,
           then that goal shows 1 of 4 and a bar filled one quarter.
  AC-15.2  Given a goal with no items,
           when I open the goals view,
           then it shows 0 of 0 and an empty bar, not a division error.
  AC-15.3  Given I mark one of a goal's items done,
           when the goals view renders,
           then the count and the bar move without a reload.
  AC-15.4  Given an item belongs to a goal,
           when I look at it on the dashboard,
           then the goal name is shown on the item.
```

---

```
US-16  As someone deciding whether today is going badly,
       I want a count of what is left today and what I finished yesterday,
       so that I get the answer before reading any list.

Priority: Should
Acceptance criteria:
  AC-16.1  Given three open items due today and two done today,
           when I open Home,
           then it shows 3 remaining today.
  AC-16.2  Given two items were completed yesterday,
           when I open Home,
           then it shows 2 completed yesterday.
  AC-16.3  Given nothing is due today,
           when I open Home,
           then it shows 0 remaining today rather than hiding the row.
```

---

```
US-17  As someone who wants to know whether the bad weeks have a pattern,
       I want to record how each day went, on a five point scale with a note,
       so that there is something to look back at.

Priority: Must
Acceptance criteria:
  AC-17.1  Given I have not recorded today,
           when I open Reflections,
           then I am asked how today went, with five choices.
  AC-17.2  Given I choose a score and save,
           when I reload,
           then today's entry shows the score I chose.
  AC-17.3  Given I already recorded today,
           when I choose a different score,
           then today's entry is replaced, not duplicated.
  AC-17.4  Given entries exist for previous days,
           when I open Reflections,
           then they are listed newest first with their scores and notes.
```

---

```
US-18  As someone who cannot see a pattern in a list,
       I want my reflection scores and completed items plotted over time,
       so that a bad fortnight is visible rather than remembered.

Priority: Should
Acceptance criteria:
  AC-18.1  Given reflections exist on several days,
           when I open Trends,
           then a line is plotted with one point per day that has an entry.
  AC-18.2  Given items were completed on several days,
           when I open Trends,
           then a second series shows completions per day.
  AC-18.3  Given fewer than two days of data,
           when I open Trends,
           then a message says there is not enough yet, and no empty axes are
           drawn.
  AC-18.4  Given the chart is on screen,
           when I read it with a screen reader,
           then a table of the same numbers is available.
```

---

```
US-19  As someone adding items on a laptop every day,
       I want to pick a date rather than type one,
       so that entering something is a click instead of a spelling test.

Priority: Must
Supersedes: AC-01.4
Acceptance criteria:
  AC-19.1  Given the add form is open,
           when I use the due date control,
           then the browser's own date picker opens and the chosen date is
           used.
  AC-19.2  Given I pick a date and leave the time empty,
           when I submit,
           then the item is due at 23:59 local on that day.
  AC-19.3  Given I pick a date and a time,
           when I submit,
           then the item is due at that local time, stored as a UTC instant.
  AC-19.4  Given the date control is empty,
           when I submit,
           then no item is created and the field shows a message.
```

---

```
US-20  As someone whose courses change every quarter,
       I want to delete a goal or a course without losing its items,
       so that cleaning up does not destroy work.

Priority: Must
Acceptance criteria:
  AC-20.1  Given a goal with three items,
           when I delete the goal,
           then the items remain and their goal field is cleared.
  AC-20.2  Given a course with three items,
           when I delete the course,
           then the items remain and their course field is cleared.
  AC-20.3  Given I activate delete,
           when the confirmation appears,
           then nothing is removed until I confirm.
```

---

US-07, already written, is unchanged and joins this set.

## Decisions I am making rather than asking about

**The date control replaces typed dates, and AC-01.4 retires with it.** You
asked for a selector instead of typing. Native `date` and `time` inputs give a
picker, keyboard entry, locale handling and validation for nothing, which is
better than a parser I maintain. `parseDueDate` and roughly twenty of its tests
go. `formatDue`, `groupOf` and `isUpcoming` stay, and so does the rule that only
`dates.ts` constructs a `Date`.

**No chart library.** Two line series on a shared axis is about sixty lines of
inline SVG. Recharts or Chart.js would each be a dependency that can read your
deadlines, for a feature with two series. If the charts grow past this, that is
the moment to ask.

**No router.** Four views, one `useState` in `App`, and reloading returns you to
Home. `location.hash` is the upgrade if that irritates you.

**Reflections are one per day, keyed by local calendar day.** Recording twice
replaces rather than appends, which is what AC-17.3 asks for and what keeps the
Trends series one point per day.

**No bell, no avatar, no greeting.** The reference has a notification bell with
a red count. We have no notifications, and drawing a bell that never rings
misrepresents the one thing the app cannot do. The avatar has no account behind
it.

## Milestones

Each one runs and is worth using before the next exists.

**M4: the shell, courses and the date picker.** US-13, US-07, US-19, and the
version 2 migration underneath all of it. You can navigate, keep class details,
and pick dates.

**M5: goals.** US-14, US-15, US-20. Goals with progress, items attached, safe
deletion.

**M6: reflections and the stat row.** US-17, US-16.

**M7: trends.** US-18.

The migration lands first, inside M4, with its own tests before any feature
uses it.

## What this changes about v1

`CLAUDE.md` says courses, filtering and recurrence are not in v1 and not to be
built toward. Version 2 supersedes that for courses. Recurrence and category
filtering stay out, and phone notifications stay out, which means the app still
only reminds you while it is open.

The definition of done carries over unchanged: every acceptance criterion gets a
test naming its ID, all six gates green, and each story driven in a real browser
before you see it.

## What I need from you

Approve the story set, or strike the ones you do not want. Then I start M4 with
the migration.

---

# US-21, a calendar view

Written in response to Aditya asking about a calendar. Approved and built on
15 September 2026.

## Why this one is grounded where the others are not

The deferred candidates (category filtering, recurrence, calendar export) are
guesses. This one is not. From the interview:

> "before a college term starts I like to put the midterms and finals on a
> calendar"

That is a habit he already has, described in his own words, and the app cannot
support it. The four urgency groups answer "what do I do next" and cannot answer
"what does October look like", which is the question you ask while planning a
term rather than surviving a day.

It also earns the sidebar slot in a way the others would not: a month is a
different way of seeing the same items, not a new kind of thing to maintain.

## What it is

A month grid on a new sidebar view, one cell per day, items shown on the day
they are due. Move between months. Nothing new is stored: it reads the items
already there.

```
US-21  As someone who plans a term before it starts,
       I want to see my deadlines laid out as a month,
       so that I can tell a heavy week from a light one before it arrives.

Priority: Should, built
Acceptance criteria:
  AC-21.1  Given items due on several days this month,
           when I open the calendar,
           then each appears in the cell for the day it is due.
  AC-21.2  Given the calendar is open,
           when I look at it,
           then today's cell is marked as today.
  AC-21.3  Given the calendar is open on September,
           when I move to the next month,
           then October is shown and the items shown are October's.
  AC-21.4  Given a day has more items than the cell can show,
           when I look at that day,
           then the cell says how many more there are rather than clipping
           them silently.
  AC-21.5  Given a month has no items at all,
           when I open it,
           then the grid still renders, with no items rather than an error.
  AC-21.6  Given an item is marked done,
           when I look at the calendar,
           then it is not shown, matching the dashboard.
```

## Decisions to make before building

**A month grid, not an agenda list.** An agenda is what the dashboard already
is. The grid is the thing that makes a heavy week visible as a shape.

**What a cell shows.** Titles truncate fast in a 7-column grid. Proposal: the
day number, then up to two item titles, then "+2 more". AC-21.4 covers the
overflow so nothing disappears quietly.

**Moving between months** needs one piece of state and two buttons. Opening
always starts on the current month, matching how the sidebar already forgets
which view you were on after a reload.

**No dependency.** A month grid is date arithmetic plus a CSS grid of seven
columns, roughly sixty lines. `date-fns` would be a package to compute the first
weekday of a month.

**Not in scope:** clicking a day to add an item prefilled with that date, and
dragging an item to another day. Both are reasonable and neither is in an
acceptance criterion. If the first turns out to matter it is a small follow-up.

## What it does not fix

A calendar still only shows you anything while the app is open. It makes term
planning possible, which is real, and it does not address forgetting, which is
what the missed assignment and the missed appointment came from. Calendar
export, the deferred one, is still the only candidate that does.

---

# US-22, a row you can read at a glance

Approved on 15 September 2026, from a choice Aditya was given between leaving
the row alone, setting course and goal at add time only, and this.

## The problem

An item row carries a done control, a title, a due time, a Soon marker, a
category tag, a course select, a goal select and a note field. Nine things. The
goal name truncates, and the reference screenshots put a single coloured tag on
a task row rather than two dropdowns.

Nothing is broken and no acceptance criterion fails. What fails is the
three-second test: the dashboard is meant to be readable at a glance, and a row
with two dropdowns in it reads as a form.

```
US-22  As someone checking the dashboard in three seconds,
       I want a row to show what a thing is rather than how to change it,
       so that scanning the list is reading and not editing.

Priority: Should, built
Acceptance criteria:
  AC-22.1  Given an item belongs to a course,
           when I look at the list,
           then the course name is shown on the row.
  AC-22.2  Given an item belongs to no course,
           when I look at the list,
           then no course is shown on the row, and no empty control either.
  AC-22.3  Given the list is showing,
           when I have not opened an item,
           then no course select, goal select or note field is on screen.
  AC-22.4  Given an item is closed,
           when I click its title,
           then the course select, the goal select and the note field appear.
  AC-22.5  Given an item is open,
           when I click its title again,
           then those controls are hidden.
  AC-22.6  Given an item row,
           when a screen reader reads its title,
           then the title says whether the item is open or closed.
  AC-22.7  Given a note was written on an item,
           when the item is closed,
           then the note text is still shown, so nothing written disappears.
  AC-22.8  Given the list is showing,
           when I mark something done from the keyboard,
           then it takes the same keystrokes it did before.
```

## Decisions

**The title is the control.** Not a separate chevron, which would be a tenth
thing on the row. Clicking the title opens the item, which is what Aditya chose,
and a button carrying `aria-expanded` is the standard disclosure pattern rather
than a div with a click handler.

**Done stays its own button,** outside the disclosure, so US-05's keyboard path
is untouched: Tab reaches Done directly and nothing has to be opened first.

**The note is shown when closed and editable when open.** Hiding a note you
wrote behind a click would trade one problem for a worse one.

**Chips are spans, not selects.** A course with no value renders nothing at all,
so an item with no course costs no width and no tab stop.

---

# US-23, a sidebar that fits a phone

Found while checking the calendar on 15 September 2026, and confirmed to predate
it: the numbers are identical on Home. Approved and built the same day, with the
third option below.

## What is wrong

The page has a hard minimum width of 592px. Below that it does not reflow, it
scrolls sideways.

| Viewport              | Page width | Off screen |
| --------------------- | ---------- | ---------- |
| 320px, iPhone SE      | 592px      | 272px      |
| 375px                 | 592px      | 217px      |
| 390px, iPhone 15      | 592px      | 202px      |
| 430px, iPhone Pro Max | 592px      | 162px      |
| 600px                 | 600px      | none       |

On the phone Aditya actually carries, a third of the page is off the right edge,
including the Export and Import controls and the right end of every item row.

## The cause is one missing declaration

`@media (max-width: 700px)` already turns the shell into a single column and
lays the nav out as a row. That row is `flex-wrap: nowrap`, and the six items
measure 568px together. Add the sidebar's 24px of padding and the page cannot go
below 592px however narrow the screen is.

It was invisible while there were two views. US-13 added the sidebar with four,
US-21 made it six, and nothing re-measured.

```
US-23  As someone who checks this on a phone between classes,
       I want the page to fit the screen,
       so that I can read a deadline without dragging the page sideways.

Priority: Should, built
Acceptance criteria:
  AC-23.1  Given a 320px wide screen,
           when the app loads,
           then the document is no wider than the screen.
  AC-23.2  Given any viewport from 320px to 1400px,
           when the app loads,
           then there is no horizontal scrollbar on the page.
  AC-23.3  Given a narrow screen,
           when I look at the sidebar,
           then every one of the six views is reachable without scrolling
           the page sideways.
  AC-23.4  Given a narrow screen,
           when a screen reader reads the sidebar,
           then each item still announces its name.
  AC-23.5  Given a wide screen,
           when the app loads,
           then the sidebar is unchanged from what it is today.
  AC-23.6  Given a narrow screen,
           when I look at the sidebar,
           then it is no taller than the row of icons in it.
```

## Three ways to do it, and they differ in what they cost

**Wrap the row.** `flex-wrap: wrap` on `.sidebar__nav`. One declaration. Six
items become two rows of three. Costs roughly 40px of vertical space above the
content on the view that matters most, and the nav grows another row the next
time a view is added.

**Scroll the nav instead of the page.** `overflow-x: auto` on the nav. Also
about one declaration, keeps a single row, and the page stops overflowing. But
destinations sit off the edge with nothing saying so, which is the failure the
sidebar was added to avoid.

**Icons only below the breakpoint.** Hide the labels with the
`.visually-hidden` class US-21 already added, leaving the six icons the nav
already draws. Six icons at roughly 32px each is 192px, which fits a 320px
screen in one row with room to spare. AC-23.4 is why the labels are hidden
visually rather than deleted: the accessible name survives untouched.

**The third was chosen.** It is the only one that keeps every destination
visible, in one row, with no vertical cost, and it scales to a seventh view.

I said it would need no component change and that was wrong. A bare text node
cannot be targeted by CSS, so the label is now wrapped in a
`<span className="sidebar__label">`. One line, but a component change.

## What the fix actually took

Hiding the labels moved the floor from 592px to 324px, four pixels short. The
rest was a second bug in the same rule: the narrow layout said
`grid-template-columns: 1fr`, and a `1fr` track still refuses to shrink below
its content's minimum. The desktop rule had used `minmax(0, 1fr)` since US-13
and the narrow one never did, so a single wide child could push the page past
the screen no matter what the sidebar did.

Two declarations, in other words, not one. The measurement is what found the
second; the first fix looked right and the page still did not fit.

A third came out of looking at the result rather than the numbers. With the
layout in two rows, the grid's default `align-content: stretch` split the spare
page height between them, so the sidebar became an 82px band of empty colour
above the content. `grid-template-rows: auto minmax(0, 1fr)` pins it to its
icons. That one predates this story and no test would have caught it, because
nothing was overflowing. It is AC-23.6 now.

## One thing to tidy while in there

US-21 added `@media (max-width: 720px)` for the calendar while the shell has
used `700px` since US-13. Two breakpoints 20px apart is an accident, not a
decision. Whichever option is chosen, these should become one value.

## Not in scope

A hamburger menu, a drawer, or anything that hides the nav behind a tap. Six
destinations fit on a phone; a disclosure would be chrome hiding chrome.

---

# US-24, deadlines on the phone calendar

Written and built 15 September 2026, with VEVENT and a 30 minute event.

## Why this one and not notifications

From the interview, two failures cost something real: a missed assignment and a
missed appointment. Everything built since helps you see what is coming once the
app is open, and the app still only reminds you while it is open. That
limitation is in the README rather than buried, and nothing has moved it.

Push notifications would move it and cannot be built: they need a server, a
subscription endpoint and a network request, and the security posture forbids
all three.

An `.ics` export moves it anyway. It is a file the browser writes, the same path
the JSON export already takes, with no server and no network request. You import
it once into the phone calendar you already carry, and the phone does the
reminding. The lazy version of notifications is the calendar you already have.

```
US-24  As someone who misses things that are not in front of him,
       I want my deadlines as a calendar file,
       so that the phone I already carry reminds me without this app running.

Priority: Should, built
Acceptance criteria:
  AC-24.1  Given I have open items,
           when I export a calendar,
           then I get a .ics file containing one event per open item.
  AC-24.2  Given an item is done,
           when I export a calendar,
           then it is not in the file.
  AC-24.3  Given an item due at 11:59pm Pacific,
           when the file is read in another timezone,
           then the event is at the same instant, not the same wall clock.
  AC-24.4  Given a title containing a comma, a semicolon, a backslash or a
           newline,
           when I export,
           then the file is still valid and the title survives intact.
  AC-24.5  Given a title longer than 75 characters,
           when I export,
           then the line is folded and the title still reads correctly.
  AC-24.6  Given I export, import to my phone, then export and import again,
           when I look at the calendar,
           then each item appears once, not twice.
  AC-24.7  Given an exported file,
           when a calendar application reads it,
           then it parses without error.
  AC-24.8  Given there are no open items,
           when I export a calendar,
           then I get a valid empty calendar rather than a broken file.
```

## Decisions, and two that need you

**VEVENT or VTODO.** A deadline is semantically a to-do with a due date, which
is exactly what `VTODO` is for. The problem is that Apple Calendar does not
import `VTODO` at all; it belongs to Reminders. `VEVENT` is understood by every
calendar application on every phone.

- **VEVENT** works everywhere, but a deadline shows up as an appointment, which
  is a small lie about what it is.
- **VTODO** is honest and lands in Reminders on an iPhone, where you may or may
  not look at it.

`VEVENT` was chosen: the whole point is that the reminder reaches you, and a
thing you see is better than a thing that is correctly filed.

**How long is a deadline.** A due date is a moment, not a span. Zero-length
events are legal and rendered badly by several clients, some of which drop them.
Options: a 30-minute event ending at the deadline, or an all-day event on that
date. Thirty minutes keeps the time visible, which matters for a 5pm rent
deadline; all-day loses it. Thirty minutes ending at the due time was chosen.

**A reminder inside the file.** One `VALARM` at `TRIGGER:-PT1H`. An hour is
enough to act on a submission and not so early it becomes noise. Without an
alarm the event is silent and the story fails at its own purpose.

**Stable UIDs, which is what AC-24.6 rests on.** The `UID` is the item's own id
plus an `@personal-tracker` suffix. Re-importing then updates the existing event
instead of creating a second one, which is the same property that makes
importing your own JSON export twice a no-op.

**Timezones need nothing, and that is the payoff.** Every `dueAt` is already a
UTC instant, so the file emits `DTSTART:20260916T235900Z` and carries no
`VTIMEZONE` block at all. The decision made in US-01 to store instants rather
than wall-clock times is what makes this three lines instead of a timezone
database.

## Two things that will bite

**The format requires CRLF line endings.** RFC 5545 is explicit, and clients do
reject files with bare newlines. This repo already has a CRLF story: Git is set
to `autocrlf=true` and Prettier to `endOfLine: auto`. The generator must emit
`\r\n` itself rather than inheriting whatever the platform does, and a test must
assert the bytes.

**Text fields need escaping and folding.** A comma, a semicolon or a backslash
in a title corrupts the file if passed through, and lines over 75 octets must be
folded with a CRLF and a leading space. AC-24.4 and AC-24.5 exist because a
title like `Lab 3: read ch. 4, 5; write up` is an ordinary thing to type, not an
edge case. This is the same discipline as treating the import file as hostile,
pointed the other way: the app must not write a broken file out.

## Scope

**In:** a second button beside Export, one `.ics` file, open items only.

**Out:** subscribing to a live feed, which needs a server and a URL and is the
thing the security posture rules out. Also out: importing `.ics`, exporting
goals or reflections, and two-way sync. A file you carry to your phone is the
whole story.

**One more thing to do while in there:** `.gitignore` blocks
`personal-tracker-*.json` by pattern so an export cannot be committed. It must
block `personal-tracker-*.ics` too, and for the same reason. A calendar file
naming a doctor's appointment is the same information as the JSON.

## What it took

`src/domain/ics.ts`, about 140 lines, and two helpers in `dates.ts`. No
dependency: an iCalendar file is string work, and a library for it would be a
package that can read your deadlines.

Both predicted bites landed. The CRLF is written by the module rather than
inherited, and a test asserts no bare newline survives anywhere. Escaping and
folding each needed their own care, and folding needed more than expected:
cutting at byte 75 lands inside a multibyte character, so the fold walks code
points and counts their encoded length rather than slicing the string.

One test was wrong and got corrected rather than the code. "An item with no note
carries no empty description" asserted that `DESCRIPTION:` never appears, but a
`VALARM` with `ACTION:DISPLAY` is required to carry one. The assertion now says
what it meant: no property with nothing after the colon.

The end to end spec decodes the downloaded file with `TextDecoder` rather than
`Buffer`, so the suite still typechecks without `@types/node`.

---

# US-25, changing your mind about an item

Found 18 September 2026 while planning something else, and built the same day.
This was a missing primitive rather than a feature.

## What is missing

An item can be marked done, given a note, attached to a course and attached to a
goal. It cannot be renamed, its date cannot be moved, and it cannot be deleted.
Courses and goals both have deletion, with a confirmation and safe unlinking.
Items never got it.

This is not hypothetical for a term that has already started:

- A professor moves a midterm by a week. There is no way to move the deadline.
- A title has a typo in it. It is permanent.
- An appointment is cancelled, or something was added twice. It stays on the
  dashboard and in the calendar export forever.

**The available workaround actively corrupts the data.** The only way to get an
item off the dashboard today is to mark it done, and done is not inert: it feeds
`completedYesterday` on the Home stat row, the "3 of 5 done" on a goal, and the
completions line on Trends. Clearing a mistake by lying about finishing it makes
every number the app shows slightly wrong, and it does so permanently, because
the item then cannot be deleted either.

The real escape hatch is Export, hand-edit the JSON, Import, Replace. That is a
text editor and a round trip to fix a typo.

```
US-25  As someone whose deadlines move and who types things wrong,
       I want to change or remove an item,
       so that the list stays true without lying about finishing something.

Priority: Must, built
Acceptance criteria:
  AC-25.1  Given an item is open,
           when I edit its title,
           then the new title is shown and survives a reload.
  AC-25.2  Given an item is open,
           when I change its due date or time,
           then it moves to the group and the calendar cell that date belongs
           to.
  AC-25.3  Given I clear the title and save,
           then the item is unchanged and the field says why, matching the add
           form.
  AC-25.4  Given an item is open,
           when I delete it,
           then it is asked about first, in the same words courses and goals
           use.
  AC-25.5  Given I confirm a deletion,
           then the item is gone from the dashboard, the calendar and the
           export, and does not come back after a reload.
  AC-25.6  Given I delete an item attached to a goal,
           when I look at that goal,
           then its progress no longer counts the deleted item.
  AC-25.7  Given I delete an item,
           when I look at the stat row and Trends,
           then nothing counts it as completed.
  AC-25.8  Given I decline the deletion,
           then nothing is removed.
```

## Decisions

**The controls go in the row that US-22 already opens.** That panel exists, it
already holds the things that change an item, and a row that opens to edit is
exactly where a rename belongs. No new view, no modal.

**Delete is confirmed, worded like the others.** `deleteCourse` and `deleteGoal`
both ask first and say what survives. An item deletion has nothing to reassure
you about, so the wording is shorter, but the shape matches.

**Delete really deletes.** Not an archive flag, not a tombstone. The database
has no concept of a hidden item and inventing one would mean every count, every
chart and the export all learning about it. If restoring a deletion turns out to
matter, `u` already exists as a pattern and it gets its own story.

**Editing the date reuses `toDueAt`.** The same two controls as the add form and
the same validation, so there is one definition of what a valid deadline is.

## What it took

`editItem` and `removeItem` on the hook, both one-liners over the existing
`mapItems` and `update` helpers, and the controls in the panel US-22 already
opens. No domain module: goal progress is derived by `progressOf` rather than
stored, so deleting an item corrects every count for free. An abstraction with
one caller would have been deleted anyway.

The label collision from US-24 turned up a third time, and the first fix for it
was wrong. Both the add form and the edit panel have a field called Title, so
`getByLabel('Title')` matched two inputs. Removing the edit panel's `<label>`
did not help, because Playwright also matches `aria-label` by substring and the
edit field's name is "Title for Pset 1", which contains "Title". The fix that
worked is `exact: true`, the same one the Export and Calendar collisions needed.
The markup change stayed anyway, on its own merit: each input now has one
source for its accessible name instead of two.

## Why this is a Must and bulk entry is not

Bulk entry makes the app faster to fill. This makes it possible to keep it
correct. A tracker you cannot correct stops being trusted the first time it is
wrong, and a tracker you do not trust is not consulted, whatever else it does.

---

# US-26, filling a term in one paste

Written and built 18 September 2026, after US-25. Aditya approved the strict,
previewed format below.

## Why

Every item is entered one at a time: a title, a date, a time, a category, a
priority, a submit. Five courses with ten deadlines each is fifty items and
roughly fifteen minutes of typing, and it lands at exactly the moment described
in the interview: sitting down before a term starts to put the midterms and
finals somewhere.

Entry cost is upstream of every other feature. A calendar with four items in it
looks empty, a goal with four items has meaningless progress, and Trends has
nothing to plot. Everything built so far assumes a full list and nothing helps
you get one.

```
US-26  As someone setting up a whole quarter at once,
       I want to paste a list of deadlines,
       so that filling the term is one action instead of fifty.

Priority: Should, built
Acceptance criteria:
  AC-26.1  Given a block of lines, each a date and a title,
           when I paste it,
           then I see what each line was understood as, before anything is
           saved.
  AC-26.2  Given the preview is showing,
           when I confirm,
           then every understood line becomes an item.
  AC-26.3  Given a line that cannot be read,
           when I paste,
           then that line is listed as not understood and the rest still work.
  AC-26.4  Given the preview is showing,
           when I cancel,
           then nothing is added.
  AC-26.5  Given a pasted line with no time,
           then the item is due at 23:59 that day, matching the add form.
  AC-26.6  Given text that is not a list at all,
           when I paste it,
           then I am told nothing was understood and nothing is written.
```

## The contradiction to resolve first

**US-19 deliberately removed typed dates.** It replaced "oct 3 2pm" with the
browser's own date control, on the grounds that entering something should be a
click rather than a spelling test, and `parseDueDate` was deleted. Bulk paste
needs to read dates out of text, which is the thing that was taken out.

These are not actually in conflict, but only if the difference is respected:

- US-19 is about the **daily path**, where guessing at what you meant is worse
  than a picker, because a wrong guess is silent and you use it every day.
- A paste is a **one-off, reviewed** action. AC-26.1 says nothing is written
  until you have seen what each line was understood as, which is the same shape
  as the import prompt: parse, show, confirm.

So the format is strict rather than clever. `2026-10-03 Read chapter 4` and
`2026-10-03 17:00 Rent`: an ISO date, an optional 24 hour time, then the title.
Anything else is reported as not understood rather than guessed at. No month
names, no "next Tuesday", no natural language. If a strict format turns out to
be too strict in real use, that is a thing real use will say.

**Aditya took the strict, previewed version.**

## Scope

**In:** one paste box, a preview, a confirm. Category and priority take the same
defaults the add form uses.

**Out:** reading a syllabus PDF, importing from Canvas, and anything that needs
a network request or guesses at prose. Those are a different product.

## What it took

`parseLines` in `src/domain/bulk.ts` is one regular expression and a loop.
`toDueAt` does the rest of the rejecting, so February 30th and 25:00 are refused
by the same code that refuses them in the add form rather than by a second
opinion about what a date is.

**The preview has no Preview button.** It is derived from whatever is in the box
on every render, which is one fewer control and makes AC-26.1 true by
construction: the Add button cannot be reached without the preview having
already rendered what each line was understood as.

**A batch action was necessary, not a nicety.** `addItem` closes over the
database it was rendered with, so calling it fifty times in a loop would have
written fifty items over the top of each other and kept the last. `addItems`
commits the whole list once. There is an end to end test that pastes twelve
lines and counts twelve distinct ids, because that is the failure this shape
prevents and a unit test on the parser would never have seen it.

**It lives beside Import, not under the add form.** Putting the button under the
form put it in the Tab order between Add and the first item, which broke the
US-05 keyboard path and was caught by that story's own test. The comment in
`App.tsx` already said why export sits after the list; a term-start action
belongs in the same place for the same reason.

---

# US-08, filtering the list to one category

Written in `user-research.md` before version 1 and deferred twice: out of the
MVP, then out of version 2. Built 18 September 2026, after US-26 made a fifty
item list a realistic thing to have.

The story and AC-08.1 and AC-08.2 are unchanged from the original. One was
added, because the original two do not cover what happens when a filter matches
nothing:

```
  AC-08.3  Given items exist but none match the filter,
           when I look at the list,
           then it says the filter is hiding them rather than showing the
           first-run empty state, and offers a way back to everything.
```

## Decisions

**Buttons with `aria-pressed`, not a select.** One click instead of two, and the
choice in force is visible without opening anything. Matches the score control
on Reflections.

**The filter is not stored.** AC-08.2 asks for a reload to show everything
again, which plain component state gives for free, and it is the right default:
a filter you forgot you set is a list that is lying to you.

**The stat row is not filtered.** "Remaining today" counts the day you are
having, not the view you are reading. Filtering to academic while a dentist
appointment is due today should not make the day look emptier than it is. This
is an assumption rather than something AC-08.1 settles.

**The control sits above the add form.** Between the form and the list would put
it in the Tab order between Add and the first item, which is the US-05 keyboard
path that US-26 broke once already.

## What this does not solve

The category is a two way split. After a pasted quarter, filtering fifty items
to "academic" leaves about forty five, which is not the question you were
asking. The question a term actually raises is "what do I owe CSE 110", and
items have carried a `courseId` since US-07.

Filtering by course is a different story and is not built. US-08 was specified
before courses existed, and widening it silently would have been a different
feature wearing an approved story's ID.
