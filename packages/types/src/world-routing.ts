import type { NormalizedPoint } from "./virtual-venue";
import {
  type WorldPlan,
  type WorldWay,
  metresToWorld,
  nearestOnPolyline,
  worldToMetres,
} from "./world-geo";

/**
 * DRIVING THE REAL STREETS.
 *
 * ---------------------------------------------------------------------
 * THE COMPLAINT THIS ANSWERS, AND HOW MANY TIMES IT HAS BEEN MADE
 * ---------------------------------------------------------------------
 * Amit, more than once:
 *
 *     "גם הדמויות זזות ונוסעות לא טוב ומציאותי על הכביש."
 *     "חייב שהכלי רכב יסעו כמו שצריך על הכביש... חייב לעבוד טוב במסלול."
 *
 * Every answer so far has been a better interpolation. `assignment-route`
 * bends a curve between a shop and a customer and then nudges it towards
 * the carriageway that was measured off the painting; it is three legs
 * and two constants, and it is as close to a road as a drawing can get
 * without there being a road.
 *
 * On a real extract there IS a road, and a route stops being a shape to
 * be tuned and becomes a path to be found. A van that turns left at a
 * junction does it because the junction is there.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS NOT
 * ---------------------------------------------------------------------
 * Not an ETA. `/CLAUDE.md §3` — a real ETA comes from the server and from
 * a real routing provider, and the distance this returns is a distance
 * along drawn geometry with no traffic, no turn restrictions and no
 * one-way streets in it. `routeLengthMetres` exists so a caller can ask
 * how long a drawn path is; a caller that turns it into minutes and shows
 * them to a customer has invented an ETA, which is the single thing this
 * codebase is most careful about.
 *
 * It is also not a navigation instruction. Nobody is told to turn left.
 * It is the line a vehicle is drawn moving along.
 */

/* ------------------------------------------------------------------ */
/* THE GRAPH                                                           */
/* ------------------------------------------------------------------ */

interface Node {
  at: NormalizedPoint;
  /** Neighbour index and the length of the edge to it. */
  edges: Array<{ to: number; cost: number }>;
}

export interface RoadGraph {
  nodes: Node[];
  /** Where a coordinate lands, so two ways meeting at a point share it. */
  index: Map<string, number>;
  plan: WorldPlan;
}

/**
 * HOW NEAR IS THE SAME PLACE.
 *
 * OSM ways that meet at a junction share a node id and therefore exactly
 * the same coordinate, so an exact match would very nearly work. Very
 * nearly is the problem: an extract that has been simplified, reprojected
 * or hand-made has junctions that are a few centimetres apart, and a
 * graph built on exact equality quietly becomes a set of disconnected
 * streets — every route fails, and it fails by returning nothing rather
 * than by looking wrong.
 *
 * So coordinates are snapped to a grid of about a metre. Two ways that
 * end within a metre of each other are one junction, which is true of
 * every road ever built.
 */
const SNAP_METRES = 1.2;

function keyOf(p: NormalizedPoint, snap: number): string {
  return `${Math.round(p.u / snap)}:${Math.round(p.v / snap)}`;
}

/**
 * Turn the ways into something a route can be found in.
 *
 * Built once per extract and reused — a graph rebuilt per frame is the
 * kind of thing that works beautifully in a test and drops every frame on
 * a phone.
 */
export function buildRoadGraph(plan: WorldPlan): RoadGraph {
  const snap = metresToWorld(plan.geo.bounds, SNAP_METRES);
  const nodes: Node[] = [];
  const index = new Map<string, number>();

  const nodeAt = (p: NormalizedPoint): number => {
    const k = keyOf(p, snap);
    const found = index.get(k);
    if (found !== undefined) return found;
    const id = nodes.length;
    nodes.push({ at: p, edges: [] });
    index.set(k, id);
    return id;
  };

  const link = (a: number, b: number) => {
    if (a === b) return;
    const cost = Math.hypot(nodes[a]!.at.u - nodes[b]!.at.u, nodes[a]!.at.v - nodes[b]!.at.v);
    nodes[a]!.edges.push({ to: b, cost });
    nodes[b]!.edges.push({ to: a, cost });
  };

  for (const way of plan.ways) {
    /*
     * PATHS ARE WALKED, NOT DRIVEN. A footway is in the extract because
     * people use it, and a van routed down one is the single most
     * obviously wrong thing this could produce.
     */
    if (way.kind === "PATH") continue;
    let previous: number | null = null;
    for (const p of way.points) {
      const id = nodeAt(p);
      if (previous !== null) link(previous, id);
      previous = id;
    }
  }

  /*
   * ---------------------------------------------------------------------
   * AND THE JUNCTIONS NOBODY WROTE DOWN
   * ---------------------------------------------------------------------
   * Two streets that cross share a node in a well-formed OSM extract, and
   * do not in a hand-made one, a simplified one, or one where a road
   * passes under a bridge — and the code cannot tell those apart from the
   * geometry alone.
   *
   * Splitting at every intersection would invent a junction under every
   * bridge in the city. Not splitting leaves a fixture whose streets all
   * cross and none connect, so every route returns nothing. The rule
   * taken here is the conservative one for a WORLD rather than for
   * navigation: segments that cross are joined, because a vehicle taking
   * a turning that does not exist is a smaller error in a drawn city than
   * a vehicle that cannot leave its own street — and nobody is being told
   * to drive it.
   *
   * O(n²) over segments, which is fine for a neighbourhood (a few hundred)
   * and is why `geoViolations` refuses an extract larger than one.
   */
  const segs: Array<{ a: number; b: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (const e of nodes[i]!.edges) if (e.to > i) segs.push({ a: i, b: e.to });
  }
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i]!;
      const t = segs[j]!;
      if (s.a === t.a || s.a === t.b || s.b === t.a || s.b === t.b) continue;
      const x = crossing(nodes[s.a]!.at, nodes[s.b]!.at, nodes[t.a]!.at, nodes[t.b]!.at);
      if (!x) continue;
      const id = nodeAt(x);
      link(id, s.a);
      link(id, s.b);
      link(id, t.a);
      link(id, t.b);
    }
  }

  return { nodes, index, plan };
}

/** Where two segments cross, or null. */
function crossing(
  a: NormalizedPoint,
  b: NormalizedPoint,
  c: NormalizedPoint,
  d: NormalizedPoint
): NormalizedPoint | null {
  const r = { u: b.u - a.u, v: b.v - a.v };
  const s = { u: d.u - c.u, v: d.v - c.v };
  const denom = r.u * s.v - r.v * s.u;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((c.u - a.u) * s.v - (c.v - a.v) * s.u) / denom;
  const u = ((c.u - a.u) * r.v - (c.v - a.v) * r.u) / denom;
  // Strictly inside both, so a shared endpoint is not reported as a cross.
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
  return { u: a.u + r.u * t, v: a.v + r.v * t };
}

/* ------------------------------------------------------------------ */
/* THE ROUTE                                                           */
/* ------------------------------------------------------------------ */

export interface RoadRoute {
  /** The whole path, doorstep to doorstep, in world coordinates. */
  path: NormalizedPoint[];
  /** Along the carriageway only, without the two walks to the kerb. */
  drive: NormalizedPoint[];
  /**
   * How long the drawn path is, in metres.
   *
   * A DRAWN length, not a journey. See the note at the top of this file:
   * turning it into minutes is inventing an ETA.
   */
  metres: number;
}

/**
 * The way a vehicle actually gets from one point to the other.
 *
 * Dijkstra rather than A*: a neighbourhood graph is a few thousand nodes,
 * the difference is microseconds, and a heuristic is one more thing that
 * can be subtly wrong in a way that produces a plausible route through
 * somebody's garden.
 */
export function routeAlongRoads(
  graph: RoadGraph,
  from: NormalizedPoint,
  to: NormalizedPoint
): RoadRoute | null {
  const start = nearestNode(graph, from);
  const end = nearestNode(graph, to);
  if (start === null || end === null) return null;

  if (start === end) {
    const at = graph.nodes[start]!.at;
    const path = [from, at, to];
    return { path, drive: [at], metres: lengthMetres(graph.plan, path) };
  }

  const dist = new Array<number>(graph.nodes.length).fill(Infinity);
  const prev = new Array<number>(graph.nodes.length).fill(-1);
  const done = new Array<boolean>(graph.nodes.length).fill(false);
  dist[start] = 0;

  /*
   * A LINEAR SCAN FOR THE NEAREST UNVISITED NODE.
   *
   * O(n²), and deliberately: a binary heap here would be a hundred lines
   * of priority queue to save a millisecond on a graph this size, and the
   * bugs in hand-rolled heaps are exactly the kind that produce a route
   * that is nearly right.
   */
  for (;;) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < dist.length; i++) {
      if (!done[i] && dist[i]! < bestD) {
        bestD = dist[i]!;
        best = i;
      }
    }
    if (best === -1 || best === end) break;
    done[best] = true;
    for (const e of graph.nodes[best]!.edges) {
      const d = bestD + e.cost;
      if (d < dist[e.to]!) {
        dist[e.to] = d;
        prev[e.to] = best;
      }
    }
  }

  if (!Number.isFinite(dist[end]!)) return null;

  const drive: NormalizedPoint[] = [];
  for (let at = end; at !== -1; at = prev[at]!) {
    drive.push(graph.nodes[at]!.at);
    if (at === start) break;
  }
  drive.reverse();
  if (drive[0] !== graph.nodes[start]!.at) return null;

  const path = [from, ...drive, to];
  return { path, drive, metres: lengthMetres(graph.plan, path) };
}

/** The node nearest a point, or null in an empty graph. */
export function nearestNode(graph: RoadGraph, p: NormalizedPoint): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (let i = 0; i < graph.nodes.length; i++) {
    const n = graph.nodes[i]!;
    const d = (n.at.u - p.u) ** 2 + (n.at.v - p.v) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function lengthMetres(plan: WorldPlan, path: readonly NormalizedPoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i]!.u - path[i - 1]!.u, path[i]!.v - path[i - 1]!.v);
  }
  return worldToMetres(plan.geo.bounds, total);
}

export interface RoutePose {
  at: NormalizedPoint;
  heading: NormalizedPoint;
}

/**
 * WHERE A VEHICLE IS AFTER TRAVELLING THIS MANY METRES.
 *
 * ---------------------------------------------------------------------
 * WHY DISTANCE AND NOT A FRACTION, AND CERTAINLY NOT AN INDEX
 * ---------------------------------------------------------------------
 * ChatGPT, on reading that the router was in:
 *
 *     "מכאן גם לא הייתי נותן לאנימציה לדעת בכלל על נקודות המסלול.
 *      מבחינתה היא מקבלת distanceAlongRoute ומחזירה position + heading.
 *      כך אפשר בהמשך לעשות acceleration, braking ו-cornering בלי לשנות
 *      ניווט."
 *
 * Which is the right seam and worth taking now rather than later. A
 * layer that thinks in metres can be given a speed, slowed into a corner
 * and eased away from a stop, and none of that touches routing. A layer
 * that thinks in "fraction of the trip" can only be given a different
 * fraction, which is why every previous attempt at making the vehicles
 * feel real ended up as a different easing curve.
 *
 * `alongRoute` stays as the fraction-shaped wrapper, because the screen
 * still gets a 0..1 progress from the server's ETA and that conversion
 * belongs in one place.
 *
 * Named `roadRouteAt` rather than `routeAt` because `assignment-route`
 * already exports a `routeAt` for the painted plate's curve, and two
 * functions with one name that answer in different units is the kind of
 * collision that produces a van at a plausible wrong place.
 */
export function roadRouteAt(route: RoadRoute, metres: number): RoutePose {
  const total = route.metres;
  return alongRoute(route, total <= 0 ? 0 : metres / total);
}

/**
 * The same question asked as a fraction of the drawn length.
 *
 * A fraction of LENGTH rather than of the number of points: a route's
 * points are junctions and they are nowhere near evenly spaced, so
 * advancing by index makes a van crawl down a long straight and then leap
 * across four turns in a row — precisely the *"נוסעות לא טוב"* this file
 * exists to fix.
 */
export function alongRoute(route: RoadRoute, t: number): RoutePose {
  const pts = route.path;
  if (pts.length === 0) return { at: { u: 0.5, v: 0.5 }, heading: { u: 0, v: 1 } };
  if (pts.length === 1) return { at: pts[0]!, heading: { u: 0, v: 1 } };

  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.u - pts[i - 1]!.u, pts[i]!.v - pts[i - 1]!.v);
    lengths.push(d);
    total += d;
  }
  if (total === 0) return { at: pts[0]!, heading: { u: 0, v: 1 } };

  const clamped = Math.max(0, Math.min(1, t));
  let target = clamped * total;
  for (let i = 0; i < lengths.length; i++) {
    const seg = lengths[i]!;
    if (target <= seg || i === lengths.length - 1) {
      const f = seg === 0 ? 0 : Math.max(0, Math.min(1, target / seg));
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const len = seg || 1;
      return {
        at: { u: a.u + (b.u - a.u) * f, v: a.v + (b.v - a.v) * f },
        heading: { u: (b.u - a.u) / len, v: (b.v - a.v) / len },
      };
    }
    target -= seg;
  }
  return { at: pts.at(-1)!, heading: { u: 0, v: 1 } };
}

/**
 * Everything wrong with a route, as a list.
 *
 * The one that matters is the first: a route is only a route if a vehicle
 * drawn along it is on a road the whole way. Everything else here is a
 * way of finding out that it is not.
 */
export function routeViolations(graph: RoadGraph, route: RoadRoute | null): string[] {
  const out: string[] = [];
  if (!route) return ["there is no route"];
  if (route.drive.length === 0) out.push("the route never reaches a road");

  const plan = graph.plan;
  /*
   * Sampled along the DRIVEN part only: the first and last legs are the
   * walk from the doorstep to the kerb and are supposed to leave the road.
   */
  const drive: RoadRoute = { ...route, path: route.drive };
  for (let i = 0; i <= 60; i++) {
    const { at } = alongRoute(drive, i / 60);
    let nearest = Infinity;
    let halfWidth = 0;
    for (const way of plan.ways) {
      const on = nearestOnPolyline(way.points, at);
      if (on && on.distance < nearest) {
        nearest = on.distance;
        halfWidth = way.halfWidth;
      }
    }
    if (nearest > halfWidth + metresToWorld(plan.geo.bounds, 1.5)) {
      out.push("the route leaves the carriageway");
      break;
    }
  }

  // A route that doubles the straight-line distance is a route through
  // the wrong half of the city.
  const straight = worldToMetres(
    plan.geo.bounds,
    Math.hypot(
      route.path.at(-1)!.u - route.path[0]!.u,
      route.path.at(-1)!.v - route.path[0]!.v
    )
  );
  if (straight > 1 && route.metres > straight * 3) {
    out.push(`the route is ${Math.round(route.metres / straight)}x the straight line`);
  }

  return out;
}

/** The ways a graph was built from, for a caller that wants to draw them. */
export function drivableWays(plan: WorldPlan): WorldWay[] {
  return plan.ways.filter((w) => w.kind !== "PATH");
}
