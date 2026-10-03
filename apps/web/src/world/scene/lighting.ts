import * as THREE from "three";

/**
 * THE DEMO'S LIGHT AND AIR (tools/design-preview/src/city/street.ts, "SKY AND
 * AIR" and "LIGHT"; City.tsx for the renderer).
 *
 * Three things were missing from the product's street:
 *
 * - The sky. It was painted on a sphere 180 m out, and the fog ate it: at
 *   that distance the day haze covers 84% of it and the evening haze 99%,
 *   so the gradient and the stars never showed. The demo's sky is the
 *   scene's background, which fog does not touch.
 * - Shadows by day. The sun cast none, and nothing in the street was marked
 *   to cast or take one, so even the evening's shadow map drew nothing.
 *   A shadow is how the eye decides a surface is in space (Amit: "עדיין
 *   נראה כמו ציור").
 * - The demo's colours: its sun, its sky and ground light, exposure 1.0.
 */
export type WorldHour = "day" | "night";

export interface WorldLighting {
  /** Tone-mapping exposure (ACES filmic). */
  exposure: number;
  /** Sky gradient, top (0) to horizon (1). */
  sky: ReadonlyArray<readonly [stop: number, colour: string]>;
  fog: { colour: number; density: number };
  hemisphere: { sky: number; ground: number; intensity: number };
  sun: { colour: number; intensity: number };
}

export const WORLD_LIGHTING: Readonly<Record<WorldHour, WorldLighting>> = {
  day: {
    exposure: 1.0,
    // Morning: a clear Mediterranean sky, paler to the horizon.
    sky: [
      [0, "#3f86d6"],
      [0.45, "#76b1ea"],
      [0.8, "#bcdcf4"],
      [1, "#f1e6cf"],
    ],
    fog: { colour: 0xc4d8ec, density: 0.0075 },
    hemisphere: { sky: 0xdcebff, ground: 0x9c8a74, intensity: 1.9 },
    sun: { colour: 0xfff1da, intensity: 2.9 },
  },
  night: {
    exposure: 1.0,
    // Eight in the evening, not two in the morning: light left low in the west.
    sky: [
      [0, "#0b1030"],
      [0.42, "#1d2050"],
      [0.72, "#4a3364"],
      [0.9, "#8a4f63"],
      [1, "#c07a5e"],
    ],
    fog: { colour: 0x2a2448, density: 0.0125 },
    hemisphere: { sky: 0x8290d0, ground: 0x3d3140, intensity: 0.95 },
    sun: { colour: 0xb9c4ee, intensity: 0.8 },
  },
};

/** Where the sun sits from the spot it lights: high, to the left and behind. */
export const SUN_OFFSET = new THREE.Vector3(-22, 34, 17);
/** Half the side of the shadow box, in metres. */
export const SHADOW_HALF = 16;
/** The box is aimed this far ahead of the camera, where the eye is looking. */
export const SHADOW_LEAD = 7;
/** Below this the cut-out's alpha is a hole in its shadow (the demo's value). */
export const CUTOUT_ALPHA_TEST = 0.42;
/**
 * The yaw that turns a plane built facing +z to face the sun across the
 * ground, so a cut-out casts its whole silhouette rather than an edge.
 */
export const SUN_FACING_YAW = Math.atan2(SUN_OFFSET.x, SUN_OFFSET.z);

/** The background: a 4 × 256 gradient, as in the demo. */
export function skyTexture(hour: WorldHour): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    for (const [stop, colour] of WORLD_LIGHTING[hour].sky) g.addColorStop(stop, colour);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** The sun's shadow, set up as the demo's: one 1024² map in a box that follows you. */
export function configureSunShadow(sun: THREE.DirectionalLight): void {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const cam = sun.shadow.camera;
  cam.left = -SHADOW_HALF;
  cam.right = SHADOW_HALF;
  cam.top = SHADOW_HALF;
  cam.bottom = -SHADOW_HALF;
  cam.near = 1;
  cam.far = 90;
  cam.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
}

/** The ground point the shadow box is centred on: a few metres ahead of the camera. */
export function shadowFocus(
  cameraPosition: THREE.Vector3,
  cameraDirection: THREE.Vector3,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return out.copy(cameraDirection).multiplyScalar(SHADOW_LEAD).add(cameraPosition).setY(0);
}

/**
 * Move the sun with the box. The light keeps its angle, so shadows hold
 * still as you walk; only the region that is sharp moves.
 */
export function aimSun(sun: THREE.DirectionalLight, focus: THREE.Vector3): void {
  sun.target.position.copy(focus);
  sun.target.updateMatrixWorld();
  sun.position.set(focus.x + SUN_OFFSET.x, SUN_OFFSET.y, focus.z + SUN_OFFSET.z);
  sun.updateMatrixWorld();
}

/**
 * A SHADOW FOR A PAINTED THING.
 *
 * The street's trees, lamps and shopfronts are sprites, and three.js draws
 * no shadow for a sprite. Beside each stands this: a quad turned to the sun
 * that is drawn into the shadow map with the picture's own alpha (so a palm
 * casts a palm, not a rectangle) and draws nothing on screen. It is the
 * demo's `cutout` with the visible part left to the sprite.
 *
 * `yaw` is the quad's facing; it defaults to facing the sun.
 */
export function createShadowCaster(
  map: THREE.Texture | null,
  width: number,
  height: number,
  position: readonly [number, number, number],
  yaw = SUN_FACING_YAW,
): THREE.Mesh {
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    // Invisible on screen, but still drawn into the shadow map (which skips
    // an object whose material is not visible). Both faces cast.
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  quad.position.set(position[0], position[1], position[2]);
  quad.rotation.y = yaw;
  quad.castShadow = true;
  quad.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map,
    alphaTest: map ? CUTOUT_ALPHA_TEST : 0,
  });
  quad.name = "shadow-caster";
  return quad;
}

/** The caster for a standing sprite: its picture, its size, where it stands. */
export function shadowForSprite(sprite: THREE.Sprite): THREE.Mesh {
  const { x, y, z } = sprite.position;
  return createShadowCaster(sprite.material.map, sprite.scale.x, sprite.scale.y, [x, y, z]);
}
