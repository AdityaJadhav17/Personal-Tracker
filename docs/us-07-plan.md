# US-07 and the shell: plan

Two requests that turn out to be one job. Nothing built yet.

**US-07.** A reference card per course holding meeting location, professor
email and office hours, so you stop searching your email for the same details.

**The interface looks basic.** It should read more like the dashboard
screenshots in [ui-reference.md](ui-reference.md).

## Why these are the same job

[ui-reference.md](ui-reference.md) rejected the reference app's sidebar with a
specific reason: v1 is one page with no router, so navigation would be chrome
pointing nowhere. US-07 adds a second surface. That reason expires, and the
shell becomes worth building because there is finally something to put in it.

Doing the shell without US-07 would mean a nav with one item.

## What I am taking from the screenshots, and what I am not

**Taking.** The dark slate sidebar with icon-and-label nav and an accent bar on
the active item. Content as white cards on a light ground, each with a thin
teal rule along the top. Large light-weight headings with a smaller subtitle
beside rather than beneath them.

**Not taking, and these matter.**

The notification bell with its red count. We have no notifications. Drawing a
bell that never rings is a lie about what the app does, and your whole
complaint is about being told too late.

The avatar and "Good Morning, ethan". There are no accounts and no photo of
you, and a greeting computed from the clock is decoration that costs a row of
vertical space the three-second test wants.

The stat header ("8 remaining, 6 completed yesterday"). Computable from
`completedAt`, but no story asks for it.

## Three decisions I need from you

### 1. How an item gets its course

AC-07.2 says an item is assigned to a course. The add form is capped at four
fields by your own Phase 4 constraint, and Title, Due, Category and Priority
already fill it.

**Recommended: assign it on the item row,** with a small select beside the
category tag, exactly like the note. The form stays at four fields, and
assigning a course becomes something you do when you know it, not something
that blocks adding the item in ninety seconds between classes.

**The tempting alternative I am not taking:** collapse Category and Course into
one select whose options are Personal plus each course, on the logic that
"academic" really means "belongs to a course". It is elegant and it is a trap.
It changes what `category` means in every export file you have already taken,
and it breaks the assumption that an academic item can exist before its course
does.

### 2. The database version has to go up

Courses are a new collection, and items gain a `courseId`. That makes the
export format version 2.

Import must still read version 1 files, including any you have already
exported, and upgrade them by adding an empty course list and a null
`courseId`. Same for a version 1 database already sitting in your browser.

This is the first migration in the project. It gets its own tests before the
feature does.

### 3. Navigation without a router

Two views, still no router, because a router is a dependency for one decision.

**Recommended: `useState` in `App` holding which view is showing.** Ten lines.
Refreshing returns you to the dashboard, which is the view you want on open
anyway.

**The upgrade if that annoys you:** read and write `location.hash`, about
fifteen lines, which gives back and forward and survives a refresh. Not worth
it until the simple version irritates you.

## Still unanswered from the interview

You asked for "class schedule" alongside location, professor email and office
hours. AC-07.1 lists four fields and a weekly schedule is not one of them: it
is a recurring-time feature, which is the same machinery as recurring items,
which is deferred.

I plan to build the four fields in AC-07.1 and leave the schedule out. Say if
that is wrong.

## Order of work

Two steps, so that the feature survives if the restyle turns out badly.

**Step 1: US-07 behaviour.** The migration and its tests, the `Course` type,
the courses view, assigning a course on an item row, and deleting a course
without deleting its items. Tests at every level plus a Playwright spec, as
with every other story.

**Step 2: the shell.** Sidebar, card treatment, heading scale. Appearance only.
If any test goes red during step 2 I have changed behaviour, not styling, and I
will stop and say so.

## Files

| File                            | Change                                           |
| ------------------------------- | ------------------------------------------------ |
| `src/domain/types.ts`           | `Course`, `Item.courseId`, `Database.version: 2` |
| `src/domain/transfer.ts`        | Accept v1 and v2, upgrade v1, validate courses   |
| `src/storage/db.ts`             | Upgrade a stored v1 database on load             |
| `src/domain/courses.ts`         | New. Add, edit and delete, clearing `courseId`   |
| `src/components/CourseList.tsx` | New. The reference cards                         |
| `src/components/ItemRow.tsx`    | Course select, course name shown                 |
| `src/components/Shell.tsx`      | New. Sidebar and nav, step 2                     |
| `src/App.tsx`                   | View state, course handlers                      |
| `src/index.css`                 | Shell, sidebar, cards, course styles             |
| `e2e/us-07-courses.spec.ts`     | New                                              |

Well over 200 lines across the two steps, which is why this document exists.

## What I need from you

1. Approve, or change, the three decisions above.
2. Confirm the class schedule stays out.
3. Confirm the two-step order, behaviour before appearance.
