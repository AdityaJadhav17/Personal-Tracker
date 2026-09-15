# UI reference

Aditya shared four screenshots of an existing dashboard app on 2026-09-15 as a
visual direction for Phase 4. This file records what to take from them, what
does not transfer, and the open questions. Nothing here has been built.

Phase 4 runs with the `ui-ux-pro-max` skill. Read this file first.

## What the reference looks like

**Shell.** A fixed dark slate sidebar on the left holding an avatar, a "Good
Morning, ethan" greeting, a small uppercase NAVIGATION label, and icon-plus-text
nav items. The active item is marked with a teal accent bar and a lighter
background. A row of small utility icons sits pinned at the bottom.

**Top bar.** White, with a hamburger on the left and a notification bell with a
red count badge plus an avatar and name dropdown on the right.

**Content.** A light grey page behind white cards. Each card carries a thin
teal rule along its top edge and generous internal padding.

**Typography.** Large, light-weight, blue-grey headings, with a smaller plain
subtitle sitting beside the heading rather than under it. "Trend Correlations"
next to "Here's how you're performing with your goals over time" is the pattern.

**Accent.** A single teal-green used for progress bars, primary buttons, active
nav state, and card top rules. Red appears only for the notification badge and
for priority flags.

## The screenshot that matters most

The "Today's Tasks" card maps almost one to one onto our dashboard. Each row
holds a checkbox on the left, the task title, a star, and a coloured tag on the
right. Read against our data model:

- The checkbox is our Done control.
- The star is priority. In the reference it is a filled red flag for important
  and a hollow outline otherwise, which is a two-state treatment where we have
  three.
- The coloured tag is the item's grouping, which for us is `category`.

That card also carries a stat header above it: "Tasks Remaining Today, 8, 6
Completed Yesterday".

## What does not transfer

**The sidebar navigation.** The reference has Home, Goals, Health and Trends.
Personal Tracker v1 is one page with no router, and US-07 and US-08 are
deferred. Building a nav for pages that do not exist would be inventing scope.
If a shell is wanted, it should hold one item until there is a second.

**The stat header.** "6 Completed Yesterday" needs a notion of yesterday's
completions. We store `completedAt`, so it is computable, but no user story
asks for it.

**Charts and productivity breakdowns.** No story, no data.

**Light theme only.** The reference is light throughout. Your stated pain point
is reading this at 11pm with the lights off, and Phase 4 explicitly requires
checking contrast in dark mode. The palette will have to be derived, not copied.

## The three-second test

Phase 4's own constraint is that the dashboard answers "what do I do next"
within three seconds of looking at it. The reference is dense: a lot of cards,
a lot of chrome. Our page carries four groups and a form. Worth resisting the
pull toward filling space.

## Open decision: motion.dev

Aditya asked on 2026-09-15 whether Motion (`motion.dev`, formerly Framer
Motion) can be used for animation, plus extra CSS as needed.

**Not yet approved, because it is a new dependency** and the standing rule is
that each one gets named and approved before it lands. Recording the tradeoffs
now so the Phase 4 decision is quick.

**In favour.** Motion's `animate` covers enter and exit transitions that CSS
handles badly, and there are two here worth having: an item leaving the list
when marked done, and a group heading appearing or disappearing as the last
item moves out of it. Both currently snap.

**Against.** It is another package that runs in the page and can read the
user's deadlines, which is the argument from the security posture. The full
React package is meaningfully larger than the current bundle. And most of what
this UI needs is hover, focus and colour transitions, which are CSS one-liners.

**A middle option.** Motion ships a mini vanilla build that is a few kilobytes
and uses the browser's own Web Animations API. It covers enter and exit without
the React reconciliation layer.

**Compatibility is fine either way.** Vite bundles it from `node_modules`, so
the `script-src 'self'` policy and the no-third-party-requests rule both hold.
No CDN is involved.

**Recommendation.** Start Phase 4 with CSS only. If the done-and-undo
transition still feels abrupt once the page is styled, add Motion then, with a
specific animation it is being added for.
