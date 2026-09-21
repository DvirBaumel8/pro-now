import type { NormalizedPoint } from "./virtual-venue";
import type { RoadSample } from "./world-neighbourhood";

/**
 * THE REAL MAP UNDER OUR WORLD.
 *
 * ---------------------------------------------------------------------
 * WHAT AMIT ASKED FOR, AND WHY IT IS NOT "ADD GOOGLE MAPS"
 * ---------------------------------------------------------------------
 *     "אני רוצה לחבר מפה אמיתית שונראה איך העולם שלנו והקוד שלנו יושב
 *      עליה אולי יהיה יותר קל לשים את החנויות והדמויות על מפה אמיתית"
 *
 * and, the time before:
 *
 *     "במקום בתים אמיתיים יהיו את המבנים והדמויות שלנו? ורק הצורה של
 *      המפה תהיה אמיתית?"
 *
 * That second sentence is the specification, and it rules out the obvious
 * implementation. He does not want a photograph of a city with our icons
 * floating over it — he wants OUR city, standing on a REAL STREET PLAN.
 * Tiles are the wrong material for that: a tile is a picture of somebody
 * else's buildings, and the moment one is on screen our shopfronts are
 * stickers on it.
 *
 * So what is real here is the GEOMETRY, not the imagery. Road centrelines,
 * carriageway widths, parks, water, and the building plots that front the
 * streets — the shape of a place. We draw it ourselves, in the world's own
 * palette, and our shops stand on its real plots.
 *
 * That has three consequences worth stating, because each one is a thing
 * that used to be hard and stops being hard:
 *
 *   1. NO VENDOR DECISION. `/CLAUDE.md §4` lists the maps vendor as a human
 *      decision this codebase must not invent, and a tile URL in a config
 *      file is exactly that decision made quietly. Geometry has no such
 *      problem: an extract is a file, and the file is attributed.
 *
 *   2. THE SHOPS PLACE THEMSELVES. `PLATE_SPOTS` are eleven numbers
 *      measured off a painting with a pixel script, and they are wrong the
 *      day the painting changes. A real plot that fronts a real street is
 *      a place a shop can stand by construction — `plotSpotsFromGeo` below
 *      computes them instead of measuring them. This is precisely the
 *      "יותר קל לשים את החנויות" Amit guessed at, and he guessed right.
 *
 *   3. SIZES BECOME TRUE. On the painted plate a person is `personHeight`,
 *      a fraction of the world width chosen by eye. On a real extract the
 *      world has METRES in it, so a 1.7m person and a 4.8m van are drawn at
 *      1.7m and 4.8m. Amit has asked for correct proportions more than once
 *      and every answer so far has been a better guess; this is the first
 *      one that is not a guess.
 *
 * ---------------------------------------------------------------------
 * AND THE ONE THING THAT GETS HARDER
 * ---------------------------------------------------------------------
 * `/CLAUDE.md §3`: never fabricate availability, demand or an ETA. On an
 * invented street that rule is about copy. On a real street it is about
 * every drawn position, because a figure standing on a real corner is a
 * claim that somebody is on that corner. See `geo-truth.ts`, which is the
 * other half of this change and is not optional.
 *
 * ---------------------------------------------------------------------
 * COORDINATES
 * ---------------------------------------------------------------------
 * Nothing downstream learns about latitude. A `WorldGeo` carries a bounding
 * box, and `projectToWorld` turns a real coordinate into the same
 * `{u, v} ∈ [0,1]²` every venue, route, walker and camera in this codebase
 * already speaks. The projection is Web Mercator, so shapes are locally
 * correct and a right angle in the world is a right angle on screen.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A bounding box, in the order every extract tool in the world writes it. */
export interface GeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * What a road is, coarsely, because we draw four widths and not forty.
 *
 * OSM has dozens of `highway=` values. They collapse to these because the
 * only questions the world asks are "how wide do I draw it", "may a vehicle
 * drive it" and "is this the spine of the place".
 */
export type GeoWayKind = "ARTERIAL" | "STREET" | "SERVICE" | "PATH";

export interface GeoWay {
  id: string;
  kind: GeoWayKind;
  /** Carriageway width in metres — kerb to kerb, not including pavement. */
  widthMetres: number;
  nameHe?: string;
  points: readonly GeoPoint[];
}

export type GeoAreaKind = "WATER" | "GREEN" | "PLOT" | "SQUARE";

export interface GeoArea {
  id: string;
  kind: GeoAreaKind;
  /** Closed ring. The first point is not repeated at the end. */
  ring: readonly GeoPoint[];
}

export interface WorldGeo {
  id: string;
  nameHe: string;
  /**
   * WHETHER THIS IS A PLACE.
   *
   * A fixture that exercises the renderer is not a neighbourhood, and the
   * difference matters at exactly one moment: when a figure is drawn on it
   * and somebody reads a street off the screen. `false` is carried all the
   * way to the surface, where it is watermarked — see `RealMapSurface`.
   */
  real: boolean;
  /** Required for a real extract. ODbL is not a formality. */
  attribution: string;
  /** Where the extract came from, so it can be refetched and checked. */
  source: string;
  /** ISO timestamp. Street plans change; an undated extract cannot age. */
  fetchedAt: string;
  bounds: GeoBounds;
  ways: readonly GeoWay[];
  areas: readonly GeoArea[];
}

/* ------------------------------------------------------------------ */
/* PROJECTION                                                          */
/* ------------------------------------------------------------------ */

const DEG = Math.PI / 180;

/** Web Mercator's y, in radians of the projected plane. */
export function mercatorY(lat: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  return Math.log(Math.tan(Math.PI / 4 + (clamped * DEG) / 2));
}

/** The inverse, so a tapped point on our world can name a real place. */
export function inverseMercatorY(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / DEG;
}

/**
 * The extract's own aspect ratio — the `PLATE_ASPECT` of a real place.
 *
 * Width over height, measured on the projected plane rather than in
 * degrees, because a degree of longitude is shorter than a degree of
 * latitude everywhere except the equator and Tel Aviv is not on it. Getting
 * this wrong stretches the whole city by 20% and every road meets every
 * other road at the wrong angle.
 */
export function geoAspect(bounds: GeoBounds): number {
  const dx = bounds.east - bounds.west;
  const dy = (mercatorY(bounds.north) - mercatorY(bounds.south)) / DEG;
  if (dy === 0) return 1;
  return dx / dy;
}

/**
 * Metres across the box, on the same earth the projection uses.
 *
 * ---------------------------------------------------------------------
 * WHY BOTH OF THESE ARE WRITTEN IN MERCATOR AND NOT IN DEGREES
 * ---------------------------------------------------------------------
 * The obvious pair is `Δlng · 111320 · cos φ` for width and `Δlat · 110574`
 * for height, and those two constants are both right — on the WGS84
 * ellipsoid, where a degree of latitude is 0.67% longer than the sphere
 * says. `projectToWorld` is spherical Mercator, so mixing the ellipsoid's
 * constants into the metres made the drawn aspect and the measured one
 * disagree by exactly that 0.67%, and a test caught it.
 *
 * 0.67% of a 620m neighbourhood is four metres, which is a lane. More to
 * the point it is the SIGN of a fault rather than its size: it means the
 * picture is being drawn on one earth and measured on another, and the two
 * numbers that have to agree for `metresToWorld` to be correct on both
 * axes were arrived at independently. So both are spherical, like the
 * projection, and they agree by construction.
 *
 * In Mercator the ground distance of a step in the projected y is
 * `R · Δy · cos φ`, which is why the same cosine appears in both.
 */
const EARTH_R = 6378137;

export function geoWidthMetres(bounds: GeoBounds): number {
  const midLat = (bounds.north + bounds.south) / 2;
  return EARTH_R * (bounds.east - bounds.west) * DEG * Math.cos(midLat * DEG);
}

/** Metres top to bottom, on that same sphere. */
export function geoHeightMetres(bounds: GeoBounds): number {
  const midLat = (bounds.north + bounds.south) / 2;
  return EARTH_R * (mercatorY(bounds.north) - mercatorY(bounds.south)) * Math.cos(midLat * DEG);
}

/** A real coordinate, in the `{u,v}` the rest of this codebase speaks. */
export function projectToWorld(bounds: GeoBounds, p: GeoPoint): NormalizedPoint {
  const dx = bounds.east - bounds.west;
  const yN = mercatorY(bounds.north);
  const yS = mercatorY(bounds.south);
  const dy = yN - yS;
  return {
    u: dx === 0 ? 0.5 : (p.lng - bounds.west) / dx,
    v: dy === 0 ? 0.5 : (yN - mercatorY(p.lat)) / dy,
  };
}

/** And back, for the day a tap on our world has to become an address. */
export function unprojectFromWorld(bounds: GeoBounds, n: NormalizedPoint): GeoPoint {
  const yN = mercatorY(bounds.north);
  const yS = mercatorY(bounds.south);
  return {
    lng: bounds.west + n.u * (bounds.east - bounds.west),
    lat: inverseMercatorY(yN - n.v * (yN - yS)),
  };
}

/**
 * Metres, as a fraction of the world's width.
 *
 * The one number that makes proportions true rather than chosen. Mercator
 * is conformal, so at the scale of one neighbourhood this same scalar is
 * correct on both axes of the drawn picture — which is only true because
 * the world box is built at `geoAspect`. Draw the box at the phone's aspect
 * instead and this number is a lie on one axis, which is the identical
 * mistake `PLATE_ASPECT` exists to prevent.
 */
export function metresToWorld(bounds: GeoBounds, metres: number): number {
  const w = geoWidthMetres(bounds);
  return w === 0 ? 0 : metres / w;
}

export function worldToMetres(bounds: GeoBounds, world: number): number {
  return world * geoWidthMetres(bounds);
}

/* ------------------------------------------------------------------ */
/* GEOMETRY IN WORLD SPACE                                             */
/* ------------------------------------------------------------------ */

export interface WorldWay {
  id: string;
  kind: GeoWayKind;
  nameHe?: string;
  points: readonly NormalizedPoint[];
  /** Half the carriageway, in world units, ready to draw a kerb with. */
  halfWidth: number;
}

export function wayInWorld(bounds: GeoBounds, way: GeoWay): WorldWay {
  return {
    id: way.id,
    kind: way.kind,
    nameHe: way.nameHe,
    points: way.points.map((p) => projectToWorld(bounds, p)),
    halfWidth: metresToWorld(bounds, way.widthMetres) / 2,
  };
}

export interface WorldArea {
  id: string;
  kind: GeoAreaKind;
  ring: readonly NormalizedPoint[];
}

export function areaInWorld(bounds: GeoBounds, area: GeoArea): WorldArea {
  return { id: area.id, kind: area.kind, ring: area.ring.map((p) => projectToWorld(bounds, p)) };
}

/** Everything projected once, because projecting per frame is a jank budget. */
export interface WorldPlan {
  geo: WorldGeo;
  ways: readonly WorldWay[];
  areas: readonly WorldArea[];
  /** The world's shape, to be used exactly where `PLATE_ASPECT` is used. */
  aspect: number;
  widthMetres: number;
}

export function planWorld(geo: WorldGeo): WorldPlan {
  return {
    geo,
    ways: geo.ways.map((w) => wayInWorld(geo.bounds, w)),
    areas: geo.areas.map((a) => areaInWorld(geo.bounds, a)),
    aspect: geoAspect(geo.bounds),
    widthMetres: geoWidthMetres(geo.bounds),
  };
}

/** Ring area, signed — negative is clockwise. Used for centroids and sizes. */
export function ringArea(ring: readonly NormalizedPoint[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    a += p.u * q.v - q.u * p.v;
  }
  return a / 2;
}

export function ringCentroid(ring: readonly NormalizedPoint[]): NormalizedPoint {
  const a = ringArea(ring);
  if (a === 0) {
    // A degenerate ring still has to answer, or one bad plot in an extract
    // takes the whole city down with a NaN.
    const n = ring.length || 1;
    return {
      u: ring.reduce((s, p) => s + p.u, 0) / n,
      v: ring.reduce((s, p) => s + p.v, 0) / n,
    };
  }
  let u = 0;
  let v = 0;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % ring.length]!;
    const cross = p.u * q.v - q.u * p.v;
    u += (p.u + q.u) * cross;
    v += (p.v + q.v) * cross;
  }
  return { u: u / (6 * a), v: v / (6 * a) };
}

export interface NearestOnWay {
  /** The closest point on the centreline. */
  at: NormalizedPoint;
  /** Distance from the query point to it, in world units. */
  distance: number;
  /** The centreline's direction there, unit length. */
  heading: NormalizedPoint;
  /** Which side of the way the query point is on. */
  side: -1 | 1;
}

/** Closest point on a polyline, with enough about it to face a shop. */
export function nearestOnPolyline(
  points: readonly NormalizedPoint[],
  q: NormalizedPoint
): NearestOnWay | null {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return {
      at: points[0]!,
      distance: Math.hypot(q.u - points[0]!.u, q.v - points[0]!.v),
      heading: { u: 1, v: 0 },
      side: 1,
    };
  }
  let best: NearestOnWay | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const du = b.u - a.u;
    const dv = b.v - a.v;
    const len2 = du * du + dv * dv;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((q.u - a.u) * du + (q.v - a.v) * dv) / len2));
    const at = { u: a.u + du * t, v: a.v + dv * t };
    const d = Math.hypot(q.u - at.u, q.v - at.v);
    if (!best || d < best.distance) {
      const len = Math.sqrt(len2) || 1;
      const heading = { u: du / len, v: dv / len };
      // Cross product of the heading with the offset: sign is the side.
      const cross = heading.u * (q.v - at.v) - heading.v * (q.u - at.u);
      best = { at, distance: d, heading, side: cross >= 0 ? 1 : -1 };
    }
  }
  return best;
}

/** The nearest carriageway of any kind, across the whole plan. */
export function nearestWay(plan: WorldPlan, q: NormalizedPoint): { way: WorldWay; on: NearestOnWay } | null {
  let best: { way: WorldWay; on: NearestOnWay } | null = null;
  for (const way of plan.ways) {
    const on = nearestOnPolyline(way.points, q);
    if (!on) continue;
    if (!best || on.distance < best.on.distance) best = { way, on };
  }
  return best;
}

/** Is this point inside the carriageway of any road? */
export function inCarriageway(plan: WorldPlan, q: NormalizedPoint): boolean {
  const near = nearestWay(plan, q);
  return near !== null && near.on.distance <= near.way.halfWidth;
}

export function pointInRing(ring: readonly NormalizedPoint[], q: NormalizedPoint): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const straddles = a.v > q.v !== b.v > q.v;
    if (straddles && q.u < ((b.u - a.u) * (q.v - a.v)) / (b.v - a.v) + a.u) inside = !inside;
  }
  return inside;
}

/* ------------------------------------------------------------------ */
/* THE ROAD A VEHICLE DRIVES                                           */
/* ------------------------------------------------------------------ */

/**
 * The spine of the place, as `ROAD_SAMPLES` — the same twelve-ish rows the
 * painted plate produces, so nothing that already drives learns a new shape.
 *
 * "The spine" is the longest ARTERIAL, falling back to the longest STREET.
 * Amit's complaint that started this — *"שיסעו כמו שצריך בכביש"* — was about
 * vehicles wandering off a hand-measured centreline. A real centreline
 * cannot be wandered off, because it is where the road is.
 */
export function spineOf(plan: WorldPlan): WorldWay | null {
  const length = (w: WorldWay) => {
    let t = 0;
    for (let i = 1; i < w.points.length; i++) {
      t += Math.hypot(w.points[i]!.u - w.points[i - 1]!.u, w.points[i]!.v - w.points[i - 1]!.v);
    }
    return t;
  };
  const arterials = plan.ways.filter((w) => w.kind === "ARTERIAL");
  const pool = arterials.length > 0 ? arterials : plan.ways.filter((w) => w.kind === "STREET");
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (length(b) > length(a) ? b : a));
}

/**
 * Resampled front-to-back, because `roadAt(v)` looks a road up BY DEPTH and
 * therefore needs one row per depth, sorted, with no two rows at the same v.
 *
 * A real street that doubles back on itself would give two carriageway
 * positions at one v, and `roadAt` can only return one. Rather than silently
 * taking whichever came last, the doubled section is dropped: the sample
 * kept at each depth is the one nearest the previous row, which follows the
 * street a driver is actually on instead of teleporting across a hairpin.
 */
export function roadSamplesFromGeo(plan: WorldPlan, rows = 12): RoadSample[] {
  const spine = spineOf(plan);
  if (!spine || spine.points.length < 2) return [];

  const widthWorld = spine.halfWidth * 2;
  const vs = spine.points.map((p) => p.v);
  const top = Math.max(0, Math.min(...vs));
  const bottom = Math.min(1, Math.max(...vs));
  if (bottom - top < 1e-6) return [];

  const out: RoadSample[] = [];
  let previousU: number | null = null;
  for (let i = 0; i < rows; i++) {
    const v = top + ((bottom - top) * i) / (rows - 1);
    // Every crossing of this depth, so a hairpin offers both and we choose.
    const candidates: number[] = [];
    for (let k = 1; k < spine.points.length; k++) {
      const a = spine.points[k - 1]!;
      const b = spine.points[k]!;
      if (a.v === b.v) continue;
      const t = (v - a.v) / (b.v - a.v);
      if (t < 0 || t > 1) continue;
      candidates.push(a.u + (b.u - a.u) * t);
    }
    if (candidates.length === 0) continue;
    const anchor = previousU;
    const u: number =
      anchor === null
        ? candidates[0]!
        : candidates.reduce((best, c) => (Math.abs(c - anchor) < Math.abs(best - anchor) ? c : best));
    previousU = u;
    out.push({ u, v, width: widthWorld });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* WHERE A SHOP STANDS                                                 */
/* ------------------------------------------------------------------ */

export interface PlotSpot extends NormalizedPoint {
  /** The plot it stands on. */
  plotId: string;
  /** The road it fronts. */
  wayId: string;
  /** Metres from the kerb to the doorstep. */
  setbackMetres: number;
  /**
   * Which way the shopfront faces, as a unit vector pointing at the road.
   *
   * A shopfront drawn facing away from the street is the single most
   * obvious thing wrong with a city, and on the painted plate it was
   * unfixable because the painting decided. Here it is arithmetic.
   */
  facing: NormalizedPoint;
  /** Plot footprint in square metres — a kiosk should not get a warehouse. */
  areaMetres: number;
}

export interface PlotSpotOptions {
  /** How far apart two shopfronts must be, in world units. */
  separation?: number;
  /** Nothing nearer the viewer than the customer. */
  maxV?: number;
  /** A plot further than this from any road is not a shopfront site. */
  maxSetbackMetres?: number;
  /** Below this the plot is a shed. */
  minAreaMetres?: number;
}

/**
 * Real plots that front a real street, ready for a shopfront.
 *
 * This is the function Amit was reaching for. The painted-plate version of
 * it is `measure-spots.mjs`, three hundred lines of integral images eroding
 * a bitmap to find somewhere flat, and it was wrong twice — once because it
 * scored the doorstep instead of the building, once because it thought a
 * zebra crossing was pavement. Neither mistake is expressible here: a plot
 * is a plot because a surveyor said so, and a road is a road for the same
 * reason.
 *
 * Ordered by frontage quality — biggest plots nearest a road first — so
 * taking the first eleven gives the eleven best addresses in the extract
 * rather than the eleven that happen to come first in the file.
 */
export function plotSpotsFromGeo(plan: WorldPlan, opts: PlotSpotOptions = {}): PlotSpot[] {
  const separation = opts.separation ?? 0.06;
  const maxV = opts.maxV ?? 0.86;
  const maxSetback = opts.maxSetbackMetres ?? 45;
  const minArea = opts.minAreaMetres ?? 40;

  const scored: Array<PlotSpot & { score: number }> = [];

  for (const area of plan.areas) {
    if (area.kind !== "PLOT") continue;
    if (area.ring.length < 3) continue;

    const centre = ringCentroid(area.ring);
    const areaMetres = Math.abs(ringArea(area.ring)) * plan.widthMetres * (plan.widthMetres / plan.aspect);
    if (areaMetres < minArea) continue;

    const near = nearestWay(plan, centre);
    if (!near) continue;

    const setbackMetres = worldToMetres(plan.geo.bounds, near.on.distance - near.way.halfWidth);
    if (setbackMetres < 0) continue; // the centroid is IN the road: bad extract, not a site
    if (setbackMetres > maxSetback) continue;

    // The doorstep: on the plot's side of the road, one pavement's width
    // clear of the kerb. Not the centroid, which is inside the building.
    const toRoadU = near.on.at.u - centre.u;
    const toRoadV = near.on.at.v - centre.v;
    const len = Math.hypot(toRoadU, toRoadV) || 1;
    const facing = { u: toRoadU / len, v: toRoadV / len };
    const kerbGap = metresToWorld(plan.geo.bounds, 2.5);
    const stand = near.way.halfWidth + kerbGap;
    const spot: NormalizedPoint = {
      u: near.on.at.u - facing.u * stand,
      v: near.on.at.v - facing.v * stand,
    };

    if (spot.v > maxV || spot.v < 0 || spot.u < 0 || spot.u > 1) continue;
    if (inCarriageway(plan, spot)) continue;

    scored.push({
      ...spot,
      plotId: area.id,
      wayId: near.way.id,
      setbackMetres,
      facing,
      areaMetres,
      // A big plot right on a main road is a better address than a big
      // plot down an alley, and both beat a cupboard on a main road.
      score: Math.sqrt(areaMetres) / (1 + setbackMetres) * (near.way.kind === "ARTERIAL" ? 1.35 : 1),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const kept: PlotSpot[] = [];
  for (const s of scored) {
    if (kept.some((k) => Math.hypot(k.u - s.u, k.v - s.v) < separation)) continue;
    const { score: _score, ...spot } = s;
    void _score;
    kept.push(spot);
  }
  return kept;
}

/* ------------------------------------------------------------------ */
/* WHAT MAKES AN EXTRACT USABLE                                        */
/* ------------------------------------------------------------------ */

/**
 * Everything wrong with an extract, as a list rather than a crash.
 *
 * An extract arrives from a script run on somebody else's machine against
 * a server this container cannot reach, which is the exact profile of an
 * input that shows up broken six months from now with no one around who
 * remembers the shape. So it is checked, loudly, at the seam.
 */
export function geoViolations(geo: WorldGeo): string[] {
  const out: string[] = [];
  const b = geo.bounds;

  if (!(b.north > b.south)) out.push("the bounding box has no height");
  if (!(b.east > b.west)) out.push("the bounding box has no width");
  if (Math.abs(b.north) > 85 || Math.abs(b.south) > 85) out.push("the bounding box leaves Mercator");

  const widthM = geoWidthMetres(b);
  const heightM = geoHeightMetres(b);
  // A neighbourhood, not a country. Above about 4km the road network is
  // too dense to draw as shapes and too coarse to walk.
  if (widthM > 4000 || heightM > 4000) out.push(`the extract is ${Math.round(Math.max(widthM, heightM))}m across, which is a city and not a neighbourhood`);
  if (widthM < 200 || heightM < 200) out.push("the extract is smaller than a block");

  if (geo.ways.length === 0) out.push("there are no roads in the extract");
  if (geo.ways.some((w) => w.points.length < 2)) out.push("a road has fewer than two points");
  if (geo.ways.some((w) => !(w.widthMetres > 0))) out.push("a road has no width");
  if (geo.areas.some((a) => a.ring.length < 3)) out.push("an area has fewer than three points");

  const plan = planWorld(geo);
  if (spineOf(plan) === null) out.push("the extract has no street a vehicle could drive");

  /*
   * The aspect computed from the projection and the aspect computed from
   * the metres must agree, because `metresToWorld` uses the first to make
   * the second true on both axes. They agree by construction today — see
   * `geoWidthMetres` for the version where they did not — so this is a
   * guard against a future edit that changes one of the three and not the
   * others, which is the only way this can come apart.
   */
  const drawn = geoAspect(b);
  const measured = widthM / heightM;
  if (Math.abs(drawn - measured) / drawn > 0.005) {
    out.push("the projected aspect and the measured one disagree, so metres are wrong on one axis");
  }

  if (geo.real) {
    if (!geo.attribution.trim()) out.push("a real extract with no attribution may not be drawn");
    if (!geo.source.trim()) out.push("a real extract must say where it came from");
    if (Number.isNaN(Date.parse(geo.fetchedAt))) out.push("a real extract must be dated");
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* HOW CLOSE THE CAMERA STANDS, WHEN THE WORLD HAS METRES IN IT        */
/* ------------------------------------------------------------------ */

/**
 * THE SCALE MISMATCH, AND THE ONLY HONEST WAY OUT OF IT.
 *
 * ---------------------------------------------------------------------
 * WHAT THE FIRST SCREENSHOT SHOWED
 * ---------------------------------------------------------------------
 * Our city dropped onto a real 620m extract and every shopfront was a
 * hundred metres wide. Nothing was misplaced — `WORLD_SIZE.district` is
 * 0.16 of the world, and 0.16 of 620m is 99m. It looked exactly like the
 * bug Amit named months ago about the vehicles: *"הכל בגודל לא נכון."*
 *
 * The cause is that the painted plate is not a neighbourhood at all. It is
 * a picture of about a hundred metres of street, drawn as if it were the
 * whole world, and every size in `WORLD_SIZE` is a fraction of THAT. Those
 * numbers are right for the painting and meaningless against metres.
 *
 * ---------------------------------------------------------------------
 * THE TWO WAYS OUT, AND WHY THIS ONE
 * ---------------------------------------------------------------------
 * Either fetch a 150m extract so the art's scale happens to fit, or draw
 * things at their real size and move the camera in. The first is choosing
 * the world to flatter the drawing, and it puts a ceiling on the place —
 * a 150m extract has four streets in it and Amit's whole complaint about
 * the plaza was that you could see all of it.
 *
 * So: sizes in metres, and a shot is a NUMBER OF METRES ACROSS THE FRAME
 * rather than a fraction of whatever the world happens to be. A shopfront
 * is sixteen metres wide on a 620m extract and on a 4km one; walking past
 * three of them takes as long as walking past three real ones. That is the
 * thing a real map is actually for.
 */
export const SHOT_METRES = {
  /** The whole place, from above. */
  WIDE: 460,
  /** A trade's corner of it. */
  DISTRICT: 190,
  /** One shopfront, filling the frame. */
  VENUE: 75,
  /** A journey, both ends visible. */
  ROUTE: 280,
  /**
   * Walking. Close enough to read a sign, wide enough to see a junction.
   *
   * Three numbers before this one. 115 put a 16m shopfront at 14% of the
   * screen — correct, and too small to be what the screen is about. 90
   * made the shopfront read and lost the city: at a street's width plus
   * its buildings there is no junction in frame, so the world stopped
   * looking like a place and started looking like a corridor, which is
   * the exact complaint that killed the plaza.
   *
   * 150 holds both. A shopfront is a tenth of the screen — big enough to
   * recognise, small enough that three of them and a crossroads fit — and
   * there is always a turning in view that has not been taken.
   */
  EXPLORE: 150,
} as const;

export type GeoShot = keyof typeof SHOT_METRES;

/**
 * The zoom that puts `SHOT_METRES[shot]` across the viewport.
 *
 * Inverted straight out of `worldBox`: a world drawn `WORLD_EXTENT.width *
 * zoom` viewports wide shows `widthMetres / (WORLD_EXTENT.width * zoom)`
 * metres at a time. No camera code changes — the camera has always taken a
 * zoom, and this is just the first time anybody could say what one means.
 */
export function geoZoomFor(shot: GeoShot, bounds: GeoBounds, extentWidth = 2.4): number {
  const metres = SHOT_METRES[shot];
  if (metres <= 0) return 1;
  return geoWidthMetres(bounds) / (extentWidth * metres);
}

/**
 * The sizes the world's own objects have, in metres.
 *
 * Deliberately few, and deliberately boring. A shopfront is sixteen metres
 * because high-street frontages are twelve to twenty; a person is 1.7m
 * because people are. The point of this table is that there is nothing to
 * argue about in it, which is the opposite of the table it replaces.
 */
export const REAL_METRES = {
  shopFrontage: 16,
  personHeight: 1.7,
  /** How near a shop you must be for it to count as underfoot. */
  reach: 14,
} as const;

/* ------------------------------------------------------------------ */
/* THE GROUND PLANE, TILTED                                            */
/* ------------------------------------------------------------------ */

/**
 * A MAP IS SEEN FROM ABOVE AND A WORLD IS SEEN FROM THE STREET.
 *
 * ---------------------------------------------------------------------
 * THE CONTRADICTION THE FIRST BUILD SHIPPED WITH
 * ---------------------------------------------------------------------
 * Our city is drawn in 3/4 — shopfronts with a roof and a side, figures
 * standing up, vehicles with a top and a flank. A street plan is drawn
 * from directly overhead. The first version of the real map put one on
 * the other and it reads well enough in a screenshot, which is exactly
 * what makes it dangerous: two incompatible projections, held together by
 * the eye being generous.
 *
 * ChatGPT, asked which way to resolve it:
 *
 *     "הייתי בוחר להטות את מישור העולם, ולא להשאיר מפה שטוחה עם בניינים
 *      זקופים... אם הכביש נשאר 90° מלמעלה והחנות/האדם/הרכב ב-3/4, המוח
 *      יקרא אותם כאייקונים שמונחים על מפה — בדיוק אותה בעיית 'מדבקה'
 *      שנלחמנו בה עם הרכבים."
 *
 * That is the same sentence that killed the side-view vehicles, applied
 * one level up. A flat plan with upright buildings on it is a sticker
 * album; the buildings were never the problem.
 *
 * ---------------------------------------------------------------------
 * AND WHY THE TILT IS IN THE PROJECTION RATHER THAN IN A TRANSFORM
 * ---------------------------------------------------------------------
 * The obvious build is `rotateX` on the world container with every
 * standing object counter-rotated about its own base. It needs
 * `transformOrigin`, which React Native 0.74 does not have; it puts a 3D
 * transform on the layer that is already carrying the camera; and it
 * makes hit-testing a projection problem.
 *
 * None of that is necessary, because this world ALREADY has a ground
 * plane in it. `depthScale` has drawn far things smaller since the plaza,
 * and every figure and building is sized through it. The only thing
 * missing was that POSITIONS stayed linear while SIZES were perspective —
 * a quiet inconsistency that has been there the whole time and that the
 * painted plate hid, because the painting had the perspective baked in.
 *
 * So the tilt is the projection those sizes always implied. Nothing
 * rotates, everything stands up by construction, and the same function
 * places the road, the shopfront and the walker — which is the only way
 * they can be guaranteed to agree.
 */

/** The far edge's scale relative to the near edge, at full tilt. */
const HORIZON_SCALE = 0.74 / 1.18;

/**
 * How tilted the ground is, 0 for a plan and 1 for the world's own 3/4.
 *
 * A function of how much of the place is in frame, not of a mode the user
 * picks. ChatGPT again, and this is the part that also answers Amit's
 * older complaint (*"שיהיה אפשרות להגדיל את המפה ולראות מרחוק... שאדע
 * לאן יש לי ללכת"*):
 *
 *     "ב-Explore המישור מוטה בערך 28–35°... ב-Overview, כשהמשתמש עושה
 *      zoom-out כדי להבין לאן ללכת, המצלמה עולה בהדרגה לכיוון top-down.
 *      לא שני עולמות ולא שתי מפות — אותו עולם, מצלמה אחת שמשנה pitch
 *      לפי zoom."
 *
 * Which is right, and is how a person actually uses a place: you walk at
 * street level and you plan from above. Below 200m across the frame you
 * are in the street; past 620m you are reading a map; between them the
 * camera rises, and because it is one continuous function there is never
 * a cut between two worlds.
 */
export const STREET_METRES = 200;
export const PLAN_METRES = 620;

export function pitchForMetres(metresAcross: number): number {
  if (metresAcross <= STREET_METRES) return 1;
  if (metresAcross >= PLAN_METRES) return 0;
  const t = (metresAcross - STREET_METRES) / (PLAN_METRES - STREET_METRES);
  // Smoothstep, so the horizon does not start or stop moving abruptly —
  // a linear rise reads as the ground being winched.
  return 1 - t * t * (3 - 2 * t);
}

/** The same question asked of a shot rather than of a number. */
export function pitchForShot(shot: GeoShot): number {
  return pitchForMetres(SHOT_METRES[shot]);
}

/** How much the ground narrows at depth `v`, at this tilt. */
export function groundScale(v: number, pitch: number): number {
  const full = HORIZON_SCALE + (1 - HORIZON_SCALE) * Math.max(0, Math.min(1, v));
  return 1 + pitch * (full - 1);
}

/**
 * A point on the flat plan, placed on the tilted ground.
 *
 * `u` converges towards the middle with distance, which is what makes two
 * parallel kerbs meet at a vanishing point. `v` compresses, because equal
 * steps up the street cover less and less of the picture — that integral
 * is the whole difference between a tilted plane and a squashed one, and
 * skipping it is why "just scale the map vertically" always looks wrong.
 *
 * At `pitch = 0` this is the identity, exactly, so the plan view is the
 * real geometry untouched rather than a nearly-flat 3/4.
 */
export function groundProject(p: NormalizedPoint, pitch: number): NormalizedPoint {
  if (pitch <= 0) return p;
  const s = groundScale(p.v, pitch);
  return { u: 0.5 + (p.u - 0.5) * s, v: groundDepth(p.v, pitch) };
}

/**
 * Where depth `v` lands on the picture.
 *
 * ∫₀ᵛ s / ∫₀¹ s, with `s` linear in v, which has a closed form — so this
 * is arithmetic rather than a table, and it is exact at both ends.
 */
export function groundDepth(v: number, pitch: number): number {
  if (pitch <= 0) return v;
  const a = groundScale(0, pitch);
  const b = groundScale(1, pitch);
  const total = (a + b) / 2;
  if (total === 0) return v;
  const x = Math.max(0, Math.min(1, v));
  return (a * x + ((b - a) * x * x) / 2) / total;
}

/** The inverse, for turning a tap back into a place on the plan. */
export function groundUnproject(p: NormalizedPoint, pitch: number): NormalizedPoint {
  if (pitch <= 0) return p;
  const a = groundScale(0, pitch);
  const b = groundScale(1, pitch);
  const total = (a + b) / 2;
  /*
   * Solve ((b-a)/2)x² + a·x − total·v = 0 for x, taking the root in [0,1].
   * `b === a` is the untilted case and would divide by zero.
   */
  const A = (b - a) / 2;
  const C = -total * p.v;
  const x =
    Math.abs(A) < 1e-9 ? -C / a : (-a + Math.sqrt(Math.max(0, a * a - 4 * A * C))) / (2 * A);
  const v = Math.max(0, Math.min(1, x));
  const s = groundScale(v, pitch);
  return { u: 0.5 + (p.u - 0.5) / (s || 1), v };
}

/**
 * Everything the tilt has to be true of, as a test rather than a diagram.
 *
 * A projection is the kind of code that is obviously right and quietly
 * off by a factor, and the symptom is a shopfront half a street from its
 * own doorstep — which nobody can see, because the doorstep is not drawn.
 */
export function groundViolations(pitch: number): string[] {
  const out: string[] = [];

  // The frame's edges are the frame's edges at any tilt, or the world
  // shrinks away from the screen and shows the background behind it.
  if (Math.abs(groundDepth(0, pitch)) > 1e-9) out.push("the far edge has left the top of the frame");
  if (Math.abs(groundDepth(1, pitch) - 1) > 1e-9) out.push("the near edge has left the bottom of the frame");

  // The middle of the road stays the middle of the road.
  const spine = groundProject({ u: 0.5, v: 0.3 }, pitch);
  if (Math.abs(spine.u - 0.5) > 1e-9) out.push("the vanishing point is not on the centre line");

  // Monotonic, or two places up the street swap over.
  let last = -Infinity;
  for (let i = 0; i <= 20; i++) {
    const d = groundDepth(i / 20, pitch);
    if (d < last) out.push("depth is not monotonic, so the street folds over itself");
    last = d;
  }

  // Round-trip, which is the one that catches a wrong constant.
  for (const v of [0, 0.17, 0.5, 0.83, 1]) {
    for (const u of [0, 0.25, 0.5, 1]) {
      const back = groundUnproject(groundProject({ u, v }, pitch), pitch);
      if (Math.abs(back.u - u) > 1e-6 || Math.abs(back.v - v) > 1e-6) {
        out.push(`(${u}, ${v}) does not survive a round trip through the ground plane`);
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* WHERE A REAL BUSINESS STANDS                                        */
/* ------------------------------------------------------------------ */

/**
 * A REAL POSITION, PUT ON A FRONTAGE.
 *
 * ---------------------------------------------------------------------
 * THE PRODUCT DECISION THIS IMPLEMENTS
 * ---------------------------------------------------------------------
 * Amit, once the real map existed:
 *
 *     "לא מעניין אותי המבנים האמיתיים רק הצורה של העיר, ועליה להלביש את
 *      העיר שלנו. ובזמן אמת כל איש מקצוע יקבל את העסק שלו לפי המיקום
 *      שלו. ובעתיד עסקים שירצו לפרסם יהיה להם עסק קבוע לפי הכתובת
 *      האמיתית שלהם."
 *
 * That resolves the hardest open question in this whole change, and it
 * resolves it in the direction that makes the honesty rule easy instead
 * of awkward. A shopfront on a real street is not decoration placed on
 * somebody's building — it is one of exactly two things:
 *
 *   1. A professional who is ONLINE RIGHT NOW, drawn at the location the
 *      server reports for them. The shop exists because they do, it
 *      appears when they go online and it goes when they go offline.
 *   2. Later, a paying business at ITS OWN verified address.
 *
 * Both are server facts, so both are `SERVER` provenance in
 * `geo-truth.ts` and both may carry a name. Nothing else stands on a real
 * street. `plotSpotsFromGeo` — which picks handsome plots — stops being
 * the product's placement rule the moment real supply exists; it is the
 * demo's, and the difference is recorded here rather than left implicit.
 *
 * ---------------------------------------------------------------------
 * AND WHAT IT DOES NOT CLAIM
 * ---------------------------------------------------------------------
 * ChatGPT, unprompted, on the same question:
 *
 *     "אל תנסו לגרום לחזית המצוירת להתאים ל-footprint של הבניין האמיתי
 *      שמתחתיה. ה-footprint נותן לכם anchor/orientation, לא טענה
 *      ש'המספרה הזאת נמצאת בתוך הבניין הזה'."
 *
 * So this returns an anchor and a direction and NOTHING about the plot:
 * no size, no shape, no plot id. A shopfront is always drawn at
 * `REAL_METRES.shopFrontage`, whatever it is standing in front of. A
 * shopfront that resized itself to the building behind it would be
 * asserting that the business occupies that building, which is a claim
 * about a stranger's property that we are in no position to make.
 */
export interface Frontage {
  /** Where the shopfront stands, in the world's own coordinates. */
  at: NormalizedPoint;
  /** Unit vector from the doorstep towards the road it faces. */
  facing: NormalizedPoint;
  /** The road it fronts. */
  wayId: string;
  /** How far the reported position was moved to reach the kerb, in metres. */
  movedMetres: number;
}

/**
 * Put a server-reported position on the nearest street frontage.
 *
 * A professional's location is a point, and a point is not a shop: dropped
 * straight onto the map it lands in the middle of a building, or in the
 * carriageway, or in a garden. This finds the road it is nearest, stands
 * the shopfront on the pavement beside that road, and faces it at the
 * traffic — which is what makes a street of them read as a street.
 *
 * `movedMetres` is not decoration either. It is how far we have shifted
 * somebody from where the server said they were, and a caller that is
 * about to tell a customer "he is here" needs to be able to see it. Past
 * a few tens of metres the honest answer is an area, not a shopfront.
 */
export function frontageNear(plan: WorldPlan, position: GeoPoint | NormalizedPoint): Frontage | null {
  const at =
    "lat" in position ? projectToWorld(plan.geo.bounds, position) : (position as NormalizedPoint);
  const near = nearestWay(plan, at);
  if (!near) return null;

  const kerbGap = metresToWorld(plan.geo.bounds, 2.5);
  const stand = near.way.halfWidth + kerbGap;

  /*
   * WHICH SIDE OF THE ROAD, AND WHAT TO DO WHEN THE ANSWER IS "ON IT".
   *
   * A position inside the carriageway has no side — the offset vector is
   * near zero and normalising it gives noise, which on screen is a shop
   * that faces a different way every time the position updates. In that
   * case the side comes from the road's own normal, chosen once and
   * deterministically, so a professional stopped at a light does not
   * pirouette.
   */
  const du = at.u - near.on.at.u;
  const dv = at.v - near.on.at.v;
  const len = Math.hypot(du, dv);
  const away =
    len > 1e-6
      ? { u: du / len, v: dv / len }
      : { u: -near.on.heading.v * near.on.side, v: near.on.heading.u * near.on.side };

  const spot = {
    u: near.on.at.u + away.u * stand,
    v: near.on.at.v + away.v * stand,
  };

  return {
    at: spot,
    facing: { u: -away.u, v: -away.v },
    wayId: near.way.id,
    movedMetres: worldToMetres(plan.geo.bounds, Math.hypot(spot.u - at.u, spot.v - at.v)),
  };
}

/**
 * How far a reported position may be moved before a shopfront is a lie.
 *
 * Twenty-five metres is about the width of a street and its pavements: a
 * professional standing anywhere in that band is, to a customer looking
 * for them, on that street. Beyond it the shop would be on a different
 * street from the person, and the right answer is to draw nothing and
 * say the area instead — which `/CLAUDE.md §3` requires and which is the
 * one thing a prettier marker cannot fix.
 */
export const MAX_FRONTAGE_SHIFT_METRES = 25;

export function frontageIsHonest(f: Frontage | null): boolean {
  return f !== null && f.movedMetres <= MAX_FRONTAGE_SHIFT_METRES;
}

/* ------------------------------------------------------------------ */
/* ROADS THAT STOP IN THE MIDDLE OF THE CITY                           */
/* ------------------------------------------------------------------ */

/**
 * A STREET THAT GOES NOWHERE IS A DRAWING MISTAKE, EVEN WHEN IT IS TRUE.
 *
 * ---------------------------------------------------------------------
 * WHAT AMIT SAW
 * ---------------------------------------------------------------------
 *     "שים לב מעכשיו שיש כבישים חתוכים באמצע המפה, אפשר לוותר עליהם
 *      ולשים שם מדשאות ועסקים שלנו עתידיים. דוג ווקרים ומאמני כושר."
 *
 * He is right, and it is worth being precise about why, because the
 * geometry is not wrong. An extract is a rectangle cut out of a city, so
 * it is full of ways that genuinely end: a service lane behind a
 * building, a cul-de-sac, a road whose continuation was simplified away.
 * All true, and all of them read as a road somebody forgot to finish.
 *
 * The exception is the frame. A road that runs off the EDGE of the
 * extract does not read as broken at all — it reads as the city
 * continuing, which is the property this world has been chasing since the
 * plaza was thrown away. So the rule is not "remove short roads", it is
 * "remove ends that stop where nothing is", and where the edge of the
 * frame is counts as somewhere.
 *
 * ---------------------------------------------------------------------
 * AND WHAT GOES THERE INSTEAD
 * ---------------------------------------------------------------------
 * Amit's own answer, and it is a product decision rather than a visual
 * one: green, and room for businesses that are not shopfronts. A dog
 * walker and a fitness trainer do not have a doorway, and a city of
 * nothing but shopfronts has nowhere to put them. The reclaimed ground
 * comes back as `GREEN`, which the world already knows how to draw, and
 * `reclaimed` is returned separately so a caller can treat those areas as
 * sites rather than as scenery.
 */
export interface PrunedGeo {
  geo: WorldGeo;
  /** The lawns that replaced the removed stubs. */
  reclaimed: GeoArea[];
  /** How many ends were trimmed, for a tool that wants to report it. */
  trimmed: number;
}

export interface PruneOptions {
  /**
   * How near the frame's edge an end may be and still count as leaving.
   *
   * Generous on purpose: an extract is clipped by a bounding box, and a
   * way's last vertex before the cut can be tens of metres inside it.
   * Too small and every road out of the city is treated as a stub and
   * deleted, which removes the roads that matter most.
   */
  edgeMetres?: number;
  /** A trimmed end longer than this is a real street, and is kept. */
  maxStubMetres?: number;
}

export function pruneDeadEnds(geo: WorldGeo, opts: PruneOptions = {}): PrunedGeo {
  const edgeMetres = opts.edgeMetres ?? 40;
  const maxStubMetres = opts.maxStubMetres ?? 140;

  const plan = planWorld(geo);
  const edge = metresToWorld(geo.bounds, edgeMetres);
  const snap = metresToWorld(geo.bounds, 1.2);
  const key = (p: NormalizedPoint) => `${Math.round(p.u / snap)}:${Math.round(p.v / snap)}`;

  /* How many way-ends and crossings meet at each point. */
  const degree = new Map<string, number>();
  const bump = (p: NormalizedPoint) => degree.set(key(p), (degree.get(key(p)) ?? 0) + 1);
  for (const way of plan.ways) for (const p of way.points) bump(p);

  const atFrame = (p: NormalizedPoint) =>
    p.u <= edge || p.u >= 1 - edge || p.v <= edge || p.v >= 1 - edge;

  const keptWays: GeoWay[] = [];
  const reclaimed: GeoArea[] = [];
  let trimmed = 0;

  /*
   * AN ISLAND IS A ROAD NOBODY CAN REACH AT ALL.
   *
   * The trimming below walks in from an end to the first junction, which
   * handles a spur off a street. It does nothing for a way that touches
   * NOTHING — and that is the worst case, because every metre of it is
   * unreachable: a vehicle could only drive it by being placed on it.
   *
   * Measured by distance to the other ways rather than by shared
   * vertices, because two roads that visibly meet on screen very often
   * do not share a point in an extract that has been simplified or
   * reprojected. Eight metres is about a carriageway: closer than that
   * and they are touching, whatever the file says.
   */
  const touchMetres = metresToWorld(geo.bounds, 8);
  const isIsland = plan.ways.map((way, i) => {
    let nearest = Infinity;
    for (let j = 0; j < plan.ways.length; j++) {
      if (j === i) continue;
      for (const p of way.points) {
        const on = nearestOnPolyline(plan.ways[j]!.points, p);
        if (on && on.distance < nearest) nearest = on.distance;
      }
    }
    return nearest > touchMetres;
  });

  for (let i = 0; i < plan.ways.length; i++) {
    const world = plan.ways[i]!;
    const source = geo.ways[i]!;

    /*
     * An island that also never leaves the frame is unreachable, whatever
     * its length — so it goes whole, and the ground it stood on becomes
     * lawn. One that runs off the edge is a road into the rest of the
     * city and is kept even though nothing in this rectangle connects to
     * it.
     */
    if (isIsland[i] && !world.points.some(atFrame)) {
      reclaimed.push(lawnOver(geo, source.points, source.widthMetres, `${source.id}_lawn`));
      trimmed++;
      continue;
    }
    /* Which of its own vertices are junctions with something else. */
    const junction = world.points.map((p) => (degree.get(key(p)) ?? 0) > 1);

    let first = 0;
    let last = world.points.length - 1;

    /*
     * Walk in from each end to the first junction. Everything before it
     * is a piece of road nobody can reach except by driving up it and
     * back, which is the thing that looks unfinished.
     */
    const stubLength = (from: number, to: number) => {
      let t = 0;
      const step = from < to ? 1 : -1;
      for (let k = from; k !== to; k += step) {
        const a = world.points[k]!;
        const b = world.points[k + step]!;
        t += Math.hypot(b.u - a.u, b.v - a.v);
      }
      return worldToMetres(geo.bounds, t);
    };

    if (!atFrame(world.points[0]!) && !junction[0]) {
      let k = 1;
      while (k < last && !junction[k] && !atFrame(world.points[k]!)) k++;
      if (stubLength(0, k) <= maxStubMetres) {
        reclaimed.push(lawnOver(geo, source.points.slice(0, k + 1), source.widthMetres, `${source.id}_lawn_a`));
        first = k;
        trimmed++;
      }
    }
    if (!atFrame(world.points[last]!) && !junction[last]) {
      let k = last - 1;
      while (k > first && !junction[k] && !atFrame(world.points[k]!)) k--;
      if (stubLength(last, k) <= maxStubMetres) {
        reclaimed.push(lawnOver(geo, source.points.slice(k), source.widthMetres, `${source.id}_lawn_b`));
        last = k;
        trimmed++;
      }
    }

    /*
     * A way trimmed to nothing is dropped entirely. Keeping a
     * single-point way would leave `geoViolations` complaining about a
     * road with fewer than two points — which is the correct complaint
     * about the wrong thing.
     */
    if (last - first >= 1) {
      keptWays.push({ ...source, points: source.points.slice(first, last + 1) });
    } else {
      trimmed++;
    }
  }

  return {
    geo: { ...geo, ways: keptWays, areas: [...geo.areas, ...reclaimed] },
    reclaimed,
    trimmed,
  };
}

/**
 * A lawn shaped like the road it replaces, and a little wider.
 *
 * Wider because the road had pavements either side and they are being
 * reclaimed too; a lawn exactly the carriageway's width leaves two strips
 * of nothing down the sides of a park.
 */
function lawnOver(
  geo: WorldGeo,
  points: readonly GeoPoint[],
  widthMetres: number,
  id: string
): GeoArea {
  const bounds = geo.bounds;
  const world = points.map((p) => projectToWorld(bounds, p));
  const half = metresToWorld(bounds, (widthMetres + 7) / 2);

  const left: NormalizedPoint[] = [];
  const right: NormalizedPoint[] = [];
  for (let i = 0; i < world.length; i++) {
    const a = world[Math.max(0, i - 1)]!;
    const b = world[Math.min(world.length - 1, i + 1)]!;
    const du = b.u - a.u;
    const dv = b.v - a.v;
    const len = Math.hypot(du, dv) || 1;
    const n = { u: -dv / len, v: du / len };
    const p = world[i]!;
    left.push({ u: p.u + n.u * half, v: p.v + n.v * half });
    right.push({ u: p.u - n.u * half, v: p.v - n.v * half });
  }
  const ring = [...left, ...right.reverse()];
  return { id, kind: "GREEN", ring: ring.map((p) => unprojectFromWorld(bounds, p)) };
}
