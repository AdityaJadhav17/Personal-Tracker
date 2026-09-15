# Personal Tracker

[![CI](https://github.com/AdityaJadhav17/Personal-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/AdityaJadhav17/Personal-Tracker/actions/workflows/ci.yml)

One page holding every deadline you have, coursework and life in the same list,
grouped by urgency and ordered by priority. It runs in your browser on your own
laptop. No account, no server, nothing leaves the machine.

![The dashboard, showing overdue, today, this week and later groups](docs/screenshot.png)

## What it does

Add anything with a date and a consequence: a midterm, rent, a dentist
appointment, a friend's birthday. The dashboard sorts them into four groups.

- **Overdue** sits above everything, so you never scroll past something you
  have already missed.
- **Today**, **This week** and **Later** follow. A group with nothing in it does
  not render at all.
- Inside each group, high priority comes first, then whatever is due soonest.
- Anything due in the next three days carries a **Soon** marker, whatever its
  priority.

Type a date however you like. `oct 3`, `10/3`, `2026-10-03` and `oct 3 2pm` all
work. With no time, a deadline means 23:59 that day.

Mark something done from the keyboard, and press `u` to undo if you hit the
wrong row. Attach a short note to any item.

Export everything to a JSON file you keep, and import it back on another
machine.

## Run it

You need [Node](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/AdityaJadhav17/Personal-Tracker.git
cd Personal-Tracker
npm install
npm run dev
```

That serves the app at http://localhost:5173. Nothing else to configure, and no
database to set up: your deadlines live in the browser's own storage.

## Test it

```bash
npm test          # unit and component tests, with coverage
npm run e2e       # end to end in a real browser
npm run lint      # eslint, fails on any warning
npm run typecheck # tsc
npm run build     # typecheck, then a production build
```

The end-to-end suite drives a real Chromium, so install it once:

```bash
npx playwright install chromium
```

## Your data

Everything sits in this browser's `localStorage`, under one key. It never
travels: the app makes zero network requests after the page loads, and a
Playwright spec checks that on every CI run.

Two things follow from that.

**Clearing site data deletes your deadlines.** Use Export now and then, and keep
the file somewhere you trust. Import restores it exactly, which a round-trip
test proves against a real downloaded file.

**Anyone at your unlocked laptop can read it,** as can any browser extension you
have installed. The app stores plain text and does not encrypt anything, on the
reasoning that full-disk encryption already covers the realistic threat and a
passphrase prompt would wreck an app whose whole value is being quick to check.
[docs/engineering/decisions.md](docs/engineering/decisions.md) records that trade in full.

Exported files match a pattern in `.gitignore`, so you cannot commit your own
deadlines by accident.

## Not in this version

No accounts, no cloud sync, no hosted backend, no mobile app, no collaboration.
GitHub holds the source and nothing else.

Also absent, and deliberately: phone notifications, calendar export, recurring
items, course reference cards, and filtering by category. Items still carry a
category so that today's export files stay readable once filtering arrives.

The honest limitation: a browser tab on a laptop cannot reach your phone without
a server, so this version reminds you only while you have it open. Calendar
export is the leading candidate for fixing that, and
[docs/engineering/decisions.md](docs/engineering/decisions.md) explains why it waited.

## How it is built

React 18 and TypeScript on Vite. Vitest with React Testing Library for unit and
component tests, Playwright for end to end. No component library, no state
library, no router, no date library.

[docs/](docs/README.md) holds the rest: the user research every test ID traces
back to, the data model, and a decision log that explains why each choice went
the way it did, including the ones that were wrong first.

## Licence

MIT. See [LICENSE](LICENSE).
