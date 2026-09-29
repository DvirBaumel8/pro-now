# 23 — Observability: errors, alerts, and investigating them later

Decided and built 2026-09-29 (Dvir). The goal: while friends use the tester
build, every real error reaches a phone in real time, and everything needed
to investigate it is still there the next morning.

## Shape

```
apps/web (browser) ──Sentry SDK──────────────┐
      │                                      ├──► Sentry: stack, breadcrumbs, browser, release (history)
      │ POST /api/v1/client-errors           │
      ▼                                      │
apps/api (Fastify) ──Sentry SDK──────────────┘
      │ error handler (5xx) · unhandledRejection · uncaughtException · web reports
      ▼
   Monitor ── scrub ── fingerprint ── throttle ──► AlertNotifier (Telegram bot) ──► 📱
UptimeRobot (free, 5-min) ── GET /health ─────────────────────────────────────────► 📱 (server down)
```

| Piece | Where |
|---|---|
| Scrub + fingerprint (shared) | `packages/types/src/observability.ts` |
| Client report schema | `packages/validation/src/schemas.ts` → `clientErrorReportSchema` |
| `ErrorReporter` (Sentry / none) | `apps/api/src/observability/error-reporter.ts` |
| `AlertNotifier` (Telegram / none) | `apps/api/src/infra/alerts/` |
| Throttle | `apps/api/src/observability/alert-throttle.ts` |
| Monitor (the one entry point) | `apps/api/src/observability/monitor.ts`, wired in `plugins/observability.ts` |
| 5xx → monitor | `setErrorHandler` in `apps/api/src/server.ts` |
| Process handlers | `installProcessHandlers` in `apps/api/src/server.ts` |
| Browser reporting | `apps/web/src/observability.ts`, `apps/web/src/crash.tsx` (crash screen) |
| Test routes (admin only) | `POST /api/v1/admin/debug/boom`, `POST /api/v1/admin/debug/rejection` |

## Why Telegram and Sentry

- **Telegram bot**: free, instant push, HTML formatting and links, no expiring
  sandbox. WhatsApp's Business API needs Meta verification or a paid gateway,
  and the Twilio sandbox expires every 72h. Email arrives late and is easy to
  miss.
- **Sentry, free Developer plan**: groups repeats into one issue and keeps
  the stack, breadcrumbs, browser and release for the plan's retention period.
  Render Free's own logs are short-lived and hold no grouping. Performance
  tracing and session replay are off: the free quota is kept for errors.
- Both sit behind interfaces (`ErrorReporter`, `AlertNotifier`), so swapping
  one means one adapter and `plugins/observability.ts`.

## What alerts, and what does not

| Event | Logged | Sentry | Telegram |
|---|---|---|---|
| API 5xx | error | ✓ | ✓ |
| API 4xx (refusal, validation) | info | — | — |
| `unhandledRejection` (server keeps serving) | error | ✓ | ✓ |
| `uncaughtException` (reported, 2s flush, exit; Render restarts) | fatal | ✓ | ✓ |
| Browser: render crash, `error`, `unhandledrejection` | warn | ✓ (from the browser) | ✓ |
| Browser noise: extensions, `ResizeObserver loop`, `Script error.`, fetch failures while offline | — | — | — |
| Server down / sleeping and not waking | — | — | ✓ via UptimeRobot |

A server that fails to **boot** never gets a monitor; UptimeRobot is what
catches that.

## Alert hygiene

- The first occurrence of an error alerts at once. Repeats of the same
  fingerprint within `ALERT_THROTTLE_MINUTES` (10) become one summary:
  `🔁 … ×37 more in the last 10 min`.
- A fingerprint is source + error name + message with ids, numbers and quoted
  values folded + the first stack frame of our own code, without its column.
- At most `ALERT_MAX_PER_HOUR` (30) messages per rolling hour. The next
  message after the cap lifts says how many were dropped.
- The browser also sends the same crash from one tab at most once a minute,
  and `/client-errors` allows 20 reports a minute per IP. Behind Render's proxy
  without `trustProxy`, that means 20 a minute for the whole endpoint.
- The throttle lives in memory, which is correct for one instance. A restart
  forgets it.

## Privacy

Friends are real people, so nothing that identifies them leaves the process:

- `scrubText` replaces emails, Israeli phone numbers, bearer tokens, signed-URL
  query strings and `token=/password=/signature=/code=…` values. It runs on
  alert text, on Sentry events (message, exception, breadcrumbs, URL) and in
  the browser before a report is sent.
- Sentry `dataCollection`:
  - Off: cookies, bodies, query strings, DB values, local variables, automatic
    user info.
  - Request headers are allow-listed: `user-agent`, `content-type`,
    `accept-language`.
- A person is referred to by **user id only**, in both Sentry and Telegram.
- The Telegram bot token never appears in a log line. The adapter redacts it
  from Telegram's error text.

## Configuration (Render → Environment)

| Var | Read at | Purpose |
|---|---|---|
| `SENTRY_DSN` | runtime (API) | the API project's DSN |
| `SENTRY_ORG_URL` | runtime (API) | e.g. `https://pro-now.sentry.io`, for the link in alerts |
| `ALERT_TELEGRAM_BOT_TOKEN`, `ALERT_TELEGRAM_CHAT_ID` | runtime (API) | set both or neither; boot refuses half |
| `ALERT_THROTTLE_MINUTES`, `ALERT_MAX_PER_HOUR` | runtime (API) | defaults 10 / 30 |
| `VITE_SENTRY_DSN` | **build** (web) | the web project's DSN |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_WEB_PROJECT` | **build** (web) | uploads source maps, then deletes them from `dist` |
| `RENDER_GIT_COMMIT` | set by Render | release tag on every report |

With none of these set, errors are logged and nothing else happens. That is
the local default.

### One-time setup

1. **Telegram**:
   - Message `@BotFather`, send `/newbot`, and copy the token.
   - Send your new bot any message.
   - Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read
     `message.chat.id`.
2. **Sentry**:
   - Create an organization and two projects: `pro-now-web` (React) and
     `pro-now-api` (Node).
   - Copy both DSNs.
   - Create an org auth token with the `project:releases` scope (it is used
     for source maps).
3. **UptimeRobot**:
   - Add an HTTP(s) monitor on `https://<service>.onrender.com/health`,
     checking every 5 minutes.
   - Add Telegram as an alert contact.
   - Side effect: the checks keep the free instance from sleeping.
4. Put the values into Render's Environment and redeploy.

### Verify on a deployed server

Sign in as an admin (an `ADMIN_EMAILS` address), then from the browser
console:

```js
fetch("/api/v1/admin/debug/boom", { method: "POST" })       // → 🔴 api alert, 500 with requestId
fetch("/api/v1/admin/debug/rejection", { method: "POST" })  // → 💥 process · unhandledRejection
setTimeout(() => { throw new Error("web probe") })          // → 🟠 web · error
```

## Investigating an alert

Every alert carries the error, the route or page, `req` (the requestId, also
returned in the 500 body), `user` (id), `rel` (commit), the top frames, and a
Sentry link when there is one. To work on it with Claude, paste the alert or
the Sentry link. With a Sentry token available in the session, Claude can
pull the whole event. Otherwise the stack in the alert and the requestId
against Render's logs are the starting point.

## Security review note

- `POST /api/v1/client-errors` is unauthenticated by design, because crashes
  happen before sign-in. It is bounded by a 16 KB body, a strict schema with
  bounded strings, and a rate limit. The worst misuse is noise in Telegram,
  and the per-fingerprint throttle and the hourly cap bound that. It writes
  nothing to the database.
- The two debug routes require `ADMIN` and touch no data.
- No secret is logged. The DSNs are not secrets (Sentry's design). The
  Telegram token and the Sentry auth token are `sync: false` in `render.yaml`.
