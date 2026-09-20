import type { DepartmentCode } from "./world-districts";
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
export function worldBox(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  plateShaped = true
): { width: number; height: number } {
  if (!plateShaped) {
    return { width: viewportWidth * zoom, height: viewportHeight * zoom };
  }
  const width = viewportWidth * WORLD_EXTENT.width * zoom;
  return { width, height: width / PLATE_ASPECT };
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
      { u: 0.88, v: 0.72 },
    ],
  },
  {
    id: "back",
    labelHe: "הסמטה",
    path: [
      { u: 0.86, v: 0.7 },
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
   * RE-MEASURED, WITH THE RULE THE FIRST MEASUREMENT DID NOT HAVE.
   *
   * Amit: *"כל המכוניות והבניינים והנסיעה מבולגנת ממש."* Seven of the
   * fifty-five pairs of spots were closer together than a shopfront is
   * wide, so seven pairs of buildings were drawn through each other. The
   * first pass scored each point on its own merits — is this pavement, is
   * there a road nearby — and never asked the only question that matters
   * for a set of them: can two shops stand here at once?
   *
   * So the picking is greedy now. Points are scored as before (pavement
   * under the footing, almost no road under it, a road within reach,
   * because a shopfront faces a street) and then taken best-first, each one
   * only if it clears every spot already taken on at least one axis — a
   * building's width apart across the street, or a building's depth apart
   * up it. Clearing on one axis is enough because the world is drawn in
   * perspective: two shops at the same height must stand apart, and two at
   * different heights read as near and far.
   *
   * Bounded to u 0.12–0.88 as before, since a building is drawn outward
   * from its footing and half of one at the edge hangs off the world.
   */
  { u: 0.605, v: 0.170 },
  { u: 0.310, v: 0.200 },
  { u: 0.130, v: 0.340 },
  { u: 0.615, v: 0.355 },
  { u: 0.350, v: 0.405 },
  { u: 0.770, v: 0.515 },
  { u: 0.345, v: 0.545 },
  { u: 0.340, v: 0.675 },
  { u: 0.125, v: 0.750 },
  { u: 0.790, v: 0.835 },
  { u: 0.360, v: 0.875 },
];

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
  const ordered = [...PLATE_SPOTS].sort(
    (a, b) =>
      (a.u - home.u) ** 2 + (a.v - home.v) ** 2 - ((b.u - home.u) ** 2 + (b.v - home.v) ** 2)
  );

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
export function worldZoomFor(shot: "WIDE" | "DISTRICT" | "VENUE" | "ROUTE"): number {
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
export const SPOT_SEPARATION = { u: 0.2, v: 0.13 } as const;

export const WORLD_SIZE = {
  /** A trade's landmark, standing on the street it belongs to. */
  district: 0.16,
  /** One candidate's shopfront. The thing a search arrives at. */
  venue: 0.17,
  /**
   * The chosen one, lifted so the eye lands on it — but no wider than the
   * gap between two measured spots, or being chosen means walking into the
   * shop next door.
   */
  chosenVenue: 0.2,
  /** A professional standing in a doorway. */
  character: 0.055,
  /** What travels the lane. Height, not width — see RouteLayer. */
  travellerHeight: 0.05,
} as const;

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
  // Nothing may be so large that two of them cannot be on screen together;
  // that is the difference between a neighbourhood and a billboard.
  for (const [name, v] of Object.entries(WORLD_SIZE)) {
    if (v > 0.3) out.push(`${name} takes up too much of the world at ${v}`);
    if (v <= 0) out.push(`${name} must be positive`);
  }
  return out;
}
