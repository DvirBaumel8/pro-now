import { tradeGround, type DepartmentCode } from "./world-districts";
import type { NormalizedPoint } from "./virtual-venue";

/**
 * THE NEIGHBOURHOOD — a world with more of it than you can see.
 *
 * ---------------------------------------------------------------------
 * TWO WRONG ANSWERS BEFORE THIS ONE
 * ---------------------------------------------------------------------
 * First the world was a street: every venue on one line, everything that
 * moved crossing the frame and leaving. Amit: *"אני לא אוהב שזה רק רחוב,
 * נותן תחושה מצומצמת ולא מעגלית."*
 *
 * So it became a plaza — a ring with the shops around it. And he rejected
 * that too, in a sentence that says exactly what was wrong with both:
 *
 *     "גם זה כיכר מדי בשבילי. רוצה שיטיילו ברחובות ויהיו מגוון אפשרויות
 *      מכל סוג שבוחרים, לא שיראו את הכל."
 *
 * The mistake was mine and it is worth naming. I read "מצומצם" as *a
 * street has two ends*, and closed the ends into a ring. But a ring you can
 * take in at a glance is still a closed room — it just has no corners. What
 * he is asking for is the opposite property: **there is always more world
 * than is on screen.** A ring fails that by construction, because going
 * round returns you to what you already saw.
 *
 * ---------------------------------------------------------------------
 * WHAT MAKES A PLACE FEEL BIG
 * ---------------------------------------------------------------------
 * Not size. Occlusion. A world twice the viewport that you can see all of
 * at low zoom feels like a map; a world with a corner you have not turned
 * feels endless even when it is small. So three properties are enforced
 * here rather than described:
 *
 *   1. The world is larger than the viewport in BOTH axes, so no camera
 *      position shows all of it — `neighbourhoodViolations` fails if the
 *      extent ever shrinks to where it could.
 *   2. Districts sit on four different streets, including two that branch
 *      away from the main one. Turning a corner reveals something that was
 *      not merely small before; it was not there.
 *   3. A trade has MORE THAN ONE venue, spread along a street, and they are
 *      not all visible together. Amit: *"מגוון אפשרויות מכל סוג שבוחרים."*
 *      One shop per trade is a catalogue entry with a roof on it.
 *
 * ---------------------------------------------------------------------
 * COORDINATES
 * ---------------------------------------------------------------------
 * World space, not screen space: (0,0) is the top-left of the whole
 * neighbourhood and (1,1) the bottom-right, with the viewport showing a
 * window of about 1/`EXTENT` of it. Depth still comes from `y` alone, so a
 * building, a person and a van at the same height are drawn at the same
 * size — the one rule carried over from the plaza, because it was the part
 * that worked.
 */

/**
 * How many viewports wide and tall the neighbourhood is.
 *
 * 2.4 rather than 1.5 because the point is that you cannot hold it all in
 * your head. At 2.4 there is always a street you have not walked, and the
 * drag never reaches a boundary quickly enough to feel like a wall.
 */
export const WORLD_EXTENT = { width: 2.4, height: 2.4 } as const;

/**
 * THE PLATE'S OWN SHAPE, AND WHY THE WORLD MUST TAKE IT.
 *
 * ---------------------------------------------------------------------
 * THE BUG THIS FIXES
 * ---------------------------------------------------------------------
 * Amit, on the tracking screen: *"כל המכוניות והבניינים והנסיעה מבולגנת
 * ממש."* Shops overlapping shops, a scooter apparently parked on a
 * pavement, nothing standing where it was placed.
 *
 * Two causes, and this is the second and more insidious one.
 *
 * `PLATE_SPOTS` were measured off the painted plate in the plate's own
 * pixels — that is the whole point of measuring rather than designing them.
 * But the world box was `2.4 × 2.4` viewports, whose aspect is the PHONE's,
 * and the plate was drawn into it with `cover`. A 948×1659 image covering a
 * 936×1320 box overflows vertically and is centre-cropped, so world `v` and
 * plate `y` are not the same number — and worse, the offset between them
 * changes with the phone, because the box's aspect is the phone's aspect. A
 * shop measured onto a pavement therefore stood on a pavement on one device
 * and in the road on another, and no amount of re-measuring could fix it.
 *
 * ---------------------------------------------------------------------
 * THE RULE
 * ---------------------------------------------------------------------
 * The world IS the plate. Its width is `WORLD_EXTENT.width` viewports, as
 * before, and its HEIGHT follows from the artwork's aspect ratio rather
 * than from the screen. Then `cover` and `contain` agree, nothing is
 * cropped, and a normalised coordinate is a plate pixel on every device —
 * which is what makes measuring the plate worth doing at all.
 *
 * The number is the delivered file's, and it is stated here rather than
 * read from the image because the layout must be computable without having
 * loaded anything.
 */
export const PLATE_ASPECT = 948 / 1659;

/**
 * How big the world box is, in points, for a given viewport.
 *
 * `worldSized: false` is the old one-screen fallback for the hero plates,
 * which are composed for a single frame and have no coordinates in them.
 */
/**
 * `aspect` is the ground's own width-over-height, and it defaults to the
 * painted plate's because for two years that is the only ground there was.
 * A real street plan has its own shape — see `geoAspect` — and handing it
 * in here is the entire mechanism by which our city can stand on a real
 * one: every coordinate in this file is a fraction of this box, so change
 * the box's shape and eleven shopfronts, four streets, a route and a
 * camera all move onto the new ground without being told.
 */
export function worldBox(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  plateShaped = true,
  aspect: number = PLATE_ASPECT
): { width: number; height: number } {
  if (!plateShaped) {
    return { width: viewportWidth * zoom, height: viewportHeight * zoom };
  }
  /*
   * NEVER SMALLER THAN THE SCREEN IT IS SEEN THROUGH.
   *
   * The zoom table was written as a fraction of the world's WIDTH, and
   * the plate is portrait — so a wide shot could produce a world narrower
   * or shorter than the viewport. The camera clamp then pinned it to a
   * corner and the rest of the screen was the background colour: black
   * bands down two sides of the city, on the widest shots, which are the
   * ones meant to show the most of it.
   *
   * `WIDE` at a 390x844 phone produced a world 0.81 screens tall. It has
   * presumably looked like that on every phone taller than 16:9 since the
   * plate became portrait, and it reads as the artwork failing to load
   * rather than as a camera choice.
   *
   * So the box covers, always, and a zoom that asks for less is raised to
   * the point where it just covers. Nothing else in the file has to know:
   * every coordinate is a fraction of this box.
   */
  const asked = viewportWidth * WORLD_EXTENT.width * zoom;
  const width = Math.max(asked, minCoverWidth(viewportWidth, viewportHeight, aspect));
  return { width, height: width / aspect };
}

/**
 * The narrowest the plate may be drawn and still cover the screen.
 *
 * Wide enough for the viewport, and tall enough too — which for a plate
 * taller than the phone means the width implied by the height.
 */
export function minCoverWidth(
  viewportWidth: number,
  viewportHeight: number,
  aspect: number = PLATE_ASPECT
): number {
  return Math.max(viewportWidth, viewportHeight * aspect);
}

/**
 * The smallest zoom that still covers this screen.
 *
 * Useful to callers that want to know whether a shot they asked for was
 * raised — the camera cannot go wider than this, whatever the table says.
 */
export function minCoverZoom(
  viewportWidth: number,
  viewportHeight: number,
  aspect: number = PLATE_ASPECT
): number {
  return minCoverWidth(viewportWidth, viewportHeight, aspect) / (viewportWidth * WORLD_EXTENT.width);
}

/** How much of the world one screen shows, per axis. */
export const VIEWPORT_FRACTION = {
  width: 1 / WORLD_EXTENT.width,
  height: 1 / WORLD_EXTENT.height,
} as const;

export type StreetId = "main" | "north" | "market" | "back";

export interface Street {
  id: StreetId;
  labelHe: string;
  /**
   * The street's course through the world, as points in world space.
   *
   * A polyline rather than a straight segment, because a street that bends
   * is a street you cannot see the end of — which is the entire mechanism
   * this file exists to provide.
   */
  path: readonly NormalizedPoint[];
}

/**
 * Four streets, and the shape between them is what does the work.
 *
 * `main` runs down the middle and is where the customer starts. `market`
 * and `north` branch off it at different heights, so from the start
 * position you can see that they exist without seeing what is along them.
 * `back` never touches `main` at all — it is reached only from `market`,
 * which makes it the part of the world you find rather than the part you
 * are shown.
 */
/**
 * THE ROAD THAT IS ACTUALLY PAINTED ON THE PLATE.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS SEPARATE FROM `STREETS`
 * ---------------------------------------------------------------------
 * `STREETS` below is an idealised layout: four roads meeting in the
 * middle of the world, written before the plate existed and kept because
 * the SHAPE of it — a spine with branches you cannot see the end of — is
 * what makes the neighbourhood feel larger than the screen.
 *
 * It is not where a car can go. `main` runs straight down u≈0.5, and
 * u≈0.5 is where the shops are: six of the eleven measured shopfronts sit
 * within a few hundredths of it, because the middle of this plate is a
 * pedestrian square, not a carriageway. Every vehicle in the world drove
 * that line, which is why a courier's scooter hung in mid-air over the
 * gym's awning and a tow truck crossed the flowerbeds. Amit, twice:
 * *"כל המכוניות והבניינים והנסיעה מבולגנת."*
 *
 * So the traffic gets its own line, and it is MEASURED rather than
 * designed — `tools/design-preview/measure-road.mjs` reads the plate by
 * the complement of the pavement test (asphalt and its white paint are
 * neutral; paving is warm stone under sodium light) and returns the
 * middle of the widest continuous run of it in each band. The numbers
 * below are that tool's output for the delivered plate, at twelve
 * samples, with the carriageway's width at each point in the comment.
 *
 * It runs down the right-hand side of the world and leaves at the
 * bottom-right corner, which is where the artwork puts it.
 *
 * If the plate is ever redrawn, re-run the tool. Do not hand-edit these:
 * a vehicle's whole claim to belong in the world is that it is on the
 * road that was painted, and a number nudged by eye is the beginning of
 * the same fault this replaced.
 */
export interface RoadSample {
  /** The middle of the carriageway at this depth. */
  readonly u: number;
  readonly v: number;
  /** How wide the carriageway is here, as a fraction of the world. */
  readonly width: number;
}

/** The measured carriageway, middle and width, front to back. */
export const ROAD_SAMPLES: readonly RoadSample[] = [
  { u: 0.743, v: 0.042, width: 0.09 },
  { u: 0.758, v: 0.125, width: 0.09 },
  { u: 0.782, v: 0.208, width: 0.11 },
  { u: 0.804, v: 0.292, width: 0.11 },
  { u: 0.831, v: 0.375, width: 0.09 },
  { u: 0.853, v: 0.458, width: 0.16 },
  { u: 0.862, v: 0.542, width: 0.11 },
  { u: 0.862, v: 0.625, width: 0.19 },
  { u: 0.872, v: 0.708, width: 0.14 },
  { u: 0.91, v: 0.792, width: 0.14 },
  { u: 0.94, v: 0.875, width: 0.06 },
  { u: 0.959, v: 0.958, width: 0.09 },
];

/**
 * ---------------------------------------------------------------------
 * THE ONE PICTURE THESE COORDINATES MEAN ANYTHING ON
 * ---------------------------------------------------------------------
 * `ROAD_SAMPLES` were measured against a specific painting. They are not
 * a road in the abstract: they are where the tarmac is in
 * `world_neighbourhood.webp`, to three decimal places.
 *
 * That was forgotten in two places, and Amit found both:
 *
 *   "עדיין במסך הכניסה עפים בלי קשר קטנוע משאית, לא מבין את זה, נראה לא
 *    אמיתי" — the welcome screen paints `welcome_hero`, a DIFFERENT
 *    picture with its own street in its own place, and ran the traffic
 *    over it at the old picture's coordinates. A scooter drove across a
 *    café terrace because the terrace is where the other painting's road
 *    used to be.
 *
 *   "גם על המפה הגדולה עפים יצורים לא קשורים ולא נראה אמיתי" — with the
 *    real map on, there is no painted road at all, and the vans drove
 *    over somebody's actual neighbourhood.
 *
 * So the rule has a name and one home. Ambient traffic may run only on
 * the plate its road was measured against: not on another painting, and
 * never on a real map, where invented traffic would be a claim about a
 * real street.
 */
export const ROAD_PLATE_ASSET_ID = "world_neighbourhood";

/** Whether `ROAD` describes the ground currently being drawn. */
export function roadIsMeasuredFor(args: {
  groundAssetId?: string | null;
  /** A real map. There is no painted road on one. */
  realMap?: boolean;
}): boolean {
  if (args.realMap) return false;
  return (args.groundAssetId ?? ROAD_PLATE_ASSET_ID) === ROAD_PLATE_ASSET_ID;
}

/** The line a vehicle drives along. */
export const CARRIAGEWAY: readonly NormalizedPoint[] = ROAD_SAMPLES.map(({ u, v }) => ({ u, v }));

/**
 * How far the carriageway reaches sideways at a given depth, and where its
 * middle is — interpolated between the measured samples.
 *
 * Used to prove that nothing is standing in the road. A building placed
 * by a different measurement, on a different definition of ground, is
 * exactly how a shopfront ended up on a zebra crossing, so the two
 * measurements are made to argue with each other in a test rather than
 * agreeing quietly on screen.
 */
export function roadAt(v: number): { u: number; halfWidth: number } {
  const pts = ROAD_SAMPLES;
  if (v <= pts[0]!.v) return { u: pts[0]!.u, halfWidth: pts[0]!.width / 2 };
  const last = pts.at(-1)!;
  if (v >= last.v) return { u: last.u, halfWidth: last.width / 2 };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (v <= b.v) {
      const f = b.v === a.v ? 0 : (v - a.v) / (b.v - a.v);
      return { u: a.u + (b.u - a.u) * f, halfWidth: (a.width + (b.width - a.width) * f) / 2 };
    }
  }
  return { u: last.u, halfWidth: last.width / 2 };
}

/**
 * The carriageway as a `Street`, so everything that already knows how to
 * walk a street can drive it without learning a second shape.
 */
export const ROAD: Street = { id: "main", labelHe: "הכביש", path: CARRIAGEWAY };

export const STREETS: readonly Street[] = [
  {
    id: "main",
    labelHe: "הרחוב הראשי",
    path: [
      { u: 0.5, v: 0.12 },
      { u: 0.48, v: 0.38 },
      { u: 0.52, v: 0.62 },
      { u: 0.5, v: 0.9 },
    ],
  },
  {
    id: "north",
    labelHe: "הרחוב הצפוני",
    path: [
      { u: 0.49, v: 0.3 },
      { u: 0.24, v: 0.26 },
      { u: 0.1, v: 0.16 },
    ],
  },
  {
    id: "market",
    labelHe: "רחוב השוק",
    path: [
      { u: 0.51, v: 0.58 },
      { u: 0.76, v: 0.6 },
      /*
       * STOPS AT THE KERB, NOT IN THE ROAD.
       *
       * This ended at u 0.88, and the carriageway at that depth runs
       * from 0.805 to 0.945 — so the market street finished in the
       * middle of the tarmac. It did not matter while these spines only
       * POSITIONED things; it matters now that people walk them, and
       * `lanes.test.ts` measures every point of every street against
       * `roadAt` rather than trusting the numbers to look sensible.
       */
      { u: 0.79, v: 0.72 },
    ],
  },
  {
    id: "back",
    labelHe: "הסמטה",
    path: [
      // Begins on the pavement for the same reason: 0.86 at this depth
      // was inside a carriageway running 0.799 to 0.944.
      { u: 0.78, v: 0.7 },
      { u: 0.84, v: 0.9 },
      { u: 0.66, v: 0.96 },
    ],
  },
];

export function streetById(id: StreetId): Street {
  return STREETS.find((s) => s.id === id) ?? STREETS[0]!;
}

export interface DistrictSite {
  department: DepartmentCode;
  street: StreetId;
  /** Where along the street, 0 at the start and 1 at the end. */
  along: number;
  /** Which side of the street the shopfronts are on. */
  side: -1 | 1;
}

/**
 * Where each trade lives.
 *
 * Spread deliberately across all four streets rather than clustered, so
 * that whichever category the customer taps, the journey there passes
 * something else — which is how a world teaches you it has more in it
 * without a tutorial.
 */
export const DISTRICT_SITES: readonly DistrictSite[] = [
  { department: "BEAUTY", street: "main", along: 0.26, side: 1 },
  { department: "HOME_URGENT", street: "main", along: 0.58, side: -1 },
  { department: "APPLIANCES", street: "main", along: 0.84, side: 1 },
  { department: "TECH", street: "north", along: 0.32, side: -1 },
  { department: "WELLNESS", street: "north", along: 0.74, side: 1 },
  { department: "HOME_CARE", street: "market", along: 0.28, side: -1 },
  { department: "PETS", street: "market", along: 0.62, side: 1 },
  { department: "LOGISTICS", street: "market", along: 0.9, side: -1 },
  { department: "VEHICLE", street: "back", along: 0.3, side: 1 },
  { department: "IMPROVEMENT", street: "back", along: 0.66, side: -1 },
  { department: "ODD_JOBS", street: "back", along: 0.92, side: 1 },
];

/**
 * WHERE A SHOP CAN ACTUALLY STAND ON THE PLATE.
 *
 * ---------------------------------------------------------------------
 * WHY THE STREET MODEL IS NOT ENOUGH ON ITS OWN
 * ---------------------------------------------------------------------
 * `STREETS` and `DISTRICT_SITES` describe an idealised layout: four roads
 * and a place along each. The plate that got drawn is a real picture with
 * its own junction, its own kerbs and its own buildings, and the two do not
 * line up. Amit saw the consequence immediately — a salon standing in the
 * middle of a pedestrian crossing.
 *
 * So these points were MEASURED off the plate rather than designed: the
 * image was sampled for pixels that are pavement (light, unsaturated, not
 * foliage), that contain almost no road, and that are within a short
 * distance of a road — because a shopfront faces a street, it does not hide
 * in a courtyard. The eleven best-scoring spots, spread apart, are below.
 *
 * ---------------------------------------------------------------------
 * AND WHAT THIS MEANS FOR THE NEXT PLATE
 * ---------------------------------------------------------------------
 * These numbers belong to THIS artwork. A new neighbourhood plate needs
 * them re-measured, which is a script and not a design session — and far
 * better than the alternative, which is eleven buildings placed by eye and
 * a salon in the road the day the plate changes.
 */
export const PLATE_SPOTS: readonly NormalizedPoint[] = [
  /*
   * MEASURED AS BOXES, NOT AS POINTS — AND THEN MEASURED AGAINST THE
   * RIGHT QUESTION.
   *
   * There have been three sets of these numbers and each one was produced
   * by the same script, so it is worth being precise about what changed,
   * because twice the script was confidently answering a slightly
   * different question from the one being asked.
   *
   * The FIRST set scored the footing — the doorstep — and every one of
   * the eleven passed. Six still looked wrong on screen, because a
   * shopfront is 0.15 of the world wide and RISES from its footing: the
   * doorsteps were on clean paving and the buildings were standing across
   * flowerbeds, over the kerb, and in one case on a zebra crossing.
   *
   * The SECOND set fixed that. It eroded by the building's own footprint
   * rather than by a token margin, and the marks it gave the first set
   * were brutal — שיער on 4% clear ground, חיות on 18% and in the road.
   * Its own best eleven scored worst 41%, median 63%: better everywhere,
   * and still not good. The comment here concluded that the plate could
   * hold four shopfronts and that the next plate needed to be drawn
   * differently. That conclusion was wrong, and this is how:
   *
   * The THIRD set — these — changed nothing about the erosion and one
   * thing about what counts as ground. The test was lum > 95: bright
   * enough to be lit stone rather than tarmac. `measure-pavement.mjs` had
   * already discovered, when the same test was tried for where a PERSON
   * may stand, that brightness is the wrong question on this plate: the
   * paving in shadow at the sides is darker than 95 and is still paving,
   * while THE ZEBRA CROSSINGS ARE BRIGHTER THAN IT AND ARE STILL ROAD.
   * That tool switched to warmth — paving is warm stone under sodium
   * light, asphalt and its white paint are neutral — and this one was
   * left behind, so the two tools disagreed about where the ground was
   * and the one that places the buildings was the one that was wrong.
   *
   * It was rejecting most of the real pavement and accepting the road.
   * With the same erosion and the pavement tool's own test:
   *
   *     standable ground   0.2%  ->  13.6% of the plate
   *     separated slots    7     ->  15
   *     worst placement    36%   ->  86% clear
   *
   * So the plate holds eleven shopfronts after all, comfortably, and the
   * paragraph that used to stand here asking for a different drawing has
   * been deleted rather than softened: it was a brief written from a
   * measurement bug. The one thing it got right is kept below.
   *
   * Every one of these is now checked against the carriageway as well —
   * see `CARRIAGEWAY` and `plate-ground.test.ts`. The worst overlap is a
   * corner touching a kerb at 9%; the spot this set replaces was 90% road,
   * which is to say it was a shop parked on the zebra crossing.
   *
   * ---------------------------------------------------------------------
   * AND NONE OF THEM MAY BE NEARER THE VIEWER THAN THE CUSTOMER
   * ---------------------------------------------------------------------
   * An earlier run put a shop at v = 0.922, which is in front of
   * `CUSTOMER_POINT` at 0.9. A professional leaving that shop drives AWAY
   * from the eye to reach the person waiting, so the van shrinks as it
   * arrives — and `assignment-route.test.ts` failed on exactly that, one
   * assertion, before anybody looked at a screenshot. The cap is in the
   * measurement: nothing past v = 0.86.
   */
  { u: 0.339, v: 0.853 }, // 100% clear
  { u: 0.126, v: 0.792 }, //  89%
  { u: 0.508, v: 0.665 }, // 100%
  { u: 0.731, v: 0.567 }, //  90%
  { u: 0.292, v: 0.562 }, // 100%
  { u: 0.517, v: 0.438 }, // 100%
  { u: 0.279, v: 0.425 }, // 100%
  { u: 0.574, v: 0.257 }, //  89%
  { u: 0.359, v: 0.211 }, // 100%
  { u: 0.874, v: 0.125 }, //  86%
  { u: 0.122, v: 0.102 }, //  88%
];

/**
 * THE SPOTS NO TRADE OWNS.
 *
 * ---------------------------------------------------------------------
 * WHY A SECOND LIST
 * ---------------------------------------------------------------------
 * There are eleven trades and `PLATE_SPOTS` has eleven entries, one each,
 * so every piece of standable ground in the world belonged to somebody.
 * That was fine while a trade had one shop. It stopped being fine the
 * moment three plumbers were online at once, because `venueSlots` then
 * had nowhere to put the second and third except on another trade's
 * pavement — and the other trade's building was already standing on it.
 *
 * On screen that was a barbershop and a plumber's shop drawn 76% on top
 * of each other, and, where a venue took its own trade's spot, the
 * district's building and the venue's building in exactly the same place:
 * two identical shopfronts at 100% overlap, which does not read as two
 * businesses at all, it reads as the art failing.
 *
 * The plate has fifteen separated slots and the trades use eleven, so
 * these are the other four, kept for exactly this: a trade with more than
 * one professional online spreads onto ground nobody else is standing on.
 * They are the same measurement, from the same run — see `PLATE_SPOTS`
 * for what that measurement finally got right.
 */
export const OVERFLOW_SPOTS: readonly NormalizedPoint[] = [
  { u: 0.721, v: 0.793 }, //  82% clear
  { u: 0.125, v: 0.248 }, //  84%
  { u: 0.732, v: 0.406 }, //  67%
];

/**
 * The spot a trade stands on, on whatever ground is underfoot.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A FUNCTION AND NOT `spots[i]` AT EACH CALL SITE
 * ---------------------------------------------------------------------
 * There are three places that have to agree about where a trade's shop is:
 * the layer that DRAWS it, the test that decides which trade is UNDERFOOT,
 * and the errands scattered BETWEEN them. The first version of the real-map
 * change indexed the spot list by loop position at two of those three, and
 * the two loops were not the same loop — `DistrictLayer` filters out the
 * active trade before mapping, so hiding one shop shifted every shop after
 * it onto its neighbour's plot, while `nearestDistrict` walked
 * `WORLD_DISTRICTS` in object-key order and never shifted at all.
 *
 * On screen that is the world lighting up the plumber and opening the
 * barber, and it only appears once somebody walks — which is to say it
 * would not have appeared in any screenshot taken of it.
 *
 * So the department names its own index, once, here. `plateSpotFor` is the
 * same function with the painted plate's list baked in, kept because most
 * of the codebase has no idea a second kind of ground exists.
 */
export function groundSpotFor(
  spots: readonly NormalizedPoint[] | null | undefined,
  department: DepartmentCode,
  /**
   * Where the trades that have no door stand — a park or a square rather
   * than a frontage. See `tradeGround`: a dog walker works in a park and
   * a trainer works wherever you are, and standing either in a doorway is
   * a small untruth told by the artwork.
   *
   * Absent, or empty, and everything stands on a frontage as before.
   */
  open?: readonly NormalizedPoint[] | null
): NormalizedPoint {
  const i = DISTRICT_SITES.findIndex((d) => d.department === department);
  const at = i < 0 ? 0 : i;
  if (open && open.length > 0 && tradeGround(department) === "OPEN_GROUND") {
    return open[at % open.length]!;
  }
  if (!spots || spots.length === 0) return plateSpotFor(department);
  return spots[at % spots.length]!;
}

/** The measured spot a trade stands on, by its position in the table. */
export function plateSpotFor(department: DepartmentCode): NormalizedPoint {
  const i = DISTRICT_SITES.findIndex((d) => d.department === department);
  return PLATE_SPOTS[(i < 0 ? 0 : i) % PLATE_SPOTS.length]!;
}

/** A point along a street's polyline, by fraction of its total length. */
export function alongStreet(street: Street, t: number): NormalizedPoint {
  const pts = street.path;
  if (pts.length < 2) return pts[0] ?? { u: 0.5, v: 0.5 };

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.u - pts[i - 1]!.u, pts[i]!.v - pts[i - 1]!.v);
    lengths.push(d);
    total += d;
  }
  if (total === 0) return pts[0]!;

  /*
   * The ends are returned exactly rather than computed. Walking the
   * polyline to t=1 accumulates float error and lands at 0.8999999999,
   * which is invisible on screen and breaks every equality a test can
   * write — so the one place it matters is handled first.
   */
  if (t <= 0) return pts[0]!;
  if (t >= 1) return pts.at(-1)!;

  let target = t * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]!) {
      const f = lengths[i] === 0 ? 0 : target / lengths[i]!;
      return {
        u: pts[i]!.u + (pts[i + 1]!.u - pts[i]!.u) * f,
        v: pts[i]!.v + (pts[i + 1]!.v - pts[i]!.v) * f,
      };
    }
    target -= lengths[i]!;
  }
  return pts.at(-1)!;
}


/**
 * The centre of a trade's district, in world space.
 *
 * Read from the MEASURED plate spots rather than computed from the ideal
 * street model — see `PLATE_SPOTS`. The street model still decides the
 * order trades appear in and the route the camera travels; the plate
 * decides where a building can stand without being in the road.
 */
export function districtCentre(department: DepartmentCode): NormalizedPoint {
  return plateSpotFor(department);
}

/**
 * Where the individual shops of one trade stand.
 *
 * ---------------------------------------------------------------------
 * WHY MORE THAN ONE, AND WHY SPREAD
 * ---------------------------------------------------------------------
 * Amit: *"רוצה שיטיילו ברחובות ויהיו מגוון אפשרויות מכל סוג שבוחרים."*
 *
 * The street version gave each trade one building, so choosing a trade
 * meant arriving at a single shop and being offered a list in front of it.
 * That is a catalogue with scenery. Several shops, far enough apart that
 * they do not all fit on screen at once, means the customer arrives in a
 * place that has options in it and can keep moving to find more.
 *
 * They are still avatars of real candidates — a shop exists because the
 * server returned somebody, never to fill the street. See
 * `virtual-venue.ts`; that invariant has not moved.
 */
/**
 * How far apart two shopfronts have to stand.
 *
 * A venue is drawn at roughly half the viewport's width, and the world is
 * 2.4 viewports across, so a building covers about 0.22 of the world. Two
 * shops closer than that overlap.
 */
export const MIN_VENUE_SEPARATION = 0.22;

export function venueSlots(department: DepartmentCode, count: number): NormalizedPoint[] {
  if (count <= 0) return [];

  /*
   * The shops of one trade stand on the nearest measured pavement spots to
   * that trade's own, so three barbers are three real places along the
   * street rather than three copies stacked on one corner — and none of
   * them ends up in the road, which the ideal-street version could not
   * promise against this plate.
   */
  const home = plateSpotFor(department);
  /*
   * ITS OWN SPOT FIRST, THEN THE GROUND NOBODY OWNS, THEN THE REST.
   *
   * This sorted all of `PLATE_SPOTS` by distance and took the nearest —
   * and every entry in `PLATE_SPOTS` is some other trade's front door,
   * with that trade's building already standing on it. So the second
   * plumber online was placed on the barber's pavement, inside the
   * barber's shop: 76% overlap, two buildings in one place, which reads
   * as the artwork failing rather than as a street.
   *
   * `OVERFLOW_SPOTS` is the measured ground no trade owns, so it comes
   * first after the trade's own. Only when a trade has more professionals
   * online than the world has spare pavement does this fall through to
   * other trades' spots, which is the same graceful degradation the
   * relaxing separation below provides — worse than ideal, never a
   * dropped professional.
   */
  const byDistance = (a: NormalizedPoint, b: NormalizedPoint) =>
    (a.u - home.u) ** 2 + (a.v - home.v) ** 2 - ((b.u - home.u) ** 2 + (b.v - home.v) ** 2);
  const ordered = [
    home,
    ...[...OVERFLOW_SPOTS].sort(byDistance),
    ...[...PLATE_SPOTS].filter((p) => p !== home).sort(byDistance),
  ];

  /*
   * NEAREST IS NOT ENOUGH — THEY HAVE TO BE FAR ENOUGH APART.
   *
   * Taking the three nearest measured spots put two plumbers on pavement
   * 0.12 of the world apart, and a shopfront is drawn about 0.22 of the
   * world wide. The result on screen was one building with a second one
   * behind it at a slight offset: not two places, a rendering fault, and it
   * reads as a ghost.
   *
   * So a spot is taken only if it clears the ones already taken. The bound
   * relaxes if the street runs out of room rather than returning fewer
   * shops than there are professionals, because a candidate the server
   * returned must appear somewhere — but it relaxes in steps, so the
   * crowding is as small as the world allows instead of immediate.
   */
  const chosen: NormalizedPoint[] = [];
  const far = (p: NormalizedPoint, min: number) =>
    chosen.every((c) => (c.u - p.u) ** 2 + (c.v - p.v) ** 2 >= min * min);

  for (const min of [MIN_VENUE_SEPARATION, MIN_VENUE_SEPARATION * 0.6, 0]) {
    for (const spot of ordered) {
      if (chosen.length >= count) break;
      if (chosen.includes(spot)) continue;
      if (far(spot, min)) chosen.push(spot);
    }
    if (chosen.length >= count) break;
  }

  // More candidates than the neighbourhood has pavement: reuse from the
  // start rather than dropping a professional who is genuinely online.
  return Array.from({ length: count }, (_, i) => chosen[i % chosen.length] ?? home);
}

/**
 * How large something standing at this depth is drawn.
 *
 * Carried over from the plaza unchanged, because it was the part that
 * worked: one rule for buildings, people and vehicles, so everything at the
 * same distance agrees.
 */
export function depthScale(v: number): number {
  return 0.74 + Math.max(0, Math.min(1, v)) * 0.44;
}

/**
 * ---------------------------------------------------------------------
 * THE PAVEMENT A WALK READS BEST ON
 * ---------------------------------------------------------------------
 * Amit, about the dog walker: *"סתם מרחף לי פה ולא נראה כמו משהו אמיתי,
 * סתם זז למעלה למטה."*
 *
 * Measured across a minute in a browser: 727 pixels of vertical travel
 * against 214 horizontal. So he was moving — a long way — and almost
 * entirely toward the camera, because pedestrians were put on street 0,
 * whose spine runs 0.12 → 0.9 in v while u stays between 0.48 and 0.52.
 *
 * A figure walking straight down a three-quarter view shows no lateral
 * movement at all. It grows slightly, it bobs, and nothing slides past
 * it — which the eye reads as bouncing on the spot rather than as
 * walking, exactly as he described. The gait was never the problem: the
 * walk's bob is 0.03 of a figure's height, under a pixel on screen.
 *
 * So a pedestrian takes the pavement that crosses the frame. Chosen by
 * measurement rather than by index, so it stays right if the streets are
 * ever re-drawn: the one whose horizontal extent is largest against its
 * vertical, with `v` weighted by the world's own 3/4 rule so the
 * comparison is in SCREEN distance and not in plate coordinates.
 *
 * This is a rendering choice and not a claim. Which pavement a passer-by
 * happens to be on is arbitrary — they are ambience, they carry no
 * agency (/docs/03c §16.3) — and choosing the one where a walk looks
 * like a walk invents nothing.
 */
export function walkingStreet(): Street {
  let best = STREETS[0]!;
  let bestRatio = -1;
  for (const street of STREETS) {
    const a = street.path[0]!;
    const b = street.path[street.path.length - 1]!;
    const across = Math.abs(b.u - a.u);
    // The same 0.6 the gait and `pathLength` use: a step "into" the
    // picture covers less screen than a step across it.
    const into = Math.abs(b.v - a.v) * 0.6;
    const ratio = across / Math.max(0.001, into);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = street;
    }
  }
  return best;
}

/** Draw order. Nearer covers further. */
export function depthOrder(v: number): number {
  return Math.round(v * 1000);
}

export interface CameraWindow {
  /** Where the camera is looking, in world space. */
  focus: NormalizedPoint;
  /** 1 shows one viewport's worth. Larger is closer in. */
  zoom: number;
}

/** Which districts are visible from this camera position. */
export function visibleDistricts(window: CameraWindow): DepartmentCode[] {
  const halfU = VIEWPORT_FRACTION.width / 2 / window.zoom;
  const halfV = VIEWPORT_FRACTION.height / 2 / window.zoom;
  return DISTRICT_SITES.filter((s) => {
    const c = districtCentre(s.department);
    return (
      Math.abs(c.u - window.focus.u) <= halfU && Math.abs(c.v - window.focus.v) <= halfV
    );
  }).map((s) => s.department);
}

/**
 * The route the camera takes to a district, as points to travel through.
 *
 * Along the streets rather than straight across, because the journey is
 * half the answer to Amit's note: travelling down a road past shops you did
 * not choose is what tells you the world is bigger than the errand. A
 * straight line from A to B would fly over the buildings and arrive having
 * shown nothing.
 */
export function routeToDistrict(from: NormalizedPoint, department: DepartmentCode): NormalizedPoint[] {
  const site = DISTRICT_SITES.find((s) => s.department === department) ?? DISTRICT_SITES[0]!;
  const street = streetById(site.street);

  // Join the street at its nearest end, then follow it in.
  const startT = Math.hypot(street.path[0]!.u - from.u, street.path[0]!.v - from.v) <
    Math.hypot(street.path.at(-1)!.u - from.u, street.path.at(-1)!.v - from.v)
    ? 0
    : 1;

  const steps = 5;
  const legs = Array.from({ length: steps + 1 }, (_, i) => {
    const t = startT + (site.along - startT) * (i / steps);
    return alongStreet(street, t);
  });

  return [from, ...legs, districtCentre(department)];
}

/**
 * Everything wrong with a neighbourhood.
 *
 * The first check is the whole design, stated as a test: if any camera
 * position can see every district at once, the world has become a map and
 * the feeling Amit asked for is gone. The rest keep the streets connected
 * and the trades apart.
 */
export function neighbourhoodViolations(): string[] {
  const v: string[] = [];

  if (WORLD_EXTENT.width <= 1 || WORLD_EXTENT.height <= 1) {
    v.push("The world fits inside one screen. There has to be more of it than can be seen at once.");
  }

  // Widest sensible shot: the whole viewport at rest, centred.
  const wide: CameraWindow = { focus: { u: 0.5, v: 0.5 }, zoom: 1 };
  const seen = visibleDistricts(wide);
  if (seen.length === DISTRICT_SITES.length) {
    v.push("Every district is visible from one position. Turning a corner has to reveal something new.");
  }
  if (seen.length === 0) {
    v.push("No district is visible from the resting shot. The customer must land somewhere, not nowhere.");
  }

  const byDepartment = new Set<DepartmentCode>();
  for (const s of DISTRICT_SITES) {
    if (byDepartment.has(s.department)) v.push(`${s.department} has two district sites.`);
    byDepartment.add(s.department);
    if (s.along < 0 || s.along > 1) v.push(`${s.department} sits off the end of ${s.street}.`);
  }

  const usedStreets = new Set(DISTRICT_SITES.map((s) => s.street));
  if (usedStreets.size < 3) {
    v.push("The trades are on fewer than three streets; the world is a corridor again.");
  }

  for (const street of STREETS) {
    if (street.path.length < 2) v.push(`Street "${street.id}" has no course.`);
    for (const p of street.path) {
      if (p.u < 0 || p.u > 1 || p.v < 0 || p.v > 1) {
        v.push(`Street "${street.id}" leaves the world.`);
      }
    }
  }

  return v;
}

/**
 * THE LIVE WORLD'S RESTING SHOT.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS, AND WHAT IT STOPPED BEING
 * ---------------------------------------------------------------------
 * It was written for the welcome screen, to stop that screen opening on
 * tarmac. The welcome screen has since been given a plate of its own with
 * our shopfronts painted into it — legitimate there, because that screen
 * runs no search and claims nothing about supply — so it no longer needs a
 * point to look at.
 *
 * What the rule protects is still worth protecting, and now applies to the
 * LIVE world: wherever the map comes to rest, the customer has to be able
 * to see that trades exist here. A resting shot on an empty junction is a
 * map of a town with no businesses in it.
 *
 * The test below keeps it honest in both directions: at least two trades in
 * frame, and never all eleven — because a view that shows the whole
 * neighbourhood at once is the thing Amit rejected twice.
 */
export const WELCOME_VIEW: CameraWindow = {
  focus: { u: 0.5, v: 0.5 },
  zoom: 1,
};

export function welcomeViewViolations(): string[] {
  const seen = visibleDistricts(WELCOME_VIEW);
  const v: string[] = [];
  if (seen.length < 2) {
    v.push(
      `The welcome view shows ${seen.length} district(s). The first screen has to open on work, not on an empty road.`
    );
  }
  if (seen.length === DISTRICT_SITES.length) {
    v.push("The welcome view shows the entire neighbourhood; there has to be more of it than the first frame.");
  }
  return v;
}

/**
 * HOW MUCH WORLD EACH SHOT SHOWS.
 *
 * ---------------------------------------------------------------------
 * THE MISTAKE THIS CORRECTS
 * ---------------------------------------------------------------------
 * Amit, looking at the search screen:
 *
 *     "איפה המבט על? למה זה לא רואה את כל הבתים שבנינו, כל הדמויות, כל בית
 *      ספק אחר? הכל בזום אין. איפה התמונות מרחוק שהצ׳אט בנה?"
 *
 * He is right and the cause is arithmetic rather than taste. `CameraState`
 * was written when the world was exactly one screen, so `zoom: 1` meant
 * "resting" and everything above it meant "closer". Then the world became
 * 2.4 screens wide — and `zoom: 1` silently started meaning *show one
 * screen out of two and a half*, with DISTRICT and VENUE pushing in from
 * there. The result was a picture of tarmac: a neighbourhood was being
 * drawn and almost none of it was on screen.
 *
 * So the shot is translated into a world zoom here, where the extent is
 * known. WIDE fits the whole plate — the far shot Amit is asking for, the
 * one that shows every district and every character at once — and the other
 * shots step in from it.
 *
 * ---------------------------------------------------------------------
 * AND THE RULE THIS DOES NOT BREAK
 * ---------------------------------------------------------------------
 * Fitting the plate by WIDTH still does not show all of it: the world is
 * portrait and the phone is portrait but narrower in proportion, so there
 * is always neighbourhood above and below the frame to drag into. Seeing
 * the whole street layout and being able to see every corner of it are
 * different things, and only the second one would flatten the world into a
 * map.
 */
export function worldZoomFor(shot: "WIDE" | "DISTRICT" | "VENUE" | "ROUTE" | "EXPLORE"): number {
  /** The zoom at which one screen of viewport covers the world's width. */
  const fit = 1 / WORLD_EXTENT.width;
  switch (shot) {
    case "WIDE":
      return fit;
    // Half a step in: the district fills the frame, the rest of the
    // neighbourhood is still visible around it.
    case "DISTRICT":
      return fit * 1.45;
    // Close enough to read a shopfront and the person standing outside it.
    case "VENUE":
      return fit * 2.1;
    // Following somebody: wide enough to see where they are going.
    case "ROUTE":
      return fit * 1.25;
    /*
     * WALKING THE STREET YOURSELF.
     *
     * Amit: *"שהכל יהיה רחב בתנועתיות ויהיה אפשר באמת לטייל בין
     * המקצועות."*
     *
     * Wider than DISTRICT and for a reason that is about walking rather
     * than about taste. A close camera on a moving figure turns every
     * step into a large movement of the whole picture, so the world feels
     * like it is being shoved past you and you cannot see where you are
     * going — you arrive at shops rather than approaching them.
     *
     * Pulled back, the same step moves a smaller fraction of the frame,
     * several shops are in view at once, and choosing which way to go
     * becomes possible instead of a guess. That is the difference between
     * a street you stroll and a corridor you are pushed down.
     *
     * ---------------------------------------------------------------------
     * AND IT IS CLOSER THAN THE WIDE SHOTS, NOT WIDER
     * ---------------------------------------------------------------------
     * My first instinct was to pull back, and the geometry says the
     * opposite. The plate is only 2.4 viewports across, so a wide zoom
     * makes the whole world little more than one screen — and a world
     * that fits on the screen is a picture, not somewhere to walk. There
     * is nothing to cross and nothing beyond the edge to go and find.
     *
     * At this zoom the neighbourhood is about 1.85 screens across and 1.5
     * down, so there is genuinely somewhere to go, several shops are in
     * view at once, and a shopfront is still large enough to read. That
     * is what makes a street strollable: distance you can cover and
     * destinations you can see from where you stand.
     */
    case "EXPLORE":
      return fit * 1.85;
  }
}

/**
 * HOW BIG THINGS ARE, AND WHY IT IS MEASURED AGAINST THE WORLD.
 *
 * ---------------------------------------------------------------------
 * THE BUG
 * ---------------------------------------------------------------------
 * Amit: *"כל המכוניות והבניינים והנסיעה מבולגנת ממש."*
 *
 * Every object in the world was sized against the VIEWPORT — a shopfront
 * was "0.42 of the phone", a venue "0.52 of the phone". That is a rule
 * about the screen, not about the place, and it has a consequence that only
 * shows up once the camera moves: **zooming out made everything bigger
 * relative to the street.**
 *
 * Work it through on the tracking screen. The camera pulls back so the
 * whole journey fits, which makes the world about 1.25 screens across. The
 * shops keep their 0.42-of-a-screen size, so each one is now a third of the
 * entire neighbourhood. Five of them fill the frame, they collide with each
 * other and with the painted buildings on the plate, and the scooter
 * travelling between them is a speck. Nothing is misplaced; everything is
 * the wrong SIZE, which looks like the same thing and is not.
 *
 * ---------------------------------------------------------------------
 * THE RULE
 * ---------------------------------------------------------------------
 * A building has a size in the WORLD, as a share of the plate's width, and
 * the camera scales it along with the ground it stands on — which is what
 * happens when you walk towards a real shop. Zoom in and it grows; pull
 * back and it takes its place among the others.
 *
 * The numbers come from the plate itself: a painted shopfront on that
 * street spans roughly a sixth of the image. A PRO NOW venue is allowed to
 * be a little larger than a plain district, because at the end of a search
 * it is the thing the camera came for; a person is roughly a tenth of a
 * building; a vehicle sits between the two.
 */
/**
 * The separation the measurement guarantees between any two spots: a
 * building's width across the street, or a building's depth up it.
 *
 * Stated here, next to the sizes, because the two are one decision. A shop
 * wider than this walks into its neighbour, and every size below is bounded
 * by it rather than chosen by eye.
 */
/*
 * How far apart two shopfronts must be measured.
 *
 * The v figure is deliberately smaller than a shopfront is tall. Two shops
 * at the same depth would collide, but two at different depths overlap the
 * way buildings along a street overlap — the further one is drawn smaller
 * and higher and behind — and forbidding that cost the plate half its
 * usable slots for nothing.
 */
export const SPOT_SEPARATION = { u: 0.177, v: 0.0675 } as const;

export const WORLD_SIZE = {
  /** A trade's landmark, standing on the street it belongs to. */
  district: 0.16,
  /**
   * One candidate's shopfront. The thing a search arrives at.
   *
   * 0.17 until the footprint was measured rather than the footing. At that
   * width the promenade plate has four places a building can stand; at
   * 0.15 it has nine, and the two-hundredths cost nothing legible on a
   * phone. It is not the fix — the plate is — but it is free.
   */
  venue: 0.15,
  /**
   * The chosen one, lifted so the eye lands on it — but no wider than the
   * gap between two measured spots, or being chosen means walking into the
   * shop next door.
   */
  chosenVenue: 0.176,
  /** A professional standing in a doorway. */
  character: 0.055,
  /**
   * A PERSON'S HEIGHT, AS A FRACTION OF A SHOPFRONT'S WIDTH.
   *
   * ---------------------------------------------------------------------
   * WHY THE FIGURES ARE MEASURED AGAINST THE BUILDINGS
   * ---------------------------------------------------------------------
   * Amit: *"תוודאו שכל הפרופורציות נכונות."* They were not. The doorway
   * professionals were sized at 0.42 of a shopfront's width — a number
   * written straight into DistrictLayer — while the customer's own avatar
   * was sized as a fraction of the WORLD'S HEIGHT. Two different rulers,
   * so nothing kept them agreeing, and the avatar ended up 2.75 times the
   * height of the professional standing in a doorway beside him: a
   * customer taller than a two-storey shop.
   *
   * One ruler now. A person is this fraction of a shopfront's width, and
   * every figure in the world derives from it. The avatar is allowed to be
   * slightly larger — see `AVATAR_OF_PERSON` — because it is the nearest
   * thing in the world by definition, and that allowance is a number with
   * a reason rather than an accident of which quantity somebody reached
   * for first.
   */
  personOfVenue: 0.42,
  /** The customer's own figure, as a multiple of anybody else's height. */
  avatarOfPerson: 1.15,
  /** What travels the lane. Height, not width — see RouteLayer. */
  travellerHeight: 0.05,
} as const;

/**
 * A STANDING PERSON, IN WORLD POINTS. The ruler everything alive is
 * measured with — see `WORLD_SIZE.personOfVenue` for why there is only
 * one of them.
 */
export function personHeight(worldWidth: number): number {
  return worldWidth * WORLD_SIZE.venue * WORLD_SIZE.personOfVenue;
}

/**
 * HOW TALL EACH THING ON WHEELS IS, AS A MULTIPLE OF THE PERSON IN IT.
 *
 * ---------------------------------------------------------------------
 * WHY THE TRAFFIC WAS THE WRONG SIZE, AND WHY IT FLOATED
 * ---------------------------------------------------------------------
 * `WorldLife` sized every moving thing by a share of the world's WIDTH,
 * one number per vehicle, and drew it into a SQUARE box with `contain`.
 * Both halves of that are wrong and they compound.
 *
 * Wrong sizes, measured against a person standing on the same pavement:
 *
 *     courier_scooter   1.35 x a person
 *     moving_van        1.11
 *     tow_truck         1.00     — a flatbed truck, with a car on it,
 *                                  exactly as tall as a pedestrian
 *     dog_walker        0.71     — a grown man, drawn as a child
 *
 * And floating, which is worse and has the same cause. A square box of
 * side `w` with `contain` letterboxes a wide asset: the tow truck's art
 * is 496x184, so it drew 0.063 tall inside a 0.17 box and sat CENTRED in
 * it — a clear 0.054 of the world's width above where its wheels were
 * supposed to be, which is most of a person's height. The vehicles were
 * not driving down the street, they were hovering over it, and every
 * screenshot that showed a scooter in mid-air over a shopfront was this.
 *
 * `VenueLayer` had the identical fault with the buildings and the note
 * there says it plainly: the box has to be the asset's own aspect ratio,
 * so the thing fills it and its base sits where it was placed.
 *
 * So: height, from the person's ruler, with a multiple that states a
 * real relationship. A rider's head is about where it would be standing;
 * a box van is about a third taller than the person driving it; a
 * flatbed with a car on it is half as tall again; and somebody walking
 * dogs is a person.
 */
export const VEHICLE_OF_PERSON: Readonly<Record<string, number>> = {
  dog_walker: 1,
  courier_scooter: 1.1,
  moving_van: 1.3,
  tow_truck: 1.55,
};

/** What an unlisted traveller is worth: a small van, and no taller. */
export const DEFAULT_VEHICLE_OF_PERSON = 1.2;

/** How tall this traveller is drawn, in world points. */
export function vehicleHeight(worldWidth: number, assetId: string): number {
  return personHeight(worldWidth) * (VEHICLE_OF_PERSON[assetId] ?? DEFAULT_VEHICLE_OF_PERSON);
}

/** Everything wrong with the sizes, as a test rather than as a comment. */
export function worldSizeViolations(): string[] {
  const out: string[] = [];

  // A shop must not be wider than the gap the spots guarantee, or the
  // separation enforced in PLATE_SPOTS buys nothing.
  if (WORLD_SIZE.chosenVenue > SPOT_SEPARATION.u) {
    out.push("a venue is wider than the space between two measured spots");
  }
  if (WORLD_SIZE.venue > WORLD_SIZE.chosenVenue) {
    out.push("being chosen must not make a venue smaller");
  }
  // A person standing beside a building must read as a person.
  if (WORLD_SIZE.character > WORLD_SIZE.district / 2) {
    out.push("a character is too large beside its own building");
  }
  /*
   * A person is a person, whoever they are. The avatar may be nearer and
   * so a little larger, but a customer twice the height of the
   * professional in the next doorway is not perspective, it is a bug —
   * and it shipped, which is why this is checked rather than assumed.
   */
  if (WORLD_SIZE.avatarOfPerson > 1.4 || WORLD_SIZE.avatarOfPerson < 1) {
    out.push(`the avatar is ${WORLD_SIZE.avatarOfPerson}x a person, which is not one`);
  }
  // Somebody standing in a doorway must fit under the lintel.
  if (WORLD_SIZE.personOfVenue > 0.6) {
    out.push("a person is too tall for the shop they are standing in front of");
  }
  // Nothing may be so large that two of them cannot be on screen together;
  // that is the difference between a neighbourhood and a billboard.
  /*
   * The size rules below are about things measured against the WORLD.
   * `personOfVenue` and `avatarOfPerson` are ratios between two things in
   * it, so they are checked above instead — a ratio of 1.15 is not "115%
   * of the neighbourhood".
   */
  const RATIOS = ["personOfVenue", "avatarOfPerson"];
  for (const [name, v] of Object.entries(WORLD_SIZE)) {
    if (RATIOS.includes(name)) continue;
    if (v > 0.3) out.push(`${name} takes up too much of the world at ${v}`);
    if (v <= 0) out.push(`${name} must be positive`);
  }
  return out;
}
