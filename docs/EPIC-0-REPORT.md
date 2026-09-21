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

> **Superseded by §9 (2026-09-19).** The registry block described below was
> lifted in a later session: `npm install` now succeeds and most of this
> section's "never run" list has since been run. §7 and §7a are kept
> verbatim as the record of what was and was not true at the end of the
> first build session. **For the current verification state, read §9.**

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

### 7a. What this session verified anyway, without any network access

The registry block stops third-party dependency installation specifically.
It does not stop static analysis or running pure/near-pure logic through
the TypeScript/Node tooling that is already globally available in this
sandbox (no `npm install` involved). So before closing this report, four
real checks were run and are reproducible (`scripts/verify-domain-logic.ts`
is committed so this isn't a one-off claim):

| Check | Method | Result |
|---|---|---|
| JSON validity | `JSON.parse` on every `*.json` in the repo | **PASS** — 22/22 files parse |
| TS/TSX syntax | TypeScript compiler API parser on every `.ts`/`.tsx` file (no type resolution, no node_modules needed) | **PASS** — 85/85 files, zero syntax errors |
| Import resolution | every relative import and every `@pro-now/*` workspace import resolves to a real file on disk (third-party imports like `fastify`/`expo`/`@prisma/client` are skipped — that's exactly the part the registry block prevents verifying) | **PASS** — 85/85 files |
| Domain logic — real execution | `tsx` (globally installed, no registry contact) actually imports and runs, not just parses, `transitions.ts`, `pro-presence-transitions.ts`, `eligibility.ts`, `scoring.ts`, `pricing-adapter.ts`, and `atomic-accept.ts` — 28 real assertions, including a genuine concurrency test: two simultaneous `acceptOffer()` calls for the same offer, run with real JS-engine concurrency (`Promise.allSettled`) against in-memory fakes standing in for Prisma/Redis | **PASS** — 28/28 assertions |

Honest limits of that last check, stated plainly: it proves the exported
`acceptOffer()` function and its Redis-lock fast path are race-safe under
real concurrent invocation, and that the job/offer state guards inside the
transaction are correct — but it runs against **hand-written in-memory
fakes**, not a real PostgreSQL connection, so it does **not** exercise the
actual `SELECT ... FOR UPDATE` row lock, which is the mechanism
`atomic-accept.ts`'s own doc comment names as "the actual source of
correctness." That specific guarantee is still unverified and stays the
top item in §8 below.

What remains genuinely unverified after this pass: everything that needs
an actual `npm install` — Prisma Client generation and the real Postgres
row lock, Redis in a real outage/latency scenario, Fastify actually
booting and serving HTTP, the Expo/Next.js apps bundling and rendering,
and the existing vitest suite under `apps/api/test/*.test.ts` (which this
session's own hand-rolled script deliberately duplicates the intent of,
using `node:assert` instead of `vitest`, precisely because vitest itself
isn't installable here).

## 8. Recommended next epic (as written at the end of the first session)

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

---

## 9. Verification pass — 2026-09-19 (registry unblocked)

This section supersedes §7. The session it describes had working access to
`registry.npmjs.org`, so the single most important open item from §7 —
"nothing has ever been compiled, type-checked, linted, or executed" — was
finally worked through. Nothing below is claimed unless the command was
actually run and its output read.

### 9.1 Environment actually stood up

| Component | How | Result |
|---|---|---|
| npm dependencies | `npm install` at the repo root | **1300 packages installed** (after the peer-dependency fixes in §9.2) |
| PostgreSQL 16 | local cluster (`pg_ctlcluster 16 main start`) — the Docker daemon is not available in this container, so `docker-compose.yml` was not the path used | **online** |
| PostGIS 3.4 | `postgresql-16-postgis-3` + `CREATE EXTENSION postgis` on the `pronow` database | **installed, `postgis_version()` = 3.4 USE_GEOS=1 USE_PROJ=1** |
| Redis 7.0 | local `redis-server` | **online, `PING` → `PONG`** |

Note for whoever runs this next: `docker-compose.yml` remains the intended
local-dev path and was **not** modified. This session simply could not use
it (no Docker daemon), so it stood the same two services up directly. The
compose file is still unverified.

### 9.2 Blocking defects found and fixed — dependency graph

These are real defects that made the repository un-installable, i.e. §7's
work could not even begin until they were fixed.

1. **`packages/ui` declared open-ended peers** (`react: "*"`,
   `react-native: "*"`). npm resolved `react-native` to the current latest
   (0.87.x), which peer-requires React 19, against the apps' React 18 —
   `ERESOLVE`, install aborts. Pinned to the versions the workspace
   actually uses (`react: 18.2.0`, `react-native: ">=0.74.0 <0.75.0"`).
2. **React version split across the monorepo.** `apps/admin` asked for
   `react@^18.3.1` (hoisted to 18.3.1) while `react-native@0.74` peer-
   requires *exactly* `18.2.0`. A single hoisted React cannot satisfy both.
   Aligned `apps/admin` to `react`/`react-dom` `18.2.0` (Next 14 accepts
   `^18.2.0`), with matching `@types/react`/`@types/react-dom`.

`--legacy-peer-deps` / `--force` were deliberately **not** used: they would
have produced an install whose React version is silently wrong for React
Native, which is exactly the class of "green but untrue" that
`/CLAUDE.md §6` forbids.

### 9.3 Blocking defects found and fixed — Prisma schema

The schema had never been through Prisma's own parser (§7). It does not
parse as written:

3. **`extensions = [postgis]` without the preview feature.** Prisma gates
   managed extensions behind `previewFeatures = ["postgresqlExtensions"]`.
   Without it the schema fails validation outright with `P1012` — meaning
   `prisma generate`, `migrate` and `db seed` could never have run, and the
   PostGIS dependency the whole dispatch engine rests on was unreachable.
   Added the preview feature to the `client` generator.
4. **A duplicate generator block.** The schema declared a second generator
   (`generator json`) with the *same* provider (`prisma-client-js`) and the
   same (default) output as `generator client`, but **without**
   `previewFeatures`. It would have run the identical generator twice into
   one location, the second pass lacking the PostGIS preview flag.
   Removed.

After both fixes the schema validates: **47 models, 8 enums, 403 fields.**

This was verified with `@prisma/prisma-schema-wasm` at the exact build
matching this repo's pinned engine
(`5.22.0-44.605197351a3c8bdd595af2d2a9bc3025bca48ea2`) — a WASM parser
distributed on npm, so it needs no binary download. `validate` and
`get_dmmf` both pass.

### 9.4 Blocking defects found and fixed — mobile apps

The two Expo apps had never been bundled (§7). Three real defects stopped
Metro before it reached a single line of app code:

5. **`apps/customer-mobile/app.json` referenced `./locales/he.json`, which
   did not exist** — `expo export` aborts with `ENOENT`. Created it with
   the Hebrew permission strings that `app.json`'s `infoPlist` already
   carries. (`apps/pro-mobile` declares no `locales` block at all, so it
   needs no file — but the asymmetry is worth a product decision, see §9.8.)
6. **`"main": "node_modules/expo/AppEntry.js"` is wrong in a workspaces
   monorepo.** npm hoists `expo` to the repo root, so that path does not
   exist inside either app. Worse, the stock `expo/AppEntry.js` itself does
   `import App from '../../App'`, which only resolves when `expo` sits in
   the app's own `node_modules`. Replaced with a local `index.js` in each
   app that calls `registerRootComponent(App)` directly, and `"main":
   "index.js"`.
7. **No Metro monorepo configuration.** Metro does not follow workspace
   symlinks or hoisted dependencies by default, so `packages/*` and the
   root `node_modules` were invisible to it. Added `metro.config.js` to
   both apps with `watchFolders` on the workspace root and
   `nodeModulesPaths` covering app-then-root.
   `disableHierarchicalLookup` was tried and **reverted**: `react-native`
   keeps some dependencies nested (e.g. `@react-native/virtualized-lists`),
   and disabling the upward walk breaks `FlatList`.

### 9.5 Type and lint defects fixed

8. **`typography.numericMetric.fontVariant` was `["tabular-nums"] as const`**
   — a `readonly` tuple, which React Native's `TextStyle` (`FontVariant[]`,
   mutable) rejects. One token broke `packages/ui` plus four screens across
   both mobile apps. Now `["tabular-nums" as const]`.
9. **`apps/api` imported `PILOT_MARKET_CODE` from
   `prisma/seed-data/services.ts`**, i.e. from outside its own `rootDir`
   (`src`) — `TS6059`, so `apps/api` could not build at all. The constant
   now lives at `apps/api/src/config/market.ts`; the seed data re-exports
   it, so there is still exactly one definition.
10. **`dispatch-service.ts` used `ranked[0]` unguarded.** Under
    `noUncheckedIndexedAccess` that is `possibly undefined` in six places.
    An `undefined` top candidate would mean offering a job to nobody, so it
    is now an explicit guard that writes a `MATCH_FAILED` job event and
    returns `NO_ELIGIBLE_CANDIDATES` — not a non-null assertion.
11. **ESLint had never been configured or installed.** Every `lint` script
    referenced `eslint` but the repo had no config file and no eslint
    dependency, so `npm run lint` — one of `/CLAUDE.md §7`'s Definition of
    Done gates — failed in every workspace. Added a shared flat config
    (`eslint.config.mjs`) with `typescript-eslint`, re-exported by each of
    the 9 workspaces, plus `lint` scripts for the packages that had none.
    `apps/admin` moved from `next lint` to the same shared config so that
    "lint clean" means one thing repo-wide.
12. **19 lint errors, all real**, surfaced by that config and fixed rather
    than suppressed: 17 × `no-explicit-any` and 2 × `no-unused-vars`. The
    `any`s were concentrated in the API response types, so the fix was to
    write the wire contract down: **new `packages/types/src/api.ts`**
    defines `CatalogResponse`, `JobView`, `QuoteView`, `DispatchOfferView`,
    `ReviewView`, `ProfessionalVerificationView`, `DispatchResultView` and
    `ApiErrorResponse`, with field names and nullability taken from
    `schema.prisma`. Both mobile clients, both admin pages and
    `packages/api-client` now consume those types instead of `any`.
13. **Error bodies were read as `body?.message` on an untyped response** in
    three clients. A failed request can return a proxy's HTML or nothing at
    all, so the body is now narrowed before `message` is touched. Same fix
    in `packages/api-client`, `apps/customer-mobile`, `apps/pro-mobile`.
    `apps/api/src/server.ts` reads `statusCode`/`code` off the caught error
    defensively rather than asserting `any`.

### 9.6 What is now actually verified (commands run, output read)

| Check | Command | Result |
|---|---|---|
| Install | `npm install` | **PASS** — 1300 packages |
| Unit tests | `npm test` | **PASS — 25/25 tests, 5/5 files.** First time this suite has ever been executed. Covers job transitions, pro-presence transitions, dispatch eligibility, dispatch scoring, pricing adapters. |
| Domain logic | `npm run verify:domain` | **PASS — 28/28 assertions**, including the two-simultaneous-`acceptOffer()` concurrency check |
| Lint | `npm run lint` | **CLEAN across all 9 workspaces** |
| Typecheck | `tsc --noEmit` per workspace | **8 of 9 clean** — `apps/admin`, `apps/customer-mobile`, `apps/pro-mobile`, `packages/{ui,types,config,validation,api-client}`. `apps/api` is blocked, see §9.7 |
| Prisma schema | `@prisma/prisma-schema-wasm` `validate` + `get_dmmf` | **PASS** — 47 models, 8 enums, 403 fields |
| Admin build | `next build` | **PASS** — compiled, 7 pages prerendered |
| Customer app bundle | `expo export --platform ios` | **PASS** — 730 modules, 1.81 MB bundle |
| Pro app bundle | `expo export --platform ios` | **PASS** — 730 modules, 1.81 MB bundle |

### 9.7 What is STILL not verified, and exactly why

One blocker remains, and it is an organization egress-policy denial, not a
code problem and not something to work around:

> `binaries.prisma.sh` returns **403** through this container's egress
> proxy (confirmed at the proxy's own status endpoint:
> `connect_rejected — gateway answered 403 to CONNECT`).

Prisma 5.22 downloads its **schema engine** and **query engine** from that
host. `prisma generate`, `prisma migrate dev`, `prisma db seed` and
`prisma validate` all refuse to start without it. Upgrading was
investigated and rejected: Prisma 7 downloads from the same host, and the
WASM-engine line (`@prisma/schema-engine-wasm`) only exists on the 8.x
**release-candidate** channel, which is not an appropriate dependency for
this codebase. Per the container's own proxy guidance, a policy denial is
reported rather than routed around.

Concrete consequences — all of these remain **NOT DONE**:

- **`prisma generate` has not run**, so `@prisma/client` is the
  uninitialized stub in which `PrismaClient` is literally
  `export declare type PrismaClient = any`. That is the sole cause of the
  **7 remaining `apps/api` typecheck errors** (`tx`, `pro`, `sum`, `e`
  implicitly `any`; `Untyped function calls may not accept type
  arguments`). They are not independent defects — they will disappear when
  the client is generated. Expect *new* ones to appear at the same moment,
  because code like `pro.locations[0].lat` is currently unchecked only
  because `pro` is `any`, and `noUncheckedIndexedAccess` is on.
- **The API server does not boot.** Verified, not assumed:
  `tsx src/server.ts` fails with
  `@prisma/client did not initialize yet. Please run "prisma generate"`.
  So no HTTP route, no auth flow, and no WebSocket path has been exercised.
- **No migration has ever been applied.** Postgres+PostGIS is up and
  reachable, but the `pronow` database is empty — no tables, no seed. The
  schema is proven to *parse*; it is not proven to *apply*.
- **The `SELECT ... FOR UPDATE` row lock is still unproven.** This remains
  the single most important gap, exactly as §7 said. `verify:domain`
  proves `acceptOffer()` is race-safe against in-memory fakes; the row
  lock that `atomic-accept.ts`'s own doc comment calls "the actual source
  of correctness" needs a real Postgres transaction and has never run.
- `docker-compose.yml` is still unverified (no Docker daemon here).
- The Expo apps are proven to **bundle**, not to **render**. No simulator
  or device ran them, so RTL layout, navigation and the themes remain
  visually unverified.

### 9.8 New finding worth a product decision

`apps/customer-mobile/src/screens/MatchScreen.tsx` fetches the real job and
then renders a hard-coded professional: name "יוסי כהן", "⭐ 4.9 · 342
עבודות", ETA "12–16 דקות", visit fee "₪179". The lint rule that flagged
`job` as unused is what surfaced it. This directly contradicts
`/CLAUDE.md §3` — *"Real supply only. Real ETA only. Never fabricate
availability, demand, or a trust score."*

It was **not** silently patched, because the honest fix needs data the API
does not expose yet: `GET /v1/jobs/:id` does not expand the assigned
professional (name, photo, verified badges) and the card also needs the
`etaSecondsSnapshot` on `DispatchOffer` plus the service's visit fee. What
this pass did do: typed `job` as `JobView`, added the real loading and
error states the screen was missing (`/CLAUDE.md §6` requires them on every
data screen), and left a prominent in-file comment marking the card as an
invariant violation that must not ship. **Treat this as a blocker on Epic 8.**

Smaller, related: `apps/pro-mobile/app.json` declares no `locales` block
while the customer app does. For a Hebrew-first product that asymmetry is
probably unintended, but it is a product/localization call, not a bug to
guess at.

### 9.9 Recommended next steps (supersedes §8)

1. **Unblock `binaries.prisma.sh`** in the egress policy, or run the next
   pass somewhere that can reach it. Nothing else on this list can start
   until Prisma's engines are available.
2. Then, in order: `prisma generate` → fix the `apps/api` typecheck errors
   it reveals (both the 7 that vanish and the new ones that appear) →
   `prisma migrate dev` → `prisma db seed` → confirm the 9 departments /
   15 categories / 25 services actually land.
3. **Prove the row lock.** Promote the concurrency check from
   `verify:domain`'s in-memory fakes to a real integration test against the
   live Postgres: two concurrent `acceptOffer()` calls, one winner, with
   `SELECT ... FOR UPDATE` genuinely in play. Epic 6 is not done until this
   passes.
4. Boot `apps/api` and walk one real NOW loop end-to-end against the seeded
   database before any new feature work.
5. Only then Epic 7 (realtime resync), and Epic 8 — starting with the
   MatchScreen violation in §9.8.

Everything in §6's table that says "tests passing" can now be read as true
for the five domain-logic suites, and only for those. Every claim that
depends on a database, a booted server, or a rendered screen is still
unverified.

---

## 10. Second pass — trust correctness, the two decision cards, and a visual harness

§9 closed the "nothing has ever been run" gap. This section covers the work
that followed: the defects found once the code could actually be exercised,
the two cards the marketplace's decision moments turn on, and a way to look
at them without a simulator.

### 10.1 Trust defects fixed (Epic 3's Definition of Done)

Epic 3's DoD — "an expired required credential actually removes that
service's dispatch eligibility, in a test" — had no test. Writing it
surfaced that the rule itself was wrong. It lived inline in
`dispatch-service.ts` as:

```ts
pro.credentials.length === 0 ||
  (pro.credentials[0]?.status === "VERIFIED" && (!expiresAt || expiresAt > new Date()))
```

Three defects, each of which would have dispatched an under-verified
professional into a customer's home:

1. **A missing mandatory credential passed as current.** `length === 0`
   short-circuits to eligible, so a professional who had never uploaded a
   legally-required licence was treated exactly like one who had.
2. **Only `credentials[0]` was ever examined.** With two required
   credentials, an expired second one was never looked at.
3. **`ServiceRequirement` was never consulted at all**, so `mandatory` vs
   optional could not be distinguished.

A fourth defect sat next to them, in `eligibility.ts`: the candidate query
filtered on `presenceState` but never on `verificationStatus`, so a
**SUSPENDED or mid-onboarding account that was merely "AVAILABLE" could be
dispatched**. Being online is a presence fact; being trusted is not.

Fixes: a new pure module `domain/dispatch/credential-eligibility.ts`
(`evaluateServiceCredentials` + `isAccountDispatchable`), wired into
`dispatch-service.ts`, with `ACCOUNT_NOT_APPROVED` added as its own
explainable reason code. **27 tests** cover it, including expiry exactly at
`now`, a renewed credential held beside an expired one, a `CERTIFICATE` not
satisfying a `LICENSE` requirement, and every non-APPROVED verification
status.

### 10.2 Money-integrity defect fixed (Epic 9)

The quote hash is what makes "the customer approved *this* version"
enforceable. The route hashed an **unrounded float total** while persisting
`Math.round(total)`, so with a fractional quantity the hash bound a total
that was never stored — the one thing the hash exists to prevent.

Extracted to `domain/pricing/quote-hash.ts`, which computes the total and
the hash together so they cannot disagree, rounds **per line** (a line is
displayed as its own currency amount, so it must itself be representable),
and rejects non-integer unit prices outright. **15 tests**.

### 10.3 The row lock — no longer the top unverified item

§9.7 called this "the single most important gap": `atomic-accept.ts`'s own
doc comment names `SELECT ... FOR UPDATE` as "the actual source of
correctness", and it had never run against a real database.

`npm run verify:rowlock` (`scripts/verify-row-lock.ts`) now proves it
against live PostgreSQL 16 via `pg`, with **no Prisma involved**, so the
Prisma blocker does not gate it. It runs two races:

- **A control**, with `FOR UPDATE` removed: both accepts succeed and the job
  is double-assigned. This matters — it shows the harness genuinely
  reproduces the race, so the second result is not a false pass.
- **The guarantee**, with the exact locking statement the code issues:
  exactly one winner, job `PRO_ASSIGNED` to that winner, one offer
  `ACCEPTED`, the loser `REVOKED`, and a late accept refused.

**7/7 checks pass** at the server's `read committed` default.

### 10.4 The two cards

The marketplace has two moments that decide whether it works: a customer
deciding to let a stranger into their home, and a professional deciding
whether a job is worth taking. Both are now real components in
`packages/ui`, built against the wire types rather than props a caller can
fill in by hand.

**`MatchCard`** (customer). Renders only `JobMatchView`. There is no prop
for a name, rating, ETA or price, so the §9.8 failure — a screen that
fetched the real job and then displayed an invented professional — is not
expressible any more. Honest absences are first-class: no ETA yet renders
"מחשבים זמן הגעה…", a professional with no history renders "בעל מקצוע חדש",
and a coarse (non-route) ETA is visibly marked as an initial estimate.

**`OfferCard`** (professional). Counts down to the **server's** `expiresAt`
rather than a client-side constant, shows the expected payout before
acceptance, and says in words when the payout is genuinely not knowable
yet instead of printing a plausible number. It carries no prop that could
hold a precise customer address.

Both were wired into the real screens, which fixed two more defects:

- `OfferScreen` counted down from a hard-coded `OFFER_TIMEOUT_SECONDS = 30`
  and navigated away on its own timer — a client deciding an expiry only the
  server may decide. It also navigated with a literal `"demo-job"` id
  instead of the `jobId` the accept response returns, so the next screen
  would have loaded the wrong job.
- `MatchScreen`'s fabricated card (the §9.8 blocker) is gone.

New endpoints feed them: `GET /v1/jobs/:id/match` and
`GET /v1/pro/offers/current`. Both are **UNVERIFIED** — they typecheck and
are correct by construction, but cannot be executed until Prisma is
unblocked (§10.8).

### 10.5 Privacy control, made testable

`GET /v1/pro/offers/current` must not leak the customer's exact address
before assignment, and the schema has no area column — only
`Address.formatted`. Rather than inline the derivation in the route, it is
`domain/privacy/area-label.ts`: drop any component carrying a digit (street
number, postcode), keep at most the two broadest remaining components, and
never emit a digit. **8 tests**, because an untested privacy control is one
that regresses silently.

### 10.6 Trust decisions taken in consultation

Four product questions came out of this work. They were put to the product
side (via the ChatGPT thread Amit is running the product from) rather than
decided unilaterally, per /CLAUDE.md §4. **Amit should confirm these.**

1. **Business verification.** `BusinessProfile` had no verification field,
   so "עסק אומת" could only have been inferred from the row existing — which
   means the professional typed something in, not that anyone checked it.
   Added an explicit `BusinessVerificationStatus` enum
   (UNVERIFIED / PENDING / VERIFIED / REJECTED / REVERIFY_REQUIRED) plus
   `verifiedAt` and `verificationSource`. The badge renders only on
   `VERIFIED`.
2. **Pricing configuration.** HOURLY and DISTANCE_TIME could not be shown
   in full. Added `minimumBillableMinutes`, `perKmMinorUnits` and
   `minimumFareMinorUnits` to `ProfessionalService`, with the meaning of
   `basePriceMinorUnits` per archetype documented in the schema. **No
   amounts were seeded** — real prices are a professional's own commercial
   decision and the pilot price points are a business decision.
3. **Sandbox KYC.** A sandbox identity result now produces **no** badge.
   `IdentityVerification.isSandbox` gates it, because showing "זהות אומתה"
   for a stub response is presenting mocked data as production.
4. **Rating threshold — changed on product feedback.** The first
   implementation hid the PRO NOW rating below three reviews. The product
   side pushed back: a professional can complete a job, receive a genuine
   verified review, and watch it vanish, which reads as the platform
   withholding real information. The rating is now shown from the first
   verified review and **always together with its count** ("★ 5.0 ·
   ביקורת מאומתת אחת"), which supplies the context without manufacturing
   statistical confidence.

### 10.7 Visual verification without a simulator

§9.7 noted the mobile apps were proven to *bundle*, not to *render*.
`tools/design-preview` is a developer-only gallery (Vite +
`react-native-web`) that renders the actual `packages/ui` components in a
browser, so every card state — including the honest-absence and expired
ones — can be reviewed and screenshotted. `npm run preview:design`.

It also surfaced a genuine cross-platform issue: **the apps simulate RTL
with `flexDirection: "row-reverse"` instead of enabling
`I18nManager.forceRTL`.** On a device `isRTL` is false, so `row-reverse`
lays out right-to-left and looks correct. In a browser, CSS `row-reverse`
inside a `dir="rtl"` container flips a *second* time and renders the mirror
image. The gallery is therefore `dir="ltr"` (documented in its
`index.html`) so it is faithful to the device.

**This is a latent fragility, not a shipped bug**, since web is not a
target — but the layout is correct by accident rather than by construction,
and it would invert the day anyone enables RTL properly. The durable fix is
`forceRTL` plus logical `row`, which needs a device to verify. Recorded
here as a finding; not attempted blind.

Related: `writingDirection: "rtl"` was added wherever Hebrew prose is
right-aligned, so trailing punctuation lands on the correct side.

### 10.8 Current verification state

| Check | Result |
|---|---|
| `npm install` | **PASS** |
| Lint (10 workspaces) | **CLEAN** |
| Typecheck | **9 of 10 clean** — `apps/api` blocked, see below |
| Unit tests | **PASS — 146** (118 api + 28 ui), up from 25 |
| `verify:domain` | **PASS — 28/28** |
| `verify:rowlock` (real Postgres) | **PASS — 7/7** |
| Prisma schema (WASM validator) | **PASS — 47 models, 9 enums, 409 fields** |
| `next build` | **PASS — 7 pages** |
| Expo bundles (both apps) | **PASS — 735 modules each** |
| Design gallery build + render | **PASS** |

**Still BLOCKED, unchanged from §9.7:** `binaries.prisma.sh` returns 403
through the egress proxy. Therefore `prisma generate`, `migrate` and `seed`
have never run; `apps/api` keeps exactly 7 typecheck errors that all trace
to `PrismaClient` being the ungenerated `any` stub; the server does not
boot; and **the schema changes in §10.6 have no migration yet**. Per
/CLAUDE.md §6 ("use migrations for every schema change"), generating and
applying that migration is a required follow-up, not an optional one. No
schema change described here may be called done until it exists.

Ways to unblock, in order of preference:

1. Allow `binaries.prisma.sh` on HTTPS/443 in the egress policy.
2. Run the Prisma steps on a machine without the sandbox's egress
   restriction, from the same repo.
3. Point `PRISMA_ENGINES_MIRROR` at an approved internal mirror — Prisma
   supports this officially for restricted environments.

A Prisma 7/8 migration was considered and rejected: 7 downloads from the
same host, and the Rust-free line is only on the 8.x release-candidate
channel. Changing a major dependency to route around an egress rule, in the
middle of a verification pass, would trade a known blocker for an unknown
one.

### 10.9 Recommended next steps

1. Unblock Prisma (§10.8). Everything below waits on it.
2. `prisma generate` → fix the `apps/api` errors it reveals (the 7 that
   vanish, and the new ones that appear where `pro`/`tx` stop being `any`)
   → **create the migration for §10.6** → `migrate dev` → `db seed`.
3. Promote the row-lock proof from `scripts/verify-row-lock.ts` into a
   Prisma-based integration test, so it runs through the real
   `acceptOffer()` rather than a faithful reimplementation of its SQL.
4. Boot the API and walk one NOW loop end-to-end against seeded data —
   including the two new endpoints, which are still UNVERIFIED.
5. Decide the RTL question in §10.7 with a device in hand.
6. Then Epic 7 (realtime resync), and the rest of Epic 8.

---

## 11. Third pass — the visual layer (2026-09-19)

Amit's brief was blunt: the product looked "banal, boxy", and should feel
closer to Wolt/Gett — "fewer squares, more information, more visual, more
photographs, more UX/UI, more thought, more pages." This pass is that work.
It is UI only; nothing here touches the API, the schema, or the §10.8
blocker.

### 11.1 What changed

**Tokens** (`packages/ui/src/theme.ts`) gained `radii`, `elevation(level,
dark)`, `tint.*`, an extended `type` scale up to `displayXL`, `tabular` and
`imageRatio`. Depth is now soft wide shadows plus generous radii — never a
gradient and never a border competing with a shadow, both of which
/docs/03-DESIGN-SYSTEM.md §Personality rules out. That single change is what
removes the "boxy" reading: a card is a raised surface, not a drawn
rectangle.

**A real icon system** (`marks.tsx`) — one geometric family, 24×24, 1.8
stroke, no fills, colour inherited. The design system explicitly forbids
"cartoon trade icons"; before this there were none at all, which is how the
squares ended up carrying the whole composition.

**Photography as a first-class slot** (`ImageSlot`). The brief asked for
more images and the honest answer is that PRO NOW has no licensed
photography yet. So `ImageSlot` renders the real layout, ratio and treatment
with a labelled placeholder naming the intended subject. No stock imagery
was substituted anywhere. A design review that was flattered by invented
photos would be a review of a product that does not exist.

**Four new screen bodies** — `ServiceDetailBody` (C04), `ProProfileBody`
(C12), `QuoteApprovalBody` (C11), `JobCompleteBody` (C13) — joining the four
from the previous pass. All eight are presentational: the apps and the
gallery import the same components, so the reviewed design and the shipped
design cannot drift.

### 11.2 Where the design had to stay honest

Three places where the prettier option would have been the dishonest one:

- **The service page CTA at zero supply.** "בקשת בעל מקצוע עכשיו" is
  disabled and relabelled, rather than starting a dispatch that will fail.
  A button that promises what the marketplace cannot deliver is the exact
  failure /CLAUDE.md §3 exists to prevent.
- **The professional profile.** PRO NOW's rating, the completed-job count
  and any imported external reputation are three separately-labelled facts.
  There is no combined score, and `ProfessionalSummaryView` has no field
  that could carry one. A brand-new professional's profile shows three
  dashes and says so.
- **Quote approval.** The screen renders the server's `totalMinorUnits`; it
  does not re-derive a total from the lines it just displayed. If the two
  ever disagreed, the client's arithmetic is the wrong one to trust.
  Approval carries `versionHash`, so a stale screen cannot approve a quote
  the customer never saw.

### 11.3 New pure logic, tested

`priceExplainer()` moved into `packages/ui/src/pricing-copy.ts` with six
tests. The assertion that matters: a VISIT_QUOTE fee must never be worded
like a FIXED price, and a missing amount renders as `—`, never as `0`.

### 11.4 Verification

| Check | Result |
|---|---|
| Lint (10 workspaces) | **CLEAN** |
| Typecheck `packages/ui`, `tools/design-preview` | **CLEAN** |
| Unit tests | **PASS — 152** (118 api + 34 ui) |
| Gallery build | **PASS — 356 modules, 469 KB** |
| Rendered + screenshotted, all 8 sections | **PASS** |

Four defects were found by looking at the screenshots rather than the code:
a pinned CTA permanently covering the last lines of two scrollable screens
(fixed with footer-clearing bottom padding), and a horizontal photo strip
that opens on the wrong end inside an RTL `row-reverse` layout (replaced
with a wrapped grid, which is correct on both device and browser).

### 11.5 Unchanged

The §10.8 Prisma blocker, the §10.7 RTL decision, and the four product
decisions in §10.6 awaiting Amit's confirmation. None of this pass depends
on them, and none of it resolves them.

### 11.6 ChatGPT review of this pass, and what it changed

The pass was sent to Amit's ChatGPT thread for a second opinion. It approved
the direction and returned two corrections worth acting on immediately, plus
a direction for the next round.

**Correction 1 — a fabricated capability in my own copy.** The zero-supply
state on C04 read "נעדכן אותך כשתהיה זמינות באזור שלך". There is no
availability watch in PRO NOW. A button that promises a notification nobody
will send is a fabricated *capability*, which /CLAUDE.md §3 rules out as
firmly as fabricated supply — and it was in a screen I had just written to
enforce that same rule. The screen now offers the action that actually
exists: an enabled, outlined "בדיקה מחדש" with the true reason underneath
("הזמינות משתנה לאורך היום"). An outline rather than a greyed-out button,
because re-checking is a real action and a dead-looking control would say
the screen is a dead end. When a real watch is built, that is where it goes.

**Correction 2 — trust needs a hierarchy, not just separation.** Keeping
PRO NOW's rating apart from an imported Google rating was right, but giving
them equal visual weight made the customer decode three trust systems. PRO
NOW's rating and job count now own the hero row; the external rating sits
quietly below it, still labelled by source, as corroboration. And a
professional with no PRO NOW rating now reads "חדש" rather than three
dashes — dashes say *missing data*, "new" is the same fact stated truthfully
and usefully.

**Direction for the next pass**, recorded here rather than acted on: stop
polishing screens and design the *live* experience — real availability
counts surfaced from the backend on home and service pages, the map as the
stage rather than a backdrop, and a job offer that arrives as an event
(haptic, server countdown, large payout, one decisive Accept) rather than as
another card. It also pushed back on reading "fewer squares" as "squares
with a larger radius": some screens should have no container at all —
edge-to-edge imagery, type directly on the background, large numbers without
a card. A card should mean "this is a self-contained unit", not "text needs
somewhere to sit".

It also noted, correctly, that the premium feel cannot be judged at all
until a real licensed photography set exists. `ImageSlot` is the slot; the
photography is a business decision (/CLAUDE.md §4) and is Amit's to make.

---

## 12. The migration exists, and the row lock now runs against it

Amit's instruction was to stop escalating and decide. Two of the things I
had been treating as "blocked on Amit" were not his to decide at all, and
one of them turned out not to be blocked.

### 12.1 What was actually blocked, and what only looked blocked

Re-tested from scratch. `binaries.prisma.sh` still answers **403 at CONNECT**
under organization egress policy. I verified this is not a version problem:
a clean install of **Prisma 7.10.0** (current stable) fails identically, and
so does the documented offline switch `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`
— it skips the checksum fetch and then fails on the engine download itself.
The CLI probes for the schema engine on *every* command, including
`generate`, so no Prisma command of any kind can run in this container.

That is a network policy, not a defect, and not something to route around.
So the conclusion is structural: **`prisma migrate` is unavailable here
permanently, and waiting for it was the mistake.**

What was *not* blocked: **PostgreSQL 16 with PostGIS 3.4 is installed in
this container.** That is the thing that mattered, and I had not checked.

### 12.2 The migration, derived rather than typed

`prisma migrate dev` is a convenience that writes a SQL file; hand-authored
migration SQL is fully supported by Prisma. But hand-*typing* 47 models is
how a constraint goes quietly missing, so the file is derived instead:

- **`tools/prisma-ddl/generate.py`** parses `schema.prisma` and emits the
  DDL — enums, tables under their `@@map` names, Prisma's own scalar→
  PostgreSQL type mapping, nullability, defaults, primary keys, `@unique` /
  `@@unique` / `@@index`, and foreign keys with Prisma's default referential
  actions (`RESTRICT` for a required relation, `SET NULL` for an optional
  one). It is not a general Prisma compiler and does not pretend to be: it
  implements exactly the subset this schema uses and **raises on anything it
  does not fully understand** rather than guessing. A migration that
  silently drops a constraint is worse than no migration.
- Output: `apps/api/prisma/migrations/0_init/migration.sql` — 627 lines,
  47 tables, 9 enum types, 52 indexes, 45 foreign keys. Regenerate with
  `npm run db:ddl`.

Only DB-owned defaults are emitted. `cuid()` and `@updatedAt` are generated
by Prisma Client, so giving them database defaults would create a second
source of truth that disagrees with the application silently.

### 12.3 Verification, in both directions, with a negative control

Applying SQL only proves it parses. `tools/prisma-ddl/verify.py`
(`npm run db:verify`) re-reads `schema.prisma` independently and
interrogates the live catalog, asserting **both**:

- schema → database: every model, column, type, nullability, enum member
  and order, primary key, index and foreign key exists;
- database → schema: **nothing exists that the schema does not declare** —
  the direction that catches a leftover column or a dropped index, which a
  one-way check reports as green.

PostGIS's own objects are excluded by asking `pg_depend` which relations the
extension owns, not by hardcoding names that would stop matching on a
version bump.

**Result: 1411/1411 checks pass**, and the migration re-applies cleanly onto
an empty schema.

A green number nobody has seen fail means nothing, so the verifier was run
against deliberately broken databases first. Dropping `users.email` →
reported missing column *and* its missing index. Adding an undeclared
`jobs.sneaky` → reported. Renaming an index → reported. The check fails when
it should.

### 12.4 The row lock now races the real tables

`scripts/verify-row-lock.ts` previously ran against a hand-made two-table
mirror in its own schema — which proved the SQL, not the schema. With the
migration applied it now runs against the **real `public.jobs` and
`public.dispatch_offers`**, with their real enum columns and real foreign
keys, seeding the whole anchor chain (user → customer → address, user →
professional, department → category → service) because the job row cannot
legally exist without it. It refuses to run at all if the migration has not
been applied, rather than quietly falling back to a convenient mirror.

**7/7 pass, including the control**: without `FOR UPDATE` both accepts
succeed and the job is double-assigned; with it, exactly one professional
wins, the loser's offer is REVOKED rather than left live, and a late accept
on a settled job is refused.

### 12.5 What Amit still has to run, and it is now small

The migration exists and is proven. On a machine that can reach
`binaries.prisma.sh`, what remains is:

```
npm install
npx prisma generate --schema apps/api/prisma/schema.prisma
npx prisma migrate resolve --applied 0_init   # baseline: the SQL is already written
npx prisma migrate deploy
npm run db:seed
```

`migrate resolve` rather than `migrate dev`, because the migration is
authored, not pending generation. `prisma generate` is still required for
`apps/api` to typecheck — that one genuinely cannot be reproduced here,
since the generated client is the engine's output.

### 12.6 Decisions I took, and the ones that remain genuinely Amit's

The four questions in §10.6 were **already implemented and already correct**.
They were engineering calls dressed up as product questions, and holding
them open was my error, not Amit's indecision. They are closed: explicit
`BusinessVerificationStatus` (a typed-in row is not a verified business),
the added HOURLY/DISTANCE_TIME pricing fields, sandbox KYC producing no
badge, and the rating shown from the first verified review always beside its
count.

What remains is genuinely not mine to invent, per /CLAUDE.md §4 — each is a
commercial, legal or contractual commitment, not a design preference:
payment marketplace provider · KYC vendor · commission percentage · legal
entity and invoice model · insurance policy · pilot geography and service
mix · **a licensed photography set**. Every one has an interface and a
sandbox adapter already, so none of them blocks building; they block
*launching*, and they are decisions with money and liability attached.

---

## 13. Round 4 — the offer stops being a card

The review in §11.6 asked for the *experience* rather than more screens:
the map as the stage, and a job offer that arrives as an event. This is the
first piece of that.

### 13.1 `ProOfferBody` (P16)

A card says "here is some information". This screen has to say "something is
happening to you, right now, and it stops in thirty seconds". Those are
different jobs, so it is not the offer card with more padding:

- **No container.** The type sits directly on the scene. A legibility scrim
  carries it — a real vertical gradient, not a flat slab, because a slab
  makes the map a strip at the top and then the map is not the stage. This
  is the distinction /docs/03-DESIGN-SYSTEM.md is drawing when it rules out
  "heavy gradients": ornament is out, the standard map-overlay technique is
  not ornament.
- **The payout is the largest thing on the screen** at 58px, because it is
  the number the decision is actually made on.
- **The countdown is a ring** readable at arm's length, drawn with
  `strokeDasharray` so the arc length *is* the remaining fraction and the
  picture cannot drift from the number inside it.
- **One affirmative action.** Accept is full-width; skip is quiet text.

### 13.2 What keeps the urgency from becoming pressure

The urgency is real — a customer is waiting — and that is the only reason
the screen is allowed to look like this. Three rules hold it:

1. The ring counts down to the server's `expiresAt` and never decides when
   the offer ends. On expiry the screen says so and both actions disappear
   rather than failing on tap.
2. The payout is shown before accepting, or admitted as unknown. A
   plausible-looking number in place of one nobody has calculated is the
   most damaging lie available here, because the professional commits to
   driving on the strength of it.
3. The address is not on this screen. Before acceptance the customer's
   location is a coarse area label (/docs/12-PRIVACY.md).

### 13.3 Still to do in this round

The live supply language — "12 זמינים עכשיו", "הקרוב ביותר כ-8 דקות" —
needs a real availability endpoint before any of it can appear. It is a
server feature wearing a UI costume, and inventing the numbers in the client
is precisely the failure the rest of this work exists to prevent. It waits
for `prisma generate` and a booted API (§12.5).

---

## 14. The LIVE layer, built so it cannot lie

§13.3 said the live supply counts had to wait for a real endpoint. That was
half right: the *numbers* wait for the server, but the *rules* that keep them
honest do not, and building those first is what makes the endpoint safe to
plug in rather than dangerous.

### 14.1 The failure this is designed against

"12 מקצוענים זמינים עכשיו" is true for a few seconds. After that it is a
number that used to be true, which is worse than no number: the customer
acts on it, dispatch finds nobody, and the one promise the product rests on
— online means online — is broken by a stale variable rather than by a lie
anyone chose to tell.

So the contract carries its own expiry. `AreaAvailabilityView` has
`computedAt` and `staleAfterSeconds`: **the server states how long its own
answer may be trusted**, and the client is not allowed to decide the number
is "probably still fine".

### 14.2 Three pure, tested layers

- **`readAvailability()`** (`packages/types/src/availability.ts`) applies the
  freshness window and returns `null` for every untrustworthy case — missing
  snapshot, unparseable timestamp, future timestamp (the clocks disagree, and
  a client clock is not evidence about supply), non-positive window, expired.
  They collapse to one outcome so the UI has exactly one absence state and no
  path where a half-valid snapshot leaks a number. A corrupted per-service
  count (negative, fractional) is dropped rather than rendered as confident
  supply. **10 tests.**
- **`areaAvailabilitySchema`** (`packages/validation`) validates the payload
  on the *client* too. Everywhere else the rule is "never trust the client";
  here the matching rule is "never trust a payload just because it came from
  the server". `.strict()` matters as much as the types: an unexpected field
  means client and server disagree about what the endpoint is, and guessing
  at that point is how a rename becomes a wrong number. `parseAreaAvailability`
  returns `null` rather than throwing, so a bad response degrades to "we
  don't know" instead of tempting a catch block into reusing the last good
  value. **11 tests.**
- **`resolveHomeSupply()`** (`packages/ui/src/home-supply.ts`) decides which
  source of truth wins. **5 tests**, one of which is a regression test for a
  real bug — see below.

### 14.3 The bug the gallery caught

The freshness rule was implemented correctly and then silently undone one
line later. `CustomerHomeBody` fell back to the older per-tile props when the
snapshot expired, so the header went quiet while the tiles carried on
displaying 4, 2 and 1 — the exact stale-number failure `readAvailability` was
written to prevent, rebuilt by accident directly beneath it.

It passed typecheck. It passed lint. It read fine. It was caught by putting
the same snapshot on screen at three different moments and looking at the
third one.

The rule is now stated once, in `resolveHomeSupply`, and tested: **a caller
that supplies a snapshot has opted into that snapshot's lifetime.** When it
expires, every number on the screen becomes unknown together. No partial
credit, no fallback — a number that was never fresh cannot repair one that
has gone stale. An explicit `null` snapshot counts as opting in too, so a
failed fetch cannot leak props either.

### 14.4 Zero is not unknown

The tiles now render three states, not two:

| value | tile shows |
|---|---|
| `n > 0` | green count — supply exists and dispatch will find it |
| `0` | muted "אין זמינות כרגע" — the server checked, there is none |
| `null` | nothing — the server has not said, and neither do we |

Collapsing 0 into null tells a customer the marketplace is empty when it may
be busy; collapsing null into 0 invites them into a dispatch that cannot
succeed. Both are §3 failures, in opposite directions. The two pills share a
shape and position so the eye reads them as one fact reported differently.

### 14.5 What is left for the server

`GET /v1/areas/:areaCode/availability` returning `AreaAvailabilityView`.
Counting only professionals who are ONLINE **and** dispatch-eligible for that
specific service is the whole correctness requirement — an online
professional whose licence for that service has lapsed must not be counted,
because the count would promise what dispatch would then refuse. The UI is
already wired and will show nothing until that endpoint exists.

---

## 15. The night the apps stopped lying (2026-09-21)

Amit left the session running overnight with one instruction: *"אל תעצרו עד
לרגע שהכל הכל הכל הכל מושלם."* This section records what was found, because
most of it was not a bug anybody had reported — it was the shipped apps
quietly contradicting the product.

### 15.1 The two-apps problem, closed

`packages/ui` held the home screen, the living map, the walking, the
avatar picker, the category page, the describe-the-fault screen, the quote
approval, the completion, the professional's shift dashboard, the job
screen and the verification centre. The gallery rendered all of them every
day. `apps/customer-mobile` and `apps/pro-mobile` rendered almost none of
them: they still carried their own Epic-0 screens, written before any of
that existed, and the two sets had long since diverged in what they listed
and what they claimed.

Every customer and professional screen now renders the same component the
gallery does. Three screens were deleted outright rather than wired,
because each duplicated something the shared body already did better:
`ReviewScreen` (the review lives on the completion screen), `OnlineScreen`
(one shift dashboard, not two), and the Navigation/ActiveService/Complete
trio on the professional's side (one job screen driven by the job's own
status).

### 15.2 What the shipped apps were claiming

Every one of these was in the build that would have gone to the stores:

| Screen | Claim | Reality |
| --- | --- | --- |
| C10/C11 Tracking | "יוסי בדרך אליך · 11 דקות" | No request was made. Same name, same ETA, every job. |
| C12 Quote | Two line items, ₪300, "אשר עבודה" | Nothing was sent. The approval never reached the server. |
| C14 Complete | "סה״כ שולם ₪300 · ✓ התשלום עבר בהצלחה" | No payment provider exists (§4). Nothing was charged. |
| C06 Request | "דמי ביקור החל מ־₪179" | For every service. A massage and a tow truck quoted alike. |
| C05 Category | Seven plumbing strings | The route parameter was ignored. "חיות" opened a plumbing list. |
| P13 Offline home | "יוסי כהן", ₪840, 4 jobs, 3:24 online, IDENTITY_VERIFIED | None of it came from anywhere. |
| P15 Online | An offer four seconds after going online | `setTimeout(…, 4000)` navigating to `"demo-offer"`. |
| P22 Earnings | "ברוטו ₪2,100 · עמלה −₪420" | A 20% commission, to everybody. The rate is undecided (§4). |
| P24 Verification | "זהות מאומת · רישיון חשמלאי פג תוקף" | To every professional, including non-electricians. |

The last one is the most serious. Verification is not a feature of this
product, it is the promise, and P24 was the only place a professional
could check what they had proven.

### 15.3 The gap that made the whole flow impossible

`POST /v1/jobs` requires an `addressId` and checks it belongs to the
caller. Nothing in the API could create an address, and nothing could list
one. A customer who installed the app could not request a professional at
all. The client hid this by sending the literal string `"demo-address"`,
which worked against a seeded development database and nowhere else.

Both halves were confident, which is why it survived: the server was right
to refuse, and the client never saw a refusal.

New: `GET/POST /v1/me/addresses`, `GET /v1/pro/services` (server-decided
per-service dispatch eligibility with the NAMED missing requirement), and
`GET /v1/pro/jobs/:id` (the assigned job with the full address, released
because the job is assigned, and 404 rather than 403 for anyone else).

`POST /v1/jobs/:id/start` also sent every job to `IN_PROGRESS`, so a
VISIT_QUOTE job skipped `DIAGNOSIS` — the state where the price is
written — and landed in "working" before the customer had approved
anything. `nextAfterArrival` has encoded the right answer since the state
machine was written; the route never asked it.

### 15.4 The plate holds four shops, not eleven

`check-plate.mjs` passed the promenade plate and six of the eleven shops
were standing in flowerbeds, over kerbs and on a zebra crossing. The tool
tested the FOOTING — one pixel, eroded by eleven — while a shopfront
covers roughly 140×105 plate pixels and rises from that point.

Scored against the real footprint, the set we had been reviewing all week:
שיער 4% clear ground, שיפוצים 10%, תיקונים 15%, חיות 18%, מחשבים 22%. The
re-measured set is worst 36%, median 63%.

The limit is the plate, not the script. The promenade is an aerial of a
park walk — planters, palms, benches, bollards, lamp posts — with four
clean slots at 0.17 wide and ten at 0.09, all compromised. **The next
plate needs eleven clear paved stretches, each at least 15% of the width
by 11% of the height, with the clutter between them rather than on them,
and none of them below v = 0.86** (a shop nearer the viewer than the
customer means the professional drives away from the eye to reach them).
That requirement is now `FOOTPRINT` in `ground-plate.ts` with five tests.

### 15.5 Animation defects, second pass

Eleven were found and fixed in the first pass. A second audit found
eighteen more. The two that mattered most:

- **A drag killed the camera permanently.** `dragged` was set by the pan
  responder and never cleared by anything. One sideways look and every
  later camera move — the journey's pull-back and push-in included — ran
  with the world sitting where a thumb had left it.
- **The search camera froze 200 ms into every 1200 ms move.** The travel
  effect depended on `sweep.camera.focus` by identity, and `sweepFrame`
  returns a fresh literal at 5 Hz. React runs the previous cleanup first,
  so `anim.stop()` fired and the equality guard then started nothing. The
  camera tour played as a stutter-and-snap loop.

Also: the mini-game was being collected invisibly during the search, so the
wait began with half of it spent; the walking figure froze mid-stride at
every stop on the tour; both avatar tiles flashed on every tap; the
tracking camera re-eased from a standstill every second for twenty
minutes; `RouteLayer` still had the O(n²) cumulative-distance map that
`WorldLife` was fixed for; dragging re-rendered the whole neighbourhood
sixty times a second; and the match sheet's fold-away had never played a
single frame.

### 15.6 Both apps still bundle

Worth stating because the night added two native dependencies
(`expo-av` for the microphone, `@react-native-async-storage/async-storage`
for the avatar) and moved every screen onto `packages/ui`, which is the
kind of change that compiles and then fails in Metro.

| Check | Command | Result |
| --- | --- | --- |
| Customer bundle | `expo export --platform ios` | PASS — 2.95 MB |
| Professional bundle | `expo export --platform ios` | PASS — 2.86 MB |
| Admin build | `next build` | PASS |

The customer bundle grew from 1.81 MB because it now carries the world
layer it was always supposed to render.

### 15.7 The checks that run in a browser

Three of them now, because the defects they catch are invisible to a unit
test and to a screenshot:

| Command | What it fails on |
| --- | --- |
| `npm run verify:screens` | a screen that throws, a screen with no way back, a control too small for a thumb, a dead end |
| `npm run verify:game` | the wait is not a game: no figure, no arrows, arrows during the SEARCH, or holding one moves nothing |
| `npm run verify:a11y` | contrast and labelling |

`verify:game` earned its place the hour it was written: it found that
holding an arrow moved the figure three pixels and stopped, which is
Amit's headline feature quietly not working, and which every other check
in the project was happy with.

Two of its own measurements were wrong before the product was. Watching
the FIGURE reported no movement while it was plainly walking, because the
camera follows the walker. Watching the STREET reported the same thing for
the opposite reason, because the camera clamps at the edge of the plate.
Both are recorded in the file: the question is not whether one thing
moved, it is whether anything did.

### 15.8 Two measurements of one plate, disagreeing in silence

The morning after, the wait screen was still wrong in four ways, and
three of them came back to the same habit: a number that answers a
slightly different question from the one being asked, confidently.

**The camera told the card where the screen was, and was wrong by a
factor of two.** `WorldViewport` hands its children `visibleLeft` — which
part of the world is on screen — read from the camera's travel target.
True while it travels, while it is parked, and while it is dragged.
False while it is FOLLOWING somebody, because then the transform comes
from the follow interpolation and clamps at the plate's edge, while the
target still holds whatever the last focus asked for. The one thing that
uses the number is the card above the chosen shop, which slides sideways
to stay on the phone: told the screen was 48 points further right than it
was, it slid 35 of the 74 it needed, and a quarter of the professional's
name sat off the right edge for the whole wait. The viewport now says
whether its offsets mean anything (`following`) and the card stands down
when they do not — which is also the right product answer, because the
drawer and the headline already name that person.

**The shop sign was drawn during the search.** At 55% opacity, which is
not the same as not said: the search screen painted real professionals'
names on shopfronts before dispatch had chosen anybody. It was also drawn
on dimmed shops, at 0.55 of an 0.35 venue — 19%, at which the plate
behind the letters has gone and the name is pale type lying on the
pavement. And its rule was "not on the selected shop" rather than "not
where the card already is", so when the card stood down the chosen shop
went anonymous. One question, asked once, in `venueChrome`, with a test
that walks all sixteen combinations.

**The wait was shot for watching, not for walking.** `ROUTE` is 1.25
screens across — right when the camera moves and the customer watches.
The wait is the walk now, and at 1.25 the whole neighbourhood is on the
phone at once: both edges of the plate in frame, nothing past the edge to
find. It takes `EXPLORE`, the shot the stroll screen already uses.

**And the traffic drove through the shops.** `STREETS` is an idealised
layout and the comment beside it said only `main` lines up with the
painted road. It does not either: `main` runs down u≈0.5 and u≈0.5 is
where the shops are, because the middle of this plate is a pedestrian
square. `measure-road.mjs` now reads the carriageway off the plate — the
complement of the pavement test, with continuity as the tie-break,
because a dark roof is wider than the road beside it and won three bands
in a row on the first attempt.

Which exposed the worst of them. `measure-spots.mjs` tested standable
ground with `lum > 95`. `measure-pavement.mjs` had already found out, for
where a PERSON may stand, that brightness is the wrong question here: the
paving in shadow is darker than 95 and is still paving, while the zebra
crossings are brighter and are still road. That tool switched to warmth;
the building tool did not. So the two disagreed about where the ground
was, and the one placing the buildings was wrong:

| | before | after |
| --- | --- | --- |
| standable ground | 0.2% of the plate | 13.6% |
| separated slots | 7 | 15 |
| worst placement | 36% clear | 86% clear |

One of the eleven shopfronts had been standing on the zebra crossing, 90%
of its footprint on asphalt. And the paragraph in `PLATE_SPOTS`
concluding that this plate could hold four shops and that the next one
must be drawn differently was a brief written from a measurement bug; it
is deleted rather than softened. `plate-ground.test.ts` makes the two
measurements argue in a test instead of agreeing quietly on screen.

Fifteen slots and eleven trades exposed the last of it: every entry in
`PLATE_SPOTS` is some trade's front door with that trade's building on
it, so a second plumber was placed inside the barber's shop (76%
overlap), and the first venue of a trade took that trade's own spot where
the district layer was already drawing the same shopfront at the same
size (100% overlap, which reads as the art failing to load).
`OVERFLOW_SPOTS` is the ground no trade owns, and a trade whose own
professionals are on the street no longer gets a stand-in as well.

### 15.9 The audit that could not run

`verify:a11y` had been dead since sign-in started persisting. The first
journey that signed in left the session behind; every later journey
reloaded into the signed-in app, clicked a control that is not on the
home screen, and waited thirty seconds for a phone field before killing
the process. Six more journeys still tapped services from a home screen
that is a question and eight doors now.

Every visit starts from cleared storage, the two `fill` calls are steps
like everything else so a miss is recorded rather than fatal, and the
journeys walk the walk the app has. **10 screens audited with 6
unreachable, to 16 audited, 0 unreachable, 0 defects.** The one defect it
found on the way: the address chip at 40pt, under the 44 a thumb needs,
on the control somebody taps standing somewhere that is not home.

The HUD text was the other half of the same brightness problem.
`ScrimBand` darkens the top 17% of the screen; the header owns the first
sixty points of that, so the headline and the line under it both start
BELOW the band. It never showed while the sky behind them was dark. At
the `EXPLORE` shot the camera is down among lit paving and
"בודקים זמינות באזור שלך" was being read through a shopfront. The text
carries its own halo now rather than the band growing to cover the
tallest thing the HUD ever holds.

### 15.10 State

761 tests pass. Lint and typecheck are clean across every workspace except
`apps/api`, which still fails on the documented `prisma generate` blocker
(§12.5) — unchanged and unrelated.

Still blocked on a machine that can reach `binaries.prisma.sh`:
`prisma generate` → `migrate resolve --applied 0_init` → `migrate deploy` →
`db:seed`.

## 16. The city stands on a real street plan (2026-09-21)

Amit: *"אני רוצה לחבר מפה אמיתית שונראה איך העולם שלנו והקוד שלנו יושב
עליה, אולי יהיה יותר קל לשים את החנויות והדמויות על מפה אמיתית."*

### 16.1 What is real is the geometry, not the imagery

The obvious build is a tile layer with markers on it, and his own earlier
question ruled it out: *"ורק הצורה של המפה תהיה אמיתית?"* — the SHAPE.
A tile is a photograph of somebody else's city, and the moment one is on
screen our shopfronts are stickers on it.

So an OSM extract is fetched once (`tools/design-preview/fetch-geo.mjs`),
checked (`npm run verify:geo`), dated, attributed and committed, and
`world-geo.ts` projects it into the `{u,v}` every venue, route, walker
and camera already speaks. Swapping what `{u,v}` MEANS moves the whole
city at once, which is what the last month of putting every position into
one coordinate system bought.

**No maps vendor was chosen** (`/CLAUDE.md §4`). `MapsRoutingProvider`
remains the seam for geocoding and route ETAs, which is what a vendor is
actually for. Drawing a place needs geometry, and geometry is a file.

### 16.2 What the geometry bought

- **The shops place themselves.** `plotSpotsFromGeo` finds plots that
  front a road, stands each shopfront a pavement's width off the kerb and
  faces it at the traffic. `PLATE_SPOTS` took three rounds of bitmap
  erosion and two of them answered the wrong question.
- **Sizes became true.** A real extract has metres in it, so a shopfront
  is 16m and a person 1.7m rather than fractions chosen by eye. A camera
  shot is a number of METRES across the frame (`SHOT_METRES`), so the
  same walk looks the same on a 620m extract and a 4km one.
- **Routes are found, not drawn.** `world-routing.ts` builds a graph from
  the ways, joins streets that cross without sharing a vertex, leaves
  footways out, and runs Dijkstra. `roadRouteAt` answers in metres, so a
  layer can later be given a speed without touching navigation.
- **Dead ends become parks.** Amit: *"יש כבישים חתוכים באמצע המפה."*
  `pruneDeadEnds` trims a spur to its first junction and drops an island
  whole, keeping anything that leaves the frame — a road running off the
  edge reads as the city continuing. And the reclaimed ground is where
  the trades with no door stand: `tradeGround` puts a dog walker and a
  trainer in a park rather than in a shop doorway.

### 16.3 The honesty half, which is not optional

On an invented street the ambient crowd is atmosphere. On a real one
every figure is a claim about an address. `geo-truth.ts` gives each
plotted position a provenance and refuses `DECOR` on a real surface.

ChatGPT's rule, taken verbatim and made checkable: **motion without
agency is ambience, motion with agency is an entity.** Light may move,
leaves may move, a shadow may breathe; anything that travels A to B on
purpose needs a source of truth. It cut the one concession this file had
— a distant unbranded car — and was right: in a product whose promise is
that somebody is on their way to you, a moving vehicle is the one shape a
customer reads as an arrival.

A route carries **metres and never minutes**. The graph says where
movement can be shown; the server says when the professional arrives.

### 16.4 The ground, after four wrong answers

1. Drawn from polygons. Correct, and a diagram. Amit: *"אני לא יכול עם
   המסך הכהה הזה. איפה העולם הקסום שבנינו?"*
2. The painted plate tiled. Magical, and it repeats — the same palm every
   hundred metres, which is invisible at walking distance and is the
   whole screen at the wide shot.
3. Material tiles generated here (`make-ground-material.py`, seamless on
   a torus with a seam measure that refuses a bad tile). No repeat, and
   close up a drawing rather than a painting.
4. **Both, chosen by how far back the camera is standing.** Under 190
   metres across you are in the painting; past it you are in the drawn
   city. `metresAcrossAt` derives that number from the lens, after an
   hour in which two screens ASSERTED one zoom while their viewport used
   another and the whole fix did nothing.

And the parks ended in a deletion. Four attempts to make a drawn park
stand next to a painted street failed; the answer was that
`pruneDeadEnds` removes a road and does not have to add anything. Over
the painting the reclaimed ground shows the plate's own city.

### 16.5 Built, tested, and deliberately not wired

`world-camera.ts` — ChatGPT's soft heading-follow bearing, with the
invariant that bearing rotates the world and never the sprites. Rotating
the viewport needs `overflow: hidden`, and a clipped window no longer
covers the screen: the walk screen came back as a band of city with black
above and below. The clamp has to know the bearing, which is a per-frame
quantity Animated cannot express — the same wall the animated zoom hit.
The attempt is written down in that file so it is not repeated.

### 16.6 State

**887 tests pass.** Lint and typecheck clean across every workspace
except `apps/api` (unchanged `prisma generate` blocker, §12.5). Both
mobile bundles and the admin build are green. `verify:screens`,
`verify:game` and `verify:geo` clean; `verify:a11y` is 18 screens, 0
defects, 0 unreachable.

Still blocked on art that cannot be generated from a script: two
shopfronts (רכב, שיער) in two angles each, and two angles per vehicle.
A silhouette difference is a draughtsman's decision, not a script's.

## 17. The night the container stopped being the world (2026-09-21)

Amit: *"הבנתי שעשיתי טעות וצריך לעבוד פה איתך בקוד."*

Everything above this line was built inside a container. The repository
was exported — 125 commits as a git bundle, the tree as a tarball — and
restored onto a developer machine. The tarball matched the bundle's HEAD
exactly, so nothing uncommitted was in flight.

### 17.1 The blocker was a property of the container

`binaries.prisma.sh` returned 403 through that container's egress proxy,
for every Prisma version tried, and §12.5 wrote that down as permanent.
It was permanent *there*. On a machine with ordinary egress,
`prisma generate` finished in 200ms and produced client v5.22.0.

That is worth stating plainly because the note had hardened into a fact
about the project. It was a fact about one host.

### 17.2 What the generated client found

For months `PrismaClient` was an `any` stub, and `any` does not argue.
Generating it turned 7 stub-shaped errors into 4 real ones. Three were
defects:

- **`pro-jobs.ts` looked for a quote status nothing writes.** The pending
  quote was fetched with `status === "PENDING_APPROVAL"`. The schema
  knows `SENT | APPROVED | DECLINED | SUPERSEDED`, `quotes.ts` writes
  `SENT`, and the string `PENDING_APPROVAL` appears exactly once in the
  repository — in that comparison. So `pendingQuote` was **always null**:
  a professional who had sent a quote was told by the server that there
  was none. This was never a type error; it was a runtime lie that the
  `any` stub let through, and it is the one defect here that a user would
  have felt.
- **The same row was being returned as a `QuoteView` without being one.**
  No `lineItems` (they were not even included in the query) and a `Date`
  where the contract says an ISO string. The row is now mapped, and the
  query includes its line items.
- **`dispatch-service.ts` indexed `pro.locations[0]` unguarded.** An
  eligible candidate always has a fresh location — an absent one makes
  `locationAgeSeconds` infinite and fails the freshness rule — but the
  shortlist was a list of professionals and the ETA step re-derived the
  position by index. It is now a `flatMap` carrying `{ pro, latestLocation }`,
  so the shortlist is a list of professionals *with a position* and the
  next stage has nothing to trust.

The fourth was `structuredAnswers` reaching a `Json?` column as a
validated `Record<string, unknown>`, which is a cast, not a defect.

**Typecheck is now clean across all 10 workspaces — the first time in
this project's history.**

### 17.3 Three things that only worked in the container

- **Two modules whose names differed only in case.** `ContactShadow.tsx`
  beside `contactShadow.ts`, and the same for `SteerPad` and `ShopSign` —
  a component re-exporting its own pure logic. On a case-sensitive
  filesystem those are two modules. On macOS they are one, and all three
  apps failed to compile. The logic halves are now `shadowGeometry.ts`,
  `steerMath.ts` and `signStyle.ts`. Nothing about the split was wrong;
  the names were.
- **A browser path baked into eleven scripts.** Every harness script
  launched `/opt/pw-browsers/chromium` by absolute path. They now go
  through `tools/design-preview/browser.mjs`, which lets Playwright
  resolve its own download and accepts `PW_CHROMIUM` for a host
  Playwright has no build for — macOS 13, as it turns out.
- **A port passed by hand.** The harness navigates to 4421;
  `npm run preview:design` served Vite's default. The port is pinned in
  `vite.config.ts` now, bound to IPv4 because some scripts ask for
  `localhost` and some for `127.0.0.1`, and a v6-only bind answers one
  of them.

None of these were visible from inside the container, and none of them
are interesting. They are recorded because each one cost time to
rediscover and each one would have cost it again.

### 17.4 State

892 unit tests pass. Typecheck and lint clean across all 10 workspaces.
`verify:domain` 28/28, `verify:geo` clean, `verify:a11y` 18 screens with
0 defects and 0 unreachable, `verify:screens` and `verify:game` clean,
the admin build green at 7 pages.

**Not measured here, and therefore not claimed:** the mobile bundles
(`expo export`), `db:verify` and `verify:rowlock`. The last two need
PostgreSQL 16 + PostGIS, and this machine has no database, no Docker and
no Redis yet. Their previous results (1411/1411 and 7/7) were real, and
they were measured against a database that no longer exists. Re-running
them is the first thing to do once there is one.

`verify:silhouettes` needs numpy, which the system Python does not have.

### 17.5 Where the history lives

`github.com/nivamit1210-sketch/pro-now` exists and is **121 commits
behind**. The two histories part at `47f74ef` (§10); since then GitHub
received two README commits that are not in this history, and this
history received everything else. The `github-synced` tag at `aee6799`
marks the last sync and is no longer close to true.
