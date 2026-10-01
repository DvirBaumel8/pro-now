# CLAUDE.md — PRO NOW Engineering Contract

This file governs how any engineer (human or AI) works in this repository.
It is derived from the PRO NOW pre-development package (Master Product
Bible, Claude Code Build Specification, UX/UI Design Specification,
Database/API/State Machines, QA/Security/Launch Checklist, Final
Pre-Development Decisions, Service Catalog & Pilot Matrix) authored before
any code existed. The Master Product Bible is kept verbatim in
`/docs/_source/`; the numbered files in `/docs` are the working, code-facing
specs, kept current. Index: `/docs/CURRENT-STATE.md`.

## 1. Source of truth order

When documents conflict, resolve in this order:

1. Latest explicit product decision in `/docs/01-PRD.md` / `/docs/18-ROADMAP.md`.
2. `/docs/04-TECH-ARCHITECTURE.md`, `/docs/07-JOB-STATE-MACHINE.md`, `/docs/08-DISPATCH-ENGINE.md`.
3. `/docs/05-DATABASE.md`, `/docs/06-API-SPEC.md` for backend invariants.
4. `/docs/03-DESIGN-SYSTEM.md`, `/docs/02-UX-FLOWS.md` for UI implementation.
5. `/docs/15-QA-TEST-PLAN.md` for release gates.
6. The original bible in `/docs/_source/` as context only.

Generated UI concept boards are inspiration, never pixel specs.

## 2. Product in one sentence

PRO NOW is a real-time, ONLINE-FIRST / NOW-FIRST marketplace: independent
professionals choose when to go ONLINE and receive nearby jobs; customers
request a trusted, verified professional to come **now**.

## 3. Non-negotiable invariants

- ONLINE-FIRST. NOW-FIRST. No advance-booking calendar, no bidding, no
  provider-browsing-as-primary-flow in MVP.
- Real supply only. Real ETA only. Never fabricate availability, demand, or
  a trust score.
- Service-specific verification. A professional is dispatch-eligible per
  *service*, not merely per account.
- Transparent provider payout — the professional sees expected earnings
  before accepting whenever the amount is knowable.
- Server is authoritative for eligibility, assignment, job state, pricing
  result, quote approval, timers, and payment/ledger state. Clients render;
  they do not decide truth.
- No hard-coded "plumber-only" architecture — the domain model uses
  Department → Category → Service → Variant/Add-on and the neutral terms
  Professional / Provider / Service everywhere (code, copy, analytics).
- No fake integrations, no mocked data presented as production, ever.

## 4. Human decisions this codebase must NOT invent

Payment marketplace provider · KYC/identity vendor · commission percentage ·
legal entity/tax/invoice model · insurance policy · which credentials are
mandatory per category · background-check policy · pilot geography · pilot
service mix beyond the seeded candidates in `/docs/09b-SERVICE-CATALOG.md` ·
support hours/SLA · data retention periods · chat/call masking vendor ·
analytics vendor · cloud hosting vendor.

Wherever one of these is required, build an **interface + sandbox/mock
adapter** (see `packages/types` provider interfaces) and record the decision
as `TBD` in `/docs/18-ROADMAP.md §Open Decisions`. Never guess a business
answer and never ship a mock behind a flag that claims to be production.

## 5. Working method

One epic at a time: **Plan → Implement → Tests → Manual verification →
Docs updated → Commit → Stop/report.** Do not start the next epic until the
current epic's acceptance criteria pass or an explicit exception is
recorded in the epic's report.

## 6. Rules

Must:
- Read `/docs` before implementing anything.
- State a short plan before each epic.
- Use migrations for every schema change (Prisma). Never `db push` against
  a shared environment.
- Write tests alongside business-critical logic (state transitions, pricing
  adapters, dispatch eligibility/scoring, ledger).
- Implement loading / empty / error / offline states for every data screen.
- Preserve Hebrew RTL as the primary layout direction.
- Run lint + typecheck + tests before calling anything "done".
- Update the relevant `/docs/*.md` file when architecture changes.
- Use vendor-neutral abstractions (`PaymentProvider`,
  `IdentityVerificationProvider`, `ExternalReputationProvider`,
  `MapsRoutingProvider`, `NotificationProvider`).

- Work on a branch in your own git worktree, and land it through a pull
  request with auto-merge (`/docs/22-WORKING-MODEL.md §2`). Several sessions
  share this repository; the main checkout is not yours.

Must NOT:
- Commit or push to `master` directly, merge a PR whose `CI passed` check is
  not green, or edit files in a worktree another session is using.
- Rewrite architecture casually or add microservices/Kubernetes for MVP.
- Hard-code secrets, or commit `.env`.
- Skip a migration.
- Mark a mock as production-ready.
- Fake a test or disable TypeScript/lint to get to green.
- Use client-held state as financial or job-state truth.
- Implement BOOK/REQUEST booking engines "because it may be useful" — MVP is
  NOW/dispatch only (Engine 1). Engines 2/3 are architecture-safe, not built.
- Invent a business/legal rule listed in §4.

## 7. Definition of Done (every epic)

Code implemented · migration applied/tested if needed · unit/integration
tests passing · typecheck clean · lint clean · relevant E2E/manual path
walked and recorded · error/loading/empty states implemented · analytics
events wired · security review note added · docs updated · no TODO that
blocks the epic's stated acceptance criteria. Web-app specifics:
`/docs/21-PRODUCTION-PLAN.md §6`.

Per domain, "done" means a passing test, not a review opinion:
- **Dispatch:** two simultaneous accepts never create two assignments.
- **Realtime:** a killed, backgrounded or reconnecting client re-syncs from
  the server.
- **Payments:** duplicate and out-of-order webhooks have one effect.
- **Verification:** an expired required credential removes that service's
  dispatch eligibility.
- **Reviews:** only an eligible completed job can create a verified review
  (DB constraint + test).
- **Location:** `OFFLINE` blocks tracking; a stale `ONLINE` location removes
  eligibility.
- **Admin:** Ops can reconstruct a failed job from the event timeline alone.

Keep documentation small: an epic's report and QA findings go in its PR
description, not in new files. Update the existing spec instead of adding a
page.

## 8. Repository map

```
/CLAUDE.md
/docs/                  — CURRENT-STATE (start here), numbered specs, DEMO-SYNC, _source (the bible)
/apps/web               — THE PRODUCT'S CLIENT: Vite + React 19 + react-native-web PWA, admin at /admin
/apps/api               — Node.js + TypeScript (Fastify), Prisma, PostGIS; serves apps/web in production
/apps/customer-mobile   — React Native + Expo (Phase 3; typechecks, never built for a device)
/apps/pro-mobile        — React Native + Expo (Phase 3)
/apps/admin             — Next.js scaffold, unused since the admin moved into apps/web (D7)
/packages/ui            — the product's design-system components (not used by the demo)
/packages/types         — the product's domain types + provider interfaces (not used by the demo)
/packages/config         — shared config/env schema
/packages/api-client     — typed client consumed by the web app
/packages/validation     — shared zod schemas (request/response validation)
/tools/design-preview    — THE DEMO (Amit's track, not a shipping target). Self-contained: its own
                           copies of ui/types in `lib/ui` (@pro-now/demo-ui) and `lib/types`
                           (@pro-now/demo-types), and the 3D city (`src/city`, three.js).
                           The demo and the product share no code — see /docs/22-WORKING-MODEL.md
```

## 9. Current status

**Start with `/docs/CURRENT-STATE.md`** — who Amit and Dvir are, where the
demo, the product and production live, how to work on each, and what is
next. Amit works on the demo, Dvir on the product; they share no code
(`/docs/22-WORKING-MODEL.md`). The product catches up with the demo from
the marker in `/docs/DEMO-SYNC.md`.

The product's epics W0–W11 are done (`/docs/21-PRODUCTION-PLAN.md`) and it
runs at https://pro-now.onrender.com. Local setup is in `/README.md`. Two
steps are easy to miss: `npm run db:generate -w apps/api` (nothing in
`apps/api` compiles without the Prisma client), and the env file belongs at
`apps/api/.env`.
