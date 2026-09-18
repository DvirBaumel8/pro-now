# 06 — API Spec

Versioned REST (`/v1`) + authenticated WebSocket channels. Runtime
validation at every boundary via `packages/validation` (zod). Typed error
codes, never leaking stack traces/SQL/vendor secrets. Every response error
uses:
```
{ "code": "OFFER_EXPIRED", "message": "...", "details": { ... }, "requestId": "..." }
```

## Domains
`/auth  /me  /customer  /professional  /verification  /services  /markets
/availability  /location  /jobs  /dispatch  /quotes  /payments  /payouts
/reviews  /reputation  /chat  /notifications  /support  /admin`

## Key endpoints (semantics fixed; exact REST shape may be refined via
OpenAPI without semantic drift)
```
POST /v1/auth/otp/request
POST /v1/auth/otp/verify
GET  /v1/catalog                      (market-filtered department/category/service tree)
POST /v1/jobs                         (idempotent create; triggers dispatch)
GET  /v1/jobs/:id
POST /v1/jobs/:id/cancel
POST /v1/pro/shifts                   (GO ONLINE)
POST /v1/pro/shifts/:id/end
POST /v1/pro/location                 (presence ping, rate-limited)
POST /v1/offers/:id/accept            (idempotent, atomic)
POST /v1/offers/:id/skip
POST /v1/jobs/:id/en-route
POST /v1/jobs/:id/arrive
POST /v1/jobs/:id/start
POST /v1/jobs/:id/quotes              (professional creates/sends a quote)
POST /v1/quotes/:id/approve           (idempotent)
POST /v1/jobs/:id/complete            (idempotent)
POST /v1/jobs/:id/reviews
GET  /v1/pro/earnings
GET  /v1/pro/verification
```

## Idempotency
`Idempotency-Key` header required on: `POST /v1/jobs`,
`POST /v1/offers/:id/accept`, `POST /v1/quotes/:id/approve`,
`POST /v1/jobs/:id/complete`, and all payment-mutating endpoints. Server
stores the key + response for replay.

## WebSocket channels
- Private authenticated **user channel**: notifications, offer pushes.
- Private **job channel**, authorized to job participants + admin only:
  offer/offer-expired, assignment, job-state, quote, approval, location
  stream, payment state.
- Events are versioned with sequence IDs to support dedupe/resync on
  reconnect. No sensitive broadcast rooms. Push notifications (FCM/APNs)
  are a wake/fallback mechanism only — the socket + a resync-from-server
  call are the source of truth after reconnect. The client's own countdown
  is never authoritative for offer validity — the server's `expires_at` is.

## API security
Every object access is authorized to the acting user (no IDOR). Admin
endpoints sit behind a separate RBAC policy. Uploads go through short-lived
signed URLs with type/size validation. Rate limits scale with endpoint
risk; OTP, login, location-ping and offer-accept are specially protected.

## Contract tests (required before an epic touching the API is "done")
OpenAPI/client compatibility · full state-transition matrix · idempotency
replay · concurrent-accept race · webhook replay/out-of-order · realtime
resync after reconnect.
