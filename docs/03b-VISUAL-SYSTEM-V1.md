# PRO NOW — Visual System v1

Status: **binding**. This file is the contract the screens are checked
against, not a mood board. Where a rule can be checked by a machine, the
check is named beside it and lives in `tools/design-preview/audit.mjs` or in
lint.

The system exists because of a specific failure: the new language was applied
to three screens and thirteen were left in the old one, and the app started
reading as two apps. A language that lives only inside screens gets lost the
moment someone builds the seventeenth.

---

## 0. The two decisions everything else follows from

**Both sides are DARK. Light is the accent, and it is reserved.**

> **This reverses the first version of this rule, which said the opposite.**
> The original §0/§12 made the customer light with dark live moments, and it
> was implemented: home, capture and categories were rebuilt on warm ivory.
> Amit rejected the result — "זה ממש לא הכיוון" — and pointed at the visual
> board, which renders the customer's home screen dark and uses white only
> for the capture card and the category cards. ChatGPT had left its own
> written rule behind the moment it drew the thing.
>
> When the person who owns the product and the person who wrote the rule
> both pick the same picture, the rule is what is wrong. The argument
> behind the old §12 was that wall-to-wall dark "reads as a trading app" —
> which is an argument about FLAT dark, not about dark. Dark with depth,
> one lit panel, real photography and a single live colour does not read as
> a terminal. It reads as evening, which is when boilers actually break.

So the customer's app is `customerDarkTheme` and the professional's is
`proTheme`. A LIGHT surface is now the strongest signal available in the
product, and it is spent on exactly two things:

    a surface the customer must TOUCH   →  the capture card
    a surface the customer must READ    →  the quote, the receipt

Everything else is dark. The category drill-down is the clearest case: the
services that can actually happen now sit on a raised white card and
everything that cannot sits in quiet dark rows underneath — the difference
between "now" and "not now" is visible from across the room rather than
read.

**The Live Field replaces the map everywhere the map would be a lie.**

    no assignment yet, or the exact location must not be exposed  →  LiveField
    assignment exists AND both sides need the location to execute →  RealMap

Searching, Match and Door Verification use the Live Field. Tracking after
assignment, and the professional's navigation, use a real map. There is no
third option: a drawing of streets that is not a map is the worst of both —
it promises geography it does not have, and it invites the customer to read a
position we have not earned the right to show them.

---

## The twelve rules

### 1. Typography owns hierarchy

Only semantic tokens. A local `fontSize:` is a bug.

    display  56   hero  44   title  32   section  24
    body     17   meta  14   micro  12

At most ONE display-or-hero per viewport. At most three weights per screen.

**Enforced: `npm run verify:type-scale`, which `npm run lint` runs first.**
When the rule was written the UI package held 128 literal `fontSize:` values
across 27 distinct sizes, and every one of them had been written by someone
making a single screen look right. None was wrong on its own screen;
together they meant the ETA rendered at 44 on the match screen and 30 on the
tracking screen, so its size told the reader nothing. The check now fails
the build on any `fontSize` that does not reference `scale`, and names the
nearest step in the error.

### 2. Coral means consequence

Coral is allowed for `PRIMARY_ACTION`, `LIVE_ACTION`, `CRITICAL_ATTENTION`
and the brand mark. Never for decorative backgrounds, chips, ordinary icons,
secondary buttons or section titles.

**At most one coral-filled action per viewport.** When coral appears, it has
to mean something is happening here.
*Checkable: count of filled-coral interactive elements.*

### 3. At most three elevated surfaces per viewport

Excluding modals, sheets and the Active Job Capsule. If a screen needs four
cards to be legible, remove containers before adding a fourth.
*Checkable: count of elements with a shadow.*

### 4. Cards require semantics

A card is allowed when its content is a unit that can be selected, moved,
opened, or has independent state. Never to group: name + subtitle, a metric +
its label, section copy, trust facts. Those sit directly on the surface,
separated by spacing and type.

### 5. Borders never create hierarchy

A border is allowed for an input, a selected/focus state, a functional
divider, or an accessibility requirement. **Card + shadow + border is
forbidden** — a surface is raised or outlined, never both.
*Checkable: elements with both a shadow and a visible border.*

### 6. The Live Field appears only with a live state

Allowed: `IDLE`, `SEARCHING`, `MATCHED`, `ROUTE`, `ONLINE`, `OFFER`. `IDLE`
must be almost entirely static — it must never look like matching is
happening. Forbidden on receipts, settings, history, verification and static
service information.

### 7. Motion explains a state transition

Every animation maps `previousState → nextState`. Allowed: search expansion,
match convergence, route formation, offer arrival, completion → available.
Forbidden: looping glow, bouncing CTA, decorative float, and any pulse that
outlives the action it described. Reduced-motion gets an equivalent with no
motion.

### 8. Reality has visual priority

    real approved provider photo → approved portfolio media → neutral placeholder

Never an invented face in place of a provider, drawn or photographic. Before
MATCH there are no faces; after MATCH the person enters the interface.

### 9. One screen, one question

Each screen state has a single `primaryIntent`, and at most one primary
action. Match: is this person right for me. Offer: is this job worth it.
Tracking: when does he arrive. Completion: what happened and what did it cost.
*Checkable: count of primary actions per screen state.*

### 10. Live data must have provenance

Any component showing availability, ETA, earnings, distance, demand, a
countdown or a match reason takes a typed view-model value. String literals
like `"14 דקות"`, `"12 זמינים"`, `"₪240"` are forbidden in production
screens. `UNKNOWN` has its own state and never becomes `0`. Stale data has a
fallback. Fixtures are for the preview only.

### 11. Maps are never decorative

`RealMapSurface` is allowed only when an assignment exists and there is a
genuine location purpose — tracking or navigation. Everywhere else,
`LiveField`. A stylised street drawing standing in for a map is not a third
option.

### 12. Both sides dark; light is earned

A LIGHT surface on the customer side must be a thing the customer touches or
reads closely — the capture card, the quote, the receipt, the live group in
a category. Light applied for variety is the violation now, which is the
mirror image of what this rule used to say. See §0 for why it turned over.

The money screens are the one place the old reasoning survives intact: a
quote is a document and a document is not a live event, so rows 10 and 12
stay light on their own merits rather than by inheritance.

---

## The screen map

| # | Screen | Tone | Background | Dominant type | Max elevated |
|---|--------|------|-----------|---------------|--------------|
| 1 | Welcome / sign-in | dark | — | display | 0 |
| 2 | Home / intent capture | **dark** | — | title | 1 (the capture card) |
| 3 | Service / intake | dark | — | title | 1 |
| 4 | Searching | dark | Living Map — see `03c-LIVING-MAP-ART-DIRECTION.md` | hero | 0 |
| 5 | Match | **dark throughout** | LiveField MATCHED behind the portrait | title (the person) | 1 |
| 6 | Trust profile | dark | — | title | 1 |
| 7 | Full trust sheet | dark | — | title | 1 |
| 8 | Tracking (after assignment) | dark | **Real map** | ETA / hero | 2 |
| 9 | Door verification | dark | LiveField ROUTE → ARRIVED | display (the code) | 1 |
| 10 | Quote — customer | **light** | — | total / hero | 1 |
| 11 | Active job — customer | dark | — | status / title | 1 |
| 12 | Completion / receipt | light | — | total / title | 1 |
| 13 | Calls / history | dark | — | title | 1 |
| 14 | Pro offline / shift | dark | LiveField IDLE | earnings / hero | 1 |
| 15 | Pro online / waiting | dark | LiveField ONLINE | online time / hero | 1 |
| 16 | Pro offer / active job | dark | LiveField OFFER; real map only en route | payout / hero | 1 |

**Rows 10 and 12 are the deliberate exceptions**, and they are the only two
left. The quote is money and consent and the receipt is the record of it;
both have to read like a clear document rather than another live event. They
stay light between dark screens, which — now that light is rare — makes them
land harder than they did when everything around them was ivory too.

---

## How this gets built

Primitives first, screens second. The order is not a preference: migrating
thirteen screens by hand produces thirteen interpretations of the system and,
a month later, three languages again.

    ScreenShell      tone, background component, safe areas, the capsule slot
    LiveField        the six states
    RealMapSurface   only with an assignment
    HeroMetric       the one big number, with its provenance
    Surface          raised | outlined | quiet — never two of them at once
    PrimaryAction    the single coral action
    ProviderPortrait photo → monogram. Never an invented face.
    PresenceRing     the person's live state, drawn on the person
    ActiveJobCapsule live job, never navigation
    AppHeader        the wordmark, at a size that holds the screen
    BrandMark        PRO (signal) + NOW (ink/white), set in type, not an image
    CaptureCard      the lit panel — the one bright thing on the home screen
    CategoryGrid     six departments as a shape, not a list
    IntentSuggestions one coral action, alternatives as quiet rows
    VoiceNote        a real message for a real request. No stock intro.
    TrustRail        the vertical verification timeline — NOT BUILT YET

---

## 13. The Living Map world is art, not primitives

Rules 1–12 govern the interface. The Living Map world layer is a raster
asset pack authored outside the codebase, in 3/4 miniature perspective,
placed by normalized anchor rather than by any grid this system defines, so
the rules written for UI composition do not fit it.

**The exemption is narrow, and it is only from UI composition.** The world
layer is exempt from the container, elevation, border and card rules, which
describe surfaces it does not have. It is NOT exempt from accessibility,
truthfulness, reduced-motion, performance or data integrity. Rule 8 in
particular — never an invented face — binds the world layer exactly as it
binds a screen, and rule 10's ban on presenting a fixture as live data binds
it too. An exemption written too widely is how a decorative layer starts
claiming things.

`docs/03c-LIVING-MAP-ART-DIRECTION.md` is binding for that layer and takes
precedence over this file on composition questions only. The HUD, type,
colour, coral, safe zones, one question per screen and provenance are still
governed here.

The reason this rule exists is that the first Living Map was drawn with the
primitives above and passed every check in this file while missing the
intent completely. A system that can approve the wrong picture needs a
boundary drawn around what it is competent to approve.
