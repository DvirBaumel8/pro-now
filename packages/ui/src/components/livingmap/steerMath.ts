import type { Heading } from "@pro-now/types";

/**
 * READING A THUMB AS A DIRECTION — separated from the component that draws
 * the pad, so it can be tested without a renderer.
 *
 * See `SteerPad.tsx` for why this is a pad rather than four buttons.
 */

/** Below this fraction of the pad's radius, a touch is not a direction. */
export const DEADZONE = 0.22;

const ORDER = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/**
 * Which of the eight ways a touch at this offset from the centre means.
 *
 * Screen axes: `y` grows downward, so a touch ABOVE centre is negative and
 * means north. Getting that backwards sends the avatar the wrong way, and
 * a control that goes the wrong way is the most obvious kind of broken.
 *
 * The dead zone is what stops a thumb resting on the hub from picking an
 * arbitrary direction and walking off on its own.
 */
export function headingFrom(dx: number, dy: number, radius: number): Heading {
  if (Math.hypot(dx, dy) < radius * DEADZONE) return null;
  // Eight sectors of 45°, measured from north and going clockwise.
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return ORDER[Math.round(((deg + 360) % 360) / 45) % 8]!;
}

/**
 * HOW HARD THE THUMB IS PUSHING, 0 to 1.
 *
 * ---------------------------------------------------------------------
 * WHY THE PAD HAS TO ANSWER THIS
 * ---------------------------------------------------------------------
 * Amit wants running: *"שאתה יכול לרוץ עם החצים."* A separate run button
 * is the obvious build and the wrong one — it puts a second thing under
 * the same thumb and makes speed a mode you toggle rather than something
 * you do.
 *
 * A thumbstick already carries the answer in how far it has travelled
 * from the centre. Near the middle is a walk, out at the rim is a run,
 * and changing between them is the same gesture as steering. Nothing new
 * appears on screen.
 *
 * Zero inside the deadzone, so the value and the heading agree about
 * standing still.
 */
export function intensityFrom(dx: number, dy: number, radius: number): number {
  const d = Math.hypot(dx, dy);
  const dead = radius * DEADZONE;
  if (d <= dead) return 0;
  return Math.max(0, Math.min(1, (d - dead) / (radius - dead)));
}

/**
 * Where a walk becomes a run.
 *
 * Past halfway rather than at the very rim: a threshold at the edge can
 * only be held by somebody pressing their thumb off the control, so the
 * run would be the one speed nobody could sustain.
 */
export const RUN_AT = 0.55;

export function gaitFor(intensity: number): "WALK" | "RUN" {
  return intensity >= RUN_AT ? "RUN" : "WALK";
}
