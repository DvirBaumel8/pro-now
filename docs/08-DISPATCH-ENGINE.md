# 08 — Dispatch Engine

This is core IP. Implemented in `apps/api/src/domain/dispatch/*`.

## Pipeline
1. **Geographic pre-filter** — PostGIS `ST_DWithin` against
   `professional_locations` for `AVAILABLE` professionals, cheap and index-
   backed. This produces a coarse candidate set (tens, not thousands).
2. **Eligibility filter** (all must hold):
   - professional status `AVAILABLE`
   - fresh location (within the freshness threshold)
   - the requested service is `APPROVED` for that professional
   - customer address falls inside the professional's service area/radius
   - required credential(s) for the service are current
   - professional is not already assigned to another job
   - professional is not risk-limited/suspended for this service
   - professional is not blocked against this customer
   - equipment/vehicle requirement matches
   - market/geography is active for this service
3. **Real ETA** — only for the shortlist (never for the whole online pool):
   `MapsRoutingProvider.getEta()` (Route Matrix in production, haversine-
   based mock in the sandbox adapter, clearly labeled).
4. **Scoring** (weights are **admin-configurable via `app_config`, never
   hard-coded**):
   ```
   MATCH_SCORE =
     ETA_WEIGHT            (default 40%)
   + SERVICE_FIT_WEIGHT     (default 25%)
   + RATING_WEIGHT          (default 15%)
   + ACCEPTANCE_WEIGHT      (default 10%)
   + COMPLETION_WEIGHT      (default 10%)
   - CANCELLATION_PENALTY
   - RECENT_ASSIGNMENT_PENALTY (fairness — avoid always offering the same top pro)
   ```
5. **Offer** — sequential dispatch is acceptable for the pilot (parallel/
   batched offers are an explicitly future, architecture-safe option).
   Offer has a server-configurable timeout; expiry is server-authoritative,
   never trusted from the client's countdown UI.
6. **Atomic assignment** — see `/docs/05-DATABASE.md §Atomic accept`. Uses a
   Redis lock keyed by `job_id` plus a DB transaction so two simultaneous
   accepts can never produce two assignments. Uses idempotency keys for
   accept/retry.
7. **Fallback** — expired/declined offer → next eligible candidate by
   score. Exhausted candidates → progressively expand radius within
   service policy → if still empty, inform the customer honestly and record
   unfulfilled demand for Ops. **Never invent availability.**

## Realtime contract
WebSocket events for offer / offer-expired / assignment / job-state / quote
/ approval / location-stream / payment-state / ops-intervention. On
reconnect, the client performs a full resync call rather than trusting
buffered state. Push notifications (FCM/APNs) are a wake/fallback signal,
never the source of truth.

## NOW eligibility (which services can even use this engine)
A service is dispatch-eligible only if it can reasonably be requested
immediately, the professional can travel with the required equipment, the
scope supports dispatch, pricing is fixed/estimable or visit-fee+quote,
duration is sufficiently bounded, licensing/trust requirements are
verifiable, local supply is sufficient, and a safety policy exists. This is
exactly Engine 1 from `/docs/00-VISION.md` — Engines 2/3 (BOOK/REQUEST) do
not go through this module.

## Mandatory edge cases (see `/docs/15-QA-TEST-PLAN.md` for the full list)
Provider accepts at the exact instant an offer expires · two providers
accept simultaneously · provider accepts then the app dies · GPS stale/
denied/lost mid-dispatch · provider stops moving · no eligible provider at
all · customer address changes after assignment · duplicate request tap ·
server deploy during active dispatch. Every one of these has a
deterministic server outcome and a defined recovery UX — "we don't know" is
not an acceptable end state for the server.
