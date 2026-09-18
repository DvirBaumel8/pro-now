# PRO NOW — Claude Handoff README v1.0 (source, verbatim from Google Drive)

THIS IS THE START HERE DOCUMENT.

## 1. Source of truth order
A. Latest explicit product decisions in Master Product Bible.
B. Claude Code Build Specification v1.0.
C. Database/API/State Machines v1.0 for backend invariants.
D. UX/UI Design Specification v1.0 for visual/interaction implementation.
E. QA Security Launch Checklist v1.0 for release gates.
F. Older research/concepts only as context.
Do not treat generated UI concept images as exact UI specifications.

## 2. Product in one sentence
PRO NOW is a real-time on-demand marketplace where independent professionals
choose when to go ONLINE and receive nearby service jobs, while customers
request a trusted professional to come NOW.

## 3. Non-negotiable
ONLINE-FIRST. NOW-FIRST. Real supply only. Real ETA only. Service-specific
verification. Transparent provider payout. Server-authoritative
jobs/payments. No advance booking in MVP. No bidding. No fake integrations.
No hard-coded plumber-only architecture.

## 4. Read before code
Master Product Bible → Claude Code Build Specification → UX/UI Design
Specification → Database/API/State Machines → QA Security Launch Checklist.
Then create the repository /docs files specified in the Build Specification.

## 5. First Claude session
Do not ask Claude to "build the app". Give it the folder/specs and instruct
it to read the Handoff README first, then all authoritative specs, inspect
the repository, produce the Epic 0 implementation plan, contradictions/TBDs
and proposed file tree, and not implement product features until the plan
is approved.

## 6. Working method
One epic at a time: Plan → Implement → Tests → Manual verification → Docs →
Commit → Stop/report.

## 7. Human decisions Claude cannot make
payment provider, KYC vendor, commission, legal/tax model, insurance policy,
mandatory credentials, background checks, pilot market/services, retention,
support SLA, production cloud/vendor commitments. Build interfaces/
placeholders where needed.

## 8. Expected repo
/CLAUDE.md, /docs/*, /apps/customer-mobile, /apps/pro-mobile, /apps/admin,
/apps/api, /packages/ui, /packages/types, /packages/config,
/packages/api-client, /packages/validation.

## 9. Completion standard
A feature is not done because a screen renders. It must have real state
behavior, errors/loading/empty, RTL/accessibility, authorization, analytics,
tests, and server consistency where applicable.

## 10. MVP end-to-end definition
Verified pro goes online → customer requests active service → dispatch finds
eligible nearby supply → offer arrives → exactly one pro accepts → customer
sees confirmed identity and real ETA → pro arrives and performs correct
pricing workflow → payment/ledger resolves → review is eligible → pro
returns AVAILABLE automatically → Ops can reconstruct everything.

## 11. Do not expand scope
Record future ideas in roadmap; do not implement unless the current epic or
an explicit product decision includes it.

## 12. Handoff status
Product direction / customer core UX / professional onboarding+shift UX /
trust+verification / dispatch+state machine / data+API baseline /
security+QA gates: all defined. Vendor/business/legal choices: intentionally
open. Code should begin only after Epic 0 plan review.

## 13. Final package additions
Also read: Final Pre-Development Decisions v1.0 (final product freeze and
representative pilot service set) and Service Catalog & Pilot Matrix v1.0
(human-readable service seed matrix — convert approved rows into repository
seed data, never a production runtime dependency).

## 14. Ready status
The pre-development package is READY for Claude Code planning. Begin with
Epic 0 planning only. Open commercial/legal/vendor decisions remain
intentional and must not be guessed.
