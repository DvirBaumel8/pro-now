import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  CUTOUT_ALPHA_TEST,
  SHADOW_HALF,
  SHADOW_LEAD,
  SUN_OFFSET,
  WORLD_LIGHTING,
  aimSun,
  configureSunShadow,
  createShadowCaster,
  shadowFocus,
  shadowForSprite,
} from "./lighting";
import { frontageYaw } from "./street";

describe("the world's light, as the demo's", () => {
  it("uses the demo's sky and ground light, sun and exposure by day and by evening", () => {
    expect(WORLD_LIGHTING.day.hemisphere).toEqual({ sky: 0xdcebff, ground: 0x9c8a74, intensity: 1.9 });
    expect(WORLD_LIGHTING.night.hemisphere).toEqual({ sky: 0x8290d0, ground: 0x3d3140, intensity: 0.95 });
    expect(WORLD_LIGHTING.day.sun).toEqual({ colour: 0xfff1da, intensity: 2.9 });
    expect(WORLD_LIGHTING.night.sun).toEqual({ colour: 0xb9c4ee, intensity: 0.8 });
    expect(WORLD_LIGHTING.day.fog).toEqual({ colour: 0xc4d8ec, density: 0.0075 });
    expect(WORLD_LIGHTING.night.fog).toEqual({ colour: 0x2a2448, density: 0.0125 });
    expect(WORLD_LIGHTING.day.exposure).toBe(1);
    expect(WORLD_LIGHTING.night.exposure).toBe(1);
  });

  it("runs each sky from its top (0) to the horizon (1), deep blue by day and night-blue at 20:00", () => {
    for (const hour of ["day", "night"] as const) {
      const stops = WORLD_LIGHTING[hour].sky.map(([stop]) => stop);
      expect(stops[0]).toBe(0);
      expect(stops.at(-1)).toBe(1);
      expect([...stops].sort((a, b) => a - b)).toEqual(stops);
    }
    expect(WORLD_LIGHTING.day.sky[0]![1]).toBe("#3f86d6");
    expect(WORLD_LIGHTING.night.sky[0]![1]).toBe("#0b1030");
  });
});

describe("the sun's shadow", () => {
  it("casts from a 1024² map over a 32 m box", () => {
    const sun = new THREE.DirectionalLight();
    configureSunShadow(sun);
    expect(sun.castShadow).toBe(true);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    const cam = sun.shadow.camera;
    expect([cam.left, cam.right, cam.top, cam.bottom]).toEqual([-SHADOW_HALF, SHADOW_HALF, SHADOW_HALF, -SHADOW_HALF]);
    expect(sun.shadow.bias).toBeLessThan(0);
    expect(sun.shadow.normalBias).toBeGreaterThan(0);
  });

  it("is centred a few metres ahead of the camera, on the ground", () => {
    const focus = shadowFocus(new THREE.Vector3(1, 6, 20), new THREE.Vector3(0, -0.6, -0.8));
    expect(focus.x).toBeCloseTo(1);
    expect(focus.y).toBe(0);
    expect(focus.z).toBeCloseTo(20 - 0.8 * SHADOW_LEAD);
  });

  it("keeps the same angle wherever the box goes, so shadows hold still as you walk", () => {
    const sun = new THREE.DirectionalLight();
    const toward = (focus: THREE.Vector3) => {
      aimSun(sun, focus);
      return sun.position.clone().sub(sun.target.position).normalize();
    };
    const here = toward(new THREE.Vector3(0, 0, 0));
    const there = toward(new THREE.Vector3(-4, 0, -120));
    expect(there.distanceTo(here)).toBeLessThan(1e-9);
    expect(here.distanceTo(SUN_OFFSET.clone().normalize())).toBeLessThan(1e-9);
    // High, and from the left and behind (as the demo's).
    expect(here.y).toBeGreaterThan(0.6);
    expect(here.x).toBeLessThan(0);
    expect(here.z).toBeGreaterThan(0);
  });
});

describe("a shadow for a painted thing", () => {
  const map = new THREE.Texture();

  it("draws into the shadow map with the picture's alpha and nothing on screen", () => {
    const caster = createShadowCaster(map, 3.6, 5.4, [5, 2.7, -10]);
    const material = caster.material as THREE.MeshBasicMaterial;
    expect(caster.castShadow).toBe(true);
    expect(caster.receiveShadow).toBe(false);
    expect(material.visible).toBe(true); // the shadow pass skips an invisible material
    expect(material.colorWrite).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(material.side).toBe(THREE.DoubleSide);
    const depth = caster.customDepthMaterial as THREE.MeshDepthMaterial;
    expect(depth.map).toBe(map);
    expect(depth.alphaTest).toBe(CUTOUT_ALPHA_TEST);
    expect(caster.position.toArray()).toEqual([5, 2.7, -10]);
  });

  it("is a solid sheet when there is no picture", () => {
    const depth = createShadowCaster(null, 1, 1, [0, 0, 0]).customDepthMaterial as THREE.MeshDepthMaterial;
    expect(depth.map).toBeNull();
    expect(depth.alphaTest).toBe(0);
  });

  it("faces the sun across the ground by default, so it casts its whole silhouette", () => {
    const caster = createShadowCaster(map, 1, 1, [0, 0, 0]);
    caster.updateMatrixWorld();
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(caster.quaternion);
    const sunAcross = new THREE.Vector3(SUN_OFFSET.x, 0, SUN_OFFSET.z).normalize();
    expect(normal.distanceTo(sunAcross)).toBeLessThan(1e-9);
  });

  it("can be lined up with the street instead, for a shopfront", () => {
    const caster = createShadowCaster(map, 8.8, 5.2, [-9.7, 2.6, 0], frontageYaw(-1));
    expect(caster.rotation.y).toBe(frontageYaw(-1));
  });

  it("stands where its sprite stands, at its size", () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map }));
    sprite.scale.set(1.4, 0.9, 1);
    sprite.position.set(-6, 0.45, 26);
    const caster = shadowForSprite(sprite);
    const size = new THREE.Box3().setFromBufferAttribute(
      caster.geometry.getAttribute("position") as THREE.BufferAttribute,
    ).getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1.4);
    expect(size.y).toBeCloseTo(0.9);
    expect(caster.position.toArray()).toEqual([-6, 0.45, 26]);
    expect((caster.customDepthMaterial as THREE.MeshDepthMaterial).map).toBe(map);
  });
});
