# Living Map — Art Direction v1

Status: **binding**. Settled 20 Sep 2026 after the first Living Map build was
shown and rejected. This file exists because the same instruction —
"עיר ישראלית" — was given twice and implemented twice as flat SVG rectangles.
Words did not carry the art direction. A reference image and a fixed asset
contract do.

## 0. What went wrong, stated plainly

The build drew the world in code: `DemoCity.tsx`, one static SVG, flat boxes
with window rectangles. Against the written spec it passed. Against the
intent it failed on six counts, all of them named by ChatGPT and all of them
visible in the captures under `docs/_review/living-map-v1/`:

1. Buildings are flat repeated cubes — no perspective, volume, roofs,
   balconies, AC units, shopfronts.
2. The street is a vertical stripe. It reads as a fake map, only darker.
3. Everything is blue-black. None of the colour and cheer that was asked for.
4. The provider is a giant grey monogram circle — the strongest element on
   the screen is the placeholder.
5. No separation between world, profession and UI.
6. No depth. No foreground / midground / background.

And the one that matters most: **remove the text and nothing says "barber".**

The root cause was architectural, not aesthetic. Primitives were built before
the art direction was fixed. Drawing a premium miniature world with
hand-written SVG primitives cannot reach the target, and more primitives will
not close the gap.

## 1. The world is an asset system, not code

    HUD, text, glow, rings, paths, candidate presence, states, interaction
        → code / SVG, as now

    buildings, vehicles, trees, props — the world itself
        → raster assets, authored outside the codebase

**Format: transparent WebP. Not hand-written SVG.** Each asset ships at
1x / 2x / 3x from a master large enough for 3x. Do not regenerate the
barbershop, the buildings or the trees as SVG.

## 2. Projection: 3/4 miniature perspective, fixed

**Not 2:1 mathematical isometric.** The camera sits roughly 45–55° above,
façades and roofs both visible. A true isometric grid makes it read as
SimCity, which is the opposite of the target.

Consequence for the code: **no diamond grid, no tile map.** Placement is

    normalized anchors  x: 0..1, y: 0..1   +   zIndex   +   scale

so the engine survives an asset swap. This is scene composition, not a tile
engine.

## 3. Scale and safe zones

At a 430pt viewport:

    blocks across the world      2–3        (not 8–10 cells)
    ordinary building width      22–32%     of world width
    hero business width          32–40%     of world width
    tallest central asset        ~30%       of world height

The top HUD and the bottom sheet are **safe zones**. No critical asset may
enter them. Background may be cropped behind them.

## 4. Composition: the centre stays empty

    top     short HUD only — "מצאנו לך התאמה" + the service
    middle  65–70% of the visual experience is the WORLD
    bottom  glass sheet — name · profession · ★ rating · jobs · ETA · CTA

Name, ETA and details never sit in the middle of the city. The previous build
centred the HUD vertically, which is precisely why "14 דק׳", the name and the
portrait all landed on top of the buildings.

On confirm the sheet folds away and the world takes the stage.

## 5. Hair v1 — the closed asset list

One hero barbershop · 3 Israeli residential buildings · 1 mixed-use building ·
1 kiosk · 1 bus shelter · 2 ficus/street-tree variants + 1 jacaranda ·
1 private car · 1 scooter · 1 bus · bench · lamp post · solar water heater as
a roof prop · external AC unit as a wall prop · planter/greenery ·
destination-building variant · 1 provider journey character/vehicle.

**No further props until the vertical slice works.**

## 6. Two rules the reference image does NOT override

The reference is a visual North Star. It is not a source of truth for data,
and two things in it are artifacts of image generation rather than spec:

**No business names on buildings.** Symbolic signage only — barber pole,
scissors, awning. No "מספרת דניאל", no address, no POI. Real Hebrew lives in
the HUD. The lettering visible on a wall in the reference is not a
specification.

**No invented faces.** `ProviderPortraitSlot` keeps its dimensions and its
`PresenceRing`, but a fixture with no real provider gets a neutral monogram or
silhouette. The reference shows the target state *after real supply exists*;
it is not permission to invent supply. This means the screen will not look
like the reference until approved provider photos exist, and that is correct.

## 7. What is blocked, and on whom

Claude owns: scene composition, responsive placement, animation, the four
phases and their transitions, states, and the data contract. All of that is
already built and stays.

Claude does **not** own and cannot produce the art. **Hair Asset Pack v0.1**
has to arrive before the world can be rebuilt — consistent camera, lighting
and material language, transparent background. Until it does, the Living Map
world layer stays exactly as it is and is not polished further.

Before production: asset consistency, usage rights, and a generation/approval
process. The v0.1 pack is a prototype pack.

## 8. Open bugs found while capturing the review shots

Neither is a design problem; both are real and both are unfixed, because the
instruction was to stop.

- **ASSIGNED_ROUTE renders blank** in the published build. The phase renders
  correctly when loaded into directly, so the failure is in the
  `MATCH_REVEAL → ASSIGNED_ROUTE` transition, not in the layer.
- **The candidate is not derived from the service.** Requesting
  "נזילה או דליפת מים" surfaces a candidate whose profession renders as
  "ספרית עד הבית · תספורות ועיצוב". A data-layer bug.

## 9. Capturing these screens again

`tools/design-preview` accepts `?phase=SEARCHING|CANDIDATES_FOUND|
MATCH_REVEAL|ASSIGNED_ROUTE` (optionally `&service=svc-leak`), which pins one
phase and stops the timer. The four phases advance themselves in 5s and 2s,
which is right for a person and useless for a reviewer racing a clock.

The artifact host does not forward a query string into the preview frame, so
this works locally and not there. `scripts/` has no capture helper; the review
shots were taken headlessly against the local `dist` build.

---

## 10. It is not a map with assets on it. It is PRO NOW World.

Amit, looking at the first screen with one real building on it:

> "חייב גם שכל הרקע מסביב יהיה של העולם שלנו ולא כחול כהה סתם, ממש חווית
> טיול בין השבילים של בעלי המקצוע, כמו רולר קוסטר טייקון או סימס."

He named the actual defect. A few objects arranged on empty navy is not a
world; it is a collage. The barbershop arrived beautiful and still read as a
sticker floating in space, because nothing was underneath it.

So the framing changes, and the change is architectural rather than
decorative. The map is not the base with art placed over it — **the map is a
truth layer underneath a world**, and the world is what the customer sees.
When a maps vendor is chosen it slides in below `GROUND_LAYER` and the
person's experience does not change.

**The ground therefore outranks everything except the characters.** Not one
road: a neighbourhood surface — roads, pavements, paths, a small square,
grass, marked parking, a crossing — that fills the viewport and whose edges
run past it, so the world does not end in a straight line. Tileable if
possible, because a tileable ground is what lets the scene pan slowly while
someone waits, which is the whole "travel" feeling.

Until that exists, every further asset is a better sticker on the same empty
background. Ground before the remaining nineteen characters.

## 11. Two permanent production rules

These were agreed after the first delivery and they do not expire.

**A contact sheet approves art direction. It is never production material.**
Once a sheet is approved, every asset on it is re-generated on its own:
transparent, unlabelled, no baked sidewalk, nothing else in the frame.
Nothing is ever cut out of a sheet — cutting destroys the edges and the
alpha exactly where the art meets the ground, which is the one place a
cheap edge is visible.

**Gender is never tied to trade.** The roster is mixed from the start —
electricians, plumbers, AC technicians, tow and moving drivers who are women
alongside men across every field — rather than a male default with a token
female variant. A trade is read from equipment, clothing and silhouette, not
from exaggerated stereotype. The v1 distribution is a choice about
illustration only, and says nothing about who is available or who performs
the work.

## 12. One character, two assets

A figure in the world and an icon in a category grid pull in opposite
directions, so they are not the same file:

    *_world_v01.webp      full body, 3/4 perspective, lives in the scene
    *_portrait_v01.webp   waist-up, near-frontal, legible at 56–80px

Same character design in both — same clothing, same hair, same equipment —
so the person who appears beside "חשמל" on the home screen is recognisably
the one walking through the world later. One canonical character per
department for v1; a wider roster per trade can come later without changing
anything here.

This is what ties the home screen, the search and the Living Map into one
language. Today the lit world lives on one screen and everything else looks
like a different app.

---

## 13. The ground's own contract

Three rules, agreed with the direction and enforced by
`scenePlacementViolations`, because each looks fine in a still frame and
breaks the moment the world moves.

**No building shadows painted onto the ground.** The buildings are placed
independently and can be moved; a shadow baked into the road stays where it
was drawn and the street silently comes apart.

**The ground runs at least 25% past the viewport on every side.** Without
the overhang there is nowhere to pan to — the first finger-drag would show
the edge of the world.

**A lane stays clear through the scene.** It is defined as a band of
GROUND LINES (`y` 0.80–0.94), not a column of pixels: a street in 3/4
perspective runs across the screen, not up it. Buildings stand behind the
lane, the near kerb is in front of it, and a roof may hang over it — that is
what a street looks like. What may not happen is something standing in it.

The first version of this rule reserved a vertical strip down the middle and
failed every legal composition at once, which is how the mistake was found.

And the ground may only contain real infrastructure — asphalt, kerbs,
pavements, a crossing, parking markings, grass, soil, paving. Anything that
might later want to move is a prop, not ground.

## 14. The acceptance test

> If the whole HUD is switched off, the screen still has to look like a
> living miniature Israeli neighbourhood you would want to drag with your
> finger and explore. If it looks like an app background, we are not there.

That is the bar, and it is the reason the ground comes before nineteen more
characters. `WorldStage` now takes `explorable`, so dragging works the day
the ground lands: each band moves at a slightly different rate — the
professional drifts 10% faster than the pavement — and the pan is clamped to
the overhang so the world never shows an edge. A drag threshold of 12px
keeps a tap on the barbershop a tap, not a failed drag.

---

## 15. Venues are avatars of supply, not places

Amit wanted a wide map he could move around in, showing all the
professionals who match. `CandidatePresence` forbids a position, because
before assignment a professional's location is theirs and not ours to
display. Those looked irreconcilable until his own next sentence resolved
it:

> "כשמוצא בעל מקצוע זה כאילו נותן פוקוס על המספרה הוירטואלית שלנו, ומשם
> מציע אופציות, או כמה מספרות שכל אחת היא אופציה אחרת."

The candidate is not standing anywhere. The candidate is represented by an
illustrated shop belonging to PRO NOW's world. **Three barbershops are three
choices, never three addresses.** `VirtualVenue` makes that a compile error
rather than an intention: `lat`, `lng`, `address` and `poiId` are all
`never`, and a venue for a candidate the server did not return fails a
check, because a venue is supply and supply is never invented.

The invariant that follows, and that survives a real maps vendor:

> **Geographic truth begins only after assignment.**

When a map does exist underneath, these venues are not placed on its
coordinates. They become a Virtual Supply Layer with its own layout and its
own parallax, so nothing reads as pinned to the streets below.

## 16. The camera is the narrator

Not a background the user drags. The camera tells the story:

    WIDE      searching  — the city is alive, nobody is attached to anything
    DISTRICT  found      — in to the trade's district; venues wake in turn
    VENUE     choosing   — closer on the one being considered
    ROUTE     assigned   — back out to follow the journey

Zoom and both translations ride a single animated value, so a move can
never arrive in pieces, and the whole thing runs on the native driver. A
`VENUE` shot with nobody chosen falls back to `DISTRICT` — the camera never
pushes in on nothing.

## 17. What moves is the marketplace, not traffic

The first motion list was passing cars, an arriving bus and anonymous
pedestrians, because "make the street feel alive" sounds like it means
traffic. Amit:

> "מה קשור המכוניות והאוטובוס, איפה שליח איפה משאית קטנה טנדר?"

He is right. A private car crossing the frame makes the picture move and
says nothing. A courier on a scooter makes the picture move and says what
the product is. So everything significant that crosses the street is one of
ours on the way to somebody: a courier, the small removals van, a tow
truck, a dog walker — that last a trade in the catalogue rather than a
resident. Ambient moments — a window lighting, birds, a cat — stay, because
a world where every single thing is an employee is its own kind of unreal.

`WorldDirector` owns the pacing and is pure and tested: at most two
significant moments at once plus two small ones, never two of the same
thing, irregular gaps, frequent silence. Life comes from irregularity, not
from quantity — a street where everything moves at once reads as a loading
screen.

## 18. Every trade, not just hair

> "בבקשה תתרכזו בהכל ולא רק במספרה."

The vertical slice did its job and that phase is over. `WORLD_DISTRICTS`
holds one row per department — venue, world character, category portrait,
Hebrew label, brand suffix — and the scene asks the table instead of
knowing about trades. Adding a department is a row and two image files;
`LivingMapScene`, `VenueLayer` and `WorldStage` never change.

The sign over a venue is `PRO NOW` plus the district's word: HOME,
APPLIANCE, CARE, HAIR, WELL, PETS, AUTO, MOVE, TECH, HELP, BUILD. Branding
appears on venues and service vehicles that are ours, never on residential
blocks, the kiosk or passing traffic — a screenshot should be recognisable
as PRO NOW with the HUD off, without the neighbourhood reading as a theme
park.

Character file names carry the trade and never a gender, so the roster can
vary later without renaming the world.
