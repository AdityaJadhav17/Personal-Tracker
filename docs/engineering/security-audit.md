# Security audit, 18 September 2026

Run against the rules Aditya supplied. Those rules describe a Python desktop
app: pickle, `subprocess`, `ctypes`, Tkinter and PyQt, an auto-updater. This is
a browser-only TypeScript app with two runtime dependencies, no server, no
native loading and no update mechanism, so most sections have no surface here.
Rather than reporting "no findings" against checks that could not fail, each
section below says what the equivalent surface is and what was actually done.

## What this app's trust boundary is

One browser origin, one `localStorage` key, one file the user chooses to import,
and two files it writes out. Nothing is fetched, nothing is executed, nothing is
uploaded. The import file is the only untrusted input that exists.

## Findings

### 1. Calendar export could be broken out of with a carriage return — fixed

**Severity: medium.** `src/domain/ics.ts`, the `escape` function.

Line breaks were escaped as `/\r?\n/`, which does not match a bare carriage
return. A title or note containing one was written raw into a `SUMMARY` or
`DESCRIPTION` value. RFC 5545 delimits content lines with CRLF and forbids
control characters inside a TEXT value, and a parser that also breaks on a lone
CR would read the rest of the title as its own iCalendar properties.

Confirmed rather than assumed: a title of `a\rEND:VEVENT\rBEGIN:VEVENT\rSUMMARY:evil`
produced a `SUMMARY` line containing a raw CR. Other control characters,
including NUL, passed through untouched as well.

**Why it matters for this app.** The `.ics` file is the one artifact that leaves
the machine and is read by other software: you import it into a phone calendar.
The title can arrive from a file someone else wrote, since import does not
constrain what a title contains beyond it being non-empty text.

**Fix.** `escape` now maps `\r\n`, `\r` and `\n` all to the single escape, CRLF
first so a Windows line ending yields one and not two, and drops the control
characters that TEXT has no representation for, keeping the tab, which it
allows. Five tests in `ics.test.ts` under AC-24.4 cover it.

### 2. A refused storage write silently lost data — fixed

**Severity: medium**, data loss rather than disclosure. `src/storage/db.ts` and
`src/state/useDatabase.ts`.

`save` called `setItem` with no guard, and `commit` called `setDb(next)` before
`save(next)`. A browser refuses that write when the quota is reached, and Safari
refuses it in a private window always. The exception escaped the click handler,
and the screen kept showing items that were never stored. The lie surfaced on
the next reload, by which point the work was gone.

Reachable without malice by importing a large file, and reachable deliberately
by handing someone an export big enough to fill the quota.

**Fix.** `save` returns whether it worked instead of throwing. `commit` writes
first and only updates the screen if the write succeeded, so the UI cannot show
something storage refused. A refused write raises a message naming what to do:
export a backup, then delete finished items. Three tests in `db.test.ts` and two
in `App.test.tsx`.

### 3. No size limit on an imported file — fixed

**Severity: low**, denial of service against your own tab. `src/domain/transfer.ts`.

`parseImport` called `JSON.parse` on whatever it was handed. A file of a few
hundred megabytes freezes the tab while it parses, before any validation runs.

**Fix.** A 5MB ceiling checked on the string before parsing, which is far past
what a person types and past what the browser could store anyway. Two tests.

## Checked and found safe

These were tested, not assumed. Each is safe because of a specific decision, and
the note says which, because that is what a later change could undo.

**Prototype pollution through the import file.** A `__proto__` or `constructor`
key at the top level is rejected by the key allowlist in `transfer.ts`, and one
inside an item never reaches `Object.prototype` because `toItem` copies named
fields rather than spreading what it was handed. Both were run against a live
`Object.prototype` check. `pollution.test.ts` keeps it that way, because the
protection is the allowlist and loosening that is the change that would reopen
it.

**Code execution sinks.** No `eval`, no `new Function`, no string-argument
`setTimeout`, no `innerHTML`, no `document.write`, no `dangerouslySetInnerHTML`
anywhere in `src/` or `index.html`. `react/no-danger` is an ESLint error, so a
passing lint is the standing proof.

**Injection into the UI.** React escapes interpolated text, and nothing bypasses
it. A note of `<img src=x onerror=alert(1)>` is covered by an existing US-06
test that asserts it stays text and no image element appears.

**Secrets.** There are none. No API key, token, password or private key in
source or committed config, because there is no service to authenticate to.

**Downloaded filenames.** `exportFilename` and `calendarFilename` are built from
the clock, not from user input, so neither the JSON nor the `.ics` download can
be steered into a chosen name. `.gitignore` blocks both by pattern.

**File dialog paths.** The import reads `event.target.files?.[0]` through
`FileReader`. No path is taken from the user and none is constructed, so the
traversal question does not arise.

**Paste handling.** The bulk paste box takes plain text and parses it with an
anchored regular expression. Timed against 40,000 characters of pathological
input: under a millisecond, so no backtracking problem.

**Dependencies.** Two at runtime, `react` and `react-dom`. `npm audit --omit=dev`
reports zero vulnerabilities. Three moderate advisories exist in dev
dependencies, all in `@vitest/mocker`, which runs the test suite and is not
shipped. The fix is a major version bump of vitest; it is not urgent and is
noted rather than taken during an audit.

## Not applicable

No Python, so no `pickle`, `marshal`, `shelve` or `yaml.load`. No `subprocess`,
`os.system` or dynamic import. No `ctypes` or native library loading. No
auto-updater. No embedded browser component. No temp files. No backend, so no
endpoints, no SQL, no CORS, no SSRF and no client-supplied identity to distrust.

Section 9 becomes live the day a backend is added, and the security posture in
`CLAUDE.md` currently forbids one. If that changes, this file is where the
client/server checks belong.

## One wart, not fixed

When a write is refused, the add form still clears the fields, because it resets
as soon as it hands the draft over and has no way to learn that the write
failed. So a refused write costs you what you typed on top of refusing the
change. Fixing it means threading a success value back through `addItem`,
`update` and `commit` to the form, which is a wider change than this audit
should make on its own. It is a usability wart in an already-degraded state, not
a security issue.

**Fixed on 24 September 2026 by US-40.** `addItem` now reports whether the write
worked and the form keeps what was typed when it did not.

## Addendum, 24 September 2026: the roadmap batch

Stories US-40 to US-46 changed the trust boundary in one place: there is now a
second file the user can choose, a calendar (`.ics`) file, read by
`src/domain/icsImport.ts`. It is handled the way the JSON import is:

- **Capped before it is read**, at the same 5 MB as the JSON import.
- **Read as text, never evaluated.** Only four properties are looked at:
  `SUMMARY`, `DTSTART` or `DUE`, `STATUS` and `RRULE`. Anything else in the file,
  attachments, URLs and alarms included, is ignored.
- **Nothing is written until confirmed.** The file becomes drafts, shown in a
  preview; storage changes only on Add.
- **Titles render as text**, through React, and a test puts markup in a title to
  prove it stays text.
- **No network request.** Canvas publishes a feed URL, and fetching it would be
  the request the security posture forbids, so the user downloads the file and
  chooses it, exactly as with the JSON import.

Also checked and found safe in the batch:

- **`navigator.storage.persist()`** asks the browser to keep this origin's
  storage. It grants no new capability and exposes nothing.
- **`npm run deploy`'s self-check** reads only the deploy folder it was given and
  writes nothing.
- **`@axe-core/playwright`**, the one new dependency, is development only and is
  never bundled, so it cannot read anyone's deadlines.
