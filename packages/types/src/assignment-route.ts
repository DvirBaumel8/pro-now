import { alongStreet, depthScale, districtCentre, STREETS, streetById } from "./world-neighbourhood";
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
 * The route, as points along real streets.
 *
 * Built by walking the professional's own trade street to the junction and
 * then down the main road — so a mover comes in from the market street and
 * a barber from the main one, and the path is never the same straight line
 * twice.
 */
export function assignmentRoute(department: DepartmentCode, samples = 48): RouteStep[] {
  const n = Math.max(2, Math.floor(samples));
  const start = districtCentre(department);
  const main = streetById("main");

  const points: NormalizedPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    if (t < 0.45) {
      // Out of their own district, towards the main road.
      const f = t / 0.45;
      const joinAt = alongStreet(main, 0.45);
      points.push({ u: start.u + (joinAt.u - start.u) * f, v: start.v + (joinAt.v - start.v) * f });
    } else {
      // Down the main road to the customer.
      const f = (t - 0.45) / 0.55;
      const along = alongStreet(main, 0.45 + f * 0.5);
      points.push({
        u: along.u + (CUSTOMER_POINT.u - along.u) * f * f,
        v: along.v + (CUSTOMER_POINT.v - along.v) * f * f,
      });
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

  if (STREETS.length === 0) v.push("There are no streets to travel along.");

  return v;
}
