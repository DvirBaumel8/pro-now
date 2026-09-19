# 03 — Design System

## Personality
Premium, immediate, safe, human, energetic — a modern mobility/marketplace
product, not a contractor directory. Customer surfaces: warm off-white,
selective photography, clean cards. Professional operational surfaces: dark
charcoal, vivid live-green, large numbers, strong map presence. Avoid
generic blue SaaS, heavy gradients, clutter, skeuomorphism, cartoon trade
icons.

## Tokens (semantic — never raw colors in feature code)
`color.bg.customer` · `color.bg.pro` · `color.surface.primary` ·
`color.surface.elevated` · `color.text.primary` · `color.text.secondary` ·
`color.action.primary` · `color.status.live` · `color.status.warning` ·
`color.status.danger` · `color.border`.

Implementation defaults (see `packages/ui/src/theme.ts`) — accessibility
contrast-tested, replaceable centrally without touching feature code:

```
customer.bg        #FAF9F6   (warm off-white)
customer.surface    #FFFFFF
pro.bg              #0B0F0E   (near-black charcoal)
pro.surface         #151A18
text.primary(light) #14151A
text.primary(dark)  #F3F5F3
action.primary      #17C964   (vivid live-green)
status.warning      #F5A524
status.danger       #F31260
border(light)       #E7E5E1
border(dark)        #262B28
```

Spacing: 4px base unit; rhythm 8/12/16/24/32. Radius: 12 small, 16 default
cards, 24 hero/bottom-sheets, full-pill for live chips. Touch target
minimum 44×44pt. Motion 150–250ms; offer/live pulses may loop subtly;
reduced-motion respected. Haptics on offer-received/accept-success/
arrival/critical-error where the platform supports it.

## Typography
Hebrew-first, RTL, production-licensed/system-compatible family. Roles:
Display (hero/earnings/ETA), H1, H2, Body, Body Strong, Caption, Button,
Numeric Metric (tabular numerals for timers/money). No tiny gray legal copy
for critical price/cancellation info; no text baked into images.

## RTL rules
All screens authored RTL first. Navigation direction mirrors correctly.
Maps stay geographically correct (never mirrored). Directional
transport/navigation icons keep real-world meaning. ₪ formatting via locale
utilities. Phone/email/URL fields use correct bidi handling. Test mixed
Hebrew + numbers + English names.

## Component inventory
`Button · IconButton · Card · ServiceTile · ProfessionalCard ·
VerificationBadge · RatingSource · PriceCard · OfferCard · JobStatus ·
MapSheet · BottomSheet · OTPInput · UploadCard · CredentialCard ·
EarningsMetric · EmptyState · ErrorState · Skeleton · Toast · Modal ·
SafetyAction`.

Every async component implements: default / pressed / disabled / loading /
success / error / offline. Every list: skeleton, empty, error, populated.
Every form: inline validation + summary where needed. Every destructive
action: confirmation when impact is meaningful.

## Signature screen — "the Wolt moment"
After "מצא לי מקצוען עכשיו": full-screen map, pulse from customer location,
"מחפשים מקצוען לידך" → "מצאנו!" → professional marker appears → bottom card
rises with name, rating, ETA. No fake avatars scattered on the map.

## Accessibility
WCAG-minded contrast, dynamic type/font scaling, screen-reader labels, never
color-alone status, large hit targets, reduced motion, accessible map
alternative/status text, offer timer announced without spamming the screen
reader.

## Content rules
Real, diverse, consented/licensed professional photography. No generated
fake review avatars in production. Portfolio images belong to providers and
carry moderation/reporting. One consistent icon library. Never embed text
in marketing-style images inside functional UI.

---

## Implemented components (`packages/ui`)

| Component | Side | Purpose |
|---|---|---|
| `MatchCard` / `MatchCardSkeleton` | Customer | C09 match found — professional, factual badges, dominant ETA, price by archetype |
| `OfferCard` / `OfferCardSkeleton` | Professional | P16 incoming offer — server-deadline countdown, payout before acceptance, coarse area |
| `VerificationBadge` | Both | One enumerated, factual trust fact |
| `Avatar`, `StatusPill`, `MetaChip`, `LiveDot`, `Skeleton`, `Divider`, `SectionLabel` | Both | Shared primitives |
| `Mark` (+ `ClockMark`, `PinMark`, `ShieldCheckMark`, `StarMark`, `ArrowMark`) | Both | The single icon system: 24×24, 1.8 stroke, no fills, inherits `color`. Replaces the "cartoon trade icons" this document rules out. |
| `Surface`, `BottomSheet`, `SectionHeader`, `Chip`, `RingedAvatar`, `HeroFlourish` | Both | Depth and shape: radius + soft wide shadow only, never a gradient or a competing border |
| `ImageSlot` | Both | Where licensed photography goes. With no real `uri` it renders a labelled placeholder naming the intended subject — never a stock photo (see §Content rules) |
| `MapSurface` | Both | Stylised abstract grid + pulse for the signature screen. **Not a map** and never shippable as one; the production surface belongs to the `MapsRoutingProvider` |
| `ServiceTile` / `ServiceRow` | Customer | Catalogue entry: photo, mark, real `availableNowCount` or nothing at all |
| `JobProgress` | Customer | Maps authoritative `JobState` to four presentation steps; CANCELLED/DISPUTED render no progress |

### Screen bodies (`packages/ui/src/screens`)

Full-screen compositions, presentational only — no fetching, no navigation —
so the apps and the gallery render the *same* code and a design review is a
review of what ships.

| Body | Screen | The decision it protects |
|---|---|---|
| `CustomerHomeBody` | C01 | Supply is shown per service or not at all |
| `ServiceDetailBody` | C04 | What is included, what it costs, what happens on press — before anyone is dispatched. CTA disables at zero supply instead of promising |
| `SearchingBody` | C08 | The signature screen. Failure to match is designed as carefully as success |
| `TrackingBody` | C10 | Progress and ETA, contact masked until assignment |
| `ProProfileBody` | C12 | PRO NOW rating, completed jobs and external reputation as three separate facts — never merged into one score |
| `QuoteApprovalBody` | C11 | Every line from the server; approval pinned to `versionHash`; a superseded quote cannot be approved |
| `JobCompleteBody` | C13 | Receipt is a ledger record, not a summary. The review is earned, optional, and has no pre-selected star |
| `ProOnlineBody` | P02 | Presence belongs to the server; transitional states render as themselves |

Presentation logic that could otherwise fabricate something — ETA rounding,
rating display, countdown, payout disclosure, the hourly minimum — lives in
`packages/ui/src/format.ts` as pure functions, and is unit-tested. A card
must not compute those inline. The same rule put the pricing-model copy in
`packages/ui/src/pricing-copy.ts` (`priceExplainer`): a VISIT_QUOTE fee must
never be worded like a FIXED price, so that wording is an assertion in
`test/price-explainer.test.ts` rather than a code-review opinion.

**Reviewing the components:** `npm run preview:design` starts a browser
gallery (`tools/design-preview`) that renders the real components, including
their loading and honest-absence states. Note its `index.html` is
deliberately `dir="ltr"` — see /docs/EPIC-0-REPORT.md §10.7 for why, and for
the outstanding RTL decision.

---

## The palette (revised)

The original palette was a green-and-charcoal system that could have belonged
to any marketplace. It was replaced because "looks like every other app in
the category" is a product problem, not a taste one: Wolt owns cyan-blue,
Gett owns black-and-yellow, Uber owns black, and landing near any of them
makes a new product read as a copy before a word is read.

The system now rests on **two colours doing two different jobs**, and the
split is the whole idea:

| Role | Colour | Used for |
|---|---|---|
| **Signal** | coral `#FF5C38` | "now" — every act of summoning someone: the primary button, the live search pulse, the countdown, the payout |
| **Trust** | teal `#0FA47F` | "verified" — every fact that has been checked: badges, licences, the professional's ONLINE state, confirmations |

Keeping them apart is a **product rule, not a preference**. If urgency and
verification share a colour, "hurry" and "safe" become the same visual word —
and this product's entire claim is that speed did not cost safety. On the
professional's screen the rule is at its sharpest: "אתה ONLINE" is a state
the *server* is asserting, so it is teal; the button that starts a shift is
an action, so it is coral. A professional glancing at the phone can tell
intent from fact without reading.

Supporting: sun `#FFB020` (thin supply, caution), berry `#E01E5A` (danger).
Backgrounds are warm ivory `#FBF6EE`, and the darkest ink is a warm plum
`#17121F` rather than `#000`. Pure neutrals are what make an interface feel
clinical; the warmth is where "inviting" actually comes from.

`ThemeColors` now carries `trust` alongside `action`, so the distinction is
enforced by the type system rather than by memory.

## Illustrated people (`Persona`)

The screens were grey wherever a person belonged, and a marketplace that
looks unpopulated is one nobody joins. The fix is narrow and rests on the
difference between a **portrait** and a **character**.

A photorealistic face invites the viewer to believe a specific person exists
and is available — that is fabricated supply wearing a friendly expression,
and §Content rules forbids it. A flat vector character invites nobody to
believe anything: it is visibly a drawing. It warms the layout without
making a claim.

So `Persona` draws deliberately illustrative figures — no rendering, no
texture, no attempt at likeness — from a stable seed, so the same person is
drawn the same way on every screen. The feature set is broad on purpose
(six skin tones, five hair styles including a head covering): this product
serves a city, and a wall of identical avatars quietly says otherwise.

**A real professional's own photograph always wins.** `Persona` is what
stands in when there is none, and it never appears beside a claim that it
is a photograph.

## The lexicon (`packages/ui/src/lexicon.ts`)

Products that feel like one thing use the same word for the same idea
everywhere. Products that feel assembled say "בקשה" on one screen, "הזמנה"
on the next and "קריאה" in the push notification, and the user stops
believing there is one system behind it.

The words now live in one file. Three rules chose them:

1. **Say what is true.** A professional is "פנוי" only when the server says
   they are dispatchable. "זמין" was rejected as a synonym precisely because
   it is vaguer and therefore easier to over-claim.
2. **Ours, not the category's.** "הזמנה" belongs to food delivery and implies
   a basket and a checkout. What happens here is a **קריאה** — you call, a
   person comes. That is the product in one word, and it is the word people
   already use when a pipe bursts.
3. **Warm, not corporate.** Second person, present tense, no "לקוח יקר".

`prosFree()`, `prosFreeNearYou()` and `nearestLine()` are unit-tested,
because Hebrew has a distinct singular and "1 מקצוענים" is the kind of error
that ships, survives, and tells every reader the product was not written by
anyone who speaks the language.
