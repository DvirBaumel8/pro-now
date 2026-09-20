import { districtCentre } from "./world-neighbourhood";
import { WALKABLE } from "./world-steering";
import { WORLD_DISTRICTS, type DepartmentCode } from "./world-districts";
import type { NormalizedPoint } from "./virtual-venue";

/**
 * WHAT THE GROUND HAS TO BE.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A FILE
 * ---------------------------------------------------------------------
 * Everything known about the ground plate has lived in chat messages: it
 * must be portrait, it must be full-bleed, it must contain no shops, the
 * pavement has to reach eleven particular points, the lighting has to be
 * even. Each of those was learned by shipping a plate that got one of
 * them wrong, and each was then re-explained from memory the next time a
 * plate was drawn.
 *
 * A plate is the most expensive asset in the product and the one that
 * everything else is measured against. Writing the requirements down
 * where they can be CHECKED means the next one is verified in seconds
 * instead of discovered in a screenshot a week later.
 *
 * ---------------------------------------------------------------------
 * THE RULE THAT IS NOT ABOUT DRAWING
 * ---------------------------------------------------------------------
 * `noEntities` is an honesty rule and the most important line here.
 *
 * A shop painted into the ground is on screen when three professionals
 * are online, when one is, and when none is. It is a business that exists
 * whether or not anybody is behind it — invented supply with a roof on
 * it, and /CLAUDE.md §3 forbids exactly that. The plate we are replacing
 * has shopfronts baked into it and has been making that claim quietly for
 * weeks.
 *
 * So: the ground is a STAGE. Roads, pavement, trees, benches, lamps,
 * planters — things that are there regardless of who is working today.
 * Everything the product has an opinion about arrives as its own file and
 * is placed on top.
 */

/** 2048 x 3600 — portrait, and every measured coordinate assumes it. */
export const PLATE_SIZE = { width: 2048, height: 3600 } as const;

export const PLATE_RATIO = PLATE_SIZE.width / PLATE_SIZE.height;

/** How far the delivered file's aspect may drift before coordinates move. */
export const RATIO_TOLERANCE = 0.02;

export const GROUND_RULES = {
  /**
   * Edge to edge, no transparency, no rounded corners.
   *
   * The camera clamps to the plate's edge precisely so the end of the
   * world never enters the frame — that clamp is what keeps a place from
   * reading as a picture. A plate drawn as an island on transparency
   * puts black margins on screen the moment somebody walks to the edge.
   */
  fullBleed: true,
  /**
   * Nothing the product has an opinion about. See the header.
   */
  noEntities: true,
  /**
   * One light for the whole plate.
   *
   * The camera follows a walking person across every part of this
   * image. A corner lit differently from the middle does not read as
   * atmosphere, it reads as a rendering bug at the moment somebody walks
   * into it.
   */
  evenLighting: true,
  /**
   * Pavement, not a junction.
   *
   * Eleven shops stand on this plate and a person walks between them on
   * foot. The road is the narrow thing passing through; the pavement is
   * most of the plate. The first plate drawn to this brief had it the
   * other way round and several shops landed on tarmac.
   */
  pavementMajority: true,
} as const;

/**
 * Every point the pavement has to reach.
 *
 * The eleven shop footings, plus the place a walk begins. A plate that
 * puts any of these in a road, a flowerbed or a wall is a plate where
 * that trade cannot be visited.
 */
export function requiredFootings(): { department: DepartmentCode; at: NormalizedPoint }[] {
  return (Object.keys(WORLD_DISTRICTS) as DepartmentCode[]).map((department) => ({
    department,
    at: districtCentre(department),
  }));
}

/**
 * Whether a point is somewhere the code will actually let somebody stand.
 *
 * Outside this, no amount of pavement helps: the walk is clamped and the
 * figure will never get there.
 */
export function reachable(at: NormalizedPoint): boolean {
  return (
    at.u >= WALKABLE.minU && at.u <= WALKABLE.maxU && at.v >= WALKABLE.minV && at.v <= WALKABLE.maxV
  );
}

/** Everything wrong with the plate's requirements, as a test. */
export function groundPlateViolations(): string[] {
  const out: string[] = [];

  if (PLATE_RATIO >= 1) out.push("the plate must be portrait");

  // A footing the walk can never reach is a trade nobody can visit, and
  // it would be invisible until somebody tried to walk to it.
  for (const { department, at } of requiredFootings()) {
    if (!reachable(at)) {
      out.push(`${department} stands at ${at.u.toFixed(2)},${at.v.toFixed(2)}, outside the walkable area`);
    }
  }

  // The honesty rule is not optional and must not be quietly relaxed.
  if (!GROUND_RULES.noEntities) {
    out.push("the ground is allowed to contain businesses, which invents supply");
  }
  if (!GROUND_RULES.fullBleed) {
    out.push("the ground may have transparent margins, which shows the edge of the world");
  }

  return out;
}
