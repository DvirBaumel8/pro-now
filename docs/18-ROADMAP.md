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

### Decided — how somebody reaches a human (2026-09-23)

Off the open list above. Amit: *"ערוץ תמיכה תעשה וואטסאפ 0547222218
אימייל nivamit1210@gmail.com כרגע."* Recorded in
`packages/types/src/support.ts` rather than typed into a screen, so the
day it stops being a founder's own phone it changes in one place.

Still open, and deliberately not invented: support HOURS and a response
time. A channel is a fact; "we answer within an hour" is a promise, and
promising one on a personal phone is how a marketplace loses trust the
first night nobody answers. `supportHoursHe` says the true thing instead.

### Sponsored shops — mechanism built, list not decided (2026-09-23)

A brand renting a building in the waiting neighbourhood, with a link out
to its own site. Amit: *"ככה אגייס שיווק וכסף."* The product rules are
built and tested (`sponsor-shops.ts`); what a sponsorship costs, who is
accepted, and whether sponsored shops ship in the customer app at all
remain open and belong on the list above. See `/docs/20-SPONSORS.md`.

### Decided — when the money moves (2026-09-23)

Not on the list above any more, and it never belonged to the vendor
question: WHEN `authorize` and `capture` are called is a product rule,
and Amit has made it.

Visit fee on arrival. The quote's amount HELD on the customer's
approval, so the professional never works against a promise. Captured
only when the customer confirms the work is finished, so the money does
not leave before the job is done.

Written up with the reasoning in `/docs/09-PAYMENTS.md § When the money
moves`, and in code as `packages/types/src/payment-moments.ts`, whose
invariants are asserted against the canonical order of a visit. The
vendor remains open; nothing about this decision names one.

Everywhere one of these matters, the codebase exposes an interface + a
labeled sandbox adapter + an `app_config`/roadmap TODO — never a guessed
answer.

### TBD — which catalogue is the product's service list (asked 2026-09-22)

There are two, and they do not know about each other.

`packages/types/pilot-catalog.ts` is what the customer sees: **47
services**, with keywords, symptoms, photo prompts and matching modes.
Every screen is built from it. The `services` table is what the server
dispatches: **25 rows**, seeded from `/docs/09b-SERVICE-CATALOG.md`.

They share neither ids nor codes. `POST /v1/jobs` looks a service up by
database id and the customer app sends the pilot catalogue's id, so **no
job the customer app has ever tried to create could have succeeded**. The
wiring was there; the two halves spoke different languages.

**Resolved for the ACTIVE set, 2026-09-22.** The first framing of this
was wrong and worth correcting: it counted all 47 customer-facing services
against 25 database rows and called the gap 31. But the catalogue already
distinguishes the three cases, deliberately —

| `activationStatus` | Count | Meaning |
|---|---|---|
| `ACTIVE` | 17 | offered now |
| `PILOT` | 26 | modelled, switch off — correct to be absent |
| `INACTIVE` | 4 | gas, a doctor, a vet — a legal decision is pending |

— so the real defect was nine services that said ACTIVE while the server
had never heard of them. Those nine are in the seed now, carried from the
catalogue with their own price models and durations. Nothing was invented,
and `catalog-bridge.test.ts` now fails if any ACTIVE service is ever again
unorderable, or if a mapping is ever added for an INACTIVE one.

**Still open**, and still a business decision: whether the 26 `PILOT`
services should be opened, one at a time or as a set. Each needs a
professional supply before it is worth switching on, which is the sizing
argument `pilot-catalog.ts` makes for itself. Doctor and vet stay
INACTIVE until there is a legal answer, and the codebase should keep
refusing to guess one.

**Also still open, and larger:** `ServiceRequirement` is empty for every
service in the database. The catalogue states `requiredCredentials` per
service — a pest control licence, enhanced identity for a locksmith — and
nothing has ever carried them into the table that dispatch reads. The
credential-eligibility engine, twenty-seven tests of it, is checking every
candidate against an empty list. Which credentials are mandatory is named
in §4 as a decision this codebase must not invent; the catalogue has
already recorded an answer, so the work is to carry it, not to make it.

### TBD — the commission, which the ledger is now waiting on (2026-09-22)

Payments and the ledger are built (§21). Every job that completes writes a
CUSTOMER_CHARGE row, and **stops there**, because the platform fee and the
professional's payable cannot be computed without a commission
percentage — named in `/CLAUDE.md §4` as a decision this codebase must not
invent. `/v1/pro/earnings` therefore shows what was charged and nothing
payable, which is true rather than convenient.

Setting `app_config["payments.commission.percent"]` to `{"percent": N}`
completes the split from that moment on. Both states are walked by
`verify:journey` and both pass; the fee rounds down so rounding never
costs the professional, and fee plus payable equal the charge exactly.

### TBD — what counts as "the market" in the price comparison (2026-09-22)

Amit: *"אחרי שמקבלים הצעת מחיר, צריך שיהיה מחיר בהשוואה לשוק לראות אם יקר
או לא יקר. המטרה שלנו לתת מחיר נח לכל כיס עם מקצוענים מקסימום."*

Built: `apps/api/src/domain/pricing/price-context.ts` compares a quote
against the middle half of what was actually paid for the SAME service in
PRO NOW, and returns nothing at all below `MIN_SAMPLE` (8). The screen
shows a range, the band, and always the sample size.

Three choices in it are business decisions, not engineering ones, and
they are currently defensible defaults rather than answers:

- **The window** — `SAMPLE_WINDOW_DAYS = 90`. Trades freshness against
  sample size, and is the sort of thing a regulator asks about.
- **The minimum sample** — 8. Chosen so a "range" is not one or two
  people's opinions. The legal exposure of being wrong here is
  asymmetric: an under-confident silence costs nothing.
- **Geography** — currently none, because the pilot is one area. The
  moment there are two, "what people paid" has to mean "near you" or the
  comparison misleads in both directions.

Not open, and not up for discussion (/CLAUDE.md §3): the sample is PRO
NOW's own approved quotes and nothing else. No estimate, no seeded
"typical price per trade", no blend with an outside feed — /docs/10
forbids scraping and no price data has been licensed. Telling an Israeli
consumer a price is below market without a basis is a legal exposure as
well as a lie.

**Narrowed the same day, on Amit's second note:** *"אם זה עושה בעיות אז
אל. אני לא מחפש להיות הכי זול, מחפש להיות מהיר, הוגן, חדשני."*

The legal exposure was already handled by construction — no claim about
"the market", only what was paid here, silent below the minimum. What
was left was the FRAMING, and he is right about it: cheap-or-expensive
makes the product a price-comparison site.

So the engine still measures all three positions (ops will want them)
and the customer sees exactly one: a quote above what the work usually
costs, put as a question with the professional's own explanation one tap
away. Below and within show nothing at all — "מחיר טוב!" pushes
professionals downward, which is the opposite of wanting the best of
them, and it encourages choosing plumbing on price. `shouldPromptAboutPrice`
is where that line is kept, and tests assert each of the three silences.

Also worth recording, because it is the goal behind the original request
and no screen achieves it: *"מחיר נח לכל כיס עם מקצוענים מקסימום"* is a
supply-and-price-level strategy. Fairness is the part that can be built
without inventing a business rule.

### TBD — does an approved quote replace the visit fee or add to it?

`settlement.ts` reads it as REPLACING. `/docs/02-UX-FLOWS.md` C12 shows
the customer a quote with its own total and asks them to approve it, and
charging that total plus a fee agreed earlier would make the approval
screen a lie. `pro-jobs.ts` already tells the professional their earnings
the same way, so the two agree.

The other reading — a visit fee always payable, with approved work on top
— is a legitimate trade practice and a one-line change in each place. It
is a pricing decision rather than a bug, and it is worth being deliberate
about before anybody is charged under either.

### TBD — how long a customer waits before being told nobody is coming

`DISPATCH_SEARCH_DEADLINE_SECONDS`, added 2026-09-22 with the offer-expiry
fallback, currently defaults to **300 seconds**. Until then the server
keeps walking down the ranked list and re-checking the market; after it,
the job is cancelled by SYSTEM with `NO_PROFESSIONAL_AVAILABLE` and the
customer is told the truth.

Five minutes is a starting point, not an answer. It is the moment this
product either keeps a promise or breaks one, it interacts with the
support SLA (also TBD), and it is plainly a business call rather than an
engineering one — so it is a number in config, recorded here, and not a
decision the codebase claims to have made.

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

### And then it was built without the vendor (2026-09-21, same day)

Amit, an hour later: *"אני רוצה לחבר מפה אמיתית שונראה איך העולם שלנו
והקוד שלנו יושב עליה אולי יהיה יותר קל לשים את החנויות והדמויות על מפה
אמיתית"* — and *"ואני רוצה שאתה תעשה הכל!!!!"*

The answer above still stands for every word of it EXCEPT the assumption
in the first sentence, which was mine and not his: that a real map means a
tile vendor. Re-read his own earlier question and the specification is in
it — *"ורק הצורה של המפה תהיה אמיתית"*. The SHAPE. Not the pictures.

So what is real is the GEOMETRY, and geometry is a file:

- `packages/types/src/world-geo.ts` — an extract (real ways, areas and
  bounds) plus a Web-Mercator projection into the `{u,v}` every venue,
  route, walker and camera in this codebase already speaks. Swapping what
  `{u,v}` MEANS moves the entire city at once; that is what the last month
  of putting every position into one coordinate system bought.
- `packages/ui/.../GeoPlate.tsx` — the extract drawn in `livingPalette`.
  Our night, our asphalt, our lane markings, on real street centrelines.
- `tools/design-preview/fetch-geo.mjs` — Overpass → extract, run once,
  committed, dated, attributed. `npm run verify:geo <file>` is the gate.

Three things this buys that a tile layer does not:

1. **No vendor decision** (/CLAUDE.md §4). A tile URL in a config file is
   that decision taken quietly; an ODbL extract is not. The vendor table
   above stays open, and `MapsRoutingProvider` is still the seam for the
   thing a vendor is actually needed for — geocoding and route ETAs.
2. **The shops place themselves.** `plotSpotsFromGeo` finds real building
   plots that front a real street, stands each shopfront a pavement's
   width off the kerb and faces it at the road. `PLATE_SPOTS` took three
   rounds of bitmap erosion and two of those rounds answered the wrong
   question. This is exactly the *"יותר קל לשים את החנויות"* Amit guessed
   at, and he was right.
3. **Sizes become true.** A real extract has metres in it, so a shopfront
   is 16m and a person is 1.7m rather than fractions chosen by eye — and a
   camera shot is a number of METRES across the frame (`SHOT_METRES`)
   rather than a fraction of whatever the ground happens to be.

The §3 consequence in the paragraph above is not softened by any of this
and is the other half of the change: `packages/types/src/geo-truth.ts`
gives every plotted position a provenance, refuses `DECOR` on a real
surface, refuses a NAME on a real surface without a server behind it, and
rewrites the city's disclosure line — on real streets it says *"הרחובות
אמיתיים · העסקים בתצוגה הם המחשה ולא כתובות"* rather than promising a maps
provider that has become unnecessary. `WorldBackdrop` drops its ambient
traffic and its district signage the moment an extract is present. A real
map costs the world its invented crowd; that is the price and it is paid.

**What is still open**: the vendor question above, unchanged, for
geocoding and route ETAs. And the extract itself — every OSM host is
refused by this container's egress proxy (organization policy), so the
fetch runs on Amit's machine. A synthetic fixture (`real: false`,
watermarked, refused by `plotViolations` as a place) proves everything
downstream of it offline.

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
