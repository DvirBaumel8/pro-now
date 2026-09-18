# 00 — Vision

## North Star
"Need a pro? See who's available near you. Book them. They're on the way."

PRO NOW is a **real-time, ONLINE-FIRST / NOW-FIRST mobile services
marketplace** — not a directory, not a lead marketplace, not an appointment
calendar, not a bidding site. An independent professional decides when to go
ONLINE and receives nearby paid work; a customer who needs help right now
gets matched to a trusted, verified professional with a real ETA.

## Long-term category
The long-term category is broader than home repairs: any legal, safe
service a professional can bring to a customer's home, business, office or
meeting point — repairs, beauty & grooming, wellness & fitness, cleaning &
household, errands & delivery, moving & assembly, mobile auto, pets, family
assistance, lessons, events, food/hospitality, tech support, personal
services/concierge, and outdoor/property work (full department list in
`/docs/01-PRD.md §Departments`).

Three booking engines exist in the architecture so the taxonomy never
forces every profession to behave like a plumber:

- **Engine 1 — NOW/Dispatch** (built in MVP): faults, delivery, handyman,
  some cleaning, mobile auto, short tasks.
- **Engine 2 — BOOK/Calendar** (architecture-safe, not built): nails, hair,
  massage, lessons, recurring cleaning.
- **Engine 3 — REQUEST/Quote** (architecture-safe, not built): events,
  moves, large projects.

## What MVP actually is
Build broad, launch narrow. The MVP is Engine 1 only, in one dense pilot
geography, with a deliberately small representative service mix (see
`/docs/09b-SERVICE-CATALOG.md`) chosen to exercise all four pricing
archetypes (fixed, hourly, visit+quote, distance/time) without opening 50
categories on day one.

## Positioning
- Customer promise: "Need a service? Now." (**"צריך שירות? עכשיו."**)
- Professional promise: "Got time to work? Get online."
  (**"יש לך זמן לעבוד? תתחבר."**)
- English working line: "People. Services. Now."

## Non-negotiables (see `/CLAUDE.md §3` for the enforceable version)
ONLINE-FIRST · NOW-FIRST · real supply/ETA only · service-specific
verification · transparent payout · server-authoritative state · neutral
"Professional/Provider/Service" terminology everywhere, never hard-coded to
one trade.

## What we are deliberately not building in MVP
Advance-booking calendar · provider bidding · a social feed · nationwide
coverage assumptions · fake availability/ETA/demand · guaranteed AI
diagnosis · complex subscriptions · loyalty programs · B2B fleet management.
Every one of these can be added later without an architecture rewrite — see
`/docs/18-ROADMAP.md`.
