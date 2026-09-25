# UI final polish

Proposed 25 September 2026, after US-62 to US-68. US-69 and US-72 are built;
US-70 and US-71 are not.

The audit read every view in both themes and at phone width, with the app in
the state a term actually looks like: three courses, a goal, a week of
reflections, an overdue item and a repeating one. It applied apple-design and
emil-design-eng, and ran a code pass over `src/**/*.css` for their checklists.

## Where the app stands

The earlier plans fixed the big things, and the code pass confirms it:

- No `transition: all`, no `ease-in`, and every `:hover` is gated to a fine
  pointer.
- Nothing runs past 250ms except the phone sheet, which runs 300ms on the iOS
  drawer curve, inside the 200 to 500ms the skills give drawers.
- Reduced motion, reduced transparency and more contrast are all handled.
- Contrast is tested token by token and scanned by axe on every view.

So what is left is consistency, one behaviour that disagrees with itself, and
one accessibility gap specific to Windows. It is small on purpose: this is
the last pass before the app should be left alone and used.

## Findings

emil-design-eng's review format:

| Before                                                                                                                                                       | After                                                                                                                                       | Why                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spacing tokens in px (`--space-1: 4px` to `--space-5: 24px`), and 37 px lengths                                                                              | The five tokens in rem; the rest left alone unless they are text-adjacent                                                                   | apple-design §15: layout scales with the reader's text size. Windows' text size setting enlarges the type today and leaves the gaps the same                              |
| Corners of 6px on cards, 10px on the add field, 12px on nothing                                                                                              | `--radius` 6px for controls, `--radius-card` 10px for anything that contains (cards, the open row, charts, lists, the add field)            | Craft: two radii with a rule, not three by accident. Larger containers read softer, as macOS sizes them                                                                   |
| Calendar puts its actions right of the title; Goals and Courses put a filled "New goal" under it                                                             | One page header: title left, actions right, in the calendar's quiet button style                                                            | Familiarity: things that do the same job live in the same place. A filled button is the loudest thing on a page you mostly read                                           |
| No press state on the undo button, calendar chips, calendar dates and "Show the numbers"                                                                     | `scale: var(--press-scale)` on `:active`, like every other button                                                                           | Press feedback is the one motion allowed at any frequency; these are the last buttons without it                                                                          |
| The open row saves the note when you leave it, but the title, date, repeat, course and goal only on Save                                                     | Every field saves when you leave it or pick a value; Save goes; a bad title or date shows its error under the field and saves nothing       | apple-design §16: things that look the same behave the same. Four fields that save and one that waits is a trap, and Save is a click that exists only to finish a thought |
| Deleting and dropping remove the row in one frame; finishing folds it                                                                                        | Delete and Drop fold the same way, then remove                                                                                              | Spatial consistency: the three ways a row leaves should look like one. Safe to delay a delete: if it is lost, the item is still there                                     |
| The undo message fades after 6s even while the pointer is on it                                                                                              | Paused while hovered or focused (`animation-play-state: paused`)                                                                            | Sonner's rule: a timer never runs out under the user's hand                                                                                                               |
| Windows contrast themes (forced colours) paint every background to one system colour: course dots, the done check, today's circle and the current tab vanish | `@media (forced-colors: active)`: dots and the circle take a border in `CanvasText`, the check keeps its stroke, the current tab an outline | apple-design §14. This laptop runs Windows; `prefers-contrast` is handled, forced colours are not                                                                         |

## The phases

Four stories, in order. Each is one branch of work and small.

1. **US-69, one page header, one corner scale, rem spacing, the last press
   states.** Tokens and CSS almost entirely, plus moving two buttons in
   CourseList and GoalList. Verify: a Playwright check that every view's
   actions share the title's row; the contrast and axe suites unchanged; a
   check that doubling the root font size doubles `--space-4`.
2. **US-70, edits save as you go.** ItemRow only. The one behaviour change in
   this plan, and the only one with real test churn: every test that edits
   then clicks Save. Verify: change a field, reload, see it kept; a blank
   title shows its error and the stored title is unchanged.
3. **US-71, leaving the list looks like one thing.** Delete and Drop fold as
   done does; the undo message pauses under the pointer. Verify: the frames
   show a fold for all three; a hovered message is still there at 8s.
4. **US-72, Windows contrast themes.** CSS only. Verify: Playwright's
   `forcedColors: 'active'` with a check that each marker has a visible
   border or stroke, and a screenshot.

## Worth a prototype, not a decision

Home's date and filters scroll away with the list. A header that stays, with
the large date shrinking into a small one and the list blurring under it,
is how iOS and macOS handle a long list (apple-design §12, scroll edge
effects). It would help most in October, when the list is longest. It is
also the only item here that changes how Home feels rather than how it
behaves, so it is a prototype first, with a plain sticky header as the
quiet variant.

## Considered and rejected

| Idea                                                             | Why not                                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Animate switching views                                          | Done tens of times a day. The frequency rule says no animation, and the skill is right: Raycast has none                                     |
| Stagger the list in on load                                      | Same frequency; decoration on the thing you open to read                                                                                     |
| A spring library for sheets and popovers                         | A new dependency for motion the platform already does. Nothing here is dragged with momentum, which is what springs are for                  |
| Rename Home to Upcoming                                          | apple-design prefers specific labels, but Home is familiar, the page's title already says what it is, and dozens of tests name it            |
| Colour the moods in Reflections                                  | Colour as a verdict on your day. The words already say it                                                                                    |
| Make the calendar popover grow from whichever side it flipped to | CSS cannot see which fallback position won. The popover is occasional and the fade carries it                                                |
| The rest of mobile-native                                        | The app stays local (decided 25 September), so the phone layout serves a narrow window. Its fixes for installed apps wait for that to change |
