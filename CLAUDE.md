# CLAUDE.md — PRO NOW Engineering Contract

This file governs how any engineer (human or AI) works in this repository.
It is derived from the PRO NOW pre-development package (Master Product
Bible, Claude Code Build Specification, UX/UI Design Specification,
Database/API/State Machines, QA/Security/Launch Checklist, Final
Pre-Development Decisions, Service Catalog & Pilot Matrix) authored before
any code existed. Those source documents are preserved under
`/docs/_source/` verbatim. Everything under `/docs/00-*.md` … `/docs/19-*.md`
is the working, code-facing distillation of that package.

## 1. Source of truth order

When documents conflict, resolve in this order:

1. Latest explicit product decision in `/docs/01-PRD.md` / `/docs/18-ROADMAP.md`.
2. `/docs/04-TECH-ARCHITECTURE.md`, `/docs/07-JOB-STATE-MACHINE.md`, `/docs/08-DISPATCH-ENGINE.md`.
3. `/docs/05-DATABASE.md`, `/docs/06-API-SPEC.md` for backend invariants.
4. `/docs/03-DESIGN-SYSTEM.md`, `/docs/02-UX-FLOWS.md` for UI implementation.
5. `/docs/15-QA-TEST-PLAN.md`, `/docs/17-APP-STORES.md` for release gates.
6. Original research/concepts in `/docs/_source/` as context only.

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

Must NOT:
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
blocks the epic's stated acceptance criteria.

## 8. Repository map

```
/CLAUDE.md
/docs/                  — working specs (00…19) + /docs/_source (originals)
/apps/customer-mobile   — React Native + Expo + TypeScript
/apps/pro-mobile        — React Native + Expo + TypeScript
/apps/admin             — Next.js + TypeScript
/apps/api               — Node.js + TypeScript (Fastify), Prisma, PostGIS, Redis
/packages/ui            — shared design-system components
/packages/types         — shared domain types + provider interfaces
/packages/config         — shared config/env schema
/packages/api-client     — typed client consumed by mobile/admin
/packages/validation     — shared zod schemas (request/response validation)
/tools/design-preview    — developer-only browser gallery for packages/ui (not a shipping target)
```

## 9. Current status

See `/docs/EPIC-0-REPORT.md` for the as-built state, contradictions found
between source documents, and the recommended next epic.

**Read `§15` in that report first**, then `§12`, `§11` and `§10` —
together they are the current truth about what has actually been
installed, compiled, linted, bundled, rendered and executed. They supersede
the older `§7`/`§8`.

`§15` is the one to read before touching either mobile app: it records the
night the shipped apps stopped carrying their own Epic-0 screens, the nine
places those screens were claiming things the server had never said, and
the three endpoints that had to exist before a customer could request
anybody at all.

Short version: lint is clean across 10 workspaces, 743 unit tests pass, the
admin build and both mobile bundles are green, the **baseline migration
exists** (`apps/api/prisma/migrations/0_init`, derived from the schema by
`npm run db:ddl`) and is verified against a real PostgreSQL 16 + PostGIS 3.4
in both directions (`npm run db:verify` — 1411/1411), and the `SELECT ...
FOR UPDATE` row lock is proven **against those real tables** (`npm run
verify:rowlock` — 7/7, with a control).

Prisma's engine host (`binaries.prisma.sh`) is blocked by organization
egress policy in this container, for every Prisma version 5.x–8.x. That is
permanent here and is why the migration is hand-authored rather than
generated. `prisma generate` still has to run on a machine that can reach
that host before `apps/api` will typecheck or boot — see §12.5.
