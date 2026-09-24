# Documentation

Start with whichever question you have.

## Product

What is being built, for whom, and why.

- [product/user-research.md](product/user-research.md) — the interview, both
  personas, and the version 1 user stories with their acceptance criteria.
  Every test ID in the codebase traces back to this file.
- [product/mvp.md](product/mvp.md) — what version 1 shipped, what it left out,
  and the security posture.
- [product/v2-plan.md](product/v2-plan.md) — the current scope: goals, courses,
  reflections and trends, derived from the dashboard screenshots.
- [product/review-and-roadmap.md](product/review-and-roadmap.md) — a snapshot
  of the product, five problems from research worth solving, a review of six
  qualities, and the plan in order. Proposed, not approved.

## Engineering

How it is built and what counts as finished.

- [product/v3-plan.md](product/v3-plan.md) — proposed, not approved. The server,
  the phone notifications, and the two personas that split at a laptop lid. Read
  the "How this could be wrong" section before agreeing with it.

- [engineering/plan.md](engineering/plan.md) — data model, storage, directory
  layout, and the risks with their early warning signs.
- [engineering/decisions.md](engineering/decisions.md) — every architectural
  decision with its date, the options weighed, and the conditions that would
  reverse it. Newest first. Read this before arguing with a choice.
- [engineering/definition-of-done.md](engineering/definition-of-done.md) — the
  checklist for one story and the checklist for a release.
- [engineering/security-audit.md](engineering/security-audit.md) — what the
  trust boundary is, what was found and fixed, and what was tested and found
  safe with the reason it is safe.

## Design

- [design/ui-reference.md](design/ui-reference.md) — the dashboard screenshots
  that set the visual direction, what transfers from them and what does not.
- [design/ui-plan.md](design/ui-plan.md) — the layout reasoning, with each
  decision tied to a persona pain point or a story ID.

## History

- [session-log.md](session-log.md) — what happened, in order, including the
  mistakes. Several entries record a wrong call and the evidence that corrected
  it, which is usually more useful than the decision log's clean summary.

## Conventions

Acceptance criteria carry IDs like `AC-04.2`, and every test name contains the
ID it covers, so `npm test -- AC-04.2` finds exactly one test. A story that
changes an existing criterion says which one it supersedes.
