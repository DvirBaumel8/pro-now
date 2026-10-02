# 04 — Technical Architecture

## Stack
| Layer | Choice |
|---|---|
| Client | `apps/web`: Vite + React 19 + react-native-web PWA, TanStack Query; admin at `/admin`. Native Expo apps are Phase 3 |
| Backend API | Node.js + TypeScript (Fastify 5), serving the web app on the same origin |
| Auth | Better Auth: email link and Google (OIDC), httpOnly cookie sessions |
| Database | PostgreSQL 16 + PostGIS, Prisma 7 |
| Dispatch locks | Postgres row locks; Redis optional (latency only, off in the MVP — `21-PRODUCTION-PLAN §2`) |
| Realtime | WebSockets on an in-process bus; push is a wake-up, never the source of truth |
| Object storage | S3-compatible (Cloudflare R2; SeaweedFS locally), private, presigned URLs |
| Push / email | Web Push with our own VAPID keys; email through an outbox (Resend; Mailpit locally) |
| Geocoding | `GeocodingProvider` — Nominatim |
| Routing / ETA | vendor TBD behind `MapsRoutingProvider`; until then a labelled straight-line estimate |
| Map drawing | no vendor: real OSM geometry, fetched once and committed (`world-geo.ts`) and drawn in our palette (below) |
| Payments | `PaymentProvider`; vendor TBD after legal validation. No money moves in the app today (D1) |
| Identity/KYC | `IdentityVerificationProvider`; vendor TBD |
| External reputation | `ExternalReputationProvider`; official APIs only, never scraping |
| Monitoring | Sentry + Telegram alerts + structured logs (`16-DEPLOYMENT.md §Observability`) |
| Analytics | provider-abstracted, vendor TBD |
| Hosting | Render (one web service) + Neon; no Kubernetes or microservices for the MVP |

### Two different problems that both say "maps"

Worth separating, because conflating them is what made the maps vendor
look like a blocker for a year.

**Drawing a place.** Needs street geometry and nothing else. Geometry is
an ODbL file from OpenStreetMap, fetched once by
`tools/design-preview/fetch-geo.mjs`, checked by `npm run verify:geo`,
committed and dated. `packages/types/src/world-geo.ts` projects it into
the `{u,v}` the whole world already uses; `GeoPlate.tsx` draws it in
`livingPalette`. No account, no token, no per-load bill, and the artwork
stays ours — which is the point, because a tile is a photograph of
somebody else's city and our shopfronts would be stickers on it.

**Knowing where something is.** Geocoding an address, and an ETA that
came from a real route rather than a straight line. That is
`MapsRoutingProvider`, it needs a vendor, and the vendor is still a §4
human decision.

The second one is also where `/CLAUDE.md §3` bites hardest: once the
streets are real, every drawn position is a claim about somewhere. See
`packages/types/src/geo-truth.ts`, which refuses invented positions on a
real surface rather than trusting a reviewer to notice them.

### What is built on top of the geometry

| | |
| --- | --- |
| `world-geo.ts` | The extract, the Mercator projection into `{u,v}`, metres, the tilted ground plane, the frontages a shop stands on, and `pruneDeadEnds` |
| `world-routing.ts` | The street network as a graph; Dijkstra; `roadRouteAt(route, metres)` |
| `world-camera.ts` | Heading-follow bearing, and the invariant that bearing rotates the world and never the sprites |
| `vehicle-motion.ts` | The reactive half of movement — pitch under power, roll through a corner, brake lights. The cyclic half stays in `world-motion.ts` |
| `geo-truth.ts` | Provenance of every drawn position; what atmosphere may do; the disclosure line |
| `WorldGround.tsx` | Which ground a screen stands on: painted plate + stone road corridor, else material tiles + code props, else the drawn city |

Two rules from this layer are worth stating outside their files.

**Motion without agency is ambience; motion with agency is an entity.**
Light may move, leaves may move, a shadow may breathe. Anything that
travels from A to B on purpose — a person, a dog, a van — needs a source
of truth. That is why a real street carries no ambient traffic at all,
not even a distant unbranded car: in a product whose promise is that
somebody is on their way to you, a moving vehicle is the one shape a
customer reads as an arrival.

**A route carries metres and never minutes.** The distance is along drawn
geometry with no traffic, no turn restrictions and no one-way streets.
The graph says where movement can be shown; the server says when the
professional arrives. `/CLAUDE.md §3` — and the type has nothing on it
that could be mistaken for a duration.

## Repository layout
See `/CLAUDE.md §8`.

## Why PostgreSQL + PostGIS
The company's core query is geospatial: "find AVAILABLE professionals
within X km of the customer, who support this service, whose service area
contains the customer, ranked". PostGIS answers this cheaply for a coarse
candidate set; Route Matrix/Routes API is only ever called for the small
shortlist, never for the entire online supply pool on every request.

## Non-negotiable backend rules
- Server is authoritative for price, state transitions, eligibility and
  assignment. Clients render; they never decide truth.
- Idempotency keys required on: create-job, accept-offer, quote approval,
  payment mutation, completion.
- Atomic job assignment — a DB transaction with a `FOR UPDATE` row lock (plus an optional Redis fast-path lock, `job-lock.ts`) guarantees
  exactly one professional per job even under simultaneous accepts.
- Immutable, append-only `job_events` audit trail for every state-relevant
  action.
- Secrets never ship inside a mobile bundle; only via environment/secret
  manager.
- PII access is role-gated.
- Rate limiting on auth, matching, messaging, location and offer-accept.
- Schema changes only via versioned Prisma migrations; never `db push`
  against a shared environment.
- Soft-delete only where legally/operationally appropriate; financial/audit
  records are immutable and follow the retention policy.
- No fake "success" UI before backend confirmation.

## Vendor abstraction pattern
Every vendor-dependent capability is a TypeScript interface in
`packages/types/src/providers/*.ts` with (a) a `sandbox`/mock
implementation used in dev/test and demo builds, and (b) room for a real
adapter once the business/legal decision in `/docs/18-ROADMAP.md` is made.
No feature is allowed to special-case a specific vendor's SDK outside its
adapter module.

## Environments
`local` (docker-compose) → `test` (CI) → `staging` → `production`, each
with separate vendor keys, databases, buckets, push credentials and webhook
endpoints. Feature flags gate service/category/market/vendor-capability
activation via the `MarketActivation` table (remote-configurable, RBAC/
audited). Staging must never be able to send production payouts or
notifications.
