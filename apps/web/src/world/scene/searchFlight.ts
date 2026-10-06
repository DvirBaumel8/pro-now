import * as THREE from "three";

import type { CameraPose } from "./camera";

/**
 * THE SEARCH, FLOWN OVER THE STREET (the demo's `search` on City.tsx).
 *
 * While the server is looking for a professional, the camera flies slowly
 * and high along the lit street, looking steeply down on the roofs and the
 * road, back and forth over its whole length. It shows the search, never a
 * result: nobody is named and no shop is picked until the server assigns.
 *
 * The demo's numbers: 30 m up, 16 m behind the point it looks at, a gentle
 * sideways sway (3 m at 0.11 rad/s) and the along-street swing (0.06 rad/s).
 * Our street runs from z ≈ 88 to z ≈ −141, so the swing is centred on it.
 */
export const SEARCH_FLIGHT = { height: 30, behind: 16, ahead: 4, sway: 3, centreZ: -26, reach: 100 } as const;

export function searchFlightPose(seconds: number): CameraPose {
  const f = SEARCH_FLIGHT;
  const z = f.centreZ + Math.sin(seconds * 0.06) * f.reach;
  return {
    position: new THREE.Vector3(Math.sin(seconds * 0.11) * f.sway, f.height, z + f.behind),
    look: new THREE.Vector3(0, 0, z - f.ahead),
  };
}

/** The demo eases the flight by time: 1 − 0.03^dt of the way each frame. */
export function searchFlightFactor(dtSeconds: number): number {
  return 1 - Math.pow(0.03, Math.max(0, dtSeconds));
}

/**
 * FOUND: DOWN AND IN, AT AN ANGLE, INTO THE SHOP'S WINDOW (the demo's search
 * flight on "found").
 *
 * Once the server has assigned a professional, the camera leaves the search
 * from wherever it is, arcs down (9 m of lift that falls away as it goes) and
 * ends in front of the trade's shop window at eye height, looking into the
 * shop: 5.2 m out from the facade, 2.3 m up, 3.2 m along the street, aiming
 * 2.5 m inside at 2.1 m. It takes 4.2 s, smoothstepped; the professional is
 * shown in the doorway once it lands (JobWorldBackdrop).
 */
export const FOUND_FLIGHT = { seconds: 4.2, out: 5.2, up: 2.3, along: 3.2, inside: 2.5, aimUp: 2.1, lift: 9 } as const;

/** The demo's department → the shop the camera flies to (its DEPT_SHOP: the first of a trade's shops). */
export const FOUND_SHOP_BY_DEPARTMENT: Readonly<Record<string, string>> = {
  HOME_URGENT: "home",
  APPLIANCES: "appliance",
  HOME_CARE: "care",
  BEAUTY: "hair",
  WELLNESS: "well",
  PETS: "pets",
  VEHICLE: "auto",
  LOGISTICS: "move",
  TECH: "tech",
  ODD_JOBS: "help",
  IMPROVEMENT: "build",
};

/**
 * Where the camera is `seconds` into the flight to a shop at (`faceX`, `z`)
 * on `side`, having started at `from` looking at `aimFrom`.
 */
export function foundFlightPose(
  from: THREE.Vector3,
  aimFrom: THREE.Vector3,
  shop: { faceX: number; z: number; side: -1 | 1 },
  seconds: number,
): CameraPose {
  const f = FOUND_FLIGHT;
  const k0 = Math.min(1, Math.max(0, seconds / f.seconds));
  const k = k0 * k0 * (3 - 2 * k0);
  const end = new THREE.Vector3(shop.faceX - shop.side * f.out, f.up, shop.z + f.along);
  const aimEnd = new THREE.Vector3(shop.faceX + shop.side * f.inside, f.aimUp, shop.z);
  const mid = from.clone().lerp(end, 0.55).add(new THREE.Vector3(0, f.lift * (1 - k), 0));
  return {
    position: from.clone().lerp(mid, Math.min(1, k * 1.6)).lerp(end, k),
    look: aimFrom.clone().lerp(aimEnd, Math.min(1, k * 1.3)),
  };
}
