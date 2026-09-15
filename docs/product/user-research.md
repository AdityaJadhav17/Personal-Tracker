# Personal Tracker: user research

Phase 0 output. Drafted from the interview on 2026-09-15. Aditya corrects this
before any planning starts.

## What changed from the original brief

The opening brief called this a coursework tracker. The interview moved it
somewhere broader. Rent, tuition payments, doctor appointments, birthday
parties, and events all belong in the same list as midterms and project
deadlines. Coursework is one category inside a personal deadline tracker, not
the product.

Two consequences for the rest of this document:

- Every user story below treats "academic" as a label on an item, not as a
  precondition for the item existing.
- Courses still get special treatment, but as a reference section rather than
  as the organizing principle of the app.

## Open decisions

Three things you asked for pull against each other. I am not going to pick for
you. Stories that depend on an unresolved decision are marked.

### Decision 1: how a nudge reaches you

You gave two answers that cannot both hold.

Your worst failure was forgetting: "I missed a assignment submission deadline
and my doctors appointment because I didnt put a reminder or I forgot about
it." You also said phone alerts would help. The non-goals rule out a mobile
app, push notifications, a hosted backend, and any data leaving your machine.

A browser tab on your laptop cannot reach your phone without a server or a
third party. So a v1 that honors every non-goal can only nudge you while you
have the app open, which means it does not solve the problem that made you
build it. You would still have to remember to look.

Three ways out:

**1a. Visual only.** The dashboard groups by urgency and marks anything due in
the next few days. Nothing reaches you when the app is closed. Honest about
what it is: a better place to look, not a reminder. Cheapest by a wide margin.

**1b. Browser notifications.** The Notification API fires desktop alerts, but
only while the tab is open. Slightly better than 1a on days you leave the
laptop on, useless otherwise. Adds permission-prompt handling and a scheduling
loop for very little.

**1c. Calendar export.** The app writes an `.ics` file. You subscribe to it
from the calendar app already on your phone, and your phone handles alerts. No
server, no push infrastructure, and it reuses a reminder system you already
trust. Two costs: it breaks the "no calendar integration" non-goal, and if you
subscribe through Google Calendar your deadline titles land on Google's
servers. Subscribing through Apple Calendar on-device keeps the data local.

I recommend 1a for v1 with 1c as the next milestone, and I want to say plainly
why: 1a alone would not have caught either thing you missed. If the calendar
export is the feature that actually fixes your problem, it should be in v1 and
one of the non-goals should move.

### Decision 2: recurring items

Rent and tuition repeat. You did not say whether you want to enter them once
with a repeat rule or type each one as it comes.

Recurrence is a real jump in complexity. The app has to expand a rule into
occurrences, decide whether editing one occurrence edits the series, and handle
what happens when you delete the rule after completing three of its
occurrences. Skipping it costs you about thirty seconds a month of typing.

I recommend no recurrence in v1. Revisit it after you have used the app for a
term and can say whether the typing annoyed you.

### Decision 3: is the course reference section in v1

You asked for somewhere to keep class location, professor email, office hours
location, and the class schedule. None of that is a deadline. It is a reference
card you read, and a weekly repeating schedule, which is the one part of the
app that behaves like a calendar.

I have written it as US-07 with priority Should. Tell me if it is a Must, and
tell me whether the weekly class schedule is part of it or whether you only
want the contact and location details.

## Primary persona: Aditya

**Program.** Undergraduate at UC San Diego. Quarter system, so a term runs ten
weeks and midterms arrive in week four or five.

**Weekly rhythm.** Before a term starts he sits down once and puts midterms and
finals on a calendar. That is the only planning session. Everything after it
arrives piecemeal: a project deadline announced in lecture, a friend's birthday
party, an event he signed up for, rent. None of those go through the one
planning session, so none of them land anywhere consistent.

Load is not flat. Week four and weeks nine and ten carry most of it.

**Current tools.** A calendar for exams, set up once at the start of term.
After that, whatever is nearest: memory, mostly. Deadlines live in Canvas, in
messages, in his head, and in the original calendar, and no single view has all
of them.

**Pain points, in his words.**

1. "I missed a assignment submission deadline and my doctors appointment
   because I didnt put a reminder or I forgot about it." The two things he
   missed sit in different systems. One is coursework, one is personal. Nothing
   he owns holds both.

2. "i dont have to open a lot of stuff to check my deadlines I will be wasting
   time." Checking costs him enough friction that he skips it, which is how
   things get missed.

3. "has to be the week of finals and week before finals plus the midterm week.
   It's UCSD it goes pretty fast." The weeks he most needs the tracker are the
   weeks he has least time to maintain it.

**What notes mean to him.** Not lecture notes. Short memos attached to a
deadline or a course: what the professor wants, what he still has to do, where
to submit.

**Granularity.** "Read chapter 4" does not belong on the dashboard. He wants
submissions, exams, payments, appointments, and events. Things with a date and
a consequence.

**Success in one sentence.** Aditya opens one page each morning, sees
everything due this week across school and life ranked by what to do first, and
stops relying on memory to catch what he has not written down.

## Secondary persona: Sam (assumption)

**This persona is an assumption, not research.** I built Sam to catch design
choices that only work for Aditya's habits. Nothing below came from an
interview. Correct or discard it.

**Assumed profile.** Transfer student at UCSD, second year. Works fifteen hours
a week at an off-campus job with a shift schedule that changes weekly.

**How Sam differs from Aditya, specifically.** Sam never has a planning
session. No term-start calendar ritual, no batch entry. Sam adds one item at a
time, on a phone, in the ninety seconds between a lecture ending and the walk
to the next building. Sam also thinks in days rather than weeks: the question
is always "what do I have to do before tonight," never "what does this week
look like."

**Why that matters for the design.** Aditya's habits reward a week-shaped
dashboard and tolerate a slow entry form, because he enters in batches at a
desk. Sam breaks both. If adding an item takes more than a few seconds, Sam
never adds it, and the app holds a partial picture that is worse than no
picture. If the dashboard leads with a week grid, Sam has to do the filtering
by eye every time.

Sam also carries more recurring items than Aditya: a weekly shift, monthly
rent. If Decision 2 lands on "no recurrence," Sam retypes a lot.

**The design question Sam raises.** Does the dashboard answer "what is due
today" as fast as it answers "what does this week look like"? If the week view
is the only view, Aditya is happy and Sam is not.

## User stories

Priorities: Must means v1 does not ship without it. Should means v1 is better
with it. Could means a later milestone.

---

```
US-01  As someone tracking school and life in one place,
       I want to add an item with a title, a due date, a category, and a
       priority,
       so that a rent payment and a midterm live in the same list.

Persona:  Primary, Secondary
Priority: Must
Acceptance criteria:
  AC-01.1  Given the add form is open,
           when I submit a title, a due date, a category, and a priority,
           then the item appears on the dashboard in the group matching its
           due date.
  AC-01.2  Given the add form is open,
           when I submit without a title,
           then the item is not created and the title field shows a validation
           message.
  AC-01.3  Given the add form is open,
           when I submit without choosing a priority,
           then the item is created with priority "normal".
  AC-01.4  Given I type a due date in any of the formats "2026-10-03",
           "10/3", or "oct 3",
           when I submit,
           then the item is stored with due date 2026-10-03.
```

---

```
US-02  As someone whose deadlines arrive piecemeal all term,
       I want the dashboard to group open items into Overdue, Today, This week,
       and Later,
       so that I can see what is due without opening anything else.

Persona:  Primary
Priority: Must
Acceptance criteria:
  AC-02.1  Given items due yesterday, today, in three days, and in three weeks,
           when I open the dashboard,
           then they appear in the groups Overdue, Today, This week, and Later
           respectively.
  AC-02.2  Given a group contains no items,
           when I open the dashboard,
           then that group's heading is not rendered.
  AC-02.3  Given an item with status "done" and a due date today,
           when I open the dashboard,
           then it does not appear in the Today group.
  AC-02.4  Given the current time is 23:59 local,
           when I open the dashboard,
           then an item due today is still in the Today group and not in
           Overdue.
```

---

```
US-03  As someone the night before a deadline,
       I want overdue items pinned above everything else,
       so that I never scroll past something I have already missed.

Persona:  Primary, Secondary
Priority: Must
Acceptance criteria:
  AC-03.1  Given an item with a due date in the past and status "open",
           when I open the dashboard,
           then it appears in an "Overdue" group above the "Today" group.
  AC-03.2  Given no overdue items,
           when I open the dashboard,
           then the "Overdue" group is not rendered at all.
  AC-03.3  Given three overdue items due 1, 5, and 12 days ago,
           when I open the dashboard,
           then they are ordered most overdue first.
```

---

```
US-04  As someone who cannot do everything in finals week,
       I want items inside a group ordered by priority and then by due time,
       so that I know what to start on without deciding again each time.

Persona:  Primary
Priority: Must
Acceptance criteria:
  AC-04.1  Given three items in the This week group with priorities high,
           normal, and low,
           when I open the dashboard,
           then they are ordered high, normal, low.
  AC-04.2  Given two items in the same group with the same priority and due
           times 09:00 and 17:00 on the same day,
           when I open the dashboard,
           then the 09:00 item is listed first.
  AC-04.3  Given two items in the same group with identical priority and
           identical due timestamps,
           when I open the dashboard,
           then both are rendered and their order does not change between
           reloads.
  AC-04.4  Given a low-priority item due today and a high-priority item due in
           six days,
           when I open the dashboard,
           then the low-priority item appears in Today and the high-priority
           item appears in This week.
```

---

```
US-05  As someone who tracks deadlines while walking between classes,
       I want to mark an item done from the keyboard without touching the
       mouse,
       so that maintaining the list does not cost me time in the weeks I have
       none.

Persona:  Primary, Secondary
Priority: Must
Acceptance criteria:
  AC-05.1  Given the dashboard has focus on an item,
           when I press the done key,
           then the item's status becomes "done" and it leaves its group.
  AC-05.2  Given I have just marked an item done,
           when I press the undo key,
           then the item returns to "open" and to its previous group.
  AC-05.3  Given the dashboard is open,
           when I press Tab repeatedly,
           then focus moves through every item in the order they are displayed.
```

---

```
US-06  As someone who forgets the details, not the date,
       I want to attach short memos to an item or a course,
       so that what I still have to do is stored next to when it is due.

Persona:  Primary
Priority: Must
Acceptance criteria:
  AC-06.1  Given an item exists,
           when I save a memo on it and reload the page,
           then the memo is still attached to that item.
  AC-06.2  Given an item with two memos,
           when I delete the item,
           then both memos are removed from storage.
  AC-06.3  Given a memo of 2000 characters,
           when I save it,
           then it is stored and displayed without truncation.
```

---

```
US-07  As a student who looks up the same course details all term,
       I want a reference card per course holding location, professor email,
       and office hours,
       so that I stop searching my email for the same information.

Persona:  Primary
Priority: Should  (see Decision 3)
Acceptance criteria:
  AC-07.1  Given I save a course with a name, meeting location, professor
           email, and office hours location,
           when I reopen the course,
           then all four fields display the values I saved.
  AC-07.2  Given an item is assigned to a course,
           when I open that item,
           then the course name is shown and links to the course card.
  AC-07.3  Given a course with three items attached,
           when I delete the course,
           then the items remain and their course field is cleared.
```

---

```
US-08  As someone whose list holds rent and midterms together,
       I want to filter the dashboard to one category,
       so that I can look at only school work when that is all I can act on.

Persona:  Primary
Priority: Should
Acceptance criteria:
  AC-08.1  Given items in the categories "academic" and "personal",
           when I filter to "academic",
           then only academic items are displayed and the group headings still
           apply.
  AC-08.2  Given a filter is active,
           when I reload the page,
           then the filter is cleared and all categories are shown.
```

---

```
US-09  As someone who does not want my deadlines on anyone's server,
       I want to export everything to one JSON file,
       so that I hold my own backup.

Persona:  Primary
Priority: Must
Acceptance criteria:
  AC-09.1  Given items, memos, and courses exist,
           when I export,
           then the downloaded file parses as JSON and contains every item,
           memo, and course.
  AC-09.2  Given the database is empty,
           when I export,
           then the file parses as JSON and contains empty collections rather
           than failing.
```

---

```
US-10  As someone moving to a new laptop,
       I want import to restore an exported file exactly,
       so that the export is worth something.

Persona:  Primary
Priority: Must
Acceptance criteria:
  AC-10.1  Given a database with items, memos, and courses,
           when I export and then import that file into an empty database,
           then reading everything back produces data identical to the
           original.
  AC-10.2  Given a file that is not valid JSON,
           when I import it,
           then the existing data is unchanged and I see an error naming the
           problem.
  AC-10.3  Given a valid JSON file missing the items collection,
           when I import it,
           then the existing data is unchanged and I see an error naming the
           missing collection.
  AC-10.4  Given a database with existing items,
           when I import a file,
           then I am asked whether to replace or merge before anything is
           written.
```

---

```
US-11  As someone opening this for the first time,
       I want the empty dashboard to tell me what to do,
       so that I am not looking at a blank page wondering if it loaded.

Persona:  Primary, Secondary
Priority: Must
Acceptance criteria:
  AC-11.1  Given no items exist,
           when I open the dashboard,
           then no group headings render and an empty state with an add action
           is displayed.
  AC-11.2  Given no items exist and storage is unavailable,
           when I open the dashboard,
           then an error state explains that data could not be loaded.
```

---

```
US-12  As someone who missed a deadline by forgetting it existed,
       I want items due in the next few days marked as needing attention,
       so that I get warning while there is still time to act.

Persona:  Primary
Priority: Must
Depends on: Decision 1
Acceptance criteria:
  AC-12.1  Given an item due in two days,
           when I open the dashboard,
           then it carries an "upcoming" marker.
  AC-12.2  Given an item due in nine days,
           when I open the dashboard,
           then it does not carry an "upcoming" marker.
  AC-12.3  Given a low-priority item due in two days,
           when I open the dashboard,
           then it carries the "upcoming" marker, because priority does not
           suppress the warning.
```

---

## What I need from you

1. Pick 1a, 1b, or 1c, and say whether a non-goal moves.
2. Confirm or reject "no recurrence in v1."
3. Tell me whether US-07 is a Must, and whether it includes the weekly class
   schedule.
4. Correct Sam, or tell me to drop that persona.
5. Name the stories that are out of scope for v1.
