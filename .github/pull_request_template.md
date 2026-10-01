## Story

US-NN: what it does, in a line. Link the story in `docs/product/stories/`.

## What changed

-

## Done means

From [the definition of done](../docs/engineering/definition-of-done.md):

- [ ] Every acceptance criterion has a test with its ID in the name, and I saw
      each fail before the code existed.
- [ ] The story's Playwright spec passes in a real browser.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` (exit code 0, no
      unhandled errors) and `npm run build` pass.
- [ ] No new dependency, or it was approved by name first.
- [ ] Every changed line traces to the story. Nothing reformatted in passing.
- [ ] No real data anywhere in the diff: no exports, no screenshots of it.
