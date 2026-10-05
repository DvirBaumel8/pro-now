/**
 * GOING IN AND COMING BACK OUT, AS THE DEMO'S (tools/design-preview/src/city/City.tsx,
 * "GOING IN", "THE WALK-IN GOES THROUGH THE DOOR NOW", `leaveRef`).
 *
 * Pressing the door is not a cut. For a second and a half (by the wall clock,
 * not the frame counter) the stick is ignored, the walker walks on through the
 * door to a spot 3.4 m inside, and the camera comes down off the follow rig to
 * 0.2 m short of the frontage, 1.95 m up, looking in. The facade fades out of
 * the way over the middle of the move, and the shop's own colour rises over the
 * last 40% of it; the room then opens out of that colour, which lifts off over
 * 0.7 s. Coming back out plays the same move backwards from the room to the
 * pavement, with no colour: you can see where you are going.
 */

/** The walk-in's length, in milliseconds of the viewer's clock. */
export const ENTRY_MS = 1500;
/** How far inside the frontage the walk ends. */
export const ROOM_SPOT_IN = 3.4;
/** The shop's colour lifts off you over this, once you are in. */
export const ROOM_VEIL_S = 0.7;

export interface DoorShop {
  /** The frontage line (±FRONT_X) and the shop's middle along the street. */
  x: number;
  z: number;
  side: -1 | 1;
}

type V3 = { x: number; y: number; z: number };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Eased progress for `raw` (0 → 1 of ENTRY_MS): 0 on the pavement, 1 in the shop, whichever way you are going. */
export function entryProgress(raw: number, dir: 1 | -1): number {
  const r = clamp01(raw);
  const k = r * r * (3 - 2 * r);
  return dir > 0 ? k : 1 - k;
}

/** Where the walk-in ends, where its camera ends and what it looks at. */
export function doorShot(shop: DoorShop): { walkTo: V3; camera: V3; aim: V3 } {
  const inside = shop.x + shop.side * ROOM_SPOT_IN;
  return {
    walkTo: { x: inside, y: 0, z: shop.z },
    camera: { x: inside - shop.side * 3.6, y: 1.95, z: shop.z + 0.6 },
    aim: { x: inside + shop.side * 3.0, y: 2.0, z: shop.z },
  };
}

/** Where the way out ends: on the pavement, and the camera behind and above it. */
export function streetShot(shop: DoorShop): { walker: V3; camera: V3 } {
  return {
    walker: { x: shop.x - shop.side * 2.4, y: 0, z: shop.z + 1.2 },
    camera: { x: shop.x - shop.side * 6.6, y: 2.6, z: shop.z + 4.6 },
  };
}

/** The facade gets out of the way over the middle of the move. */
export function faceFade(k: number): number {
  return clamp01((k - 0.25) / 0.3);
}

/** The shop's colour over the screen: the last 40% of the way in; never on the way out. */
export function entryVeil(k: number, dir: 1 | -1): number {
  return dir > 0 ? clamp01((k - 0.6) / 0.34) : 0;
}

/** And lifting off once you are in. */
export function roomVeil(secondsInside: number): number {
  return 1 - clamp01(secondsInside / ROOM_VEIL_S);
}

/** The point the walker is seen at during the move (the demo's aim's start). */
export const WALKER_AIM_Y = 2.5;
