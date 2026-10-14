# Sync between the laptop and the iPhone: design

Approved section by section by Aditya on 13 October 2026. Implementation is
three stories, US-99 to US-101, each with its own plan.

## What it is for

Margin runs on the laptop (the Chrome app at `localhost:4180`) and on the
iPhone (a home-screen web app at `https://hub.<tailnet>.ts.net`, reached over
Tailscale). Each keeps its own database, so a deadline added on the phone does
not exist on the laptop. Sync makes them one set of data, automatically,
without the data touching the public internet or any service but Tailscale's
encrypted transport.

## Decisions taken

| Question                    | Decision                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| When                        | Automatically while Margin is open and the laptop is reachable                                              |
| Conflicts                   | Per record, the newer change wins; a deletion beats an older edit                                           |
| Where the shared copy lives | On the laptop's disk, served by `serve.mjs`                                                                 |
| Approach                    | Whole-database merge with per-record timestamps and deletion markers (not a change log, not a CRDT library) |

## 1. Data (US-99, database version 11)

Every record in `items`, `goals`, `courses`, `reflections`, `notes` and
`tasks` gains `changedAt`, a UTC instant set by every action that changes the
record. The version 11 migration fills it from the newest time the record
already carries: the latest of `createdAt`, `completedAt` and `updatedAt`, so
a task finished on one device and open on the other cannot tie.

Import keeps each file record's own `changedAt`. Replace (a restore) brings the
file's records back dated now and writes no deletion markers, so it restores
what is missing and never deletes anything on the other device (chosen by
Aditya, 13 October).

The database gains `deleted: { kind, id, at }[]`, one marker per deleted
record, where `kind` names the collection. Reflections are identified by
`day`, the rest by `id`. Markers older than 60 days are dropped on save. A
device that has not synced for longer than that can bring back what was deleted
elsewhere meanwhile; the Sync line says how long it has been, and two months
without opening Margin is not how it is used.

The lock gains `changedAt` as well.

What syncs: the six collections, `deleted` and `lock`. What stays on each
device: `lastBackupAt` (backups are per device), the theme, the backup folder
handle, and the before-upgrade copy.

### Merge rule

For each collection, by identity:

- present on one side only, and not deleted later than its `changedAt`: kept;
- present on both: the one with the later `changedAt`; on equal times, the
  one whose JSON text sorts later, so both devices pick the same record and
  `merge(a, b)` equals `merge(b, a)`;
- a deletion marker removes the record if `marker.at >= record.changedAt`; a
  record changed after its marker survives and the marker is dropped;
- markers are the union of both sides, the newest per record.

Locks and locked notes: the lock with the later `changedAt` wins, and every
sealed note comes from the side whose lock won. A sealed note's ciphertext is
only meaningful under its lock, so mixing would leave notes neither passcode
opens. Accepted limitation: an edit to a locked note made on the other device
before that sync is lost. Ordinary notes merge like everything else.

## 2. Server (US-100, `scripts/serve.mjs`)

A versioned store; it does not merge.

- `GET /api/sync` returns `{ revision, db }`, or `{ revision: 0, db: null }`
  before the first write.
- `PUT /api/sync` with `{ revision, db }` replaces the copy only if `revision`
  equals the current one, answering `{ revision: n + 1 }`. Otherwise `409`, and
  the client fetches, merges and retries (at most three times).

Storage: `%LOCALAPPDATA%\PersonalTracker-data\hub.json`, overridable as
`PT_DATA` for tests. Written to a temporary file and renamed over the old one;
the previous file is kept as `hub.prev.json`. The deploy folder is not used,
because the updater empties it on every deploy.

Who may call it:

1. Every request carries `X-Margin-Sync: 1` and, for `PUT`, a JSON content
   type. A cross-site page cannot send either without a CORS preflight, and
   the server answers no preflight, so the browser blocks it.
2. Under the tailnet name, `Tailscale-User-Login` must equal the laptop's own
   login, learned from `tailscale status --json` like its name. Tailscale
   strips client-supplied copies of the header.
3. Under `localhost` or `127.0.0.1`, the existing Host check applies. The
   loopback endpoint is reachable by programs running on the laptop as its
   user, as the browser profile and data folder already are.

The body is capped at 5 MB and must parse as JSON with a `db` that has the
database's top-level shape; full validation happens in the app.

## 3. App (US-101)

A `useSync` hook, beside `useAutoBackup`, runs a sync on open, 3 s after the
last change, every 60 s, on the `online` event and when the page becomes
visible. One sync:

1. `GET /api/sync`; validate `db` with `parseImport`'s validator.
2. `merge(local, shared)`.
3. If the result differs from the shared copy, `PUT` it against the revision
   read; on `409` start again, up to three times.
4. If the result differs from the local copy, commit it locally (as the
   storage event does: `latest.current` and state replaced, Undo cleared).
   `lastBackupAt` stays this device's.

Data shows a Sync line ("Synced 2:14 PM", "Laptop not reachable; will sync
when it is", "Sync failed: …") and Sync now.

Rule changes this brings, recorded in CLAUDE.md and the decision log:

- "No network request after load" becomes "none except sync to the app's own
  origin". The CSP `connect-src 'self'` already allows exactly that, and the
  off-origin Playwright spec keeps proving nothing else is fetched.
- The service worker never caches `/api/sync`: it caches only the app's files
  already, and skips non-GET requests.

Newest-wins relies on the two clocks agreeing; both set themselves
automatically, to within about a second.

## 4. Failure, testing, rollout

- Laptop unreachable: Margin works as today; the Sync line says so.
- Shared copy damaged: the app refuses it and says so; `hub.prev.json` and
  the daily backups remain.
- A bad merge: back up both devices before US-101 ships.

Tests: the merge function exhaustively (each rule above, idempotence, order
independence); the v11 migration and import; `changedAt` set by every action;
the server's read, write, conflict, header, identity, size cap and crash-safe
write, on a scratch port and data folder; and Playwright with two browser
contexts against the built app on 4190 (added on one appears on the other,
deleted on one goes from the other, offline edits catch up).

Order: US-99 (change tracking, ships alone), US-100 (the store, called by
nothing yet), US-101 (the merge, the loop, the Sync line; sync turns on).

## Not in this version

Choosing a winner by hand; sync history; field-level merging; a third device
beyond simply joining the tailnet.

## Amendments from the council review, 13 October

The council (five advisors, peer review, a chairman) confirmed the
architecture and found these, now part of the plans:

- **Edits typed during a sync survive.** Adopting a sync result merges it
  again with the device's latest local data instead of replacing it.
- **Ties converge** (rule above), and the migration dates from the newest of
  a record's times.
- **"Did anything change" compares keys and `changedAt`**, not serialised
  text, so nothing is sent when nothing changed.
- **Import and restore** keep or re-date records as above.
- **A damaged `hub.json`** falls back to `hub.prev.json` instead of failing the
  request. A write whose database is older than the shared copy's version, or
  not shaped like a database, is refused.
- **An app older than the shared copy** says "Update the app" and does not
  write.
- **The server restart works**: `serve.mjs` records its process id, and the
  updater restarts it when `serve.mjs` or `hub.mjs` changed (US-100, first).
- **Known limitations, each pinned by a test:** a locked note that exists only
  on the side whose lock lost stays unreadable; a repeating item finished on
  both devices while apart leaves two next occurrences. Clocks are trusted: both devices take time from
  the network, and a clock that is days fast wins conflicts until real time
  catches up (nothing is clamped, so two devices never rewrite each other).
- **Before first real use:** back up both devices before US-99 (it is the
  migration), and dry-run the first merge on copies of both devices' data
  against a scratch server, never 4180.
