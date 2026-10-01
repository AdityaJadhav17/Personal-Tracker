# Security policy

## Supported versions

Only `main`. The app deploys from it, so a fix ships there.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub's
[security advisory form](https://github.com/AdityaJadhav17/Personal-Tracker/security/advisories/new).
Say what you found, how to reproduce it, and what it lets someone do. You
should hear back within a week.

Never include real personal data: no exports, no screenshots of someone's
deadlines or notes. A made-up example shows the problem just as well.

## In scope

Personal Tracker runs on one laptop and holds personal information: deadlines,
notes, courses, and notes locked behind a passcode. Worth reporting:

- Anything that sends data off the machine. The app makes no network request
  after load, and its CSP is meant to enforce that.
- Script injection through anything a user types or imports, including a
  hostile backup file or calendar file.
- A way to read a locked note's text without its passcode, or a weakness in
  how it is encrypted (`src/domain/lock.ts`).
- The local server (`scripts/serve.mjs`, `127.0.0.1:4180`) serving anything
  outside the app's folder, or answering another site.
- The updater (`scripts/update.mjs`) deploying a commit that CI did not pass.

## Out of scope

- Someone using the unlocked laptop, or reading the browser profile on disk.
  The decision log accepts this; full-disk encryption covers it.
- Guessing a short or common passcode from a copied file. A passcode is only
  as strong as its owner makes it.
- Anything in `spike/`, which is throwaway and never deployed.

The threat model and past audits are in
[docs/engineering/security-audit.md](docs/engineering/security-audit.md) and
[docs/engineering/decisions.md](docs/engineering/decisions.md).
