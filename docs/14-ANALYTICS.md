# 14 — Analytics

Every event carries `version, actor, job/session id (where relevant),
timestamp` and only approved contextual properties — no unnecessary PII.
Analytics vendor is provider-abstracted (`packages/types/src/providers/
analytics-provider.ts`); final vendor choice is open
(`/docs/18-ROADMAP.md`).

## Customer events
`app_opened · address_selected · category_selected · problem_selected ·
media_added · now_request_started · request_submitted · matching_started ·
match_found · match_failed · match_cancelled · professional_viewed ·
provider_tracking_viewed · booking_confirmed · quote_received ·
quote_approved · quote_rejected · job_started · job_completed ·
payment_succeeded · payment_failed · review_submitted · job_cancelled ·
support_opened`.

## Professional events
`onboarding_started · identity_submitted · verification_approved ·
service_enabled · shift_started · shift_ended · offer_received ·
offer_accepted · offer_skipped · offer_expired · professional_en_route ·
arrived · quote_sent · service_started · service_completed ·
payout_viewed`.

## Marketplace / liquidity KPIs (the health question: "when a customer asks
NOW, can we reliably get someone moving toward them?")
Online supply by service/zone · eligible-supply rate · match rate · time to
first offer · time to acceptance · ETA · offer acceptance rate ·
professional utilization · jobs per online hour · gross/net earnings per
online hour · customer/professional cancellation · no-show · completion ·
repeat rate · unfulfilled demand.

## Rule
No artificial KPI threshold is frozen before the pilot baseline exists —
see `/docs/18-ROADMAP.md §MVP success`.
