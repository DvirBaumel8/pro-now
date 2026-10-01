# 01 — Vision and product requirements

## North star
"Need a pro? See who's available near you. Book them. They're on the way."

PRO NOW is a **real-time, ONLINE-FIRST / NOW-FIRST services marketplace** —
not a directory, a lead marketplace, an appointment calendar or a bidding
site. An independent professional decides when to go ONLINE and receives
nearby paid work; a customer who needs help now is matched to a trusted,
verified professional with a real ETA.

- Customer promise: **"צריך שירות? עכשיו."**
- Professional promise: **"יש לך זמן לעבוד? תתחבר."**
- English working line: "People. Services. Now."

The enforceable invariants are in `/CLAUDE.md §3`.

## Three booking engines (only the first is built)
The taxonomy must never force every trade to behave like a plumber:

- **Engine 1 — NOW/Dispatch** (MVP): faults, delivery, handyman, some
  cleaning, mobile auto, short tasks.
- **Engine 2 — BOOK/Calendar** (architecture-safe, not built): nails,
  hair, massage, lessons, recurring cleaning.
- **Engine 3 — REQUEST/Quote** (architecture-safe, not built): events,
  moves, large projects.

The agreed next stage after NOW is "request for a later time", with no
professional calendar (`18-ROADMAP.md`).

## MVP scope (product freeze)
- NOW only. No advance booking, bidding, provider browsing as the primary
  flow, subscriptions, loyalty, social feed or B2B.
- One identity per person; a person may hold a customer and a professional
  profile. Admin exists from day one.
- Build broad, launch narrow: one dense pilot area (geography TBD) and a
  small service mix that exercises every pricing kind
  (`09b-SERVICE-CATALOG.md`).
- Today the client is the web app (`apps/web`, a PWA). Native apps are
  Phase 3 (`21-PRODUCTION-PLAN.md`).

## Roles
| Role | Responsibility |
|---|---|
| Customer | requests, addresses, tracking, quote approval, payment, review, reports |
| Professional | verification, services and prices, going online, location while online, offers, job execution, earnings |
| Ops / Trust & Safety / Finance | live marketplace, interventions, identity and credential review, incidents, refunds and payouts |
| Admin | RBAC-governed configuration and audit access |

## Taxonomy
**Department → Category → Service → Variant/Add-on**, metadata-driven, so
a new profession is an admin change, never an app release. Departments:
Home & Repairs · Beauty & Grooming · Cleaning & Household · Wellness &
Fitness · Delivery & Errands · Auto · Pets · Moving & Assembly · Lessons ·
Events · Family & Companionship · Food/Hospitality · Tech · Personal
Services · Outdoor/Property (full brainstorm:
`_source/01-master-product-bible.md §26.1`).

## Core flows
**Customer:** address → category or free text → describe (text, photos,
voice) → price shown → request NOW → searching → match (ETA, profile,
price) → tracking → arrival → diagnosis/quote where relevant → work →
completion → review.

**Professional:** join (details, services, documents, prices) → approved
per service → GO ONLINE → offer with expected earnings → accept, skip or
let it expire → navigate → arrive → work (quote where relevant) → complete
→ back to AVAILABLE.

Screens: `02-UX-FLOWS.md`. States: `07-JOB-STATE-MACHINE.md`. How each
service is priced: `18-ROADMAP.md` ("two kinds of work").

## Sponsored shops (mechanism built, commercial terms open)
A brand rents a building in the street the customer walks while waiting.
Entering shows its shop, and one button leaves for the brand's own site.
Each rule is enforced by a test in `packages/types/src/sponsor-shops.ts`:

1. **Never mistakable for a professional.** "בחסות" appears on the card,
   the interior and the control's accessible name. A sponsor has no
   rating, distance, ETA or availability field.
2. **Not dispatchable.** No department, and never a trade's venue or
   interior.
3. **Leaving is announced.** `sponsorLeaveHe` says the order, payment and
   delivery belong to the brand.
4. **Never competes with the job.** Visible only while SEARCHING,
   OFFERING, PRO_ASSIGNED and PRO_EN_ROUTE.

No audience numbers are promised, because none are measured. The price,
who is accepted, and whether sponsors ship at all are Amit's decisions
(`18-ROADMAP.md §Open decisions`).

## What MVP success means
Not "screens exist". A real customer requests a real verified
professional; the server atomically assigns exactly one; the professional
travels, quotes where relevant, completes and is paid correctly; both
sides recover from every edge case in `15-QA-TEST-PLAN.md`; and Ops can
reconstruct the whole job from the event timeline. When features compete
with NOW reliability, choose reliability.
