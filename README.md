# PRO NOW

A real-time, ONLINE-FIRST / NOW-FIRST services marketplace: independent
professionals go ONLINE and receive nearby jobs; customers request a
trusted, verified professional to come **now**.

- **Start here:** [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md) — who works
  on what, where everything lives, what is next.
- **Rules for working in this repo:** [`CLAUDE.md`](CLAUDE.md) and
  [`docs/22-WORKING-MODEL.md`](docs/22-WORKING-MODEL.md) (one branch and PR
  per change, merged on green CI).
- **Live for testers:** https://pro-now.onrender.com

## Layout
```
apps/web              the product's client: Vite + React 19 + react-native-web PWA (admin at /admin)
apps/api              Fastify + Prisma + PostgreSQL/PostGIS; serves apps/web in production
apps/customer-mobile  Expo apps — Phase 3, not built for a device yet
apps/pro-mobile
packages/ui           the product's screens and components
packages/types        domain logic, catalogue, state machines, provider interfaces
packages/validation   shared zod request/response schemas
packages/config       env schema
packages/api-client   typed client for the web app
tools/design-preview  the demo (Amit's track); shares no code with the product
docs/                 specs and decisions — see docs/CURRENT-STATE.md
```

## Run the product locally
Needs Node ≥ 22.12 and Docker.

```bash
npm ci
npm run db:generate -w apps/api      # Prisma client; apps/api does not compile without it
cp .env.example apps/api/.env        # the API and Prisma CLI run from apps/api
docker compose up -d                 # PostGIS :54320, Mailpit :8025, S3 :8333, mock Google :8089
npm run db:migrate:deploy -w apps/api
npm run db:seed
npm run dev:app                      # http://localhost:5180 — sign-in emails at http://localhost:8025
```

## Checks
```bash
npm run lint && npm run typecheck && npm test   # every workspace
npm run test:int        # every API route against a real database (needs compose)
npm run test:e2e        # Playwright: Chromium at iPhone 16 Pro size
npm run parity          # screenshots demo vs product (during a demo catch-up)
npm run verify:rowlock  # two simultaneous accepts → exactly one winner, with a control
npm run smoke:prod      # read-only check of production
```
CI runs all of these except `parity` and `smoke:prod` (`docs/16-DEPLOYMENT.md`).

## Run the demo
```bash
npm run preview:design   # http://127.0.0.1:4421
```
How to QA and publish it: `docs/CURRENT-STATE.md §4`.

## What this is not (yet)
No payment, KYC, SMS, routing or reputation vendor is connected. Each is an
interface in `packages/types/src/providers/` with a labelled sandbox
adapter, and the choice is an open decision
(`docs/18-ROADMAP.md §Open decisions`). No money moves in the app today.
