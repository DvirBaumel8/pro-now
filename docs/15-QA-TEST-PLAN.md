# 15 — QA, Security & Launch Checklist

## Release gate
No production launch until: the critical customer/pro flow passes on real
iOS and Android, staging vendors are replaced/approved for production,
legal/privacy/payment/KYC decisions are signed off by responsible humans,
monitoring exists, and Ops has runbooks.

## P0 flows (must pass before any release)
Customer OTP · address/location · catalog shows only active services ·
request + media · search/no-match · match + ETA · tracking · arrival ·
fixed-service completion · visit+quote approval · payment · review/report
· pro onboarding/KYC · credential review · GO ONLINE · offer accept/skip/
expire · background/reconnect · navigation/arrival · completion · earnings/
payout display.

## Concurrency (unit + integration, automated, not manual-only)
Two professionals accept the same job → exactly one assignment. Duplicate
customer submit → one logical job. Duplicate completion → one completion.
Duplicate payment webhook → one financial effect. Out-of-order webhook →
consistent final state. Offer-accept at the exact expiry boundary is
deterministic.

## Network/device
Airplane mode · poor network · socket disconnect · push disabled ·
location denied · background-location denied · app killed · phone reboot
mid-job · low battery · GPS stale · device clock changed · upload
interrupted · API timeout/retry.

## Full edge-case inventory (mandatory design, see `/docs/08-DISPATCH-ENGINE.md`
and `/docs/07-JOB-STATE-MACHINE.md` for the mechanisms that resolve these)
No professionals available · offer timeout · professional declines · two
professionals accept simultaneously · GPS stale/unavailable · professional
goes offline mid-dispatch · customer denies location permission · invalid/
unsupported address · customer changes address mid-job · professional not
moving toward customer · professional no-show · customer no-show ·
cancellation before/after assignment/after arrival · quote rejected/edited
· payment authorization/capture failure · refund · dispute · network loss
· app killed/backgrounded · duplicate button tap/retry · expired
professional license mid-shift · unsafe/abusive interaction escalation ·
courier pickup/delivery proof failure · media upload partial failure ·
push-missing-but-socket-active and vice versa · server deploy during
active jobs.

## Accessibility/RTL
Screen reader · font scaling · contrast · keyboard · mixed RTL/LTR text ·
touch targets · reduced motion · accessible timer · status never
color-only.

## Trust
Fake/duplicate account · expired credential · reverification · service-
specific suspension · block pair · serious-incident escalation · manual
review/appeal audit · external reputation disconnected/stale/API-down.

## Payments
Chosen authorization/capture flow · decline · challenge flow if applicable
· timeout · refund (full/partial) · chargeback/dispute intake · payout
pending/failed · reconciliation · rounding/tax · ledger invariant checks.
**Never launch real money until finance reconciliation is tested.**

## Maps
Bad geocode · multi-entrance address · route unavailable · ETA provider
outage · wrong GPS · provider not moving · customer moves address after
assignment · maps-vendor quota failure — every fallback avoids showing a
false ETA rather than hiding the problem.

## Observability
Sentry release mapping · structured logs · request IDs · job IDs · payment-
event correlation · dispatch metrics · alerts on webhook failures,
assignment errors, elevated no-match/5xx rates · privacy-safe dashboards.

## Go/No-Go
GO only if: no open P0 · financial reconciliation passes · assignment
concurrency passes · the verification gate works · location-privacy
behavior works · Ops can reconstruct a job timeline end-to-end · responsible
owners have signed off legal/payment/trust launch requirements.

## Post-launch (daily pilot review)
Unfulfilled demand · time-to-match · acceptance · ETA · completion ·
cancel/no-show · payment failures · incidents · provider net/hour ·
customer repeat · support tickets. **Do not expand geography/categories
until liquidity and safety are stable.**
