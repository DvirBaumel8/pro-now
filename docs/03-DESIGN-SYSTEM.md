# 03 — Design system and visual rules

Status: **binding**. Tokens live in `packages/ui/src/theme.ts` (the demo has
its own copy in `tools/design-preview/lib/ui`). Where a rule is checked by a
machine, the check is named. The Living Map world layer has its own art
direction, `03c-LIVING-MAP-ART-DIRECTION.md`, which wins on composition
questions only.

## Personality
Premium, immediate, safe, human, energetic — a modern mobility product, not
a contractor directory. Avoid generic blue SaaS, heavy gradients, clutter,
skeuomorphism and cartoon trade icons.

## Two decisions everything follows from

**1. Both sides are dark; light is the accent, and it is reserved.** The
customer app is `customerDarkTheme`, the professional's is `proTheme`.
(An earlier rule made the customer side light; Amit rejected the result,
2026-09.) A light surface is spent only on what the customer must
**touch** (the capture card, the "now" group in a category) or **read
closely** (the quote, the receipt).

**2. Two colours, two jobs.**

| Role | Colour | Used for |
|---|---|---|
| **Signal** | coral `#FF5C38` (`signal*`) | "now" — summoning someone: the primary action, the search pulse, the countdown, the payout |
| **Trust** | teal `#0FA47F` (`trust*`) | "verified" — checked facts: badges, licences, the ONLINE state, confirmations |

If urgency and verification shared a colour, "hurry" and "safe" would read
as the same word. Supporting: sun `#FFB020` (thin supply, caution), berry
`#E01E5A` (danger). Ink is a warm plum, never `#000`. Feature code uses
semantic tokens only, never raw colours.

## The twelve rules
1. **Typography owns hierarchy.** Only the scale: display 56 · hero 44 ·
   title 32 · section 24 · body 17 · meta 14 · micro 12. At most one
   display/hero per viewport, three weights per screen. *Enforced:
   `npm run verify:type-scale` (inside `npm run lint`).*
2. **Coral means consequence.** Primary/live action, critical attention,
   the brand mark. At most one coral-filled action per viewport.
3. **At most three elevated surfaces per viewport** (modals, sheets and the
   active-job capsule excluded).
4. **Cards require semantics** — something selectable, movable, openable
   or with its own state. Never to group a name and subtitle or a metric
   and its label.
5. **Borders never create hierarchy.** A surface is raised or outlined,
   never both.
6. **The Live Field appears only with a live state** (IDLE, SEARCHING,
   MATCHED, ROUTE, ONLINE, OFFER). IDLE must never look like matching.
7. **Motion explains a state transition.** No looping glow, bouncing CTA
   or decorative float. Reduced motion gets an equivalent without motion.
8. **Reality has visual priority:** real approved photo → approved
   portfolio → neutral placeholder. Never an invented face in place of a
   provider. Before MATCH there are no faces.
9. **One screen, one question**, and at most one primary action.
10. **Live data must have provenance.** Availability, ETA, earnings,
    distance, demand and countdowns come from typed view-model values,
    never string literals. UNKNOWN never becomes 0.
11. **Maps are never decorative.** A real map only after assignment, for
    tracking or navigation; everywhere else the Live Field.
12. **Light is earned** (decision 1).

## Screen map
| Screen | Tone | Background |
|---|---|---|
| Welcome, home, service/intake, history | dark | — (home: one lit capture card) |
| Searching, match, door verification | dark | Living Map / Live Field — no real positions before assignment |
| Tracking after assignment, pro navigation | dark | real map |
| **Quote, receipt** | **light** | a document, not a live event |
| Pro offline / online / offer | dark | Live Field IDLE / ONLINE / OFFER |

## Spacing, shape, motion
4 px base unit (8/12/16/24/32). Radius 12 small, 16 cards, 24 sheets, pill
for live chips. Touch targets ≥ 44 pt. Motion 150–250 ms. Haptics on offer
received, accept, arrival and critical errors where supported.

## RTL and Hebrew
Authored RTL first; navigation mirrors, maps never do. ₪ through locale
utilities; correct bidi for phone, email and URL fields; test mixed
Hebrew, numbers and English names. **The lexicon** (`packages/ui/src/lexicon.ts`)
holds the product's words: a professional is "פנוי" only when the server
says so; a request is a **קריאה**, not a "הזמנה"; second person, warm, no
"לקוח יקר". Plurals are unit-tested ("1 מקצוענים" must never ship).

## Accessibility
WCAG contrast, font scaling, screen-reader labels, never colour-only
status, reduced motion, text alternatives for maps, an offer timer that is
announced without spamming. *Checked: `npm run verify:a11y` (the demo).*

## People and photography
Real, consented photography of real professionals. Where there is none,
`Persona` draws a visibly illustrated figure from a stable seed (six skin
tones, five hair styles including a head covering), never beside a claim
that it is a photo. Since D1 (2026-09-30) a professional may choose their
trade's drawn character as their public face. No generated review avatars,
no text baked into images, one icon system (`Mark`: 24×24, 1.8 stroke).

## Components
Every async component has default, pressed, disabled, loading, success,
error and offline states; every list has skeleton, empty, error and
populated. Screen bodies in `packages/ui/src/screens` are presentational
(no fetching, no navigation), so the app renders the same code a design
review sees. Logic that could fabricate something — ETA rounding, rating
display, countdowns, payout disclosure, the hourly minimum — lives in
`packages/ui/src/format.ts` as tested pure functions; pricing copy per
pricing kind lives in `pricing-copy.ts` and is asserted by
`test/price-explainer.test.ts`.
