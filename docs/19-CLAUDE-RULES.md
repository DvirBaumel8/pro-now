# 19 — Claude / Engineering Rules

This is the enforceable, code-facing twin of `/CLAUDE.md` at the repo root
— read that file first. Summary for quick reference while implementing:

**Must:** read `/docs` before implementing · plan before each epic · small
coherent commits · update docs when architecture changes · migrations for
schema changes · tests with implementation · lint/typecheck/tests before
"done" · show exact commands/results in the epic report · feature flags for
incomplete/risky features · preserve server authority · vendor
abstractions for every external dependency · ask before changing a product
invariant.

**Must NOT:** rewrite architecture casually · install major dependencies
without a stated rationale · hard-code secrets · skip a migration · mark a
mock as production · fake an integration · fake a test · disable
TypeScript/lint to get to green · use client state as financial/job truth ·
implement BOOK/REQUEST "because it may be useful" · invent a business/legal
rule from `/CLAUDE.md §4`.

## Definition of Done — expanded per domain
- **Dispatch** is not done until two simultaneous accepts cannot create two
  assignments (must be a passing concurrency test, not a code review
  opinion).
- **Realtime** is not done until a killed/backgrounded/reconnecting client
  resyncs correctly from the server.
- **Payments** are not done until duplicate and out-of-order webhook tests
  pass.
- **Verification** is not done until an expired required credential
  actually removes that service's dispatch eligibility in a test.
- **Reviews** are not done until only an eligible completed job can create
  a verified review (enforced by a DB constraint + test, not just app
  logic).
- **Location** is not done until `OFFLINE` provably blocks dispatch
  tracking and stale `ONLINE` location provably removes eligibility.
- **Admin** is not done until Ops can reconstruct a failed job from the
  event timeline alone, without querying raw tables.

## Build order (epics)
See `/docs/18-ROADMAP.md §Build order`. Do not start the next epic until
the current one's acceptance criteria pass or an explicit, written
exception is recorded in that epic's report.
