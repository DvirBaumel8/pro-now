# PRO NOW — monorepo

Real-time, ONLINE-FIRST / NOW-FIRST professional services marketplace.
Independent professionals go ONLINE and receive nearby jobs; customers
request a trusted, verified professional to come **now**. See
`/CLAUDE.md` for the engineering contract and `/docs/00-VISION.md` onward
for the full product/engineering specification this repo implements.

**Start here:** `/docs/EPIC-0-REPORT.md` — read **§25** first, then **§24**
and **§23**. Together they are the honest record of what has actually been
installed, compiled, linted, bundled, rendered and executed. They supersede
the older §7/§8, which describe a session that could not run anything.

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
- PostgreSQL 16 + PostGIS 3.4
- Redis 7 — optional for local work. The server logs `Redis not reachable
  at startup — will retry lazily` and serves requests without it; only the
  dispatch accept path needs it.

`docker-compose.yml` is one way to get both, and is still **unverified** —
no session has had a Docker daemon. On macOS 13 Docker Desktop will not
install at all (it requires a newer macOS), and there
[Postgres.app](https://postgresapp.com/) is the shorter path: the
PostgreSQL 16 build ships PostGIS 3.4 and needs macOS 10.15. Everything
below was measured against it.

## Verification status

Measured on a developer machine (macOS 13, Node 24) on 2026-09-21, after
the repository moved out of the build container — see EPIC-0-REPORT §17.

| Check | Command | Result |
|---|---|---|
| Install | `npm install` | **PASS** |
| Prisma client | `npm run db:generate -w apps/api` | **PASS — v5.22.0** |
| Typecheck (10 workspaces) | `npm run typecheck` | **CLEAN — all 10** |
| Lint (10 workspaces) | `npm run lint` | **CLEAN** |
| Unit tests | `npm test` | **PASS — 1121** |
| Domain logic | `npm run verify:domain` | **PASS — 28/28** |
| Geometry | `npm run verify:geo` | **PASS** |
| Accessibility | `npm run verify:a11y` | **PASS — 19 screens, 0 defects** |
| Screen sweep | `npm run verify:screens` | **PASS** |
| Play layer | `npm run verify:game` | **PASS** |
| Quote handover, both sides | `npm run verify:handover` | **PASS — written quote survives the crossing, panel says it back** |
| Nothing plate-scaled on a real map | `npm run verify:plan` | **PASS — with a control** |
| The figures we drew, on the screens that show people | `npm run verify:faces` | **PASS — with a control** |
| Admin build | `next build` | **PASS — 7 pages** |
| Schema vs. real database | `npm run db:verify` | **PASS — 1411/1411** |
| Row lock vs. real Postgres | `npm run verify:rowlock` | **PASS — 7/7, with a control** |
| API boot | `npm run dev:api` | **PASS — /health 200, catalogue served from the database** |
| Mobile bundles | `expo export --platform ios` | **PASS — both apps** |
| Whole journey over HTTP | `npm run verify:journey` | **PASS — request to CLOSED** |
| App navigation graphs | `npm run verify:navigation` | **PASS — 17 screens, 29 navigations** |
| Admin + gallery in a browser | manual | **PASS — 0 console errors** |

Every gate in this table has now been run on one machine.

### The Prisma blocker is gone

`binaries.prisma.sh` returned **403** through the build container's egress
proxy, for every Prisma version 5.x–8.x, which is why `prisma generate`
had never run and `apps/api` carried 7 typecheck errors from an
ungenerated `PrismaClient` stub. That was a property of that container.
Off it, `prisma generate` completes in 200ms.

Generating the client replaced those 7 errors with 4 real ones, each a
defect the `any` stub had been hiding. All four are fixed (EPIC-0-REPORT
§17.2); one of them — a pending quote looked up by a status string nothing
ever writes — was silently wrong at runtime, not merely untyped.

## Setup

```bash
npm install
npm run db:generate -w apps/api  # Prisma client; nothing in apps/api compiles without it

# The Prisma CLI and the API both run with apps/api as their working
# directory, so the real env file belongs there. The template stays at the
# root because it documents the whole repository.
cp .env.example apps/api/.env    # fill in local values

# A database matching apps/api/.env — DATABASE_URL, role, and the postgis
# extension. With Postgres.app, `createuser`/`createdb` do this directly.
docker compose up -d             # or any PostgreSQL 16 + PostGIS 3.4

npm run db:migrate:deploy --workspace=apps/api   # applies 0_init
npm run db:seed           --workspace=apps/api   # 9 departments, 15 categories, 25 services

# Local only: six demonstration professionals to dispatch to, and the
# heartbeat that keeps their positions current the way a phone would.
# Both refuse to run against anything but a local database.
npm run db:seed:dev
npm run dev:pulse &
npm run verify:journey                           # the whole product, end to end

npm run dev:api        # Fastify API on :4000
npm run dev:admin      # Next.js admin on :3000
npm run dev:customer   # Expo customer app
npm run dev:pro        # Expo professional app
```

### The visual harness

`tools/design-preview` renders the real `packages/ui` components in a
browser. The checks that drive it (`verify:a11y`, `verify:screens`,
`verify:game`, `verify:handover`, and the geo shots) navigate to **127.0.0.1:4421**, so the
server has to be up first — the port is pinned in `vite.config.ts` so the
two cannot drift apart:

```bash
npm run preview:design         # serves 127.0.0.1:4421
npm run verify:a11y            # in a second shell
```

They drive Chromium through Playwright. `npx playwright install chromium`
is the normal way to get one; where Playwright has no build for the host
(it dropped macOS 13, for instance), point `PW_CHROMIUM` at an existing
Chromium-based browser instead:

```bash
export PW_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
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
