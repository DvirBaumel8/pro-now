# PRO NOW — Master Product Bible v1.0 (source, translated/condensed from Google Drive Hebrew+English original)

Status: Working Master Specification. Purpose: central source document for
planning, design, development, QA and launch of PRO NOW.

## 1. Product definition
Real-time service marketplace connecting a customer who needs a professional
with a verified, nearby, available professional. North Star: "Need a pro?
See who's available near you. Book. They're on the way."

## 2. Product principles
NOW-first · Trust-first · No surprise pricing · Simple by default · Location
with purpose · Operational visibility · Hebrew/RTL first, English/LTR-ready.

## 3. Users & systems
A. Customer Mobile App B. Professional Mobile App C. Admin/Live Operations
Web Console D. Backend/Dispatch/Realtime/Payments/Notifications.

## 4. MVP launch scope
Initial area: dense Gush Dan urban zone. First categories: plumber,
electrician, locksmith, AC technician, handyman (subject to density/supply
check). Order modes: NOW (MVP core), Today (Phase 1.5), Schedule (Phase 2).

## 5–14. Core flows, state machines, dispatch, pricing, stack, DB domains
See `/docs/02-UX-FLOWS.md`, `/docs/07-JOB-STATE-MACHINE.md`,
`/docs/08-DISPATCH-ENGINE.md`, `/docs/09-PAYMENTS.md`,
`/docs/04-TECH-ARCHITECTURE.md`, `/docs/05-DATABASE.md` — fully distilled
from this chapter of the source bible; not duplicated here to avoid drift.

## 15–25. Backend rules, admin, edge cases, analytics, security/privacy,
Claude contract, docs set, build phases, definition of success, open
decisions — distilled into `/docs/10-TRUST-VERIFICATION.md`,
`/docs/13-ADMIN-OPS.md`, `/docs/11-SECURITY.md`, `/docs/12-PRIVACY.md`,
`/docs/14-ANALYTICS.md`, `/docs/19-CLAUDE-RULES.md`, `/docs/18-ROADMAP.md`.

## 26. EXPANDED VISION — The Mobile Services Economy
PRO NOW is not "a home-repair app". It is infrastructure for mobile work —
any legal, safe service a professional can perform at the customer's
location, business, office or meeting point. Long-term: let professionals
run a business with no fixed storefront, or extend an existing business into
mobile hours.

### 26.1 Proposed super-departments
A. Repairs, maintenance & installation — plumbing, licensed electrical,
locksmith, AC, handyman, light carpentry, hanging/drilling, furniture
assembly, TV mounting, network/Wi-Fi, smart home, cameras/intercom (where
lawful), blinds/window repair, light sealing, paint/wall touch-ups, door/
cabinet repair, appliance install/repair, computer/printer techs, pool
maintenance, gardening, licensed pest control, AC cleaning.
B. Beauty & grooming at home — barber, women's hair, styling, color/
treatments where mobile-safe, nails, manicure, gel/pedicure, lashes, brows,
makeup, event makeup, cosmetology/facials per regulation, waxing, spray tan,
personal styling, event prep.
C. Wellness, body & fitness — massage, sports massage, personal training,
yoga, pilates, stretching/mobility, running coaches, movement/dance classes,
meditation/breathwork; medical/para-medical services require a separate
compliance track and are not auto-included.
D. Cleaning & household — one-off, recurring, deep clean, move in/out,
Airbnb turnover, organizing, laundry, ironing, folding, window cleaning,
upholstery/carpet/mattress cleaning, balcony cleaning, pressure washing,
general home help, home cooking/meal prep subject to food-safety rules.
E. Errands & delivery — independent point-to-point courier, documents,
packages, store pickup, returns, shopping, laundry pickup, key pickup, small
business delivery, personal runner, queueing/physical errands where
permitted, scheduled deliveries, multi-stop (future).
F. Moving, carrying & assembly — porters, single-item transport, small
moving, driver+vehicle, disassembly/assembly, packing, unpacking, post-move
tidy, furniture/waste removal per law, in-home furniture shifting, second-
hand item pickup.
G. Mobile auto services — mobile car wash, detailing, battery replacement,
flat tire/wheel, mobile mechanic for suitable jobs, basic diagnostics,
accessory installation, more per licensing/safety; towing needs a separate
operational model.
H. Pets — dog walking, pet sitting, feeding visits, mobile grooming, bathing/
trims, home training, pet transport, holiday care, aquarium cleaning;
veterinary services only via a separate licensed track.
I. Children, family & companionship — babysitting, caregiver, family help,
companionship/supervision, non-medical elder assistance, family errands.
These categories require elevated Trust & Safety: identity/background/
reference checks, insurance, contact rules per law.
J. Lessons & tutoring at home — private tutor, languages, math, matriculation
prep, piano, guitar, vocal, drums, art, computer lessons, photography
lessons, personal sports coaching, dance lessons. Mostly Scheduled, not NOW.
K. Events at the customer's location — photographer, videographer, DJ, small
sound system, event makeup/hair, bartender, waitstaff, private chef, kids'
entertainer, balloons/decor, table design, photo booth/magnets, musicians,
setup/teardown help. Requires advance booking, crews, add-ons and equipment.
L. Food & personal service — private chef, home cooking, meal prep, baking/
workshop at home, bartending, hosting services; all food services subject to
licensing, allergen and safety review.
M. Tech & digital at home — tech support, computer, phone, TV, console,
Wi-Fi, backup/data transfer, equipment install, digital training, smart
home, scanning/photo digitizing. Cyber/account-access-risk actions get
separate trust procedures.
N. Personal services & concierge — physical personal assistant, home/closet
organizing, personal stylist, mobile tailoring/alterations, measurements,
gift wrapping, event-hosting prep, shopping, errands, passport photos/
on-site content, mobile notary only where law/licensing allow.
O. Home, outdoor & property — gardening, mowing, light pruning, yard/
balcony cleaning, garden-equipment assembly, pool maintenance, grill
cleaning, move-in/move-out prep, Airbnb maintenance, property photography,
measurements, light home staging, property-helper services.

### 26.2 Three booking engines — not every profession behaves like a plumber
ENGINE 1 — NOW/Dispatch: faults, delivery, handyman, some cleaning, mobile
auto, short tasks. Customer requests now; system finds Online Pros and
dispatches.
ENGINE 2 — BOOK/Calendar: nails, lashes, hair, massage, cosmetology, lessons,
training, recurring cleaning. Customer sees slots + travel/setup time and
books.
ENGINE 3 — REQUEST/Quote: events, moves, painting, large jobs, private chef,
projects. Customer sends a brief; matching Pros respond/quote; a pre-visit
can be scheduled.
The same Pro can use more than one engine depending on the service.

### 26.3 Service definition — every service is metadata-driven, not code
category_department, category, service, booking_mode (NOW|BOOK|REQUEST|
HYBRID), duration_minutes, buffer_before/after, pricing model (base_price /
visit_fee / hourly / fixed / quote_required), travel_radius,
equipment_required, customer_preparation, media_required,
license_requirement, gender/preference options only where lawful and
appropriate, max_party/people, location_type (customer_home|office|outdoor|
provider_location|flexible), vehicle_requirement, inventory/consumables,
add_ons, cancellation_policy, safety_level, trust_tier. New professions can
be added from Admin without an app release.

### 26.4 Professional Operating System
The Pro app gradually becomes "a business in your pocket": Online/Offline,
calendar, service menu, service radius, travel time, portfolio, reviews,
CRM/history, repeat clients, quote builder, add-ons, payments/payouts,
invoices/receipts integration where applicable, equipment checklist,
inventory (later), earnings, utilization, cancellation/acceptance stats,
route/day planner, favorite-customer/rebook flows, optional storefront link.
Value proposition: not just "bring me a lead" — give the professional the
infrastructure to run a mobile business independent of a fixed location.

### 26.5 Customer information architecture
Home does not show dozens of professions in one list. Top departments: Home
& Repairs, Beauty & Grooming, Cleaning & Household, Wellness & Fitness,
Delivery & Errands, Auto, Pets, Lessons, Moving & Assembly, Events, Family &
Companionship, More services. Central search bar: "What do you need today?"
supporting intent search ("hang a TV", "blow-dry at home", "courier for a
document", "cleaner today"). Personalized: reorder, favorites, "available
near you now", recent services.

### 26.6 Supply expansion strategy
The vision is broad; the launch is not. Architecture and taxonomy are built
for every department, but each city/category activates via feature/config
flags only once there is minimum supply, pricing, trust policy and
operations. Never show an "empty" category just because it exists in the DB.

### 26.7 Trust tiers
TIER A — low-risk task: identity + payment + reviews.
TIER B — home-entry: enhanced identity/reference checks.
TIER C — licensed trade: verified professional license where required.
TIER D — vulnerable-person care / sensitive services: enhanced screening.
TIER E — regulated/medical/high-liability: disabled until explicit legal
approval.

### 26.8 Research validation (context only, not a legal/market claim)
Comparable marketplaces (Urban Company, TaskRabbit, Thumbtack) operate far
broader category sets than "repairs" — cleaning, salon, massage, home help,
repairs/AC, and in places cooking, laundry, moving; beauty, lessons, pets,
wellness, auto. Conclusion for product: build a generic core marketplace
with a per-service configuration layer, not a rigid plumbers-only app.

### 26.9 Revised positioning
Old mental model: "Gett for home-service pros." New mental model: "PRO NOW —
a marketplace for work and services that come to you." Consumer promise:
"Everything that can be brought to you — in one app." Professional promise:
"Your business can move with you."

### 26.10 Roadmap consequence
MVP still must be narrow to solve cold-start. Phase 1 pilot: 2–4 departments
with high repeat/urgent demand, not 50 active categories. Phase 2: Beauty +
Cleaning/Household. Phase 3: Wellness + Pets + Auto + Moving/Delivery.
Phase 4: Lessons + Events + Family services. Department activation is driven
by validation and supply, not only the roadmap calendar.

### 26.11 Architecture consequence
Taxonomy must be hierarchical and dynamic: departments → categories →
services → service_variants/add_ons. A professional profile supports
multiple departments/categories/services. Availability can be global or
service-specific. Pricing and booking mode live at the professional_service
level with platform defaults. The dispatch engine only applies to
NOW-capable services; a scheduling engine would handle BOOK; a request/quote
engine handles REQUEST. One unified Job/Booking entity uses service
configuration to determine its lifecycle.

### 26.12 Product principle
PRO NOW must never assume "professional" means repair technician. Names,
icons, onboarding copy, data models, admin terminology and analytics must
use neutral terms — Professional / Provider / Service — so a nail
technician, barber, cleaner, courier, tutor, dog groomer and plumber all fit
naturally without hacks.

## 27. PRODUCT RESET v1.1 — ONLINE-FIRST / NOW-FIRST
Decision: PRO NOW is built first and foremost as a real-time gig
marketplace. Core loop: ONLINE → JOB OFFER → ACCEPT → TRAVEL → SERVICE →
PAYMENT → AVAILABLE AGAIN. BOOK and REQUEST are NOT part of the MVP
experience. Architecture must not block future expansion, but no
appointment calendar, bidding marketplace or RFQ system is built now.
Full detail distilled into `/docs/01-PRD.md`, `/docs/07-JOB-STATE-MACHINE.md`,
`/docs/08-DISPATCH-ENGINE.md`, `/docs/18-ROADMAP.md`.

## 28. Trust, Verification & Reputation Engine
Full detail distilled into `/docs/10-TRUST-VERIFICATION.md`.

## 29–33. Pro app feature set, customer trust experience, admin risk queues,
professional-side design directive, prototype screen list.
Distilled into `/docs/02-UX-FLOWS.md` and `/docs/03-DESIGN-SYSTEM.md`.
