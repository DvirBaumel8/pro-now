import { CARRIAGEWAY, depthScale, districtCentre, roadAt } from "./world-neighbourhood";
import type { NormalizedPoint } from "./virtual-venue";
import type { DepartmentCode } from "./world-districts";

/**
 * THE PROFESSIONAL ON THE WAY, DRAWN IN OUR WORLD.
 *
 * ---------------------------------------------------------------------
 * WHAT AMIT ASKED FOR
 * ---------------------------------------------------------------------
 *   "גם את העמוד הזה נצטרך לעשות שאיש המקצוע הנכון נוסע אליך ורואים אותו זז
 *    במפה שבנינו."
 *
 * He is right that this is the last screen still happening somewhere else.
 * Everything up to it takes place in the neighbourhood; then the job is
 * assigned and the customer is handed an abstract dark grid with a dotted
 * curve on it. The product's whole language stops at the moment it matters
 * most.
 *
 * ---------------------------------------------------------------------
 * AND THE LINE THIS MUST NOT CROSS
 * ---------------------------------------------------------------------
 * This is the one place in the product where position is REAL. After
 * assignment the server knows where the professional is and how long they
 * will take; `/CLAUDE.md §3` says real ETA only, and `livingMapViolations`
 * already refuses to plot a true coordinate over invented streets.
 *
 * So this module draws a JOURNEY, not a LOCATION. It takes `progress` — how
 * much of the trip is done, which is a real number derived from the
 * server's own ETA — and returns a point along our illustrated streets. The
 * professional is genuinely a fraction of the way to you, and that fraction
 * is what is being shown. Where they physically are is not claimed, and the
 * type makes it impossible to claim: there is nowhere here to put a
 * latitude.
 *
 * When a maps vendor is chosen (`/CLAUDE.md §4`, still open), the real map
 * replaces this and the screen already says so out loud.
 */

export interface RouteStep {
  /** Where along our streets, in world space. */
  at: NormalizedPoint;
  /** Size at this depth, so the vehicle shrinks into the distance. */
  scale: number;
  /** True when travelling right-to-left across the frame. */
  facingLeft: boolean;
}

/**
 * Where the customer is, in the world.
 *
 * The near end of the main street: the journey comes down the road towards
 * the bottom of the frame, which is where the viewer is standing. Arriving
 * INTO the camera rather than past it is the difference between "somebody
 * is coming to me" and "somebody is driving about".
 */
export const CUSTOMER_POINT: NormalizedPoint = { u: 0.5, v: 0.9 };

/**
 * The route, as three legs: out of the yard, down the road, up to the door.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS THE MEASURED ROAD AND NOT "THE MAIN STREET"
 * ---------------------------------------------------------------------
 * This used to leave the professional's shop, join `STREETS[0]` at 45% of
 * its length, and curve from there to the customer. `STREETS` is an
 * idealised layout written before anybody had measured the plate, and its
 * main street runs straight down u≈0.5 — which is where the SHOPS are,
 * because the middle of this plate is a pedestrian square. So the
 * professional's scooter drove up the square and over the front of the
 * repair shop, the same fault the ambient traffic had, for the same
 * reason and in the same place. Amit: *"כל המכוניות והבניינים והנסיעה
 * מבולגנת ממש."*
 *
 * `CARRIAGEWAY` is where the road actually is — measured off the plate by
 * `tools/design-preview/measure-road.mjs`. The trip now reads the way a
 * trip reads:
 *
 *   1. OUT. From their own shopfront across to the road. Short, and it
 *      is the leg that makes every trade's journey different, because it
 *      starts at that trade's own door.
 *   2. ALONG. Down the carriageway, from wherever they joined it to the
 *      point on it level with the customer. This is most of the trip and
 *      all of it is on tarmac.
 *   3. IN. Off the road and across to the person waiting. The customer
 *      stands in the square — that is the whole idea of the square — so
 *      the last stretch is deliberately NOT on the road, and it is short
 *      enough to read as arriving rather than as driving through a
 *      flowerbed.
 *
 * The legs are eased into each other by position rather than by time, so
 * there is no corner where one ends and the next begins.
 */
export function assignmentRoute(department: DepartmentCode, samples = 48): RouteStep[] {
  const n = Math.max(2, Math.floor(samples));
  const shop = districtCentre(department);

  /** Where this trade's shop meets the road, and where the road leaves it. */
  const joinAt = { u: roadAt(shop.v).u, v: shop.v };

  /*
   * THE TRIP STARTS AT THE KERB, NOT AT THE DOOR.
   *
   * `districtCentre` is the shop's FOOTING — the point the building rises
   * from — so a vehicle placed there is drawn standing in the shopfront,
   * with its wheels on the doorstep and its body over the awning. At the
   * start of every trip, on the screen where the customer is watching
   * somebody come to them, that reads as a scooter hovering in mid-air
   * over the repair shop.
   *
   * A third of the way to the road puts it on the pavement in front of
   * its own shop, which is where a scooter about to leave actually
   * stands, and it is still unmistakably THAT shop's scooter. The trip
   * still starts somewhere different for every trade, because the kerb it
   * starts at is their own.
   */
  const start = { u: shop.u + (joinAt.u - shop.u) * 0.34, v: shop.v };
  const leaveAt = { u: roadAt(CUSTOMER_POINT.v).u, v: CUSTOMER_POINT.v };

  const OUT = 0.22;
  const IN = 0.82;

  const between = (a: NormalizedPoint, b: NormalizedPoint, f: number): NormalizedPoint => ({
    u: a.u + (b.u - a.u) * f,
    v: a.v + (b.v - a.v) * f,
  });

  const points: NormalizedPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (t < OUT) {
      // Out of their own yard, across to the road.
      points.push(between(start, joinAt, t / OUT));
    } else if (t < IN) {
      /*
       * Down the road. `v` carries the whole way from the shop's depth to
       * the customer's, and `u` follows the carriageway at that depth —
       * so the vehicle stays on the tarmac through every bend rather
       * than cutting the corner the way a straight interpolation would.
       */
      const f = (t - OUT) / (IN - OUT);
      const v = joinAt.v + (leaveAt.v - joinAt.v) * f;
      points.push({ u: roadAt(v).u, v });
    } else {
      // Off the road and up to the door.
      points.push(between(leaveAt, CUSTOMER_POINT, (t - IN) / (1 - IN)));
    }
  }

  return points.map((at, i) => {
    const prev = points[Math.max(0, i - 1)]!;
    return { at, scale: depthScale(at.v), facingLeft: at.u < prev.u };
  });
}

/**
 * Where the professional is, `progress` of the way through the trip.
 *
 * `progress` is 0..1 and comes from the server's ETA, never from a timer
 * this screen started: a client that invented its own progress would drift
 * from the truth the moment the professional hit traffic, and the customer
 * would watch a van arrive on screen while nobody knocked.
 */
export function routeAt(department: DepartmentCode, progress: number): RouteStep {
  const route = assignmentRoute(department);
  const p = Math.max(0, Math.min(1, progress));
  const i = Math.min(route.length - 1, Math.round(p * (route.length - 1)));
  return route[i]!;
}

/**
 * How far through the trip we are, from the ETA the server gave.
 *
 * Returns null rather than a guess when there is no ETA. A journey with an
 * unknown remaining time is drawn holding still at the start — which is
 * honest — rather than creeping forward at an invented speed.
 */
export function routeProgress(args: {
  etaSecondsAtAssignment: number | null;
  etaSecondsNow: number | null;
  /**
   * Now, and when the current ETA was read. Both optional; supplying them
   * is what lets the journey continue between readings — see below.
   */
  nowMs?: number;
  etaReadAtMs?: number;
}): number | null {
  const { etaSecondsAtAssignment: total, etaSecondsNow: left } = args;
  if (total === null || left === null) return null;
  if (!Number.isFinite(total) || !Number.isFinite(left) || total <= 0) return null;

  /*
   * WHY THE CLOCK IS ALLOWED IN HERE, AND WHAT IT IS NOT ALLOWED TO DO.
   *
   * Amit: *"חייב להשקיע יותר בתזוזה... זה נראה כמו סתם הנפשה גרועה."* On
   * the tracking screen the largest part of that was not the animation at
   * all — it was that the professional did not move. Readings arrive every
   * few seconds and the figure was pinned to the last one, so it sat
   * motionless in the road and then jumped. A still figure on a road is
   * read as a broken animation, and reasonably so.
   *
   * The distinction that keeps this honest is between INVENTING progress
   * and RENDERING a claim already made. The server said fourteen minutes.
   * Fourteen minutes is a statement about time passing; drawing the
   * seconds between two readings is showing that statement, not adding to
   * it. What would be invention is continuing past the end, or moving when
   * no ETA was given at all, and neither is possible here: the seconds
   * elapsed are subtracted from the ETA the server actually gave, and the
   * result is clamped, so a late professional stops at the door rather
   * than walking through it.
   *
   * Without the clock this behaves exactly as before, which is what keeps
   * every existing caller and every existing test correct.
   */
  const elapsedSeconds =
    args.nowMs !== undefined && args.etaReadAtMs !== undefined
      ? Math.max(0, (args.nowMs - args.etaReadAtMs) / 1000)
      : 0;
  const remaining = Math.max(0, left - elapsedSeconds);
  return Math.max(0, Math.min(1, 1 - remaining / total));
}

/**
 * Everything wrong with an assignment route.
 *
 * The first check is the one that matters: this module may never be handed
 * a real position. If a caller ever starts passing coordinates through
 * here, the illustrated streets stop being an illustration and become a
 * claim about where somebody is.
 */
export function assignmentRouteViolations(args: {
  route: readonly RouteStep[];
  progress: number | null;
}): string[] {
  const v: string[] = [];

  for (const step of args.route) {
    if ("lat" in step.at || "lng" in step.at) {
      v.push("The route carries a real position. These streets are an illustration; a true coordinate drawn on them is a lie about where somebody is.");
      break;
    }
    if (step.at.u < 0 || step.at.u > 1 || step.at.v < 0 || step.at.v > 1) {
      v.push("The route leaves the world.");
      break;
    }
  }

  if (args.route.length > 1) {
    const end = args.route.at(-1)!.at;
    const d = Math.hypot(end.u - CUSTOMER_POINT.u, end.v - CUSTOMER_POINT.v);
    if (d > 0.08) v.push("The route does not end at the customer. It has to arrive, not pass by.");
  }

  if (args.progress !== null && (args.progress < 0 || args.progress > 1)) {
    v.push(`Progress is ${args.progress}; it is a fraction of a trip, not a distance.`);
  }

  if (CARRIAGEWAY.length === 0) v.push("There is no road to travel along.");

  return v;
}
