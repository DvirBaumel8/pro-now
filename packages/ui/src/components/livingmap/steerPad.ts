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
