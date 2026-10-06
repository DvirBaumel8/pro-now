import * as THREE from "three";

import { KERB_X, SPAWN, type WorldShopPosition } from "./street";

/** Where the camera wants to be and what it wants to look at. */
export interface CameraPose {
  position: THREE.Vector3;
  look: THREE.Vector3;
}

/**
 * The demo's third-person camera (City.tsx), walking down the street:
 * 6.98 m straight behind the walker, height and aim proportional to that
 * distance (1.2 + 0.33·d up, 1.55·d ahead at 1.1 + 0.16·d), so the figure
 * sits low in the frame with the street opening out ahead of it.
 */
export const FOLLOW_DISTANCE = 6.2 + 0.26 * 3.0;

/**
 * The line the following camera rides. The walker is on the pavement, and
 * straight behind them the camera would fly through the lamps and the
 * trees (billboards that turn to face it and fill the screen). So it stays
 * just off the kerb, clear of every pavement prop, still aimed at the walker.
 */
export const CAMERA_LINE_X = KERB_X + 0.6;

export function cameraLineX(x: number): number {
  return Math.sign(x) * Math.min(Math.abs(x), CAMERA_LINE_X);
}

export function followPose(target: THREE.Vector3): CameraPose {
  return streetPose(target, 0, 0, false);
}

/*
 * ---------------------------------------------------------------------------
 * AROUND A SHOP, AS THE DEMO'S (tools/design-preview/src/city/City.tsx,
 * "LOOKING AT THE SHOP YOU ARE WALKING PAST" and "STANDING BACK TO SEE A SHOP")
 * ---------------------------------------------------------------------------
 * The demo's camera has a HEAD and a pair of LEGS of its own:
 *
 * - `look`, an angle added to the camera's heading and to nothing else. As you
 *   pass a shop the view drifts towards the middle of its facade: on with
 *   proximity over 4.5 m, held to 0.42 of itself while you walk (you glance),
 *   capped at 0.85 rad (past about fifty degrees the walker, a back-view
 *   drawing, would be seen walking sideways), and eased by time, slowly
 *   (0.02^dt), because snapping to a shop reads as a bug.
 * - `frame`, 0 walking and 1 standing back. Stopping beside a shop walks the
 *   camera BACKWARDS, out over the road, while the walker stays on the
 *   pavement: 5.2 m further back and 1.1 m higher, so most of the facade is in
 *   the 72° lens (from the pavement it held 13% of a shopfront). Eased at
 *   0.08^dt; walk on and it comes back in behind you.
 * - A shop you can SEE INTO (the demo's `windowShops`) is framed CLOSE
 *   instead, at about head height: only 1.6 m further back, 0.6 m LOWER, the
 *   aim raised 1.3 m and the head allowed round to 1.4 rad once you stop, so
 *   the window and the room behind it fill the screen (`closeUp`).
 *
 * Which shop: the nearest DOORWAY (3 m out from the facade) within 9 m, and
 * only one you can see: a door more than 1.5 m behind the way you face does
 * not count. The demo's walker turns round; the product's always faces down
 * the street (-z), the demo's opening heading (yaw = π), so the angles here
 * are measured from that.
 */

/** A shop counts from its doorway, nine metres off (the demo's `bd = 9`). */
export const SHOP_SEEN_WITHIN = 9;
/** The doorway stands this far out from the facade, on the pavement. */
export const DOORWAY_OUT = 3.0;
/** A door further than this behind the way you face is not "beside" you. */
export const BEHIND_LIMIT = 1.5;
/** Below this stick push you are standing still. */
export const STILL_PUSH = 0.08;
/** The head's turn: on over the last 4.5 m, capped, and held back while walking. */
export const LOOK = { ramp: 4.5, cap: 0.85, capSeeInto: 1.4, walking: 0.42, ease: 0.02 } as const;
/** Standing back: on over the last 4 m, then how far back, up and where the aim goes. */
export const FRAME = {
  ramp: 4,
  ease: 0.08,
  back: 5.2,
  rise: 1.1,
  closeBack: 1.6,
  closeRise: -0.6,
  closeAim: 1.3,
} as const;

export interface ShopBeside {
  shop: WorldShopPosition;
  /** From the walker to the shop's doorway, in metres. */
  distance: number;
}

/** The demo's `best`: the nearest doorway within 9 m that is not behind you. */
export function shopBeside(
  x: number,
  z: number,
  shops: readonly WorldShopPosition[],
): ShopBeside | null {
  let best: ShopBeside | null = null;
  let bd = SHOP_SEEN_WITHIN;
  for (const shop of shops) {
    const doorX = shop.x - shop.side * DOORWAY_OUT;
    // Facing -z: "along" the way you face is how far the door is down the street.
    const along = z - shop.z;
    if (along < -BEHIND_LIMIT) continue;
    const d = Math.hypot(doorX - x, shop.z - z);
    if (d < bd) {
      bd = d;
      best = { shop, distance: d };
    }
  }
  return best;
}

/**
 * The head's wanted turn, radians, positive to the left (towards -x). It aims
 * at the middle of the facade, level with the doorway.
 */
export function lookWant(x: number, z: number, beside: ShopBeside | null, push: number, seeInto: boolean): number {
  if (!beside) return 0;
  const { shop, distance } = beside;
  // The demo's atan2(wallX - x, door.z - z) - yaw, with yaw = π, wrapped.
  let d = Math.atan2(shop.x - x, shop.z - z) - Math.PI;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const near = Math.max(0, Math.min(1, (SHOP_SEEN_WITHIN - distance) / LOOK.ramp));
  const still = push <= STILL_PUSH;
  const cap = seeInto && still ? LOOK.capSeeInto : LOOK.cap;
  return Math.max(-cap, Math.min(cap, d)) * near * (still ? 1 : LOOK.walking);
}

/** How far to stand back, 0 to 1: only while still, over the last 4 m. */
export function frameWant(beside: ShopBeside | null, push: number): number {
  if (!beside || push >= STILL_PUSH) return 0;
  return Math.max(0, Math.min(1, (SHOP_SEEN_WITHIN - beside.distance) / FRAME.ramp));
}

/** The demo's time-based easing: `v += (want - v) * (1 - base^dt)`. */
export function easeBy(value: number, want: number, base: number, dtSeconds: number): number {
  return value + (want - value) * (1 - Math.pow(base, Math.max(0, dtSeconds)));
}

/**
 * The demo's walking camera with its head turned by `look` and stood back by
 * `frame`: `dist` behind along the turned heading, height and aim following
 * the distance (1.2 + 0.33·d up, 1.55·d ahead at 1.1 + 0.16·d), plus the
 * framing terms above. The product keeps its kerb line (`cameraLineX`) so the
 * camera never rides through the pavement's lamps and trees.
 */
export function streetPose(target: THREE.Vector3, look: number, frame: number, closeUp: boolean): CameraPose {
  const dist = FOLLOW_DISTANCE + frame * (closeUp ? FRAME.closeBack : FRAME.back);
  const height = 1.2 + dist * 0.33 + frame * (closeUp ? FRAME.closeRise : FRAME.rise);
  const ahead = dist * 1.55;
  // Forward, facing -z and turned left by `look`: (-sin, -cos).
  const sin = Math.sin(look);
  const cos = Math.cos(look);
  return {
    position: new THREE.Vector3(cameraLineX(target.x + sin * dist), height, target.z + cos * dist),
    look: new THREE.Vector3(
      target.x - sin * ahead,
      1.1 + dist * 0.16 + (closeUp ? frame * FRAME.closeAim : 0),
      target.z - cos * ahead,
    ),
  };
}

/**
 * THE ENTRY: high over the street, then down behind the walker.
 *
 * As in the demo, the world opens 38 m back and 26 m up, looking down the
 * lit street, and the first move flies the camera down into the walking
 * view over 1.9 s. `k` is the eased progress, 0 up there and 1 down here.
 */
export const ENTRY_WIDE = { dist: 38, hgt: 26 } as const;
export const DESCENT_SECONDS = 1.9;

/** Ease in and out, so the drop neither starts nor stops with a jolt. */
export function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function entryPose(target: THREE.Vector3, k: number, ground: CameraPose): CameraPose {
  const wide: CameraPose = {
    position: new THREE.Vector3(target.x, ENTRY_WIDE.hgt, target.z + ENTRY_WIDE.dist),
    look: new THREE.Vector3(target.x, 2.6, target.z - ENTRY_WIDE.dist * 1.55 * 0.45),
  };
  if (k <= 0) return wide;
  if (k >= 1) return ground;
  return {
    position: wide.position.lerp(ground.position, k),
    look: wide.look.lerp(ground.look, k),
  };
}

/** The demo's easing towards the pose, by time rather than by frame. */
export function followFactor(dtSeconds: number): number {
  return 1 - Math.pow(0.002, Math.max(0, dtSeconds));
}

// The point each camera is looking at, eased like its position so that moving
// in and out of a shop's range turns the view instead of snapping it.
const lookTargets = new WeakMap<THREE.Camera, THREE.Vector3>();

/**
 * Move the camera a step towards a pose. Reduced motion jumps straight there.
 * The look target eases at the same rate as the position.
 */
export function easeTowards(
  camera: THREE.PerspectiveCamera,
  pose: CameraPose,
  factor: number,
  reducedMotion: boolean,
): void {
  const step = reducedMotion ? 1 : factor;
  camera.position.lerp(pose.position, step);
  let look = lookTargets.get(camera);
  if (!look) {
    look = pose.look.clone();
    lookTargets.set(camera, look);
  } else {
    look.lerp(pose.look, step);
  }
  camera.lookAt(look);
}

/** Look straight at a point and remember it, for views that do not ease (and scripted moves). */
export function lookAtNow(camera: THREE.PerspectiveCamera, x: number, y: number, z: number): void {
  const look = lookTargets.get(camera) ?? new THREE.Vector3();
  look.set(x, y, z);
  lookTargets.set(camera, look);
  camera.lookAt(look);
}

export function followCharacter(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  reducedMotion: boolean,
): void {
  easeTowards(camera, followPose(target), 0.08, reducedMotion);
}

/**
 * Aerial overview of the street (for SEARCH, AMBIENT, FALLBACK modes).
 */
export function frameStreet(
  camera: THREE.PerspectiveCamera,
  reducedMotion: boolean,
): void {
  const desired = new THREE.Vector3(0, 28, SPAWN.z + 30);
  if (reducedMotion) camera.position.copy(desired);
  else camera.position.lerp(desired, 0.04);
  lookAtNow(camera, 0, 0, SPAWN.z - 40);
}
