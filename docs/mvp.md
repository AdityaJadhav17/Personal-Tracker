# Personal Tracker: MVP scope

Drafted 2026-09-15, after the Phase 0 interview. Aditya approves this before
any code is written.

## What the MVP is

One page you open each morning that shows every deadline you have entered,
school and life together, grouped by urgency and ordered by priority. You can
add an item in one screen, mark it done from the keyboard, attach a short note,
and export everything to a JSON file you keep.

That is the whole product. Everything else waits.

## What the MVP is not

Deferred by your decision on 2026-09-15:

- **Phone notifications and any push mechanism.** Revisit after you have run
  the app for a term. The three options from `user-research.md` stay on the
  table, and the calendar export route is still the only one that reaches your
  phone without a server.
- **Recurring items.** Rent and tuition get typed in each time. My assumption,
  not your stated decision. Say so if you want recurrence in v1, because it
  changes the data model rather than adding a screen.
- **Course reference cards.** Class location, professor email, and office
  hours move to milestone 4. Also my assumption. This one is cheap to pull
  forward if you want it sooner.
- **Category filtering.** Items still carry a category in v1, because export
  and import need the field and adding it later would break old export files.
  The filter control itself waits.

Unchanged from the original brief: no accounts, no cloud sync, no hosted
backend, no mobile app, no collaboration. GitHub holds the source only.

## Stories in the MVP

Ten of the twelve in `user-research.md`. US-07 and US-08 move out.

| Story | Title                                                      | Milestone |
| ----- | ---------------------------------------------------------- | --------- |
| US-01 | Add an item with title, due date, category, priority       | M1        |
| US-02 | Dashboard groups items by Overdue, Today, This week, Later | M1        |
| US-03 | Overdue pinned above everything                            | M1        |
| US-04 | Priority then due-time ordering inside each group          | M1        |
| US-11 | Empty state and error state                                | M1        |
| US-05 | Mark done and undo from the keyboard                       | M2        |
| US-06 | Short note attached to an item                             | M2        |
| US-12 | Items due in the next few days marked "upcoming"           | M2        |
| US-09 | Export everything to one JSON file                         | M3        |
| US-10 | Import restores an export exactly                          | M3        |

### One change to US-06

The interview described notes as "small memos or things i have to do." That
does not need its own entity. US-06 becomes a single optional text field on an
item rather than a memo collection with its own lifecycle.

This deletes AC-06.2 outright, because nothing cascades when you delete an
item. AC-06.1 and AC-06.3 stand. If you later want several timestamped memos
per item, that is a new story and a migration, not something to build now
against a maybe.

## Milestones

Each one runs on its own and is worth using before the next exists.

**M1: capture and see.** US-01, US-02, US-03, US-04, US-11. You can add
deadlines and see them grouped and ordered. No way to mark anything done yet,
so the list only grows. Still more useful than what you have now.

**M2: run your week on it.** US-05, US-06, US-12. Done, undo, notes, and the
upcoming marker. This is the first version worth using for real school days.

**M3: own your data.** US-09, US-10. Export and import with a round-trip test.
After this you can move laptops and your data survives.

**M4 and later, not in v1.** Course reference cards (US-07), category filter
(US-08), recurrence, calendar export for phone alerts.

## Security posture

You asked me to account for security while building. Here is the honest
version, including what I recommend against.

### What the app actually holds

Deadline titles, dates, categories, priorities, and short notes. Some of that
reveals more than it looks like: a doctor's appointment title is health
information, and a rent due date says where you live and when money moves.
Treat it as personal, not as secret.

### Who could realistically read it

Someone with your unlocked laptop. A browser extension you installed, because
extensions can read page storage on any origin. An npm package in the
dependency tree, because anything running in the page can read the same
storage the app uses. Anyone who finds an exported JSON file sitting in your
Downloads folder or committed to a public repository.

Notably absent: a network attacker. The app makes no requests, so there is no
traffic to intercept.

### Controls we build in

These cost nothing and go in from the first commit:

1. **Never call `dangerouslySetInnerHTML`.** React escapes text by default,
   which means an item title containing `<script>` renders as characters. This
   one rule closes the main injection path. It goes in `CLAUDE.md` and in the
   ESLint config as `react/no-danger` set to error, so CI catches it rather
   than a reviewer.

2. **Treat the import file as hostile.** Someone can hand you a JSON file.
   Validate every field's type and shape before writing anything, reject
   unknown top-level keys, never reconstruct behavior from the file, and never
   pass its contents to `eval` or `Function`. AC-10.2 and AC-10.3 already test
   the rejection path.

3. **No third-party requests at runtime.** Self-host fonts, no CDN, no
   analytics, no error reporting service. A CDN request leaks your IP and the
   fact you are using the app, and a compromised CDN can serve script that
   reads your storage. This also keeps the "no data leaves my machine" promise
   literally true rather than mostly true.

4. **A Content Security Policy meta tag in `index.html`** restricting scripts
   to `'self'`. One line. It turns rule 3 from a convention into something the
   browser enforces.

5. **Minimal dependencies, and you approve each one.** Every package you add
   is code that can read your deadlines. This is the same rule you already set
   in section 0 for different reasons, and the security argument reinforces it.

6. **`.gitignore` blocks exported JSON** by pattern, not by remembering.
   Exports are the most exposed copy of your data, because they leave the
   browser sandbox and land in a folder you sync or share.

### What I recommend against, and why

**Encrypting data at rest inside the app.** WebCrypto could encrypt storage
under a passphrase you type at launch. I think that is the wrong trade for v1.

You would type a passphrase every single time you open a tracker whose whole
value is being faster to check than the alternatives. Forget the passphrase and
the data is gone, with no recovery path, because there is no server holding a
key. And the threat it defends against, someone reading browser storage off
your disk, is already covered by BitLocker on Windows, which encrypts the whole
profile under credentials you already have.

App-level encryption becomes worth it when you share the machine, or when you
start storing something you would not want a person with your unlocked laptop
to read. Neither is true today. If either becomes true, tell me and we will
revisit it as its own story.

**Sanitizing input on the way in.** Escaping belongs at render time, which
React already does. Stripping characters on entry corrupts legitimate titles
like `Math 20C: prove f(x) < g(x)` and buys nothing.

## Decisions made since this document was drafted

All four are recorded in full, with their reasoning and their reversal
conditions, in [decisions.md](decisions.md).

- **Storage is `localStorage` with a plain module.** No `StorageAdapter`
  interface, no IndexedDB, no `fake-indexeddb`.
- **Deadlines are UTC instants rendered in the device's current timezone.** A
  Canvas submission closes at 11:59pm Pacific whether or not you are in
  California. My first recommendation here was wrong and the log says so.
- **Playwright runs every feature in a real browser before you see it.** Added
  2026-09-15. Green unit tests are not the bar.
- **Notes are a field on an item, not an entity.**
