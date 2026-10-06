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
