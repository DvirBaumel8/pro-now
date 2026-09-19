# PRO NOW — monorepo

Real-time, ONLINE-FIRST / NOW-FIRST professional services marketplace.
Independent professionals go ONLINE and receive nearby jobs; customers
request a trusted, verified professional to come **now**. See
`/CLAUDE.md` for the engineering contract and `/docs/00-VISION.md` onward
for the full product/engineering specification this repo implements.

**Start here:** `/docs/EPIC-0-REPORT.md` — read **§10** first, then **§9**.
Together they are the honest record of what has actually been installed,
compiled, linted, bundled, rendered and executed. They supersede the older
§7/§8, which describe a session that could not run anything.

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
/tools/design-preview     — developer-only browser gallery for packages/ui (not a shipping target)
```

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16 + PostGIS 3.4, and Redis 7
  (`docker-compose.yml` is the intended path; it is **unverified** — the
  verification session had no Docker daemon and used local services instead)

## Verification status

| Check | Command | Result |
|---|---|---|
| Install | `npm install` | **PASS** |
| Lint (10 workspaces) | `npm run lint` | **CLEAN** |
| Unit tests | `npm test` | **PASS — 146** |
| Domain logic | `npm run verify:domain` | **PASS — 28/28** |
| Row lock vs. real Postgres | `npm run verify:rowlock` | **PASS — 7/7** |
| Admin build | `next build` | **PASS — 7 pages** |
| Mobile bundles | `expo export` | **PASS — both apps** |
| Typecheck | `tsc --noEmit` | **9 of 10 workspaces clean** |

### 🔴 One blocker: Prisma engines

`binaries.prisma.sh` returns **403** through the verification environment's
egress proxy. Prisma downloads its schema and query engines from that host,
so **`prisma generate`, `prisma migrate` and `prisma db seed` have never
run**. Consequences:

- `apps/api` has exactly 7 typecheck errors, all tracing to `PrismaClient`
  being the ungenerated `any` stub. They should disappear on `generate`
  (and new ones will appear where `pro`/`tx` stop being `any`).
- The API server does not boot.
- **The schema changes in EPIC-0-REPORT §10.6 have no migration yet.** Per
  `CLAUDE.md §6` they are *implemented in code / DB unverified*, not done.

Ways to unblock, in order of preference: allow `binaries.prisma.sh` on
HTTPS/443; run the Prisma steps from a machine without that egress rule; or
point `PRISMA_ENGINES_MIRROR` at an approved internal mirror.

## Setup

```bash
npm install
cp .env.example .env            # fill in local values
docker compose up -d            # postgres+postgis on 5432, redis on 6379

npm run db:migrate --workspace=apps/api
npm run db:seed    --workspace=apps/api

npm run dev:api        # Fastify API on :4000
npm run dev:admin      # Next.js admin on :3000
npm run dev:customer   # Expo customer app
npm run dev:pro        # Expo professional app
```

## Quality gates

```bash
npm run typecheck        # tsc --noEmit across all workspaces
npm run lint             # eslint (shared flat config) across all workspaces
npm test                 # vitest — 146 tests
npm run verify:domain    # runs the domain logic for real, no DB needed
npm run verify:rowlock   # proves SELECT ... FOR UPDATE against a live Postgres
npm run preview:design   # browser gallery of the packages/ui components
```

`npm run verify:rowlock` is worth singling out. It proves the guarantee the
whole marketplace rests on — two simultaneous accepts of one job produce
exactly one winner — against a **real** PostgreSQL, with no Prisma involved.
It first runs a control with the lock removed and shows the job genuinely
*is* double-assigned; without that control, a pass would prove nothing.

`apps/api/test/*.test.ts` covers the correctness guarantees
`/docs/19-CLAUDE-RULES.md` treats as non-negotiable: valid state
transitions only, explainable dispatch eligibility and scoring, correct
output for all four pricing archetypes, service-specific credential
verification, quote hash integrity, and pre-assignment location privacy.

## What this is not

No payment provider, KYC vendor, maps/routing vendor, or external
reputation vendor is wired to a real account — every one of those is a
labeled sandbox adapter behind a vendor-neutral interface in
`packages/types/src/providers/*`, by design (see `/CLAUDE.md §4` and
`/docs/18-ROADMAP.md §Open decisions`). Do not deploy this to production
traffic without replacing those adapters and making the listed business
decisions first.

A sandbox identity check deliberately produces **no** verification badge,
for the same reason.
