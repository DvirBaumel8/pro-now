# Epic 0 Report — PRO NOW

Written at the end of the first build session, per the process the source
package itself prescribes: read everything, don't invent business/legal/
vendor decisions, build Epic 0 (+ a first pass at several later epics,
per this session's explicit brief), then stop and report back before any
further epic starts. This document is that report.

## 1. Product understanding

PRO NOW is **not** a booking/directory app. It is a real-time, two-sided
dispatch marketplace with one primary loop:

1. A verified, trained professional taps **ONLINE** for one or more
   services they're eligible for, and their live location starts feeding
   the dispatch system.
2. A customer opens the app, picks a service, and requests it **now** (no
   calendar, no browsing a list of providers as the primary flow, no
   bidding).
3. The server runs a geographic pre-filter → eligibility filter (with
   explainable reason codes, never a silent drop) → real ETA for the
   shortlist only (ETA is expensive, so it's never computed for the whole
   candidate pool) → weighted score → sequential offer to one professional
   at a time.
4. Acceptance is atomic: exactly one professional can end up assigned to a
   job even under concurrent accepts from multiple offered professionals.
5. The two sides track a shared job state machine through arrival, service
   (fixed price, hourly, visit-then-quote, or distance/time pricing),
   completion, payment, and review.
6. The professional sees their expected payout before accepting whenever
   it's knowable, and goes back to eligible-for-dispatch the instant they
   finish or go back online — the marketplace's whole value proposition is
   that "online" supply is real, not aspirational.

Two design choices run through every layer of the spec and therefore
through this code: **everything is domain-neutral** (Department → Category
→ Service → Variant/Add-on, "Professional"/"Provider"/"Service" in code and
copy — nothing is hard-coded to a single vertical like plumbing), and
**the server is authoritative** for eligibility, assignment, job state,
price, quote approval, timers, and ledger state; clients render, they never
decide truth. Both are treated as invariants, not preferences, in
`/CLAUDE.md §3`.

Hebrew-first RTL is a first-class layout requirement, not a locale
afterthought — every screen in `apps/customer-mobile` and `apps/pro-mobile`
was built RTL-first with the two themes from `docs/03-DESIGN-SYSTEM.md`
(warm off-white customer theme, dark charcoal/green pro theme).

## 2. Architecture understanding

- **Monorepo**, npm workspaces, `apps/*` (4 deployables) + `packages/*` (5
  shared libraries) — matches `/docs/04-TECH-ARCHITECTURE.md §Repository
  layout` exactly.
- **apps/api** (Fastify + TypeScript): domain logic under
  `src/domain/{job,dispatch,pricing}`, infra adapters under `src/infra/*`,
  HTTP routes under `src/routes/*`, a WS scaffold under `src/realtime`.
  Postgres + **PostGIS** for geospatial dispatch queries, **Prisma** as the
  ORM/migration tool, **Redis** for presence/locks/dispatch coordination.
- **State machines are enforced in code, not convention**:
  `src/domain/job/transitions.ts` and `pro-presence-transitions.ts` encode
  the full transition tables from `/docs/07-JOB-STATE-MACHINE.md`, with
  actor-based authorization (which actor may trigger which transition) —
  covered by `apps/api/test/job-transitions.test.ts` and
  `pro-presence-transitions.test.ts`.
- **Dispatch** (`src/domain/dispatch/*`) implements the exact pipeline in
  `/docs/08-DISPATCH-ENGINE.md`: `eligibility.ts` produces explainable
  reason codes, `scoring.ts` applies admin-configurable weights read from
  `AppConfig`, `atomic-accept.ts` uses a Redis lock plus a Postgres
  `SELECT ... FOR UPDATE` row lock inside one Prisma `$transaction` so that
  two simultaneous accepts cannot both succeed — the specific guarantee
  `/docs/19-CLAUDE-RULES.md` names as the definition of "dispatch is done".
  `dispatch-eligibility.test.ts` and `dispatch-scoring.test.ts` cover this.
- **Pricing** (`src/domain/pricing/pricing-adapter.ts`) implements all four
  archetypes from `/docs/09-PAYMENTS.md` (FIXED, HOURLY, VISIT_QUOTE,
  DISTANCE_TIME) as one adapter interface feeding a single `Job` entity, so
  adding a fifth pricing shape later doesn't touch the job model — covered
  by `pricing-adapters.test.ts`.
- **Money** is integer minor units + ISO currency everywhere (`packages/
  types/src/money.ts`), never a float, per `/CLAUDE.md §3`.
- **Every external dependency the business hasn't chosen yet** — payments,
  identity/KYC, maps/routing, external reputation, notifications — is a
  vendor-neutral interface in `packages/types/src/providers/*` with a
  **sandbox** implementation in `apps/api/src/infra/*`, each loudly
  labeled non-production in its own file header. This is the mechanism
  that lets real engineering proceed without inventing the business
  decisions listed in `/CLAUDE.md §4`.
- **apps/admin** (Next.js Pages Router): KPI dashboard, live map page,
  provider list, job list + job inspector that reconstructs a job from its
  real event timeline via `GET /v1/jobs/:id` — the specific bar
  `/docs/19-CLAUDE-RULES.md` sets for "admin is done".
- **apps/customer-mobile / apps/pro-mobile** (Expo + RN + TS): the 9
  signature screens per side named in `/docs/02-UX-FLOWS.md`, wired to a
  real (if currently unauthenticated-by-default) fetch-based API client,
  not static mocks.

## 3. Contradictions found between source documents (resolved)

- **Doc numbering/list drift.** The Handoff README and the Master Product
  Bible's early file list name `07-JOB-STATE-MACHINE.md,
  08-DISPATCH-ENGINE.md, ... 18-CLAUDE-RULES.md` (ending at 18). The Build
  Specification's own later, more detailed `/docs` file list (§24 in the
  source) inserts `10-TRUST-VERIFICATION.md` and shifts everything after
  it down by one, ending at `19-CLAUDE-RULES.md`. **Resolution:** this repo
  follows the Build Specification's numbering (the more detailed and later
  of the two), which is why `docs/` here runs `00` through `19` with trust/
  verification as its own `10-TRUST-VERIFICATION.md` rather than folded
  into another file. Flagged here per `/CLAUDE.md §1` so it's an explicit,
  recorded resolution rather than a silent pick.
- No other hard contradictions were found between the Master Product
  Bible, the Build Specification, the UX/UI spec, and the Database/API/
  State-Machine spec — the later documents consistently refine rather than
  contradict the Bible's product principles (ONLINE-FIRST/NOW-FIRST,
  domain-neutral taxonomy, server authority). Where a later document adds
  detail the earlier one lacked (e.g. exact state-transition tables, the
  25-row pilot service matrix), this repo follows the later, more detailed
  document, per `/CLAUDE.md §1`'s source-of-truth order.

## 4. Open decisions — intentionally NOT invented in this codebase

Per `/CLAUDE.md §4` and `/docs/18-ROADMAP.md §Open decisions`, the
following remain human/business/legal decisions and are represented only
as an interface + sandbox adapter + `TBD`, never a guess:

Israeli payment marketplace provider · KYC/identity provider · exact maps/
routing commercial setup · external Google-reputation implementation and
terms · legal entity and tax/invoice model · commission percentage ·
cancellation fees · provider insurance policy · which credentials are
mandatory per category · background-check policy where lawful · pilot
geography · pilot services beyond the seeded catalog candidates · support
hours/SLA · data retention periods · chat/call masking vendor · analytics
vendor · cloud hosting vendor · final brand/trademark/domain clearance.

Nothing in `apps/*` or `packages/*` assumes an answer to any of these.
Where a value was needed to make the sandbox runnable (e.g. a fake
commission % used only inside `sandbox-payment-provider.ts` math), it is
marked inline as a placeholder, not a recommendation.

## 5. Repository structure (as built)

```
/CLAUDE.md
/README.md
/docker-compose.yml            postgis + redis, local dev only
/.env.example
/docs/00…19-*.md                working specs
/docs/_source/*                 original package, preserved verbatim
/apps/api/prisma/schema.prisma  ~45-model schema
/apps/api/prisma/seed*.ts       9 departments / 15 categories / 25 services
/apps/api/src/domain/*          job + presence state machines, dispatch, pricing
/apps/api/src/infra/*           sandbox provider adapters (payments, identity, maps, reputation)
/apps/api/src/routes/*          auth, catalog, jobs, offers, pro, quotes, reviews
/apps/api/src/realtime          WS scaffold
/apps/api/test/*                5 unit-test files on the correctness-critical logic
/apps/customer-mobile           9 signature screens, RTL, warm theme
/apps/pro-mobile                9 signature screens, RTL, dark theme
/apps/admin                     KPI dashboard, live map, providers, job list + inspector
/packages/types                 domain types + 5 provider interfaces
/packages/config                zod env schema
/packages/validation             zod request schemas
/packages/ui                     theme tokens + 3 shared components
/packages/api-client              typed fetch client factory
```

## 6. Epic status against `/docs/19-CLAUDE-RULES.md` Definition of Done

| Epic | Scope | Status |
|---|---|---|
| 0 — Repository & docs | monorepo, CLAUDE.md, docs 00–19 | **Done.** This report closes it. |
| 1 — Database foundation | Prisma schema, PostGIS, seed | **First pass done.** Schema + seed written and internally consistent with `/docs/05-DATABASE.md`. **Not done:** migration has never actually been run against Postgres in this session (see §7) — "migrations for every schema change" is satisfied structurally (Prisma-managed) but not yet *executed and tested* per the DoD checklist. |
| 2 — Auth & account | JWT + sandbox OTP | **First pass done.** `src/lib/auth.ts`, `auth-context` plugin, `/routes/auth.ts`. **Not done:** no test suite for auth yet; untested against a running DB. |
| 3 — Professional verification | service-specific eligibility gating | **Interfaces + sandbox done** (`IdentityVerificationProvider` + `sandbox-identity-provider.ts`, trust-status fields in schema). **Not done:** the DoD-defining test ("expired required credential actually removes that service's dispatch eligibility, in a test") does not exist yet — `eligibility.ts` has the logic hook but no dedicated expiry test. |
| 4 — Customer discovery/request | mobile UI | **First pass done** — all 9 signature screens built and wired to the API client. **Not done:** no E2E walk was performed (no environment to run Expo in this session). |
| 5 — Pro services & shift | mobile UI | **First pass done**, same caveat as Epic 4. |
| 6 — Dispatch | core engine | **Strongest epic in this delivery.** Eligibility, scoring, atomic accept, and their DoD-defining concurrency guarantee are all implemented *and* have a written test (`atomic-accept` + `dispatch-eligibility.test.ts` + `dispatch-scoring.test.ts`). **Not done:** the concurrency test has not actually been executed in this session (no DB/Redis available — see §7), so it is "written to prove the guarantee" but not yet "passing" in the DoD sense. |
| 7 — Realtime | WS scaffold | **Scaffold only.** `job-socket.ts` exists; the DoD bar ("a killed/backgrounded/reconnecting client resyncs correctly") is explicitly **not met** — no resync logic yet. This is correctly the first place the roadmap should slow down. |
| 8 — Active job (nav/arrival/service/completion) | — | Screens exist (`NavigationScreen`, `ActiveServiceScreen`, `TrackingScreen`, completion screens); server-side timers/edge-case handling for this epic's full scope not built. |
| 9 — Pricing/quotes | 4 adapters | **Core adapters done + tested** (`pricing-adapters.test.ts`). Quote versioning/hash-integrity endpoint (`/routes/quotes.ts`) exists; full approval-flow edge cases not yet covered by tests. |
| 10 — Payments/ledger | sandbox provider | **Sandbox interface done.** Ledger tables exist in schema. Duplicate/out-of-order webhook tests (the DoD bar) **not built** — correctly blocked on Epic 7/webhook plumbing and the real-provider business decision. |
| 11 — Reputation | PRO NOW reviews | **Interface + review route done.** DB-constraint enforcing "only an eligible completed job can create a verified review" (the DoD bar) is **not yet added as a constraint/test** — currently app-logic only, which the rules explicitly say is insufficient. |
| 12 — Admin/Ops | dashboard | **First pass done**, including the job-inspector-from-event-timeline bar. **Not done:** not run against a live API in this session. |
| 13–17 | Safety, analytics, hardening, staging, store readiness | **Not started** — correctly out of scope until the NOW loop above is verified end-to-end. |

## 7. Verification status — please read this before trusting anything above as "tested"

This build session ran inside a sandboxed cloud container whose network
policy returns `403 host_not_allowed` for `registry.npmjs.org` for the
entire session (confirmed via direct `curl`, not a flaky retry-able
error). Per that policy, no workaround was attempted. The practical
consequence: **`npm install` was never run, so `tsc --noEmit`, `npm test`,
`next build`, `expo start`, and `prisma migrate` were never run either.**
Nothing in this repository has been compiled, type-checked, linted, or
executed in this session. Docker Compose (Postgres/PostGIS + Redis) was
also never started, since there was nothing installed yet to point at it.

What that means concretely:

- The 5 test files under `apps/api/test/*` are real, specific tests
  written against the actual domain code they test (not stubs) — but they
  have not been run, so "tests passing" in the Definition of Done sense is
  **not yet true** for any epic, including Epic 6.
- The Prisma schema has not been through `prisma generate` or `prisma
  migrate dev`, so it's unverified against Prisma's own parser beyond
  careful manual authoring.
- The Expo and Next.js apps have not been bundled or booted, so import
  paths, RN/Expo API usage, and Next.js page conventions are unverified
  beyond careful manual authoring against each framework's real API
  surface.

**This is the single most important open item.** The recommended next
action for whoever picks this up (human or a future session with working
registry access) is: `npm install` at the repo root, fix whatever the
first real compile surfaces, then run `npm run typecheck`, `npm run lint`,
and `npm test`, and only then treat the epic statuses in §6 as more than
"written, self-consistent, believed correct."

## 8. Recommended next epic

Given §6 and §7: **do not start Epic 8+ yet.** The correct next step,
matching `/docs/19-CLAUDE-RULES.md §Build order` ("do not start the next
epic until the current one's acceptance criteria pass"), is to close the
verification gap on Epics 0–6 first:

1. Get `npm install` + `docker compose up` + `prisma migrate dev` +
   `prisma db seed` running in a real environment.
2. Run `npm test` and fix whatever the dispatch-concurrency and state-
   machine tests reveal — Epic 6 is the epic this whole marketplace's
   integrity depends on, so it should be the first one proven green, not
   just written.
3. Then finish Epic 7 (Realtime) properly — the resync-on-reconnect
   guarantee — since Epics 8, 10, and 11's remaining DoD gaps (webhook
   ordering, live job tracking) all sit downstream of realtime actually
   working.
4. Only after that, resume Epic 8 (active job) end-to-end and Epic 11's
   DB-level review constraint.

No product feature work is recommended before that verification pass —
consistent with `/docs/18-ROADMAP.md`'s "when there is tension between
features and making NOW reliable, choose NOW reliability."
