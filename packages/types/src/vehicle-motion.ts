import type { NormalizedPoint } from "./virtual-venue";

/**
 * A VEHICLE REACTS TO FORCES; IT DOES NOT PLAY AN ANIMATION.
 *
 * ---------------------------------------------------------------------
 * WHERE THIS CAME FROM, AND WHY IT IS ITS OWN FILE
 * ---------------------------------------------------------------------
 * ChatGPT, asked what would make the travelling vehicles stop looking
 * like a nineties sprite:
 *
 *     "אם אפשר להוסיף דבר רביעי כמעט בחינם: תגובה למהירות. בהאצה/בלימה
 *      scale/pitch זעיר של 1–2%, ובפנייה lean קטן. בלי bounce מחזורי.
 *      רכב לא 'עושה אנימציה'; הוא מגיב לכוחות. זה ההבדל בתחושה."
 *
 * And, once the router was in:
 *
 *     "לא הייתי נותן לאנימציה לדעת בכלל על נקודות המסלול... כך אפשר
 *      בהמשך לעשות acceleration, braking ו-cornering בלי לשנות ניווט."
 *
 * That second sentence is why this can exist at all. `roadRouteAt`
 * answers in metres, so a layer can hold a SPEED — and once there is a
 * speed there is an acceleration, and once there is a heading there is a
 * curvature. Everything below is those two numbers turned into a pose.
 *
 * `world-motion.ts` is the other half and is deliberately left alone: it
 * holds the CYCLIC motion, the bob of a walk and the lean of a stride,
 * which is a function of distance travelled. This is the opposite kind —
 * nothing here repeats, and none of it happens while the vehicle is
 * holding a steady speed on a straight road. A van that is always doing
 * something is the thing this is meant to replace.
 */

export interface VehicleState {
  /** Metres travelled along the route. */
  distance: number;
  /** Metres per second, as the layer is driving it. */
  speed: number;
  /** Which way it is pointing, unit length. */
  heading: NormalizedPoint;
}

export interface VehiclePose {
  /**
   * Nose up under acceleration, down under braking, in the world's own
   * units where 1 is level. Applied as a vertical scale on the sprite,
   * which at this magnitude reads as weight transfer rather than as the
   * vehicle changing size.
   */
  pitch: number;
  /** Body roll through a corner, in radians. Positive leans right. */
  lean: number;
  /** How hard it is braking, 0..1 — for the brake lights. */
  braking: number;
  /** Whether the back of the vehicle is towards the viewer. */
  showingRear: boolean;
}

/**
 * THE NUMBERS, AND WHY THEY ARE THIS SMALL.
 *
 * Everything here is at the edge of noticing on purpose. ChatGPT asked
 * for 1–2% and it is right for a reason worth writing down: the eye
 * reads a vehicle's weight from very small changes, and anything large
 * enough to SEE as a movement reads as the sprite being animated. The
 * test for these numbers is that nobody can point at them.
 */
export const VEHICLE_RESPONSE = {
  /** Fraction of scale per m/s² of acceleration. */
  pitchPerAccel: 0.012,
  /** The most it may pitch, either way. */
  maxPitch: 0.02,
  /** Radians of roll per unit of curvature (1/metre) at 10 m/s. */
  leanPerCurve: 2.2,
  /** The most it may lean. About four degrees. */
  maxLean: 0.07,
  /** Below this deceleration, the brake lights stay off. */
  brakingThreshold: 0.6,
  /** Deceleration at which the brake lights are fully on. */
  brakingFull: 3.5,
} as const;

/** Signed curvature of a turn, in 1/metres, from two headings. */
export function curvatureBetween(
  before: NormalizedPoint,
  after: NormalizedPoint,
  metres: number
): number {
  if (metres <= 0) return 0;
  const cross = before.u * after.v - before.v * after.u;
  const dot = before.u * after.u + before.v * after.v;
  const angle = Math.atan2(cross, dot);
  return angle / metres;
}

/**
 * The pose a vehicle is in, from what it is doing.
 *
 * `accel` is metres per second squared: positive speeding up, negative
 * braking. `curvature` is signed, in 1/metres, and is scaled by speed
 * because a car leans through a corner in proportion to how fast it takes
 * it — a van crawling round a junction does not lean at all, and one
 * that leans anyway is the thing that reads as an animation.
 */
export function vehiclePose(state: VehicleState, accel: number, curvature: number): VehiclePose {
  const pitch = clamp(
    1 + accel * VEHICLE_RESPONSE.pitchPerAccel,
    1 - VEHICLE_RESPONSE.maxPitch,
    1 + VEHICLE_RESPONSE.maxPitch
  );

  /*
   * LATERAL ACCELERATION GOES WITH THE SQUARE OF SPEED.
   *
   * Written linear first, and a van crawling round a junction at half a
   * metre per second still leaned two degrees — which is the exact
   * failure this file exists to avoid, a vehicle doing something when
   * nothing is happening to it. v²κ is both the physics and the fix: at
   * walking pace the lean is a thousandth of a degree, and the same
   * corner taken at speed hits the clamp.
   */
  const v = Math.max(0, state.speed) / 10;
  const speedFactor = v * v;
  const lean = clamp(
    curvature * VEHICLE_RESPONSE.leanPerCurve * speedFactor,
    -VEHICLE_RESPONSE.maxLean,
    VEHICLE_RESPONSE.maxLean
  );

  const decel = Math.max(0, -accel);
  const braking =
    decel <= VEHICLE_RESPONSE.brakingThreshold
      ? 0
      : Math.min(
          1,
          (decel - VEHICLE_RESPONSE.brakingThreshold) /
            (VEHICLE_RESPONSE.brakingFull - VEHICLE_RESPONSE.brakingThreshold)
        );

  /*
   * THE BACK OF A VEHICLE IS TOWARDS YOU WHEN IT IS DRIVING AWAY.
   *
   * In this world `v` grows downwards and the viewer is at the bottom,
   * so a vehicle whose heading has a negative `v` is going up the street
   * and showing its back. ChatGPT: *"אדום רק כשהחלק האחורי פונה אלינו,
   * לבן מלפנים"* — the red lights being permanently on is one of the
   * things that makes a sprite look like a sticker.
   */
  return { pitch, lean, braking, showingRear: state.heading.v < 0 };
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Everything the response has to be true of.
 *
 * The first two are the ones that matter, and they are about what must
 * NOT happen: a vehicle holding a steady speed on a straight road is
 * perfectly still, and nothing here ever grows large enough to be seen
 * as a movement in its own right.
 */
export function vehicleMotionViolations(): string[] {
  const out: string[] = [];
  const straight: VehicleState = { distance: 100, speed: 9, heading: { u: 0, v: -1 } };

  const cruising = vehiclePose(straight, 0, 0);
  if (cruising.pitch !== 1) out.push("a vehicle at a steady speed is not level");
  if (cruising.lean !== 0) out.push("a vehicle on a straight road is leaning");
  if (cruising.braking !== 0) out.push("a vehicle that is not braking has its brake lights on");

  /* Nothing may be large enough to read as an animation. */
  for (const accel of [-12, -4, 0, 4, 12]) {
    for (const curve of [-0.2, 0, 0.2]) {
      const pose = vehiclePose({ ...straight, speed: 18 }, accel, curve);
      if (Math.abs(pose.pitch - 1) > VEHICLE_RESPONSE.maxPitch + 1e-9) {
        out.push("the pitch is large enough to see as a movement");
      }
      if (Math.abs(pose.lean) > VEHICLE_RESPONSE.maxLean + 1e-9) {
        out.push("the lean is large enough to see as a movement");
      }
    }
  }

  // Direction: accelerating lifts the nose, braking drops it.
  if (vehiclePose(straight, 3, 0).pitch <= 1) out.push("accelerating does not lift the nose");
  if (vehiclePose(straight, -3, 0).pitch >= 1) out.push("braking does not drop the nose");

  // A crawl through a junction does not lean.
  const crawling = vehiclePose({ ...straight, speed: 0.4 }, 0, 0.25);
  if (Math.abs(crawling.lean) > 0.01) out.push("a vehicle crawling round a corner leans like a bike");

  // And the same corner taken fast does.
  const fast = vehiclePose({ ...straight, speed: 14 }, 0, 0.25);
  if (Math.abs(fast.lean) < 0.02) out.push("a corner taken at speed does not lean at all");
  if (Math.sign(fast.lean) !== 1) out.push("the lean goes the wrong way round a corner");

  // Rear lights only when the back is towards the viewer.
  if (!vehiclePose({ ...straight, heading: { u: 0, v: -1 } }, 0, 0).showingRear) {
    out.push("a vehicle driving away is not showing its back");
  }
  if (vehiclePose({ ...straight, heading: { u: 0, v: 1 } }, 0, 0).showingRear) {
    out.push("a vehicle driving towards you is showing its back");
  }

  // Curvature: a straight line has none, a quarter turn over 10m has a lot.
  if (curvatureBetween({ u: 1, v: 0 }, { u: 1, v: 0 }, 10) !== 0) {
    out.push("a straight line is curved");
  }
  const quarter = curvatureBetween({ u: 1, v: 0 }, { u: 0, v: 1 }, 10);
  if (Math.abs(quarter - Math.PI / 2 / 10) > 1e-9) out.push("a quarter turn is the wrong curvature");
  if (curvatureBetween({ u: 1, v: 0 }, { u: 0, v: 1 }, 0) !== 0) {
    out.push("a turn over no distance is not finite");
  }

  return out;
}

/**
 * WHICH WAY THE ROAD ACTUALLY RUNS ON SCREEN — AND WHAT THE ART CAN TAKE.
 *
 * ---------------------------------------------------------------------
 * THE REPORT
 * ---------------------------------------------------------------------
 * Amit: *"למה המכוניות והאופנועים נוסעים ככ עקום ולא אמיתי עדיין?"*
 *
 * He had reported the traffic twice before and each time the answer was
 * a placement fix — the scooter riding through the pedestrian square,
 * the tow truck crossing the flowerbeds. Both were real and neither was
 * this one. This time the vehicles are on the measured carriageway and
 * they still look wrong, so the cause is somewhere else.
 *
 * It is the art, and it is arithmetic rather than taste. The delivered
 * vehicles are pure SIDE views — `moving_van`, `tow_truck`,
 * `courier_scooter` are all drawn broadside, wheels in a line. The
 * carriageway measured off this plate runs from (0.743, 0.042) to
 * (0.959, 0.958) of a 946x1662 picture, which on screen is 204 pixels
 * across for 1522 down: **82 degrees from horizontal**. The road goes
 * almost straight down the screen, towards the camera.
 *
 * A side-view van driving along that line is broadside to its own
 * direction of travel for the entire journey. There is no transform
 * that repairs it — rotating a side view by 82 degrees produces a van
 * standing on its nose, which is worse and is still not a vehicle seen
 * from behind.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS DOES ABOUT IT
 * ---------------------------------------------------------------------
 * Two things, and neither pretends to be the fix.
 *
 * `roadScreenAngleDeg` measures what is actually on screen, so the
 * question stops being a matter of looking at it. `sideViewFitsRoad`
 * answers whether side-view art can honestly drive that road, and a
 * test asks it about this plate — so the day the neighbourhood plate
 * changes, or the day the 3/4 art arrives, the answer changes by itself
 * instead of by somebody remembering.
 *
 * `SIDE_VIEW_MAX_DEG` is how far a broadside drawing can be turned
 * before it stops reading as a vehicle at all. It is deliberately
 * small. Turning a van 28 degrees into a road that runs at 82 does not
 * make it correct; it makes it visibly angled into its own direction of
 * travel rather than perfectly level across it, which is the most an
 * honest transform can buy. The rest is a drawing nobody has made yet —
 * see the vehicles section of `npm run art:brief`.
 */
export const SIDE_VIEW_MAX_DEG = 28;

/**
 * The angle of a line on screen, in degrees from horizontal, where the
 * two points are fractions of a picture `aspect` times as tall as it is
 * wide. Always 0..90: which way round it runs is `facing`, not this.
 */
export function roadScreenAngleDeg(
  from: NormalizedPoint,
  to: NormalizedPoint,
  aspect: number
): number {
  const dx = Math.abs(to.u - from.u);
  const dy = Math.abs(to.v - from.v) * aspect;
  if (dx === 0 && dy === 0) return 0;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Whether broadside art can honestly drive this road. False means the
 * picture required is a vehicle seen from behind, not a rotation.
 */
export function sideViewFitsRoad(
  from: NormalizedPoint,
  to: NormalizedPoint,
  aspect: number
): boolean {
  return roadScreenAngleDeg(from, to, aspect) <= SIDE_VIEW_MAX_DEG;
}

/** How far to turn side-view art towards a road, honestly bounded. */
export function sideViewTurnDeg(
  from: NormalizedPoint,
  to: NormalizedPoint,
  aspect: number
): number {
  const angle = roadScreenAngleDeg(from, to, aspect);
  return Math.min(angle, SIDE_VIEW_MAX_DEG);
}
