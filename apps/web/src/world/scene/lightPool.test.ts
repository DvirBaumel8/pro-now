import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { EVENING_LIGHT, LIGHT_POOL_SIZE, createLightPool, emitter, lendLights } from "./lightPool";

describe("the evening's light pool", () => {
  it("is a fixed set of dark point lights with the demo's falloff", () => {
    const parent = new THREE.Group();
    const pool = createLightPool(parent);
    expect(pool).toHaveLength(LIGHT_POOL_SIZE);
    expect(parent.children).toHaveLength(LIGHT_POOL_SIZE);
    for (const light of pool) {
      expect(light.intensity).toBe(0);
      expect(light.decay).toBe(2);
    }
  });

  it("lends its lights to the emitters nearest the camera, with their colour, strength and reach", () => {
    const pool = createLightPool(new THREE.Group(), 2);
    const far = emitter(0, 5, -100, 0xff0000, 95, 22);
    const near = emitter(0, 5, -3, 0x00ff00, 42, 11);
    const nearest = emitter(1, 5, 0, 0x0000ff, 210, 24);
    lendLights(pool, [far, near, nearest], new THREE.Vector3(0, 2, 2));
    expect(pool[0]!.position.toArray()).toEqual([1, 5, 0]);
    expect(pool[0]!.color.getHex()).toBe(0x0000ff);
    expect([pool[0]!.intensity, pool[0]!.distance]).toEqual([210, 24]);
    expect(pool[1]!.position.toArray()).toEqual([0, 5, -3]);
    expect([pool[1]!.intensity, pool[1]!.distance]).toEqual([42, 11]);
  });

  it("moves with the walker: further up the street, the far emitter takes a light", () => {
    const pool = createLightPool(new THREE.Group(), 1);
    const emitters = [emitter(0, 5, 0, 0xffffff, 95, 22), emitter(0, 5, -100, 0xffffff, 95, 22)];
    lendLights(pool, emitters, new THREE.Vector3(0, 2, 0));
    expect(pool[0]!.position.z).toBe(0);
    lendLights(pool, emitters, new THREE.Vector3(0, 2, -90));
    expect(pool[0]!.position.z).toBe(-100);
  });

  it("darkens a light it has nothing to lend to, without removing it", () => {
    const parent = new THREE.Group();
    const pool = createLightPool(parent, 3);
    lendLights(pool, [emitter(0, 5, 0, 0xffffff, 95, 22)], new THREE.Vector3());
    expect(pool.map((l) => l.intensity)).toEqual([95, 0, 0]);
    expect(parent.children).toHaveLength(3);
  });

  it("uses the demo's values: lamps 95 cd over 22 m, shop spill 42 over 11, signs 210 over 24", () => {
    expect(EVENING_LIGHT.lamp).toMatchObject({ colour: 0xffb45e, intensity: 95, distance: 22 });
    expect(EVENING_LIGHT.shopSpill).toMatchObject({ colour: 0xffc07a, intensity: 42, distance: 11 });
    expect(EVENING_LIGHT.shopSign).toMatchObject({ intensity: 210, distance: 24 });
  });
});
