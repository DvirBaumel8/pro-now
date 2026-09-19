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
