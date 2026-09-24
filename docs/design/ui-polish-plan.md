# UI polish, from six design skills

Proposed 24 September 2026. **Not approved; nothing here is built.** Each phase
becomes a story with its own tests before any code.

The skills are six of the thirteen in
[emilkowalski/skills](https://github.com/emilkowalski/skills), chosen against
this codebase: apple-design, emil-design-eng, find-animation-opportunities,
review-animations, mobile-native and prototype. Their rules were read from the
repository before this plan was written, and every item below cites the rule it
comes from and the file it changes.

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

| Before                                                                                         | After                                                                        | Why                                                                                         |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Every transition uses the built-in `ease`, and one in `CalendarView.css` names no curve at all | One custom ease-out token, `cubic-bezier(0.23, 1, 0.32, 1)`, used everywhere | Built-in curves are too weak for UI; the skill flags them                                   |
| Fourteen `:hover` rules apply on any device                                                    | Gated behind `@media (hover: hover) and (pointer: fine)`                     | On a touch screen a hover sticks after a tap. Invisible on the laptop; matters on the phone |
| `motion.css` sets every duration to 0.01ms when reduced motion is asked for                    | Remove movement, keep short opacity and colour changes                       | "Reduce, don't eliminate": a colour change is not motion                                    |
| No button has a pressed state                                                                  | `:active { transform: scale(0.97) }` over 160ms                              | Press feedback is the one motion allowed even on frequent actions                           |
| Durations: 150ms throughout                                                                    | Unchanged                                                                    | Within the 100 to 160ms press budget and well under 300ms                                   |
| Properties: colour, background, border, opacity                                                | Unchanged                                                                    | Cheap on elements this small; nothing animates layout                                       |

Verdict the skill would give: **approve with fixes.** Nothing is slow or
janky; it is plain.

## Where motion or feedback would genuinely help

find-animation-opportunities' four gates: frequency, a named purpose, a
duration within budget, and the motion helping rather than obstructing.

| Where                                     | How often  | Purpose                                                                             | Recipe                                                                                                                        |
| ----------------------------------------- | ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Calendar cell under a dragged item        | Occasional | Feedback. apple-design: continuous feedback _during_ a gesture, not only at the end | Highlight the cell being hovered with `--accent-soft`, instantly, no transition. Today nothing shows where the item will land |
| An item row opening                       | Tens a day | Stop content teleporting in                                                         | The panel's contents fade and rise 4px over 150ms with `@starting-style`. Height does not animate, since that is layout       |
| The calendar's day opening                | Occasional | Stop content teleporting in                                                         | The same fade and rise, 200ms                                                                                                 |
| Status lines ("moved to…", "Marked done") | Occasional | Draw the eye to a change                                                            | Fade in over 150ms. No movement                                                                                               |
| Buttons                                   | Tens a day | Feedback                                                                            | The press state from the review                                                                                               |

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
- **A decision for you, not a fix: confirmations or undo.** apple-design's
  "Agency" principle prefers easy undo and few confirmations. Drop and Delete
  both ask first. Undo instead would be one click fewer and just as safe, but it
  reverses the "no undo" choice you made for drag in US-39. **Not in the phases
  below unless you ask for it.**

## For the phone: mobile-native

Most of this skill matters only when the app runs on your iPhone, which is v3
phase two. Two parts help today:

- **Now:** a `theme-color` meta tag for light and dark, which colours the
  installed Chrome app's title bar to match the app. Also the hover gating
  above.
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

The prototype skill builds each full size in a throwaway page with a switcher.
Nothing it builds imports into the app, and it is deleted once you pick. Given
this app's layout, that is one standalone HTML file, not a new route.

## The phases

| Phase | Story             | Contents                                                                                                                      | Size                                                                         |
| ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1     | US-47             | Motion foundation: an easing token, gated hover, press states, reduced motion that reduces                                    | Small, CSS only                                                              |
| 2     | US-48             | Feedback where it is missing: the drop-target highlight, rows and the day opening without teleporting, status lines fading in | Small; one piece of state for the hovered cell                               |
| 3     | US-49             | Type and contrast: `rem` sizes, `prefers-contrast: more`, tracking by size                                                    | Medium, mechanical; checked by building before and after, like the CSS split |
| 4     | US-50             | Installed-app polish: `theme-color` for light and dark                                                                        | Tiny                                                                         |
| 5     | Prototype         | The day-opening question, three variants, you pick                                                                            | Throwaway, then a story for the winner                                       |
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
