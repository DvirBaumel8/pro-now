import * as THREE from "three";

import { SPAWN } from "./street";

/**
 * Third-person follow: camera sits behind and above the player,
 * matching the demo's perspective (slightly above, behind, looking
 * ahead of the character).
 */
export function followCharacter(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  reducedMotion: boolean,
): void {
  const desired = new THREE.Vector3(target.x * 0.85, target.y + 3.6, target.z + 6.8);
  if (reducedMotion) camera.position.copy(desired);
  else camera.position.lerp(desired, 0.08);
  camera.lookAt(target.x, target.y + 0.8, target.z - 3.5);
}

/**
 * Aerial overview of the street (for SEARCH, AMBIENT, FALLBACK modes).
 * Higher altitude to show more of the street, matching the demo's
 * wider view with fog fading out the ends.
 */
export function frameStreet(
  camera: THREE.PerspectiveCamera,
  reducedMotion: boolean,
): void {
  const desired = new THREE.Vector3(0, 28, SPAWN.z + 30);
  if (reducedMotion) camera.position.copy(desired);
  else camera.position.lerp(desired, 0.04);
  camera.lookAt(0, 0, SPAWN.z - 40);
}

/**
 * Camera position inside a shop room: looking at the back wall from
 * the doorway area, matching the demo's interior framing.
 */
export function followInsideShop(
  camera: THREE.PerspectiveCamera,
  reducedMotion: boolean,
): void {
  const desired = new THREE.Vector3(0, 1.8, 3.2);
  const lerpFactor = reducedMotion ? 1 : 0.06;
  camera.position.lerp(desired, lerpFactor);
  camera.lookAt(0, 1.6, -1.5);
}
