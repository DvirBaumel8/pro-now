import { pathLength, type Gait } from "./world-motion";
import type { NormalizedPoint } from "./virtual-venue";

/**
 * WALKING THE STREET, RATHER THAN DRAGGING A MAP.
 *
 * ---------------------------------------------------------------------
 * WHY A CONTROL AND NOT A DRAG
 * ---------------------------------------------------------------------
 * Amit: *"אפשר להוסיף מסך שליטה קטן של חצים שאפשר לכוון את הנסיעה, לקדם
 * את זה לעבר חווית משחק."*
 *
 * This is the natural consequence of the avatar and it is worth saying
 * plainly, because the two gestures look similar and mean opposite things.
 *
 * A DRAG moves the world under a fixed viewer. The thing that changes is
 * the camera, the person is nowhere, and what you are doing is reading a
 * map — which is exactly the interaction Amit has now rejected three
 * times, most recently as *"מרחפים... לא אמיתי"*.
 *
 * A STEER moves a person through a world that stays where it is. What
 * changes is where THEY are; the camera follows because it is watching
 * them. Same pixels moving across the same screen, and the difference in
 * how it reads is the whole of "like VR".
 *
 * So the control does not pan. It sets a heading, the avatar walks, and
 * the camera comes along.
 *
 * ---------------------------------------------------------------------
 * WHAT IT MAY NOT DO
 * ---------------------------------------------------------------------
 * Walking is exploration and never dispatch. Standing in front of a shop
 * does not hire anybody, does not reserve anybody, and above all does not
 * change what the world claims about supply: the shops on the street are
 * the candidates the server returned before the walk started, and walking
 * further does not summon more of them. A street that grew new
 * professionals as you walked would be inventing availability with a
 * joystick.
 */

/** Eight ways to go, plus standing still. Screen-relative, not world-relative. */
export type Heading = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | null;

/**
 * How fast an avatar covers ground, in world widths per second.
 *
 * Deliberately close to the WALK gait's own speed rather than faster. The
 * temptation with a steering control is to make it quick so the world can
 * be crossed — but the point is not to get anywhere, it is to pass shops
 * at the pace you would pass shops. A fast walk turns a street into a
 * corridor to the end of.
 */
export const STEER_SPEED = 0.055;

/** The gait a steered avatar uses. They are on foot; there is no other. */
export const STEER_GAIT: Gait = "WALK";

const VECTORS: Readonly<Record<Exclude<Heading, null>, { du: number; dv: number }>> = {
  N: { du: 0, dv: -1 },
  NE: { du: 0.7071, dv: -0.7071 },
  E: { du: 1, dv: 0 },
  SE: { du: 0.7071, dv: 0.7071 },
  S: { du: 0, dv: 1 },
  SW: { du: -0.7071, dv: 0.7071 },
  W: { du: -1, dv: 0 },
  NW: { du: -0.7071, dv: -0.7071 },
};

/**
 * Where one tick of walking puts you.
 *
 * `dv` is divided by the same 0.6 the distance metric multiplies it by, so
 * that walking north covers the same VISIBLE ground as walking east. The
 * world is drawn in 3/4: without this, holding "up" crosses the street
 * noticeably faster than holding "right", which reads as the controls
 * being broken rather than as perspective.
 */
export function stepFrom(
  at: NormalizedPoint,
  heading: Heading,
  elapsedMs: number,
  speed = STEER_SPEED
): NormalizedPoint {
  if (!heading) return at;
  const v = VECTORS[heading];
  const d = (speed * elapsedMs) / 1000;
  return {
    u: clamp01(at.u + v.du * d),
    v: clamp01(at.v + (v.dv * d) / 0.6),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Which way the avatar is facing on screen, as a mirror of the artwork.
 *
 * The art is one back view. Heading east it is mirrored, heading west it
 * is not, and heading straight up or down it stays as drawn — a figure
 * walking away from you has no left or right to show.
 *
 * Returning a mirror rather than demanding a side view is a decision about
 * ART BUDGET as much as about code: twelve side views is twelve more files
 * for a case the customer sees for a second at a time while turning.
 */
export function facingFor(heading: Heading): 1 | -1 {
  if (!heading) return 1;
  return VECTORS[heading].du > 0 ? -1 : 1;
}

/** How far a walk of this many milliseconds covers, for the gait. */
export function distanceWalked(elapsedMs: number, speed = STEER_SPEED): number {
  return (speed * elapsedMs) / 1000;
}

/**
 * Keep the avatar on the pavement, in the sense that matters here: inside
 * the world. The plate has no collision map, and inventing one from image
 * analysis would produce a figure that mysteriously refuses to move.
 * Bounded rather than blocked.
 */
export const WALKABLE = { minU: 0.06, maxU: 0.94, minV: 0.08, maxV: 0.96 } as const;

export function insideWalkable(at: NormalizedPoint): boolean {
  return (
    at.u >= WALKABLE.minU && at.u <= WALKABLE.maxU && at.v >= WALKABLE.minV && at.v <= WALKABLE.maxV
  );
}

export function clampWalkable(at: NormalizedPoint): NormalizedPoint {
  return {
    u: Math.max(WALKABLE.minU, Math.min(WALKABLE.maxU, at.u)),
    v: Math.max(WALKABLE.minV, Math.min(WALKABLE.maxV, at.v)),
  };
}

/** Everything wrong with the steering model, as a test rather than prose. */
export function steeringViolations(): string[] {
  const out: string[] = [];

  // A walk must feel like a walk. Faster than this and the street becomes
  // a corridor to the end of rather than somewhere you pass shops.
  if (STEER_SPEED > 0.09) out.push("steering is too fast to read as walking");
  if (STEER_SPEED <= 0) out.push("steering must move");

  // Up and right must cover the same visible ground. Without the 3/4
  // correction, holding "up" crosses the street faster than "right" and
  // the controls read as broken rather than as perspective.
  const mid: NormalizedPoint = { u: 0.5, v: 0.5 };
  const east = stepFrom(mid, "E", 1000);
  const north = stepFrom(mid, "N", 1000);
  const dEast = pathLength([mid, east]);
  const dNorth = pathLength([mid, north]);
  if (Math.abs(dEast - dNorth) > 1e-6) out.push("walking north covers different ground from east");

  // Standing still must be standing still.
  const still = stepFrom(mid, null, 5000);
  if (still.u !== mid.u || still.v !== mid.v) out.push("no heading must not move the avatar");

  // Nothing may leave the world.
  for (const h of ["N", "E", "S", "W"] as const) {
    const far = stepFrom(mid, h, 1_000_000);
    if (far.u < 0 || far.u > 1 || far.v < 0 || far.v > 1) out.push(`${h} leaves the world`);
  }

  // The walkable box must sit inside the world with room for a figure.
  if (WALKABLE.minU <= 0 || WALKABLE.maxU >= 1) out.push("the walkable box touches the world's edge");

  return out;
}
