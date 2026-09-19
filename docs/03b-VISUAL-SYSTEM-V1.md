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

**Customer is LIGHT by default, with dark live moments. Professional is DARK
by default.**

The customer opens the app occasionally, in a moment of need, and a
wall-to-wall dark interface reads as a trading app. The professional lives in
theirs through a shift, often in a van at night, and dark is the working
surface. Dark on the customer side is reserved for moments that are genuinely
live — searching, the match, the door — which is what makes those moments
feel different rather than merely styled.

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
*Checkable: computed font sizes outside the scale; count of display/hero.*

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

### 12. Customer light, professional dark

A dark surface on the customer side requires a live state to justify it.

---

## The screen map

| # | Screen | Tone | Background | Dominant type | Max elevated |
|---|--------|------|-----------|---------------|--------------|
| 1 | Welcome / sign-in | light | — | display | 0 |
| 2 | Home / intent capture | light | LiveField IDLE, faint | hero | 1 |
| 3 | Service / intake | light | — | title | 1 |
| 4 | Searching | dark | LiveField SEARCHING | hero | 0 |
| 5 | Match | dark → light | LiveField MATCHED in hero | hero | 1 |
| 6 | Trust profile | light | — | title | 1 |
| 7 | Full trust sheet | light | — | title | 1 |
| 8 | Tracking (after assignment) | dark | **Real map** | ETA / hero | 2 |
| 9 | Door verification | dark | LiveField ROUTE → ARRIVED | display (the code) | 1 |
| 10 | Quote — customer | **light** | — | total / hero | 1 |
| 11 | Active job — customer | light | — | status / title | 1 |
| 12 | Completion / receipt | light | — | total / title | 1 |
| 13 | Calls / history | light | — | title | 1 |
| 14 | Pro offline / shift | dark | LiveField IDLE | earnings / hero | 1 |
| 15 | Pro online / waiting | dark | LiveField ONLINE | online time / hero | 1 |
| 16 | Pro offer / active job | dark | LiveField OFFER; real map only en route | payout / hero | 1 |

**Row 10 is a deliberate exception.** The quote is money and consent, and it
has to read like a clear document rather than another live event. It stays
light even though it sits between two dark screens.

---

## How this gets built

Primitives first, screens second. The order is not a preference: migrating
thirteen screens by hand produces thirteen interpretations of the system and,
a month later, three languages again.

    ScreenShell      tone, background component, safe areas, the capsule slot
    LiveField        the six states
    RealMapSurface   only with an assignment
    HeroMetric       the one big number, with its provenance
    Surface          the only elevated container
    PrimaryAction    the single coral action
    PersonIdentity   photo → portfolio → placeholder, in that order
    TrustRail        the vertical verification timeline
    ActiveJobCapsule live job, never navigation
