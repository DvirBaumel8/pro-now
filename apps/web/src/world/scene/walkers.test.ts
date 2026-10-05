import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { SPAWN, STREET_LENGTH } from "./street";
import {
  CLEAR_OF_SPAWN,
  STRIDE,
  WALKER_COUNT,
  WALKER_LANE,
  WALKER_SHEETS,
  createWalker,
  frameIndex,
  measureSheet,
  planWalkers,
  type Cycle,
} from "./walkers";

/** A sheet of figures: [x0, x1] columns each, filled from row `top` to `bottom`, feet at [f0, f1]. */
function sheet(figures: Array<{ x: [number, number]; feet?: [number, number] }>, top = 10, bottom = 89) {
  return (x: number, y: number) =>
    figures.some(({ x: [a, z], feet }) => {
      if (y < top || y > bottom) return false;
      if (feet && y >= bottom - 12) return x >= feet[0] && x <= feet[1];
      return x >= a && x <= z;
    });
}

describe("slicing a walk sheet", () => {
  it("finds each figure from its own columns, not an even grid", () => {
    // Uneven widths and gaps, as the delivered sheets (walk_man: 254–305 px wide, 1–25 px apart).
    const layout = measureSheet(sheet([{ x: [0, 29] }, { x: [40, 74] }, { x: [76, 105] }]), 120, 100);
    expect(layout?.rects).toEqual([
      [0, 29],
      [40, 74],
      [76, 105],
    ]);
    expect(layout?.band).toEqual([10, 89]);
    expect(layout?.unit).toBe(35);
  });

  it("keeps to the figures' band, so a mark above them does not stretch every frame", () => {
    const figures = sheet([{ x: [0, 29] }, { x: [40, 69] }]);
    const withCaption = (x: number, y: number) => figures(x, y) || (y >= 0 && y <= 3 && x < 60);
    expect(measureSheet(withCaption, 100, 100)?.band).toEqual([10, 89]);
  });

  it("centres each pose on its feet, not its outline", () => {
    // An arm out to the right: the outline runs to 39, the feet sit at 10–19.
    const layout = measureSheet(sheet([{ x: [0, 39], feet: [10, 19] }]), 60, 100);
    expect(layout?.centres).toEqual([15]);
  });

  it("splits a run that is two figures touching, at the waist between them", () => {
    // Two 30-wide figures joined by a hand: 8 columns, 3 pixels tall.
    const two = (x: number, y: number) =>
      (y >= 10 && y <= 89 && ((x >= 0 && x <= 29) || (x >= 38 && x <= 67))) || (x >= 30 && x <= 37 && y >= 50 && y <= 52);
    const rects = measureSheet(two, 80, 100)?.rects ?? [];
    expect(rects).toHaveLength(2);
    expect(rects[0]![1]).toBeGreaterThanOrEqual(29);
    expect(rects[1]![0]).toBeLessThanOrEqual(38);
  });

  it("cuts the dog walker's sheet evenly, as the demo does", () => {
    expect(WALKER_SHEETS.find(({ id }) => id === "walk_dogwalker")?.forceEven).toBe(6);
    const layout = measureSheet(sheet([{ x: [0, 119] }]), 120, 100, 6);
    expect(layout?.rects).toHaveLength(6);
    expect(layout?.rects[1]).toEqual([20, 39]);
  });

  it("finds nothing on an empty sheet", () => {
    expect(measureSheet(() => false, 50, 50)).toBeNull();
  });
});

describe("the walk", () => {
  it("steps through the poses by ground covered, one cycle a stride", () => {
    expect(frameIndex(0, STRIDE, 7)).toBe(0);
    expect(frameIndex(STRIDE / 2, STRIDE, 7)).toBe(3);
    expect(frameIndex(STRIDE * 0.999, STRIDE, 7)).toBe(6);
    expect(frameIndex(STRIDE * 2 + 0.01, STRIDE, 7)).toBe(0);
  });

  it("lays the crowd in the pavement's middle lane, clear of where you arrive", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const plans = planWalkers(random, 200);
    expect(planWalkers()).toHaveLength(WALKER_COUNT);
    for (const plan of plans) {
      expect(Math.abs(plan.x)).toBeGreaterThanOrEqual(WALKER_LANE.from);
      expect(Math.abs(plan.x)).toBeLessThanOrEqual(WALKER_LANE.from + WALKER_LANE.width);
      expect(Math.abs(plan.z - SPAWN.z)).toBeGreaterThanOrEqual(CLEAR_OF_SPAWN);
      expect(Math.abs(plan.z)).toBeLessThanOrEqual(STREET_LENGTH / 2);
      expect(plan.height).toBeGreaterThanOrEqual(1.62);
      expect(plan.height).toBeLessThanOrEqual(1.76);
    }
    expect(new Set(plans.map((plan) => Math.sign(plan.x)))).toEqual(new Set([-1, 1]));
    expect(new Set(plans.map((plan) => plan.sheet))).toEqual(new Set([0, 1, 2]));
  });

  const cycle: Cycle = { frames: Array.from({ length: 7 }, () => new THREE.Texture()), aspect: 0.4 };
  const walker = createWalker({ x: -6, z: 10, sheet: 0, height: 1.7, speed: 1.2 }, cycle, new THREE.Texture());

  it("is a lit figure seen from behind, casting a shadow in its own shape, with a contact shadow", () => {
    const figure = walker.group.getObjectByName("walker-figure") as THREE.Mesh;
    expect((figure.geometry as THREE.PlaneGeometry).parameters).toMatchObject({ width: 1.7 * 0.4, height: 1.7 });
    expect(figure.position.y).toBeCloseTo(0.85);
    expect(figure.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(figure.castShadow).toBe(true);
    expect((figure.customDepthMaterial as THREE.MeshDepthMaterial).map).toBe(cycle.frames[0]);
    expect(walker.group.getObjectByName("walker-contact-shadow")).toBeDefined();
  });

  it("walks away from the camera, its shadow changing pose with it, and comes back in at the top", () => {
    walker.step(STRIDE / 2 / 1.2);
    expect(walker.group.position.z).toBeCloseTo(10 - STRIDE / 2);
    expect(walker.frame()).toBe(cycle.frames[3]);
    const figure = walker.group.getObjectByName("walker-figure") as THREE.Mesh;
    expect((figure.customDepthMaterial as THREE.MeshDepthMaterial).map).toBe(cycle.frames[3]);
    walker.group.position.z = -STREET_LENGTH / 2 + 0.1;
    walker.step(1);
    expect(walker.group.position.z).toBeCloseTo(STREET_LENGTH / 2 - 1.1);
  });
});
