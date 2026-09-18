# 13 — Admin / Live Operations

Admin is built from v1, not "phase 2".

## Dashboard KPIs
jobs today · GMV · platform revenue · online professionals · active
searches · active jobs · average ETA · acceptance rate · cancellation rate ·
completion rate · unfulfilled demand.

## Live map
Online professionals · searching customers/jobs · assigned/en-route jobs ·
stalled/exception jobs · "no Pro found" hotspots.

## Job inspector
Customer, professional, service, timestamps, media, quotes, payments,
messages (where support access is permitted), and the **complete event
timeline** — e.g.:
```
10:31:04  Customer created job
10:31:07  Matching started
10:31:09  Offer → Pro #291
10:31:31  Offer expired
10:31:32  Offer → Pro #831
10:31:40  Accepted
10:31:44  En route
10:43:21  Arrived
```
This is what turns "I waited half an hour and nobody came" from a guess
into an answer. Manual support actions are always audit-logged.

## Provider approval & risk queues
Identity review · credential review · business/profile review · external-
reputation linking · duplicate/risk flags · complaints/incidents ·
re-verification · suspensions/appeals. The provider timeline records who
reviewed what, when, source/status changes and reason codes. All sensitive
admin actions require role-based access and are audit-logged.

## Configuration (remote, RBAC-protected, audited)
Market/service activation · offer timeout · search-radius expansion ·
location-freshness threshold · dispatch scoring weights · pricing config ·
credential requirements · cancellation rules · feature flags. **No
production-critical constant is hidden in mobile code** — everything above
is `app_config`, editable without an app release.

## Support runbooks (minimum set — full list in `/docs/15-QA-TEST-PLAN.md`)
No professional found · professional stuck/not moving · customer/provider
unreachable · safety complaint · payment failed after work · refund ·
credential issue · KYC pending · maps/push/realtime/payment-provider outage
· suspend/restore provider. Each runbook defines: detection, user
communication, admin action, escalation, audit.
