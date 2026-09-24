# UI polish, from six design skills

Proposed 24 September 2026. **Phases 1 to 4 are built** as
[US-47](../product/stories/US-47.md), [US-48](../product/stories/US-48.md),
[US-49](../product/stories/US-49.md) and [US-50](../product/stories/US-50.md),
with a light and dark toggle added alongside as
[US-51](../product/stories/US-51.md). Phase 5 was prototyped and Aditya picked
the popover, built as [US-53](../product/stories/US-53.md). The phone fixes
are not started.

The skills are six of the thirteen in
[emilkowalski/skills](https://github.com/emilkowalski/skills), chosen against
this codebase: apple-design, emil-design-eng, find-animation-opportunities,
review-animations, mobile-native and prototype. Their rules were read from the
repository before this plan was written, and every item below cites the rule it
comes from and the file it changes. It was first drafted from the repository's
summaries and corrected after reading the full skill files; the corrections are
listed at the end.

## The rule that shapes everything else

Both animation skills sort motion by how often it happens. Something you do a
hundred times a day gets no animation, because motion there reads as slowness.
Something you do tens of times a day gets motion you barely notice, if any.
Occasional moments get ordinary animation, and rare ones may have delight.

This app's value is being fast to check, so most of it sits in the first two
tiers. The plan is therefore mostly feedback and fixes, with very little new
motion. The rejected list at the end is as much a part of the plan as the
accepted one.

## What a strict review of today's motion finds

review-animations, run against the eleven transitions in `src/`:

| Before                                                                                                | After                                                                                                                                                                           | Why                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Hover and colour transitions use the built-in `ease`; one in `CalendarView.css` names no curve at all | Keep `ease` on hover and colour changes and name it on the one that lacks it. Add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for the new press, entrance and exit motion only | STANDARDS.md: hover and colour change use `ease`; entering, exiting and pressing use a strong ease-out |
| Fourteen `:hover` rules apply on any device                                                           | Gated behind `@media (hover: hover) and (pointer: fine)`                                                                                                                        | On a touch screen a hover sticks after a tap. Invisible on the laptop; matters on the phone            |
| `motion.css` sets every duration to 0.01ms when reduced motion is asked for                           | Remove movement, keep short opacity and colour changes                                                                                                                          | "Reduce, don't eliminate": a colour change is not motion                                               |
| No button has a pressed state                                                                         | `:active { transform: scale(0.97) }` over 160ms                                                                                                                                 | Press feedback is the one motion allowed even on frequent actions                                      |
| Durations: 150ms throughout                                                                           | Unchanged                                                                                                                                                                       | Within the 100 to 160ms press budget and well under 300ms                                              |
| Properties: colour, background, border, opacity                                                       | Unchanged                                                                                                                                                                       | Cheap on elements this small; nothing animates layout                                                  |

Verdict the skill would give: **approve with fixes.** Nothing is slow or
janky; it is plain.

## Where motion or feedback would genuinely help

find-animation-opportunities' four gates: frequency, a named purpose, a
duration within budget, and the motion helping rather than obstructing.

| Where                                     | How often  | Purpose                                                                             | Recipe                                                                                                                                                                                                                       |
| ----------------------------------------- | ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar cell under a dragged item        | Occasional | Feedback. apple-design: continuous feedback _during_ a gesture, not only at the end | Highlight the cell being hovered with `--accent-soft`, instantly, no transition. Today nothing shows where the item will land                                                                                                |
| An item row opening                       | Tens a day | Stop content teleporting in                                                         | The panel's contents fade and rise 4px over 150ms with `@starting-style`. At this frequency the skills allow only near-imperceptible motion, which is why it is 4px and 150ms. Height does not animate, since that is layout |
| The calendar's day opening                | Occasional | Stop content teleporting in                                                         | The same fade and rise, 200ms                                                                                                                                                                                                |
| Status lines ("moved to…", "Marked done") | Occasional | Draw the eye to a change                                                            | Fade in over 150ms from `opacity: 0; translateY(2px)`. A pure fade with no initial transform is one of review-animations' escalation triggers, so it starts 2px low                                                          |
| Buttons                                   | Tens a day | Feedback                                                                            | The press state from the review                                                                                                                                                                                              |

**Rejected, with the gate each fails:**

- **Switching views in the sidebar:** far past a hundred times a day, and
  keyboard driven. Frequency.
- **Previous and next month:** navigation done repeatedly. Frequency.
- **Marking an item done:** keyboard driven, and `u` undoes it. An exit
  animation would slow the app's most-used action. Frequency.
- **Items moving between groups** after Tomorrow, or a new date: animating a
  list reorder needs layout animation or a library. Function and cost.
- **Trends charts:** dense information, which motion obscures. Function.
- **Springs, momentum and rubber-banding** from apple-design: drag and drop is
  the browser's own, and there is nothing here to throw. Purpose.
- **Translucent materials and blur:** a flat app with no overlapping layers has
  nothing for them to separate. Purpose.
- **Delight moments,** such as finishing a project's last step: allowed for rare
  events, but no story asks for it. Purpose.

## Beyond motion: apple-design

- **Text that follows your size setting.** Font sizes are fixed in pixels: 13px
  twenty-four times, 11px thirteen times. Written in `rem`, they would scale with
  Chrome's font-size setting as well as with zoom. Visually identical at the
  default size.
- **More contrast when the system asks for it.** Add a
  `@media (prefers-contrast: more)` block with stronger borders and muted text in
  `styles/base.css`. It redefines tokens only, so the contrast test covers it.
- **Tracking by size.** Slightly tighter letter spacing on the large numbers in
  the stat row and the headings; body text stays at zero.
- **Confirmations are consistent with apple-design as they stand.** Its
  "Agency" principle reserves a confirmation for "genuinely destructive,
  irreversible actions", and Drop and Delete are exactly that. If you want fewer
  clicks there are two alternatives, neither in the phases below:
  - **undo**, which makes the action reversible and so removes the need to ask
  - **hold to confirm**, from find-animation-opportunities: a fill across the
    button over 2 seconds while held, snapping back over 200ms on release
- **A label to reconsider: "Home".** apple-design: "Name nav items for their
  contents, not vague umbrellas ('Home')." The view holds your deadlines, so
  "Deadlines" says what is there. It would touch the sidebar and every test that
  names the view. **A decision for you, not in the phases.**

## For the phone: mobile-native

Most of this skill matters only when the app runs on your iPhone, which is v3
phase two. Two parts help today:

- **Now:** a `theme-color` meta tag per colour scheme, which colours the
  installed Chrome app's title bar. The skill says to match the colour at the
  top of the page, which here is the page background: `#f7f9f9` in light and
  `#0f172a` in dark, the `--bg` token. Also the hover gating above.
- **With v3 phase two:**
  - inputs at 16px, so iOS does not zoom the page when you tap a field
  - `100dvh` in place of `100vh` in `Shell.css`
  - safe-area padding and `viewport-fit=cover`
  - `touch-action: manipulation`
  - no tap-highlight flash
  - `enterkeyhint` on the add form

  Each needs testing on the real phone, which the skill insists on. It belongs
  with the phone work, not before it.

## One question worth prototyping

apple-design's spatial consistency rule: something should open where you
reached for it. Today a calendar day opens _below the whole grid_, so on a tall
month the result lands far from the cell you pressed. That is a real design
question with several defensible answers, which is what the prototype skill is
for:

1. **Below the grid,** as now.
2. **A panel beside the grid,** with the calendar narrowing to make room.
3. **A popover anchored to the cell,** growing from it.

The prototype skill builds each full size in a throwaway page with its picker,
copied verbatim from `PICKER.md`. There is no router, so the page is a second
Vite HTML entry, `prototypes/day-panel.html`, which imports the real calendar so
each variant is judged in context. The production build only builds
`index.html`, so the prototype never ships, and it is deleted once you pick.

## The phases

| Phase | Story             | Contents                                                                                                                      | Size                                                                         |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1     | US-47             | Motion foundation: an easing token, gated hover, press states, reduced motion that reduces                                    | Small, CSS only                                                              |
| 2     | US-48             | Feedback where it is missing: the drop-target highlight, rows and the day opening without teleporting, status lines fading in | Small; one piece of state for the hovered cell                               |
| 3     | US-49             | Type and contrast: `rem` sizes, `prefers-contrast: more`, tracking by size                                                    | Medium, mechanical; checked by building before and after, like the CSS split |
| 4     | US-50             | Installed-app polish: `theme-color` for light and dark                                                                        | Tiny                                                                         |
| 5     | US-53             | The day-opening question, three variants, you pick. Picked: the popover                                                       | Throwaway, then a story for the winner                                       |
| Later | With v3 phase two | The phone fixes from mobile-native                                                                                            | Tested on the iPhone                                                         |

**How it will be tested.** Motion is mostly invisible to unit tests, so the
checks go where they can:

- Playwright reads computed styles: every transition under 300ms, no built-in
  curves, hover rules inert on a touch emulation, and reduced motion keeping
  opacity while removing movement.
- The drop highlight gets a component test.
- The WCAG scan runs on every view as it does now, and `prefers-contrast` is
  added as a third scheme.
- Screenshots in both themes before and after each phase, for you to look at.

**No new dependency in any phase.** Everything here is CSS, plus one piece of
React state.

## Corrected after reading the full skills

The first draft relied on the repository's summaries. Reading the files
themselves changed six things:

1. **Hover and colour changes keep `ease`.** The draft replaced every built-in
   curve; `STANDARDS.md` says hover and colour change use `ease` and reserves
   the strong ease-out for entrances, exits and presses.
2. **Status lines start 2px low**, because a pure fade is an escalation trigger.
3. **Row opening is held to near-imperceptible** motion, the limit for
   something seen tens of times a day.
4. **The confirmation question changed.** apple-design endorses confirmation for
   irreversible actions, and find-animation-opportunities offers hold to confirm
   as a third option.
5. **"Home" is a label apple-design names as too vague.** New, and yours to
   decide.
6. **The prototype becomes a second Vite page** using the real calendar, which
   the skill prefers over a standalone file when a dev server exists.
