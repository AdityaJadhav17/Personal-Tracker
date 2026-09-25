# Extending the app

Two changes come up again and again: a new field on an item, and a new view.
Each touches several files, and missing one of them fails quietly: the field
does not survive an import, or the view is unreachable from the keyboard. These
lists are what versions 4 and 5 actually took.

## Adding a field to an item

1. **`src/domain/types.ts`.** Add it to `Item`, required, with `null` for
   "none". `exactOptionalPropertyTypes` is on, so an optional field is more
   trouble than a nullable one.
2. **`src/domain/migrate.ts`.** Bump the version and add one hop that gives
   every existing item the empty value. Spread the item after the default, so
   an item that already carries the field keeps it.
3. **`src/domain/types.ts` again.** Change `Database['version']` to the new
   number.
4. **`src/domain/transfer.ts`.** Add the version to `KEYS` and to the version
   check in `parseImport`. Validate the field in `itemProblem`, accepting it
   absent for older files. Copy it in `toItem`, defaulting it when absent.
5. **`src/storage/db.ts`.** `emptyDatabase` uses the new version.
6. **`src/state/useDatabase.ts`.** `itemFrom` sets the empty value. Check that
   every action that builds or changes an item sets it deliberately: `markDone`
   copies the item it finishes, and `editItem` spreads the old one.
7. **Tests.** Every hand-built item fixture needs the field; the compiler lists
   them. Every assertion of "the current version" moves up by one. Add a
   migration test from the previous version and a round-trip import test.
8. **Playwright seeds** may stay at older versions: `load` upgrades them.
9. **`CLAUDE.md`**, the paragraph that names the current version and fields.

## Adding a view

1. **`src/components/Shell.tsx`.** Add it to `VIEWS`, with a label and an
   icon path. The sidebar, its keyboard order and `aria-current` follow.
2. **`src/App.tsx`.** Add a branch to the view conditional. There are seven
   branches now, Data the longest; if an eighth makes it hard to read, that
   is the time to turn it into a map, not before.
3. **`e2e/us-42-accessibility.spec.ts`.** Add the view's label to `VIEWS`, so
   the WCAG scan covers it in both colour schemes.
4. **`e2e/us-23-narrow.spec.ts`.** Add it to `VIEWS` there too, so it is
   checked at 320px.
5. **`e2e/us-13-sidebar.spec.ts`** counts Tab stops by position; check it
   still reaches the view it means to.

## Names that tests will look for

Playwright matches `getByLabel` and `getByRole` names **by substring** unless
told `exact: true`; Testing Library matches whole strings. Eight collisions
have come from that difference, most recently "Step title for Midterm"
containing "Title for Midterm". Before naming a control, search the existing
names for one that contains it or that it contains.
