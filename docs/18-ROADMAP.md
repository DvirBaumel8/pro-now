# 18 — Roadmap, Build Order & Open Decisions

## Build order / epics
```
EPIC 0  — Repository & docs                  (this delivery)
EPIC 1  — Database foundation                 (this delivery, first pass)
EPIC 2  — Auth & account                      (this delivery, first pass)
EPIC 3  — Professional verification            (interfaces + sandbox, this delivery)
EPIC 4  — Customer discovery/request           (this delivery, first pass — mobile UI)
EPIC 5  — Pro services & shift                 (this delivery, first pass — mobile UI)
EPIC 6  — Dispatch                             (this delivery, core engine + tests)
EPIC 7  — Realtime                             (this delivery, WS scaffold)
EPIC 8  — Active job (nav/arrival/service/completion)
EPIC 9  — Pricing/quotes (4 adapters)
EPIC 10 — Payments/ledger (sandbox provider; real vendor after business decision)
EPIC 11 — Reputation (PRO NOW reviews now; external provider after terms validation)
EPIC 12 — Admin/Ops (dashboard + job inspector, this delivery, first pass)
EPIC 13 — Safety/support
EPIC 14 — Analytics/observability
EPIC 15 — Hardening (security/perf/concurrency/offline/a11y/RTL QA)
EPIC 16 — Staging/pilot
EPIC 17 — Production/store readiness
```
Each epic's precise acceptance criteria live in `/docs/19-CLAUDE-RULES.md`.
See `/docs/EPIC-0-REPORT.md` for exactly how far this delivery got through
epics 0–7 and what remains.

## Pilot philosophy
Build broad, launch narrow. `MarketActivation` controls service × geography
× customer-visibility × provider-onboarding × dispatch, independently.
Never market a category before supply density and operational policy are
ready. See `/docs/09b-SERVICE-CATALOG.md` for the seeded pilot candidates.

## Open decisions — human/business/legal, must NOT be invented in code
Israeli payment marketplace provider · KYC/identity provider · exact maps/
routing commercial setup · external Google-reputation implementation/terms
· legal entity and tax/invoice model · commission percentage ·
cancellation fees · provider insurance policy · which credentials are
mandatory by category · background-check policy where lawful · pilot
geography · pilot services beyond the seeded candidates · support hours/
SLA · data retention periods · chat/call masking vendor · analytics vendor
· cloud hosting vendor · final brand/trademark/domain clearance.

The maps one has its numbers written down below — see *The maps vendor,
with the numbers*. The decision is still a decision; what is no longer
missing is the price of each option and what each one costs us in
honesty.

Everywhere one of these matters, the codebase exposes an interface + a
labeled sandbox adapter + an `app_config`/roadmap TODO — never a guessed
answer.

### The one that is blocking a real complaint, with the numbers

Amit, on the artifact: *"איפה כל הדברים של כל המקצועות? למה אין, ולא קיים
בקטלוג?"* He is right that it feels thin, and "which services to add" is
on the list above — each one needs a pricing model, a typical duration,
the credentials it mandates, and a judgement about whether it belongs in
a NOW marketplace at all. None of that is an engineering answer.

What IS an engineering answer is the shape of the problem, so the decision
takes a minute instead of an evening. 47 services today, and the imbalance
is the whole story:

| Front door | Services |
| --- | --- |
| לבית | 25 |
| ניקיון | 4 |
| רכב | 4 |
| חיות | 4 |
| ביוטי ושיער | 3 |
| בריאות וכושר | 3 |
| הובלות ומשלוחים | 2 |
| מחשבים וסלולר | 2 |

Half the catalogue is behind one door. A customer who taps "מחשבים
וסלולר" sees two rows and closes the app; a customer who taps "לבית" sees
a wall. Both are the same decision not yet made.

Adding one is a single entry in `packages/types/src/pilot-catalog.ts` —
name, pricing model, typical minutes, required credentials — and the home
grid, the category page, the sentence matcher and the professional's
eligibility list all pick it up, because they are all derived from that
one file. `content-completeness.test.ts` refuses a half-written entry, so
a service cannot be added without the fields that make it work.

### The maps vendor, with the numbers (asked 2026-09-21)

Amit: *"ברגע שיהיה חיבור לספק המפות נוכל לעשות הדמיות אמיתיות? במקום בתים
אמיתיים יהיו את המבנים והדמויות שלנו? ורק הצורה של המפה תהיה אמיתית? כמה
זה עולה? איך מתחברים?"*

**Yes, and it is the normal way to use these products.** A modern map is
vector tiles — roads, water, parks, land use, building footprints, labels
— each as its own layer, plus a STYLE that says how each layer is drawn
or whether it is drawn at all. So the real street geometry can stay while
the built environment is replaced with ours: building layers switched
off, our shopfronts placed at real coordinates as symbol layers, parks
and water kept in their true shapes and recoloured to our palette,
figures moving along the real street network. That is a style and a
sprite sheet, not a custom renderer.

Published prices, read on 2026-09-21 — they move, so re-check before
deciding:

| | Free per month | Then |
| --- | --- | --- |
| Mapbox Maps SDK (mobile) | 25,000 monthly active users | $4.00 / 1,000 MAU to 125k, $3.20 to 250k, $2.40 above |
| Mapbox Directions | 100,000 requests | $2.00 / 1,000 to 500k |
| Google Maps dynamic maps | 10,000 map loads | $7.00 / 1,000 to 100k, $5.60 to 500k |
| MapLibre + a tile vendor or self-hosted | — | hosting; the renderer is open source and the style is entirely ours |

The shapes of those two bills are different in a way that matters for
this product. Mapbox charges per PERSON per month however many times they
open the map; Google charges per map LOAD, and in a dispatch product one
customer watching one job is many loads. At 50,000 customers a month
Mapbox is about $100; the same traffic on per-load pricing is not
comparable in kind, so the estimate has to be built from expected loads
per job rather than from users.

Connecting is small and is already scaffolded: `MapsRoutingProvider` in
`packages/types` is the interface, the sandbox adapter is what runs
today, and a real vendor is an account, a token in `.env` (never
committed) and one adapter. The work is not the integration.

**Two things that are NOT engineering and must be decided first.** Which
vendor, which is on the list above and stays there. And the fact that the
moment our shops sit at real coordinates, the map starts making claims
about WHERE professionals are — today the city is honest precisely
because it is labelled an illustration and its positions are invented
(/CLAUDE.md §3). On a real map every position drawn must come from the
server and must be true, and "approximate area" has to be a deliberate,
designed answer rather than a blurred marker.

## MVP success — two levels
**Technical:** stable end-to-end loop, safe atomic assignment, payment
integrity, trust gating, recovery from every edge case in
`/docs/15-QA-TEST-PLAN.md`.
**Pilot marketplace:** high eligible-supply/match rate, acceptable time-to-
match/ETA, real provider earnings opportunity, completion and repeat
behavior, manageable incident/support rate. No KPI threshold is frozen
before a real pilot baseline exists.

## Final development principle
When there is tension between adding features and making NOW reliable,
choose NOW reliability. The MVP wins when a verified professional can
safely go online, a real nearby customer can request a supported service,
the system reliably matches them, both sides know what's happening, the
professional gets paid correctly, and the marketplace immediately knows the
professional is available again. Everything else is secondary until this
loop works repeatedly in the real world.
