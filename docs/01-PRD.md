# 01 — Product Requirements

## MVP product freeze (Final Pre-Development Decisions v1.0)
- ONLINE-FIRST / NOW-FIRST.
- Separate customer and professional mobile apps; one shared user identity
  model (a person may hold a customer profile and a professional profile
  without duplicate identity records).
- Admin web app from day one, not "phase 2".
- No advance booking. No bidding. No provider-directory-browsing as the
  primary flow. No subscriptions/loyalty/B2B in MVP.

## Users & roles
| Role | Responsibility |
|---|---|
| Customer | creates requests, manages addresses/payment, tracks active job, approves quotes, pays, reviews, reports |
| Professional | verification, service configuration, shift start/end, location sharing while online, offer accept/decline, job execution, earnings/reputation/documents |
| Ops | live marketplace visibility, matching/job intervention, no-match & stuck-job handling, support |
| Trust & Safety | identity/credential review, risk flags, incidents, suspensions, re-verification |
| Finance | reconciliation, refunds, payouts, payment failures |
| Admin | RBAC-governed configuration and audit access |

## Departments (architecture-wide taxonomy; activation is per-market/config)
Home & Repairs · Beauty & Grooming · Cleaning & Household · Wellness &
Fitness · Delivery & Errands · Auto · Pets · Moving & Assembly · Lessons ·
Events · Family & Companionship · Food/Home Hospitality · Tech · Personal
Services/Concierge · Home/Outdoor/Property. See
`/docs/_source/01-master-product-bible.md §26.1` for the full sub-service
brainstorm this taxonomy is derived from.

Hierarchy: **Department → Category → Service → Variant/Add-on**, entirely
metadata-driven (see `/docs/05-DATABASE.md`), so a new profession is an
Admin configuration change, never an app release.

## MVP launch scope
- Initial market: one dense urban zone (Gush Dan-equivalent density; exact
  geography is an intentionally open business decision — see
  `/docs/18-ROADMAP.md §Open Decisions`).
- Pilot service mix: seeded from `/docs/09b-SERVICE-CATALOG.md` rows marked
  `PILOT_CANDIDATE`, spanning Beauty (fixed), Wellness/Massage (fixed,
  elevated trust), Home repairs/Plumbing/Electrical (visit+quote), Handyman
  & Cleaning (hourly), Courier (distance/time).
- Order mode: NOW only. "Today" and "Schedule" are Phase 1.5/Phase 2, not
  built.

## Customer core flow
Open app → select address → select category → select problem / "I'm not
sure" → add description/media → Request NOW → matching → professional found
→ review ETA/profile/visit fee → confirm booking/payment method → dispatch
accepted → live tracking → professional arrived → diagnosis (if
visit+quote) → quote → customer approval → work in progress → completion →
payment → rating/review → closed.

## Professional core flow
Open Pro app → verify onboarding status → GO ONLINE → share location while
available → receive dispatch offer → accept/decline/timeout → navigate →
arrive → diagnose (if applicable) → build quote → wait for approval →
perform work → complete → payment/payout status → return AVAILABLE or
OFFLINE.

## Definition of MVP success
Not "screens exist". A real customer can request a real verified
professional; the system matches and atomically assigns exactly one
professional; the professional travels and is tracked appropriately;
submits a quote where relevant; receives approval; completes the job and
payment; both sides recover safely from every edge case in
`/docs/15-QA-TEST-PLAN.md`; and Ops can reconstruct the entire job from the
event timeline without reading raw database tables.

## Open decisions this PRD intentionally leaves open
See `/docs/18-ROADMAP.md §Open Decisions` — these are business/legal/vendor
questions, not engineering questions, and must not be answered by code.
