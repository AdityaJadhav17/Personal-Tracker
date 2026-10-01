# Accessibility

Personal Tracker aims to meet WCAG 2.2 level AA. Everything below is checked
by a test that runs on every push, unless it says otherwise.

## What is checked

- **An automated WCAG 2.2 AA scan** (axe) of every view, in light, dark, and
  both with "more contrast", including the open calendar day and the lock
  screen for notes. Any violation fails CI.
- **Colour contrast** of the whole palette, light and dark, by a unit test
  that reads the design tokens: text at 4.5:1, borders that mark a control at
  3:1.
- **The keyboard.** A skip link comes first and jumps past the sidebar. Every
  sidebar view and every control on an item is reached by Tab, in the order
  shown. A deadline can be moved on the calendar without dragging, through
  its date field. `u` undoes, and is ignored while you type.
- **Windows contrast themes** (forced colours): the current view, chosen
  filter, today, ticked items and floating panels keep a visible edge.
- **Reduced motion:** with it on, nothing slides or bounces; colour changes
  still fade.
- **Text size:** no font size is set in pixels and spacing is in rem, so the
  layout grows with the browser's and Windows' text size.
- **Narrow screens:** every view fits 320px without sideways scrolling, and
  on a phone fields are 16px so iOS does not zoom.
- **Not by colour alone:** courses have a name beside their colour, overdue
  items say how late they are, and each chart has a table of the same
  numbers.

## Supported

Current Chrome and Edge on Windows, which is what the app is built and tested
in. The phone layout is tested at phone sizes in the same engine, not on a
real phone or in Safari.

## Known limitations

- **No manual screen reader pass yet.** Names, roles and live messages are
  covered by the scan and by tests that find everything through accessible
  names, but no one has used the app end to end with NVDA, Narrator or
  VoiceOver. Reports from anyone who does are especially welcome.
- **Calendar drag and drop** is mouse and touch only. The keyboard way to move
  a deadline is its date field, in the open day.
- **The notes editor** shows the text cursor rather than a focus ring, as text
  fields do.
- **Charts in Trends** are drawn for sight; the exact numbers are in the table
  under "Show the numbers".

## Reporting a barrier

Open an issue with the **Bug** form and say what you were trying to do, what
you use (browser, screen reader, zoom, contrast theme), and what got in the
way. Please do not include real personal data.
