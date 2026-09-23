import { pathLength, type Gait } from "./world-motion";
import type { NormalizedPoint } from "./virtual-venue";
import { PLATE_V_WEIGHT, roadAt } from "./world-neighbourhood";

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
 * ---------------------------------------------------------------------
 * WHY THE VERTICAL STEP IS SCALED BY THE PLATE'S SHAPE
 * ---------------------------------------------------------------------
 * A position is a fraction of the world, and the world is not square. A
 * step of `dv` covers `dv * worldHeight` pixels while the same step of
 * `du` covers `du * worldWidth` — so to make holding "up" cover the same
 * visible ground as holding "right", the vertical step is multiplied by
 * the plate's width-over-height.
 *
 * This used to divide by a flat 0.6, a number tuned by eye against a
 * plate 946 by 1662. That plate is now one of three joined end to end
 * and the street is five times taller than it is wide, where dividing by
 * 0.6 makes a step north cover about eight times the screen distance of
 * a step east — the avatar crossing the neighbourhood in a second and
 * the controls reading as broken.
 *
 * Taking it from `PLATE_ASPECT` means the next time the street is
 * extended, walking still feels the same, and nobody has to remember
 * this.
 */
export function stepFrom(
  at: NormalizedPoint,
  heading: Heading,
  elapsedMs: number,
  speed = STEER_SPEED,
  vWeight = PLATE_V_WEIGHT
): NormalizedPoint {
  if (!heading) return at;
  const v = VECTORS[heading];
  const d = (speed * elapsedMs) / 1000;
  return {
    u: clamp01(at.u + v.du * d),
    v: clamp01(at.v + (v.dv * d) / vWeight),
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

/**
 * Where a walk begins.
 *
 * NOT `CUSTOMER_POINT`. That is where the customer's own door is on the
 * assignment route, at the very bottom of the world — and starting there
 * put the figure on the last few pixels of the plate, half cut off by the
 * edge of the phone, because the camera clamps rather than show past the
 * end of the world. The first thing anybody saw of their own avatar was
 * its head.
 *
 * Far enough up that there is street both in front of and behind them,
 * which is the difference between standing somewhere and standing at the
 * end of something.
 *
 * ---------------------------------------------------------------------
 * AND FURTHER UP AGAIN, BECAUSE 0.74 WAS A CORNER
 * ---------------------------------------------------------------------
 * Amit: *"כל המשחקיות לא טובה, משחקיות."*
 *
 * Measured rather than argued. From 0.5,0.74 the pavement mask allows a
 * walk of 0.8 SECONDS to the south, 2.4 north, 3.2 north-east — the
 * figure took a few steps in any direction and stopped against a planter.
 * The reasoning above was right and the number was in a corner: that spot
 * is ringed by the beds along the middle of the square.
 *
 * Every point on the pavement was then scored by its WORST direction —
 * eight seconds north and half a second south is a corridor, not a place
 * to stand — and 0.44,0.60 is the best of them: 2.8s at worst against
 * 0.8s, and 44.5s of walking in total against 37.3s.
 *
 * MOVED AGAIN FOR THE THREE-PLATE STREET. 0.60 on the old plate was
 * between two shopfronts; on this one it is open pavement with the
 * nearest business half a screen away, so a walk began by looking at
 * nothing. 0.66 stands between the frontages measured at (0.545, 0.674)
 * and (0.329, 0.649) — you start where there is something to walk up
 * to, which is the whole reason to be on the street.
 *
 * IT ALSO UNPINS THE CAMERA, which is the larger half. On a 390x844
 * phone the world is 1263 tall, so a figure at v=0.74 sits 935 down it
 * and the camera wants an offset of -513 — outside the -419 the clamp
 * allows. The camera was therefore pinned against the bottom of the
 * plate from the first frame, and walking north or south moved NOTHING
 * on screen. At 0.60 the offset is -336 and the camera can follow in
 * both directions, which is the difference between a walk you can see
 * and a walk you can only be told about.
 */
export const WALK_START = { u: 0.44, v: 0.66 } as const;

export function insideWalkable(at: NormalizedPoint): boolean {
  if (
    at.u < WALKABLE.minU || at.u > WALKABLE.maxU ||
    at.v < WALKABLE.minV || at.v > WALKABLE.maxV
  ) {
    return false;
  }
  /*
   * AND NOT IN THE ROAD.
   *
   * The note above says the plate has no collision map and that
   * inventing one from image analysis would produce a figure that
   * mysteriously refuses to move. That is still true of planters,
   * benches and steps — and it was never true of the carriageway, which
   * has been measured off the plate by `measure-road.mjs` since the
   * traffic needed somewhere to drive.
   *
   * A person strolling down the middle of the tarmac is the one
   * collision worth having: it is the thing that makes a drawn street
   * read as a street rather than as a floor.
   */
  const road = roadAt(at.v);
  return Math.abs(at.u - road.u) >= road.halfWidth;
}

export function clampWalkable(at: NormalizedPoint): NormalizedPoint {
  const v = Math.max(WALKABLE.minV, Math.min(WALKABLE.maxV, at.v));
  let u = Math.max(WALKABLE.minU, Math.min(WALKABLE.maxU, at.u));
  /*
   * AND OUT OF THE ROAD, TO THE NEARER KERB.
   *
   * `insideWalkable` refuses the carriageway, so a clamp that only
   * squared the position into the rectangle could hand back a point
   * that is still not walkable — which is exactly what the invariant
   * beside this one reported the moment the road became a rule.
   *
   * Pushed to whichever kerb is closer, so somebody steering into the
   * road slides along it rather than being thrown across it.
   */
  const road = roadAt(v);
  if (Math.abs(u - road.u) < road.halfWidth) {
    const left = road.u - road.halfWidth;
    const right = road.u + road.halfWidth;
    /*
     * WHICHEVER KERB IS BOTH NEARER AND INSIDE THE WORLD.
     *
     * Near the top of this plate the carriageway runs to 0.987 while
     * the walkable box stops at 0.94 — so the far kerb is off the edge
     * of the world, and pushing to it and re-clamping put the figure
     * back in the road it had just been pushed out of. The check caught
     * it with the plainest possible failure: a clamped point that is
     * still not walkable.
     */
    const rightFits = right <= WALKABLE.maxU;
    const leftFits = left >= WALKABLE.minU;
    if (rightFits && (!leftFits || u >= road.u)) u = right;
    else if (leftFits) u = left;
    else u = left; // a road wider than the world: the near side, at least
  }
  return { u, v };
}

/**
 * The whole step rule: inside the world AND on the pavement.
 *
 * Two tests rather than one because they answer different questions. The
 * rectangle is about the EDGE OF THE PLATE — walk past it and the camera
 * clamps, so the figure slides off the side of the screen. The pavement
 * map is about the GROUND — walk off it and the figure is standing in a
 * hedge. Callers want both, always, so they are composed here rather than
 * left to be remembered at each call site.
 */
export function walkStep(from: NormalizedPoint, to: NormalizedPoint): NormalizedPoint {
  return stepOnPavement(clampWalkable(from), clampWalkable(to));
}


/**
 * ---------------------------------------------------------------------
 * WHERE THE PAVEMENT ACTUALLY IS
 * ---------------------------------------------------------------------
 * `WALKABLE` above is a rectangle covering almost the whole plate, which
 * meant the customer's figure could stand in a flowerbed, on a bench, in
 * the middle of the road or halfway up a palm tree, and nothing stopped
 * it. Amit asked to *"באמת לטייל בין המקצועות"*, and walking through a
 * planter is the exact moment a street stops being a street.
 *
 * This is the plate's own answer, measured by
 * `tools/design-preview/measure-pavement.mjs`: warm stone under sodium
 * light, not green, not in deep shadow — so asphalt and white road paint
 * both fail it whatever their brightness, and the flowerbeds fail it on
 * colour. Then eroded by a person's own footprint, so nobody ends up with
 * one foot over a kerb.
 *
 * 32 x 56 because a person is roughly 3% of the world wide: a cell about
 * that size is as fine as the question can be answered, and a per-pixel
 * mask would be a megabyte and a walk that caught on every kerbstone.
 *
 * ---------------------------------------------------------------------
 * IT BELONGS TO THIS DRAWING
 * ---------------------------------------------------------------------
 * Like `PLATE_SPOTS`, these numbers are a reading of one image. A new
 * plate needs them re-measured, which is one command — and far better
 * than the alternative, which is a figure wading through a hedge on the
 * day the artwork changes.
 */
export const PAVEMENT_COLS = 32;
export const PAVEMENT_ROWS = 56;

const PAVEMENT: readonly string[] = [
  "11101100111111010100110001100000",
  "01110000100111111111110001100000",
  "01101111111111111111100001110000",
  "11111000111100011111100001011100",
  "11111111111111111100010001111110",
  "00111111111101110000000001111110",
  "00011111111111110000000000111100",
  "00000111111111110000000000111111",
  "00000011111111111011010000111110",
  "00011101111111111000000000011100",
  "11011110111111111110000000011111",
  "11011111111111111110111000001100",
  "11111100011111111111001000011000",
  "00111100000001111111110000001000",
  "11111000100001111100100000001000",
  "00110111000000111000010100001111",
  "00110111100111110000000100001111",
  "01111111010110011000001100001111",
  "00111111111110011100011000001011",
  "00011110011101111111111000011101",
  "10111111010100111111111100001101",
  "10111111111111111111111100000011",
  "10111111111111111111111110000011",
  "01000111111111111111100000000011",
  "00010111111111111111001000000011",
  "01011110011111111111111010000001",
  "00111111111111111001111110000001",
  "00011111111111111101111111000001",
  "00011111111111110011111111000001",
  "00011111111111111000011101000000",
  "00011111111111111111011111000000",
  "00111111111111111111111111000001",
  "11111100011111111111111110000011",
  "11111000011111111111111100000001",
  "11111000111111111111111100000000",
  "11111110111011111111111100000001",
  "00110001111001111111110100000011",
  "01001011100111111110000110000011",
  "00001111101111111100001110000011",
  "00111111001111111110001110000011",
  "00111111001111111111111110000010",
  "00111111111111111111111110000011",
  "01111111111111111111111011000001",
  "11111111111111111111011111000001",
  "00111111111111101011110111110011",
  "11101001111111101111100011100001",
  "00010001111111110111100111000000",
  "00000110111111111111001111100000",
  "00000111111111111111001111100000",
  "00000111100011111111111110000000",
  "00001111100011111111111110000000",
  "00011100100000111111110011010000",
  "00111110101000111111001010000000",
  "00001110000000111111101011111000",
  "00000011110011111111111100001000",
  "00000011110001111111111000000000",
];

/**
 * Whether a person may stand here.
 *
 * Outside the plate is not walkable, which the rectangle already handled
 * and which stays true: the two tests are AND-ed by the caller, so the
 * coarse bounds still keep the figure away from the edge of the world.
 */
export function onPavement(at: NormalizedPoint): boolean {
  const col = Math.floor(at.u * PAVEMENT_COLS);
  const row = Math.floor(at.v * PAVEMENT_ROWS);
  if (col < 0 || col >= PAVEMENT_COLS || row < 0 || row >= PAVEMENT_ROWS) return false;
  return PAVEMENT[row]![col] === "1";
}

/**
 * THE STEP THAT WOULD LEAVE THE PAVEMENT DOES NOT HAPPEN.
 *
 * Deliberately not "slide along the edge": a figure that keeps moving
 * while pressed against a hedge reads as broken, and a figure that simply
 * stops reads as a person who has reached something. The axes are tried
 * separately so walking diagonally into a kerb still carries you ALONG
 * it, which is what a person does and what makes a narrow pavement
 * usable rather than a corridor of dead ends.
 */
export function stepOnPavement(from: NormalizedPoint, to: NormalizedPoint): NormalizedPoint {
  if (onPavement(to)) return to;
  const alongU = { u: to.u, v: from.v };
  if (onPavement(alongU)) return alongU;
  const alongV = { u: from.u, v: to.v };
  if (onPavement(alongV)) return alongV;
  return from;
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
