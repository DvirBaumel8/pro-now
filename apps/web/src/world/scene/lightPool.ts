import * as THREE from "three";

/**
 * THE EVENING'S LIGHT, LENT OUT (the demo's street.ts, "LENDING THE SIX LAMPS OUT").
 *
 * The evening street is lit by its lamps and its shops. three.js compiles the
 * number of lights into every material and every lit pixel loops over all of
 * them, so a light per lamp and per shop (about thirty) is unaffordable, and
 * switching far ones off as you walk changes the count, which recompiles every
 * material, a stall each time. The demo's answer, ported here: a fixed pool of
 * real point lights (the count never changes) lent every fifth of a second to
 * the emitters nearest the camera. The rest keep their glow sprites and the
 * painted pools under the lamps, which cost nothing.
 *
 * The values are the demo's, in physical units (candela, metres): a street
 * lamp 95 cd reaching 22 m, a shop's spill on its pavement 42 cd over 11 m,
 * its neon sign 210 cd over 24 m.
 */
export interface LightEmitter {
  position: THREE.Vector3;
  colour: THREE.Color;
  /** Candela. */
  intensity: number;
  /** Metres, where the light reaches zero. */
  distance: number;
}

export const LIGHT_POOL_SIZE = 10;
/** Seconds between re-lending: well under what a walker could notice. */
export const LEND_INTERVAL_S = 0.2;
/** Physically based falloff, as the demo's pool. */
const DECAY = 2;

export const EVENING_LIGHT = {
  lamp: { colour: 0xffb45e, intensity: 95, distance: 22, height: 5.0 },
  shopSpill: { colour: 0xffc07a, intensity: 42, distance: 11, height: 2.7, out: 2.4 },
  shopSign: { intensity: 210, distance: 24, height: 4.6, out: 2.6 },
} as const;

export function emitter(
  x: number,
  y: number,
  z: number,
  colour: THREE.ColorRepresentation,
  intensity: number,
  distance: number,
): LightEmitter {
  return { position: new THREE.Vector3(x, y, z), colour: new THREE.Color(colour), intensity, distance };
}

/** The pool's lights, dark until lent, added to `parent`. */
export function createLightPool(parent: THREE.Object3D, size = LIGHT_POOL_SIZE): THREE.PointLight[] {
  const pool: THREE.PointLight[] = [];
  for (let i = 0; i < size; i += 1) {
    const light = new THREE.PointLight(0xffffff, 0, 20, DECAY);
    light.name = "light-pool";
    parent.add(light);
    pool.push(light);
  }
  return pool;
}

/**
 * Give the pool's lights to the emitters nearest `from`, nearest first.
 * A light with no emitter left goes dark; none is ever added or removed.
 */
export function lendLights(pool: readonly THREE.PointLight[], emitters: LightEmitter[], from: THREE.Vector3): void {
  emitters.sort((a, b) => a.position.distanceToSquared(from) - b.position.distanceToSquared(from));
  for (let i = 0; i < pool.length; i += 1) {
    const light = pool[i]!;
    const source = emitters[i];
    if (!source) {
      light.intensity = 0;
      continue;
    }
    light.position.copy(source.position);
    light.color.copy(source.colour);
    light.intensity = source.intensity;
    light.distance = source.distance;
  }
}
