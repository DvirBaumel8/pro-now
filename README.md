# PRO NOW — monorepo

Real-time, ONLINE-FIRST / NOW-FIRST professional services marketplace.
Independent professionals go ONLINE and receive nearby jobs; customers
request a trusted, verified professional to come **now**. See
`/CLAUDE.md` for the engineering contract and `/docs/00-VISION.md` onward
for the full product/engineering specification this repo implements.

**Start here:** `/docs/EPIC-0-REPORT.md` — what is actually built, what is
scaffolded, what is intentionally left as an interface + sandbox adapter
pending a human business decision, and the recommended next epic.

## Repository layout

```
/CLAUDE.md               — engineering contract (source-of-truth order, invariants, DoD)
/docs/                    — 00…19 working specs + /docs/_source (original package)
/apps/customer-mobile     — React Native + Expo + TypeScript (customer app)
/apps/pro-mobile          — React Native + Expo + TypeScript (professional app)
/apps/admin               — Next.js + TypeScript (live-ops dashboard)
/apps/api                 — Node.js + TypeScript (Fastify), Prisma, PostGIS, Redis
/packages/ui              — shared design-system tokens + components
/packages/types           — shared domain types + vendor-neutral provider interfaces
/packages/config          — shared env schema (zod)
/packages/validation      — shared request/response zod schemas
/packages/api-client      — thin typed REST client factory (pre-OpenAPI)
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local Postgres/PostGIS + Redis via `docker-compose.yml`)

## ⚠️ This session could not run `npm install`

This code was written in a sandboxed cloud session whose network policy
blocks `registry.npmjs.org` (`403 host_not_allowed`) for the entire
session — not a transient error, a hard org-level egress rule. That means
**none of the commands below have been executed or verified in this
session**: no `npm install`, no `tsc --noEmit`, no `npm test`, no
`expo start`, no `next dev`. The code was written carefully against each
package's real API (Fastify v4, Prisma v5, Expo SDK 51, Next.js 14,
vitest) and cross-checked by re-reading the specs, but you should treat
first install/build in your own environment as the first real
compile/test pass, and expect to fix the ordinary small issues that
surface on a first build (a missing dependency version pin, a Prisma
generate step, an Expo config key) rather than assume the whole tree is
pre-verified green. Please run the steps below yourself and treat
`/docs/EPIC-0-REPORT.md §Verification status` as the honest record of what
is and isn't confirmed working.

That said, this session did run one meaningful check without any network
access: `npm run verify:domain` (see `scripts/verify-domain-logic.ts`)
actually imports and executes — not just parses — the core domain logic
(job/presence state machines, dispatch eligibility, scoring, all 4 pricing
adapters, and a real concurrency test of the dispatch atomic-accept path
against in-memory fakes) using the globally-available `tsx`, and every one
of its 28 assertions passes. It is not a replacement for the real vitest
suite or a real Postgres/Redis, but it's a genuine, reproducible signal
that the business logic itself is sound, independent of the install
question. Run it any time with:

```bash
npm run verify:domain   # or: npx tsx scripts/verify-domain-logic.ts
```

## Setup

```bash
npm install                       # installs all workspaces

cp .env.example .env               # fill in local values
docker compose up -d               # postgres+postgis on 5432, redis on 6379

npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api

npm run dev:api        # Fastify API on :4000
npm run dev:admin      # Next.js admin on :3000
npm run dev:customer   # Expo customer app (scan QR / simulator)
npm run dev:pro        # Expo professional app (scan QR / simulator)
```

## Quality gates

```bash
npm run typecheck   # tsc --noEmit across all workspaces
npm run lint         # eslint across all workspaces
npm test             # vitest — job/presence state machines, dispatch
                      # eligibility+scoring, pricing adapters
```

`apps/api/test/*.test.ts` covers the correctness guarantees this project
treats as non-negotiable per `/docs/19-CLAUDE-RULES.md`: no double-accept
on a dispatch offer, valid state transitions only, correct eligibility/
scoring reason codes, correct output for all four pricing archetypes.

## What this is not

No payment provider, KYC vendor, maps/routing vendor, or external
reputation vendor is wired to a real account — every one of those is a
labeled **sandbox** adapter behind a vendor-neutral interface in
`packages/types/src/providers/*`, by design (see `/CLAUDE.md §4` and
`/docs/18-ROADMAP.md §Open decisions`). Do not deploy this to production
traffic without replacing those adapters and making the listed business
decisions first.
