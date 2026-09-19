# Architectural decisions

Newest first. Every entry records the date, what we were choosing between, what
we picked, and why. Add an entry before writing code that depends on it.

---

## 2026-09-18: a refused storage write refuses the change, rather than showing it

**Context.** The security audit found `save` calling `setItem` with no guard
while `commit` updated React state first. A browser refuses that write when the
quota is reached, and Safari refuses it in a private window always.

**Options considered.** Keep the change on screen and warn; drop the change and
warn; retry with older data evicted.

**Choice.** Drop the change and say so. `save` returns whether it worked,
`commit` writes before it shows, and a refusal names the remedy: export a
backup, then delete finished items.

**Why.** A screen showing items the browser never stored is a lie that only
surfaces on the next reload, by which point the work is gone. Refusing the
change is visible immediately and recoverable. Evicting old data to make room
means the app deleting your deadlines to save a new one, which is worse than
either.

**What would reverse it.** A storage backend without a small fixed quota. That
is the IndexedDB decision, which is still declined for its own reasons.

---

## 2026-09-18: a repeating item creates the next one when it is finished

**Context.** US-28. Rent is due on the 1st of every month and was being entered
by hand twelve times a year.

**Options considered.** A separate recurring-template entity that spawns items;
generating a year of occurrences up front; one field on the item and the next
occurrence created on completion.

**Choice.** The field, and creation on completion.

**Why.** A template needs its own lifecycle, its own editing, and its own answer
to what happens when you change it after three occurrences. Generating ahead
would put twelve rent rows on a dashboard whose job is answering what to do
next, and fill the calendar with work nobody has done.

**The cost, stated rather than hidden.** A repeating item you never mark done
never comes back. That is written into the story and the README.

**Known limitation.** The monthly clamp is permanent: an item due on the 29th to
31st walks backwards the first time it crosses a short month and stays there,
because the next date is computed from the last one and nothing stores the day
it started on. Anchoring the original day needs a field on the item and is a
story of its own.

**What would reverse it.** Wanting to see a term of rent on the calendar before
paying any of it.

---

## 2026-09-18: schema versions are applied as hops, and only migrate.ts knows about them

**Context.** US-28 needed version 3. `upgrade` asked whether the input was
version 2 and treated anything else as version 1, and `load` had its own branch
on the version.

**Choice.** `upgrade` applies one step per version in order, and `load` and
`parseImport` both hand it whatever they have without inspecting the number.

**Why.** The old shape meant every new version was a rethink of every path
through the function. Adding version 4 is now one `if`. It also removed a real
bug: a find-and-replace during US-28 changed `load`'s version guard and dropped
goals, courses and reflections on read, which eight tests caught.

**What would reverse it.** Nothing foreseeable. A migration that cannot be
expressed as a sequence of steps would, and none has come up.

---

## 2026-09-18: the calendar export is VEVENT and half an hour long

**Context.** US-24 needed to represent a deadline in an `.ics` file.

**Options considered.** `VTODO`, which is semantically a to-do with a due date;
`VEVENT`, which is an appointment. And for length: a zero-length event, a
30 minute event ending at the deadline, or an all-day event.

**Choice.** `VEVENT`, 30 minutes, ending at the deadline. Aditya picked both.

**Why.** Apple Calendar does not import `VTODO` at all; it belongs to Reminders.
The point of the story is that the reminder reaches you, and a thing you see
beats a thing that is correctly filed. Zero-length events are rendered badly by
several clients and dropped by some, and an all-day event would lose the 5pm on
rent.

**What would reverse it.** Only using clients that handle `VTODO` well.

---

## 2026-09-18: a pasted list is parsed strictly, and previewed before it is saved

**Context.** US-26 needed to read dates out of text, which is what US-19
deliberately removed from the daily path when it deleted `parseDueDate`.

**Choice.** A strict format, `2026-10-03 17:00 Rent`, with an ISO date, an
optional 24-hour time and then the title. Anything else is reported as
unreadable rather than interpreted, and nothing is written until the preview has
shown what every line was understood as.

**Why these are not in conflict.** US-19 is about the path used every day, where
a silent wrong guess is worse than a picker. A paste is one-off and reviewed:
parse, show, confirm, which is the same shape the JSON import already uses.

**What would reverse it.** Real use showing the format is too strict to be worth
having. That is a thing a week of classes would say.

---

## 2026-09-18: a filter is never remembered across a reload

**Context.** US-08 and US-27 both narrow the list. AC-08.2 asked for a reload to
clear the category filter.

**Choice.** Neither filter is stored. Both are plain component state, so a
reload shows everything.

**Why.** A filter you forgot you set is a list that is lying to you, and the
cost of being wrong is missing a deadline. The same reasoning produced AC-08.3,
which refuses to show the first-run empty state when a filter is what is hiding
the work.

**What would reverse it.** Aditya saying he re-picks the same filter every time
he opens the app.

---

## 2026-09-15: Motion (motion.dev) deferred to the Phase 4 decision

**Context.** Aditya supplied four dashboard screenshots as a visual direction
and asked whether Motion can be used for animation alongside extra CSS.

**Status.** Not approved and not installed. Every dependency gets named and
approved before it lands, and this one has no caller yet.

**Where the reasoning lives.** [../design/ui-reference.md](../design/ui-reference.md), together
with the design notes from the screenshots.

**Recommendation carried into Phase 4.** Style with CSS first. Add Motion only
if a specific transition still feels wrong once the page is styled, and prefer
its mini vanilla build over the React package. Either build bundles through
Vite, so the `script-src 'self'` policy and the no-third-party-requests rule
are unaffected.

---

## 2026-09-15: Playwright drives every feature before Aditya sees it

**Context.** Aditya asked for end-to-end testing and for features to be
exercised and fixed before they are presented to him.

**Choice.** `@playwright/test` with Chromium. Each story gets one thin spec in
`e2e/`. Running it and fixing what it surfaces is a gate in
[definition-of-done.md](definition-of-done.md), not an optional extra.

**Why the layer earns its place despite the cost.** A React Testing Library
test renders a component with props chosen by the test author, so it cannot see
a wiring bug: a callback never passed down, a value that does not survive a
reload, a CSP header that blocks the bundle. The Playwright spec loads the real
page, types into the real form, and reads what actually persisted. Those are
different failure modes.

**Keeping the cost down.** Specs stay thin and cover a happy path plus the one
failure that would really happen. Acceptance criteria are tested at the unit
and component level, where they run in milliseconds and point at the broken
line. A suite that re-tests every AC through a browser would be slow enough
that nobody runs it.

**Two smoke specs exist from M0.** One asserts the page loads with no console
errors. The other asserts the app makes zero off-origin requests, which turns
the "no data leaves my machine" promise into something CI checks rather than
something we remember.

---

## 2026-09-15: defer phone notifications out of v1

**Context.** The interview named forgetting as the failure that caused both
missed deadlines. Phone alerts would address it directly. The non-goals rule
out a mobile app, push notifications, a hosted backend, and any data leaving
the machine, and a browser tab on a laptop cannot reach a phone without a
server or a third party.

**Options considered.**

1. Visual markers only. The dashboard emphasizes items due soon. Reaches you
   only when you open the app.
2. Browser Notification API. Desktop alerts that fire only while the tab stays
   open.
3. Calendar export. The app writes an `.ics` file, you subscribe from your
   phone's calendar, and the phone alerts you. No server. Breaks the "no
   calendar integration" non-goal, and routing through Google Calendar would
   put deadline titles on Google's servers.

**Choice.** Option 1 for v1. Aditya deferred the question to focus on the
foundational app.

**Known cost.** A visual-only v1 does not solve the problem that motivated the
project. You still have to remember to open it. Revisit after one term of real
use, with option 3 as the leading candidate.

---

## 2026-09-15: no encryption at rest in v1

**Context.** Aditya asked that the app not store data somewhere a malicious
actor could easily reach.

**Options considered.**

1. Plain browser storage, relying on Windows full-disk encryption.
2. WebCrypto encryption under a passphrase typed at every launch.

**Choice.** Option 1.

**Why.** BitLocker already encrypts the browser profile under credentials
Aditya has. Option 2 adds a passphrase prompt to an app whose value is being
fast to check, and creates a permanent data-loss path with no server holding a
recovery key. The residual risk, someone reading storage on an unlocked
machine, is accepted.

**Revisit when.** The laptop becomes shared, or the app starts holding
something Aditya would not want a person at his unlocked laptop to read.

---

## 2026-09-15: notes become a field, not an entity

**Context.** Section 1 of the brief asked for notes attached to a course or an
assignment. The interview clarified these are "small memos or things i have to
do," not lecture notes.

**Options considered.**

1. A `Note` entity with its own identity, timestamps, and cascade-delete
   behavior.
2. One optional text field on an item.

**Choice.** Option 2, which deletes acceptance criterion AC-06.2 because
nothing cascades.

**Revisit when.** Aditya wants several timestamped notes on one item. That is a
new story plus a migration, not a reason to build the entity now.

---

## 2026-09-15: category stays in the v1 data model, filtering does not

**Context.** Category filtering (US-08) moved out of the MVP.

**Choice.** Items still carry a `category` field in v1; the filter control
waits for a later milestone.

**Why.** Export files written in v1 have to stay importable later. Adding the
field after users have export files creates a migration for no reason.

---

## 2026-09-15: localStorage with a plain module, no StorageAdapter

**Context.** The original brief specified IndexedDB behind a `StorageAdapter`
interface so that a later move to SQLite would touch one file.

**Options considered.**

1. `localStorage` with a plain module of two functions. Synchronous reads, no
   schema versioning, no transactions, no `fake-indexeddb` dependency.
2. IndexedDB behind a `StorageAdapter` interface, as originally specified.

**Choice.** Option 1, approved by Aditya on 2026-09-15.

**Why.** Roughly 300 items a year at 300 bytes each is about 90KB against a 5MB
per-origin budget, so the size argument for IndexedDB does not apply. Its async
API would put loading states in components and a promise in every read.
`StorageAdapter` would have exactly one implementation for the life of v1,
which the project guardrails say to delete. What actually makes storage
replaceable later is the JSON export and its round-trip test, not the
interface.

**Known costs, both accepted.** Every write rewrites the whole database
synchronously, so the app writes on submit and blur rather than per keystroke.
`localStorage` holds strings only.

**Revisit when.** File attachments become a feature, since a 2MB image becomes
a 2.7MB base64 string and exhausts the budget after two. Or when the stored
database passes roughly 1MB and full rewrites start to stutter.

---

## 2026-09-15: deadlines are UTC instants, rendered in the device's zone

**Context.** A deadline can be modeled as a floating wall-clock time that reads
the same everywhere, or as a fixed moment that converts. The two produce
different numbers on screen as soon as the device changes timezone.

**Options considered.**

1. Floating wall-clock. Store `"2026-10-03T23:59"` with no zone. The number
   never changes.
2. Fixed moment. Store the UTC instant, render in the device's current zone.

**Choice.** Option 2, chosen by Aditya on 2026-09-15.

**How this decision moved.** I first recommended option 1, on the intuition
that "11:59pm should stay 11:59pm." Aditya pushed back toward timezone-aware
behavior and was right. That intuition fits a floating reminder such as "take
medication at 8am." It does not fit this app's items: a Canvas submission
closes at 11:59pm Pacific whether or not you are in California, rent is due in
the city you rent in, and a San Diego appointment at 2pm does not become 2pm in
Delhi. Every item type in scope is anchored to a place.

I also overstated the cost. I claimed option 2 needed a zone field per item and
a picker in the add form. It needs neither. What you type is interpreted in the
device's zone at entry, stored as an instant, and formatted on the way out.
Same single `dueAt` field.

**Why option 1 was actually dangerous.** Under it, flying east makes a deadline
display earlier than the truth, which is merely annoying. Flying west makes it
display later than the truth, which is how you miss the thing.

**Guards.** `src/domain/dates.ts` is the only file that constructs a `Date`.
Every domain function takes `now` as a parameter so tests pin the clock.
`groupOf` converts the instant to a local calendar day before bucketing, which
is what keeps AC-02.4 passing at 23:59 local.

**Accepted limitation.** An item is anchored to the zone the device was in when
it was typed, with no per-item override. If someone tells you a deadline in a
zone you are not currently in, you do that conversion yourself. A per-item zone
picker would fix it and is not worth the field and the form control today.
