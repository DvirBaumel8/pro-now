# 04 — Technical Architecture

## Stack (frozen for MVP — see `/docs/18-ROADMAP.md` for what's explicitly open)
| Layer | Choice |
|---|---|
| Customer mobile | React Native + Expo + TypeScript |
| Professional mobile | React Native + Expo + TypeScript |
| Admin | Next.js + TypeScript |
| Backend API | Node.js + TypeScript (Fastify) |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma |
| Cache / presence / dispatch locks | Redis |
| Realtime | WebSockets (push is fallback/wakeup only) |
| Object storage | S3-compatible |
| Push | FCM + APNs |
| Maps / address / ETA | Google Maps Platform (Places Autocomplete, Routes/Route Matrix) behind a `MapsRoutingProvider` interface |
| Monitoring | Sentry + structured logs + metrics |
| Analytics | provider-abstracted (PostHog/Amplitude candidate, vendor TBD) |
| Payments | `PaymentProvider` interface; vendor selected after Israel/business/legal validation (Stripe Connect is a candidate, not a decision) |
| Identity/KYC | `IdentityVerificationProvider` interface; vendor TBD |
| External reputation | `ExternalReputationProvider` interface; official Google APIs candidate, no scraping ever |
| Infra | Docker for local deps; local/test/staging/production strictly separated; no Kubernetes/microservices for MVP |

## Repository layout
```
apps/customer-mobile   React Native + Expo + TS
apps/pro-mobile         React Native + Expo + TS
apps/admin              Next.js + TS
apps/api                Node.js + TS (Fastify), Prisma, PostGIS, Redis, WS
packages/ui             design system components (packages/ui/src/theme.ts = tokens)
packages/types          domain types + provider interfaces
packages/config          shared env schema (zod)
packages/api-client      typed client for mobile/admin
packages/validation      shared zod request/response schemas
```

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
- Atomic job assignment — a Redis lock plus a DB transaction guarantees
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
