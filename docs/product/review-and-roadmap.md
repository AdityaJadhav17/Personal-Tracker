# Where the product stands, and what comes next

Written 24 September 2026, the day Fall quarter started. Aditya asked for four
things: a snapshot of the product as it is, the five best problems from how
people struggle with personal trackers, a review of six qualities, and a plan
in order. Nothing here is approved yet. Each step becomes a story with its own
plan before any code.

## First, why your goals are not on the calendar

The calendar reads items and nothing else. US-21 defined it as "the same
items as the dashboard, laid out as a month", and `monthGrid` in
`src/domain/calendar.ts` takes a list of items. Goals have a target date, but
nobody put them on the calendar. So the gap comes from how US-21 was scoped,
not from a broken feature. Step 2 below closes it.

## Snapshot: what the product is today

**What it is.** A deadline tracker for one person, running on his own
laptop. School and life share one list. There are no accounts and no server,
and no data leaves the machine.

**What it does, as of `2959b07`:**

| Area        | What you can do                                                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home        | Add an item with a title, due date, optional time, category, priority and repeat. See it grouped as overdue, today, tomorrow, this week and later, with a count of what is left today and what you finished yesterday. |
| An item     | Open it to edit the title, date, time and repeat. Link it to a course or a goal, add a note, mark it done (`u` undoes), or delete it.                                                                                  |
| Filters     | Filter by category or by course.                                                                                                                                                                                       |
| Bulk        | Paste a list, one `2026-10-07 23:59 Title` per line.                                                                                                                                                                   |
| Calendar    | See a month. Drag an item to another day, or over Next and Previous month to cross months.                                                                                                                             |
| Goals       | Set a target date. Progress counts from the linked items.                                                                                                                                                              |
| Courses     | Record the meeting place, professor email and office hours.                                                                                                                                                            |
| Reflections | Rate the day from one to five and add a note.                                                                                                                                                                          |
| Trends      | A chart of completions against reflections.                                                                                                                                                                            |
| Data        | Export and import JSON (Replace or Merge). Export an `.ics` with a 30 minute alarm on every open deadline, for the phone's calendar.                                                                                   |
| Running it  | `npm run deploy` then `npm run live` serves it at `localhost:4180`. A Startup shortcut runs it at login, and Chrome shows it as an installed app.                                                                      |

**How it works:**

- The UI is React 18 and TypeScript, built by Vite.
- Everything the app knows is one JSON document in `localStorage`, written
  through two functions in `src/storage/db.ts`.
- The document is at version 3. Every load and every import passes through
  one migration per version in `src/domain/migrate.ts`.
- All the rules about dates, grouping, repeats, calendars and `.ics` live in
  `src/domain/`. That code never touches the screen or storage, and every
  function takes `now` as an argument, so the tests fix the clock. The v3
  server is meant to reuse this code unchanged.
- Every timestamp is a UTC instant. What you type is read in your own
  timezone.
- The one runtime dependency is React. The page's CSP only runs scripts from
  its own origin, and a Playwright spec fails if the page requests anything
  from another origin.

**In numbers:**

- About 10,400 lines of source and 1,283 lines of CSS.
- 574 unit and component tests and 176 Playwright specs. Coverage is 99.2% of
  statements and 95.6% of branches.
- About 415 bytes per item.

## Notion, and why this should not become it

Notion's strength is flexibility: build any database, page or template. In the
reports below, the same flexibility is what makes people stop using it. Every
new database is another thing to fill in or feel guilty about. Templates end
up taking more upkeep than they save. People spend twenty minutes tidying the
system for every five minutes of work.

So "Notion, but personalised" should mean the opposite of Notion's design.
The app decides the structure, so you never maintain it. Your deadlines,
courses and habits are the only schema there is, and the app does the
organising. Every feature below is judged by whether it removes work from
you, not whether it adds a place to put things.

## The five problems worth solving

These come from what people report when trackers fail them, filtered through
two questions: does it happen to you, and can this app fix it without
breaking the security posture?

### 1. Getting the term in costs so much that people never finish

**What people report.** The failure is "almost always too much upkeep", and
large templates take more time to keep up than they save. Student planners
work when kept small. Entry is where they die.

**Where you hit it.** Your quarter went in because I read three PDFs and
built a file by hand. Next quarter you will face the same work. The CSE 123
schedule page already has a "Download iCal File" button. Canvas publishes
a calendar feed of every assignment.

**What to build (US-43).** Import an `.ics` file. You download it from Canvas
or a course site, the app reads each event into an item, shows you the list
to confirm, and merges it in. The app itself still makes no network request,
because you do the download.

### 2. Overdue items pile up until the app is avoided

**What people report.** Opening the app to a wall of overdue items turns
every morning into guilt management. The longer the list, the more
overwhelming it feels, and people stop opening it.

**Where you will hit it.** The overdue group only grows. Nothing asks you to
decide anything about an item that has passed.

**What to build (US-44).** When something is overdue, the app asks once per
item: done, tomorrow, pick a day, or drop it. Four buttons, one decision each,
and the pile never builds.

### 3. Big work is ignored until the week it is due

**What people report.** Without a plan, students work on whatever is most
recent or most urgent, and long projects get ignored until the deadline is
close. The fix everyone recommends is milestones with their own dates.

**Where you will hit it.**

- CSE 123 Project 2b is one line due 11/30. It was released 11/16, and
  nothing reminds you of it in between.
- The week of 10/26 has two midterms, a project and an exam window closing,
  and the calendar can only show two titles a day.

**What to build (US-45).** Two parts:

- Milestones under an item: steps with their own dates that feed the item's
  progress. This is reading C from US-39, the "work on it" day, done
  properly. It needs database version 4.
- A load shade on each calendar week, so a heavy week is visible a month
  ahead.

### 4. Your data lives in one copy, and people fear losing it

**What people report.** People worry about lock-in, exports that leave
things out, and "renting access to your own thoughts". Local-first apps
answer this with open formats and automatic backups.

**Where you stand.** Lock-in is already solved: the export is readable JSON,
and Import brings it back exactly. The weak point is that there is one copy.
It lives in Chrome's storage for `localhost:4180`. Clearing site data or
losing the Chrome profile takes everything, and nothing prompts you to
export.

**What to build (US-40).**

- Ask Chrome to treat the storage as persistent. That is one call,
  `navigator.storage.persist()`.
- Show "last backup 9 days ago" once it has been a week, with Export next
  to it.

### 5. Too many alerts teach you to ignore all of them

**What people report.** The average person gets dozens of notifications a
day. When everything is an alarm, nothing is. People learn to dismiss alerts
automatically.

**Where you will hit it.** Your `.ics` gives all 18 syllabus deadlines the
same 30 minute alarm, from "book PrairieTest" to the CSE 120 final. By
November you will be swiping them away unread.

**What to build (US-46).** Alarms by priority:

- A high priority item, like every exam, gets an alarm a day before and
  another an hour before.
- A normal item gets one alarm, the evening before at 8pm.
- A low priority item gets none.

This also sets the design rule for the v3 nudges: a few, batched into the
morning summary (US-33), never one per item.

**Considered and left out.** Mobile capture and offline use top most Notion
complaints. That is phase two of the v3 plan, already written and waiting on
the spike, so it is not repeated here.

## The six qualities

Each has an honest assessment of where it stands and the smallest change that
would improve it.

### Accessibility

**Strong already:**

- A test fails the build if a colour pair drops below WCAG contrast.
- Every control has a label, driven by roles in the tests.
- `role="status"` and `role="alert"` regions announce changes.
- Calendar cells read out the full date.
- There is a `prefers-reduced-motion` rule and a visible focus ring.

**Gaps:**

- Moving a deadline on the calendar needs a mouse, and calendar items cannot
  be opened.
- Items behind "2 more" cannot be reached at all.
- There is no skip link past the sidebar.
- Nothing checks the whole page automatically. The contrast test only covers
  colours.

**Improve:**

- Make calendar items buttons that open the item's panel, which also gives a
  keyboard way to move them.
- Make "2 more" open the whole day.
- Add a skip link.
- Add an automated accessibility scan to the Playwright suite. That needs
  `@axe-core/playwright` as a dev dependency. It never ships to the browser,
  and your approval is needed.

### Usability

**Strong already:** grouping by when things are due, a filter by course, and
bulk paste. The calendar now takes drag and drop.

**Gaps, all found in the first two days of real use:**

- Goals are not on the calendar.
- "2 more" is a dead end.
- The `.ics` on the phone goes stale the moment anything changes, and
  re-importing it on an iPhone can make duplicates.
- A write the browser refuses still clears the add form, which is a known
  wart.

**Improve:**

- Put goal targets on the calendar as markers.
- Make a day expandable.
- After export, say what changed since the last export, so you know when the
  phone is out of date.
- Keep the form contents when a save fails.

### Stability

**Strong already:**

- A refused write never shows data that was not saved.
- Imports are validated field by field and capped at 5 MB.
- Merge now keeps every collection.
- Nothing runs on the network.

**Gaps:**

- Everything lives in one copy (problem 4 above).
- A monthly repeat on the 29th to 31st drifts earlier after a short month,
  and stays there.
- One deploy left an old `index.html` in place, and the cause is still
  unknown.

**Improve:**

- US-40 for backups.
- Fix the monthly clamp, test first.
- Make `deploy` check itself. After building, a short script confirms that
  `index.html` points at files that exist, and fails loudly otherwise. That
  would have caught the partial deploy the moment it happened.

### Maintainability

**Strong already:**

- The domain logic is pure and the tests read like the acceptance criteria.
- There is one dependency.
- Every decision has a reason written down.

**Gaps:**

- 22 Playwright spec files each carry their own copy of the date and seeding
  helpers.
- The CSS is one file of 1,283 lines, so changing the calendar means
  scrolling past everything else.
- `v2-plan.md` has grown past 1,300 lines as stories were appended to it.
- Playwright's substring matching of names has caused seven test collisions
  this project.

**Improve:**

- One shared `e2e/helpers.ts` for dates and seeding.
- Move each component's CSS next to it. Vite does this natively and the
  output is identical.
- One file per story under `docs/product/stories/`.
- A rule in `CLAUDE.md`: Playwright name matches use `exact: true` unless
  a partial match is the point.

Under the rule against refactoring code the current task does not touch, each
of these is its own small task, not something slipped into a feature.

### Extensibility

**Strong already:**

- A new schema version is one migration hop in one file.
- The domain layer does not know the UI exists, which is what lets the v3
  server reuse it.

**Gaps:**

- Adding a field to an item touches the type, the migration, the import
  validation, the form and the row. Nothing lists those places, so one gets
  missed.
- Views are a chain of five conditionals in `App.tsx`.

**Improve:**

- Write the "adding a field" and "adding a view" checklists into
  `docs/engineering/`.
- Leave the view chain alone until a sixth view exists. Replacing it now
  would be an abstraction built for a future that has not arrived.

### Scalability

**The numbers:** at about 415 bytes an item, the browser's 5 MB allows about
12,000 items. At 25 a week that is around nine years, and rendering a few
thousand rows is not a problem for React. Nothing needs to change for size.

**Where scale does bite:**

- A single day can hold more items than the calendar can show. Fixed by
  making a day expandable.
- One browser on one laptop. Reaching a second device, your phone, is v3,
  gated on the spike.

**Improve:** nothing now. Revisit if an export passes 1 MB, and treat v3 as
the answer to scaling across devices.

## The plan, step by step

Each step is a story with its own plan and your approval, written test first,
committed separately.

**Step 0. Already under way, and it decides the order after step 3.**

- Three school days of real use, with notes.
- The iOS push spike.

Nothing below replaces them. What you notice in the next week should reorder
steps 4 to 7.

**Step 1. Protect the data.** Small, and first because the rest is worth
nothing if the data is lost.

- US-40: persistent storage, and the "last backup" reminder.
- The bug fixes: keep the form when a save fails, and the monthly repeat
  drift.
- `deploy` checks itself.

**Step 2. What the first two days showed (US-41).**

- Goal targets on the calendar.
- A day that opens to show everything.
- Calendar items open their panel when clicked.

**Step 3. Accessibility (US-42).**

- A keyboard way to move an item, through the panel from step 2.
- A skip link.
- The automated scan in Playwright, if you approve the dev dependency.

**Step 4. Alarms that mean something (US-46).** Alarms by priority in the
`.ics`. Small, and it changes your phone this month.

**Step 5. Import a calendar file (US-43).** Next quarter's syllabus goes in
as one download and one confirm.

**Step 6. Overdue triage (US-44).**

**Step 7. Milestones and the week's load (US-45).** The largest step. It
needs database version 4 and gets its own plan document.

**Alongside, as their own tasks:** the maintainability items (shared test
helpers, CSS next to components, story files, the `exact: true` rule) and the
extensibility checklists. Each is done when it next gets in the way, not all
at once.

**After that:** v3, the nudges and the phone, if the spike and your notes
say it is worth it.

## Sources

- [I love using Notion, but here's why I'm quitting it](https://nicholasng.substack.com/p/quitting-notion)
- [Notion for Students guide](https://www.atlasworkspace.ai/blog/notion-for-students)
- [Notion Study Planner setup guide](https://macaron.im/blog/notion-study-planner-setup-guide-for-students)
- [Solved: Why is Notion's mobile app still so bad in 2026?](https://techresolve.blog/2026/03/09/why-is-notions-mobile-app-still-so-bad-in-2026/)
- [Notion mobile: lag, sync issues and slow load times](https://fibery.io/openion/notion-notes-docs-tasks-2/mobile-app-performance-concerns-lag-sync-issues-and-slow-load-times-244843)
- [Your To-Do List Is Lying To You](https://betterlateadhd.substack.com/p/your-to-do-list-is-lying-to-you)
- [How I learned to suck less at GTD](https://www.todoist.com/inspiration/gtd-tips)
- [I deleted my to-do list apps for a week](https://www.xda-developers.com/no-to-do-list-experiment/)
- [Why most habit trackers stop working after a few weeks](https://compounddaily.collabtower.com/blog/why-most-habit-trackers-stop-working)
- [The hidden psychology of why we abandon habit apps](https://dev.to/eastkap/the-hidden-psychology-of-why-we-abandon-habit-apps-and-what-actually-works-36g6)
- [Task management for students](https://blog.any.do/task-management-for-students-deadlines-projects-and-getting-through-the-semester/)
- [Your to-do list knows too much: local-first productivity](https://super-productivity.com/blog/your-to-do-list-knows-too-much-case-for-local-first/)
- [How to migrate from cloud productivity apps to local-first](https://super-productivity.com/blog/migrate-cloud-to-local-first-productivity/)
- [Notification fatigue, the silent productivity killer](https://www.meistertask.com/blog/notification-fatigue-the-productivity-killer-explained)
- [A call to alarms: persistent calendar and reminder notifications](https://tidbits.com/2023/05/11/a-call-to-alarms-why-we-need-persistent-calendar-and-reminder-notifications/)
