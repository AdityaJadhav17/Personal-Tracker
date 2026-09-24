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

# Stories after this plan

Each story written after the plan above has its own file in
[stories/](stories/). They used to be appended here, which is how this file
passed 1,300 lines.

- [US-21, a calendar view](stories/US-21.md)
- [US-22, a row you can read at a glance](stories/US-22.md)
- [US-23, a sidebar that fits a phone](stories/US-23.md)
- [US-24, deadlines on the phone calendar](stories/US-24.md)
- [US-25, changing your mind about an item](stories/US-25.md)
- [US-26, filling a term in one paste](stories/US-26.md)
- [US-08, filtering the list to one category](stories/US-08.md)
- [US-27, filtering to one course](stories/US-27.md)
- [US-28, things that come back](stories/US-28.md)
- [US-29, changing your mind about repeating](stories/US-29.md)
- [US-38, opening it without a terminal](stories/US-38.md)
- [US-39, moving a deadline by dragging it](stories/US-39.md)
- [US-40, keeping the data safe](stories/US-40.md)
- [US-41, a calendar you can open](stories/US-41.md)
- [US-42, accessibility you can check](stories/US-42.md)
- [US-43, a term from a calendar file](stories/US-43.md)
- [US-44, deciding what to do with what is late](stories/US-44.md)
- [US-45, big work in steps, and a week you can see coming](stories/US-45.md)
- [US-46, alarms that mean something](stories/US-46.md)
- [US-47, motion that feels right](stories/US-47.md)
- [US-48, feedback where it was missing](stories/US-48.md)
- [US-50, a title bar that matches](stories/US-50.md)
- [US-51, choosing light or dark](stories/US-51.md)
