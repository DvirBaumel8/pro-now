import { districtCentre, WORLD_DISTRICTS, type DepartmentCode, type NormalizedPoint } from "@pro-now/types";

/**
 * WHICH TRADE THE WALKER IS STANDING BY.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A FILE AND NOT FOUR LINES IN THE SCREEN
 * ---------------------------------------------------------------------
 * It decides what the street SAYS about where somebody is, which makes it
 * the one piece of this screen that can be wrong in a way nobody notices
 * — a label naming the wrong shop reads as a slightly confusing street
 * rather than as a bug, and it would survive every screenshot review.
 *
 * (It is also `.ts` rather than `.tsx` because vitest collects no tests
 * from a suite that imports a component file. That is a tooling fact, not
 * a design one, and it has bitten this repository twice.)
 */

/**
 * How close counts as "by".
 *
 * Deliberately generous. A threshold tight enough to mean "at the door"
 * makes the label flicker on and off as somebody walks, which turns a
 * street into a tooltip; standing in the road between two shops belongs
 * to neither of them, and saying nothing is the right answer there.
 */
export const NEAR = 0.16;

/**
 * The 3/4 weighting, the same one the whole world uses.
 *
 * A step north covers less visible ground than a step east, so a raw
 * distance would make shops up the street feel nearer than shops beside
 * you. See `pathLength` and `stepFrom`, which weight it identically.
 */
export const DEPTH_WEIGHT = 0.6;

export function nearestDistrict(at: NormalizedPoint, near = NEAR): DepartmentCode | null {
  let best: DepartmentCode | null = null;
  let bestD = near;
  for (const code of Object.keys(WORLD_DISTRICTS) as DepartmentCode[]) {
    const spot = districtCentre(code);
    if (!spot) continue;
    const d = Math.hypot(spot.u - at.u, (spot.v - at.v) * DEPTH_WEIGHT);
    if (d < bestD) {
      bestD = d;
      best = code;
    }
  }
  return best;
}

/**
 * Whether a step is far enough to redraw the street's depth order.
 *
 * The walker's position is an Animated value so that walking re-renders
 * nothing; draw order cannot be interpolated, so it is kept as state and
 * this is what keeps that state from changing sixty times a second. The
 * question it answers is only "which side of the figure is this shop
 * drawn on", and there are eleven shops.
 */
export const DEPTH_STEP = 0.02;

export function depthChanged(was: number, now: number): boolean {
  return Math.abs(was - now) > DEPTH_STEP;
}
