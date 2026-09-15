# Phase 4: layout reasoning

Every decision below names the pain point or story ID it serves. Nothing here
is built yet. Aditya approves this before any CSS is written.

Inputs: the personas in [../product/user-research.md](../product/user-research.md), the screenshots
in [ui-reference.md](ui-reference.md), and a `ui-ux-pro-max` design system run
for a dense, low-motion productivity dashboard.

## What the skill recommended, and what I am not taking

The search returned Flat Design, a teal-forward palette, Inter, and a
150-200ms transition budget. Those I am taking. Three I am not.

**The layout pattern it returned is for a marketing page.** Hero, product
video, feature breakdown, CTA. That is the landing-page pattern, not a
dashboard. Disregarded.

**Inter is served from Google Fonts.** The security posture forbids CDN
requests, and a spec already asserts the app makes zero off-origin requests.
Self-hosting Inter means committing woff2 files for a marginal gain over the
system stack, which on your laptop resolves to Segoe UI. Using the system
stack: zero bytes, zero requests, spec stays green. `public/fonts/` stays
empty and can go.

**GSAP is a dependency.** Same argument as Motion in
[../engineering/decisions.md](../engineering/decisions.md). CSS transitions only.

## The three-second test

Your Phase 4 constraint is that the dashboard answers "what do I do next"
within three seconds. That sets the whole layout, so everything else follows
from it.

Three seconds means two eye movements, not a scan. So:

**One column, no sidebar, no tabs, no cards side by side.** The reference app
has a four-item sidebar; we have one page and no router, so a nav would be
chrome pointing nowhere. Serves pain point 2: "i dont have to open a lot of
stuff to check my deadlines I will be wasting time."

**Overdue and Today must be readable without scrolling, always.** During
finals week you might have fifteen open items (pain point 3: "It's UCSD it
goes pretty fast"). Fifteen rows at comfortable spacing pushes Today below the
fold. So the row height is tight, roughly 40px, and groups do not get card
chrome with padding on all four sides. Density dial set to 8 of 10 for this
reason.

**Group headings carry a count.** "Overdue 2" answers the question before you
read a single title. Serves US-02 and US-03.

## The item row

Left to right: done control, priority, title, due time, Soon marker, note.

**Priority is a colour bar on the left edge of the row, not a word.** US-04
orders by priority, so the order already encodes it; the bar confirms what the
order is telling you without adding a word to read. Three states: a solid bar
for high, a faint one for normal, nothing for low. The reference app uses a
red flag for the same job.

Colour alone cannot carry meaning, so the bar is width-differentiated as well
as colour-differentiated, and the row keeps its `aria-label` on the done
control which already names the item.

**The done control becomes a checkbox-shaped button**, matching the reference
and matching what a task list looks like everywhere. It keeps its current
accessible name, so US-05's tests and the keyboard path are untouched.

**The note collapses to one line.** Right now every item renders a full
textarea, which is the ugliest thing on the page. It becomes a borderless
single line showing the note text, or a faint "Note" placeholder when empty,
expanding to three lines on focus. No new state, no new component, no test
changes: the same textarea with different CSS. Serves US-06 while getting the
row height down for the three-second test.

**Category is a small muted tag, not a section.** Pain point 1 is that a
missed assignment and a missed doctor's appointment lived in different systems.
Splitting them back into sections on screen would rebuild the problem. The tag
is there so you can tell them apart, not so you can separate them.

## The form

Stays at the top, stays four fields, keeps the forgiving date parser.

**It becomes a single row on wide screens** rather than four stacked
label-and-field pairs, so it costs one line instead of five and Overdue starts
higher up the page. Labels stay visible, never placeholder-only.

Sam, the secondary persona, adds items in the ninety seconds between classes.
That argues for the form being the first thing focusable and staying out of
the way otherwise, which is what it already does.

## Colour

Teal as the single accent, matching both the skill's recommendation and the
reference screenshots. Red reserved for overdue and for errors, so red always
means the same thing.

Tokens as CSS custom properties on `:root`, with a `prefers-color-scheme: dark`
block redefining only the values. No raw hex in component CSS.

| Token          | Light     | Dark      |
| -------------- | --------- | --------- |
| `--bg`         | `#F7F9F9` | `#0F172A` |
| `--surface`    | `#FFFFFF` | `#192134` |
| `--text`       | `#134E4A` | `#E2E8F0` |
| `--text-muted` | `#475569` | `#94A3B8` |
| `--border`     | `#D9E4E3` | `#2A3550` |
| `--accent`     | `#0F766E` | `#2DD4BF` |
| `--danger`     | `#DC2626` | `#F87171` |

The accent differs between modes on purpose. `#0D9488` on white gives white
text only about 3.3 to 1, which fails AA for body text, so light mode uses the
darker `#0F766E`. Dark mode needs the opposite: a light teal on a dark ground.

## Dark mode, and proving it

Your pain point is reading this at 11pm with the lights off. The palette
follows `prefers-color-scheme`, so it matches whatever your laptop is already
doing at that hour.

**I want to make the contrast claim testable rather than asserted.** Proposal:
a unit test that reads the custom properties out of `src/index.css`, computes
the WCAG contrast ratio for each declared foreground and background pair in
both modes, and fails below 4.5 to 1. One source of truth, and a gate that
catches a future palette tweak that quietly breaks legibility.

That is a new test file and roughly 60 lines with no new dependency. Say if
you would rather I just eyeball it.

## Keyboard and focus

US-05 already proves you can add an item and finish it without the mouse. The
styling must not undo that.

**A visible focus ring on everything**, using `:focus-visible` so it appears
for keyboard use and not for mouse clicks. A two-pixel accent outline with an
offset, never `outline: none`.

**Nothing sticky.** WCAG 2.2 requires focus to stay unobscured, and a sticky
header over a scrolling list is the usual way that breaks. The page scrolls as
one document.

## Motion

Transitions on colour and background only, 150ms, and everything wrapped in
`prefers-reduced-motion: reduce`. No layout animation, no entrance animation.

The one place motion would genuinely help is an item leaving the list when
marked done, which currently snaps. That is the Motion decision from
[../engineering/decisions.md](../engineering/decisions.md), and it stays deferred until the page is styled
and we can see whether it still feels abrupt.

## Responsive

Single column throughout, so there is little to break. Below roughly 600px the
form stacks back to one field per line and the note drops under the title. No
horizontal scroll at any width.

## Files this touches, and the size

The 200-line guardrail applies, so here is the shape before the work.

| File                             | Change                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `src/index.css`                  | Tokens, reset, and all component styles. The bulk, roughly 250 lines |
| `src/App.tsx`                    | Wrapper elements and class names. No logic                           |
| `src/components/AddItemForm.tsx` | Class names, form laid out in a row                                  |
| `src/components/ItemRow.tsx`     | Class names, priority bar, category tag                              |
| `src/components/Dashboard.tsx`   | Class names, counts in headings                                      |
| `src/components/EmptyState.tsx`  | Class names                                                          |
| `src/components/ErrorState.tsx`  | Class names                                                          |
| `src/design/contrast.test.ts`    | New, if you want the contrast gate                                   |
| `public/fonts/`                  | Delete, empty and now unused                                         |

Total is well over 200 lines, which is why this document exists rather than a
diff.

**No logic changes and no new dependencies.** If any existing test goes red,
that is a signal I changed behaviour, not styling, and I will stop and say so
rather than update the test. The one exception I expect: group headings gaining
a count changes their accessible names, so `getByRole('heading', { name:
'Overdue' })` becomes `'Overdue 2'`. That is a real behaviour change and I will
flag each test it touches rather than quietly rewriting them.

## What I need from you

1. Approve the layout reasoning, or tell me what to change.
2. Say yes or no to the contrast test.
3. Confirm the system font stack instead of self-hosted Inter.
