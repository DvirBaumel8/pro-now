/**
 * HOW A THING MOVES, NOT JUST WHERE IT ENDS UP.
 *
 * ---------------------------------------------------------------------
 * WHAT AMIT SAW
 * ---------------------------------------------------------------------
 * *"חייב להשקיע יותר בתזוזה של הדמויות. זה נראה כמו סתם הנפשה גרועה ולא
 * מכוונת ולא ברמה שלנו."*
 *
 * He is right and the diagnosis is specific. Everything that travelled was
 * interpolated between two points and nothing else happened to it. A figure
 * slid along a road at a constant rate, upright, unchanging — which is not
 * a person walking, it is a sticker being dragged. The eye reads that in
 * well under a second, and no amount of polish elsewhere survives it.
 *
 * Three faults, and they are separable:
 *
 *   1. NO GAIT. A walking person rises and falls with each step and leans
 *      into the direction of travel. Without it there is no walking, only
 *      translation.
 *   2. THE WRONG EASING. Traffic crossing a street was eased in and out, so
 *      a van accelerated from nothing, cruised, and slowed to a stop in the
 *      middle of a road for no reason. Easing belongs to a CAMERA, which is
 *      a decision being made, and not to a van, which is just driving.
 *   3. ONE SPEED FOR EVERYTHING. A person on foot and a scooter covered the
 *      same street in whatever time the spec said, so the person was
 *      sprinting or the scooter was crawling.
 *
 * ---------------------------------------------------------------------
 * THE ONE RULE THAT MAKES IT READ AS WALKING
 * ---------------------------------------------------------------------
 * **The bob is driven by DISTANCE TRAVELLED, never by a clock.**
 *
 * This is the whole difference. A sine on a timer keeps bobbing when the
 * figure has stopped — a person jogging on the spot — and its rhythm has no
 * relationship to how fast they are going, so the feet slide. A sine on
 * distance means one rise and fall per step of ground covered: stop moving
 * and the bobbing stops, move faster and the steps come faster, exactly as
 * they do for a real person, without simulating a single leg.
 *
 * It is also why this is a table of numbers rather than an animation. The
 * renderer already interpolates position along a sampled path; the gait is
 * two more samples taken at the same points, so it costs nothing and cannot
 * drift out of step with the position it belongs to.
 */

/** What kind of thing is moving. Decides its gait and its speed. */
export type Gait = "WALK" | "RIDE" | "DRIVE" | "HAUL";

export interface GaitSpec {
  /**
   * How many rise-and-falls per unit of world distance.
   *
   * A person's stride is short, so the count is high; a vehicle has no
   * stride at all and this is instead the rate at which its suspension
   * answers the road.
   */
  readonly cyclesPerWorld: number;
  /**
   * How far it rises, as a share of its own drawn height.
   *
   * Small on purpose. Above about 4% a walk becomes a bounce and the figure
   * reads as a cartoon rather than as somebody going to work.
   */
  readonly bob: number;
  /** How far it leans into travel, in degrees. Zero for anything on wheels. */
  readonly lean: number;
  /**
   * World widths covered per second.
   *
   * The honest reason these differ: a scooter really is about three times
   * a walking pace, and when they shared one duration the street had a
   * sprinting pedestrian in it. The absolute values are tuned so that a
   * crossing of the main street lasts long enough to be noticed and short
   * enough not to become the subject — roughly ten seconds on foot, four
   * on two wheels.
   */
  readonly speed: number;
}

export const GAITS: Readonly<Record<Gait, GaitSpec>> = {
  /** On foot. The only one with a real stride. */
  WALK: { cyclesPerWorld: 34, bob: 0.03, lean: 1.6, speed: 0.045 },
  /** Two wheels. A little suspension chatter, no stride, no lean. */
  RIDE: { cyclesPerWorld: 12, bob: 0.008, lean: 0, speed: 0.12 },
  /** Four wheels, light. */
  DRIVE: { cyclesPerWorld: 8, bob: 0.005, lean: 0, speed: 0.1 },
  /** Four wheels carrying something heavy: slower, and it wallows. */
  HAUL: { cyclesPerWorld: 6, bob: 0.009, lean: 0, speed: 0.075 },
};

/**
 * How high above its own feet a thing sits, at this point in its journey.
 *
 * Returned as a share of its drawn height, to be multiplied by that height
 * at the call site — so the same gait works for a figure 20 points tall and
 * one 200 points tall.
 *
 * `distance` is how far it has travelled in world widths, NOT how long it
 * has been travelling. See the note above; this is the whole trick.
 *
 * The result is always <= 0: a step lifts you off the ground and returns
 * you to it, and it must never sink a figure into the pavement.
 */
export function bobAt(gait: Gait, distance: number): number {
  const spec = GAITS[gait];
  // -(1 - cos)/2 runs 0 → -1 → 0: it starts on the ground, rises, lands.
  const phase = distance * spec.cyclesPerWorld * Math.PI * 2;
  return -((1 - Math.cos(phase)) / 2) * spec.bob;
}

/**
 * How far it leans, in degrees, at this point in its journey.
 *
 * A walker leans forward through the push-off and comes upright as the foot
 * lands, which is half the frequency of the bob — one lean per step rather
 * than one per rise and fall. Wheels do not lean at all, and pretending they
 * do is how a scooter starts looking like it is being blown over.
 */
export function leanAt(gait: Gait, distance: number, facing: 1 | -1): number {
  const spec = GAITS[gait];
  if (spec.lean === 0) return 0;
  const phase = distance * spec.cyclesPerWorld * Math.PI;
  return Math.sin(phase) * spec.lean * facing;
}

/**
 * How long a journey of this length should take, in milliseconds.
 *
 * Derived from the gait's real speed rather than set per moment, so adding
 * a new traveller cannot accidentally give a pedestrian a motorbike's pace.
 * Clamped: below a second nothing registers as having happened, and above
 * half a minute a street feels becalmed.
 */
export function travelMs(gait: Gait, worldDistance: number): number {
  const raw = (worldDistance / GAITS[gait].speed) * 1000;
  return Math.round(Math.max(1200, Math.min(30_000, raw)));
}

/**
 * The length of a sampled path, in world widths.
 *
 * `v` is weighted down because the world is drawn in 3/4: a step up the
 * street covers more ground than a step across it, so treating the two
 * equally makes anything moving vertically look like it is in a hurry.
 */
export function pathLength(points: readonly { u: number; v: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const du = points[i]!.u - points[i - 1]!.u;
    const dv = (points[i]!.v - points[i - 1]!.v) * 0.6;
    total += Math.hypot(du, dv);
  }
  return total;
}

/** Everything wrong with the motion model, as a test rather than as prose. */
export function worldMotionViolations(): string[] {
  const out: string[] = [];

  for (const [name, g] of Object.entries(GAITS)) {
    // Above roughly 4% of its own height a walk reads as a bounce.
    if (g.bob > 0.04) out.push(`${name} bobs too far at ${g.bob}`);
    if (g.bob <= 0) out.push(`${name} must move at all`);
    if (g.speed <= 0) out.push(`${name} must have a speed`);
    // Wheels do not lean; a leaning scooter looks blown over.
    if (name !== "WALK" && g.lean !== 0) out.push(`${name} must not lean`);
  }

  // A person on foot must be the slowest thing on the street.
  const walk = GAITS.WALK.speed;
  for (const [name, g] of Object.entries(GAITS)) {
    if (name !== "WALK" && g.speed <= walk) out.push(`${name} is no faster than walking`);
  }

  // The bob must start and end on the ground, or a figure spawns mid-step
  // and lands below the pavement when it stops.
  if (Math.abs(bobAt("WALK", 0)) > 1e-9) out.push("a step must begin on the ground");
  const full = 1 / GAITS.WALK.cyclesPerWorld;
  if (Math.abs(bobAt("WALK", full)) > 1e-9) out.push("a step must end on the ground");

  // And it must never push a figure below its own feet.
  for (let d = 0; d <= 1; d += 0.013) {
    if (bobAt("WALK", d) > 1e-9) out.push("a step must never sink into the pavement");
  }

  return out;
}
