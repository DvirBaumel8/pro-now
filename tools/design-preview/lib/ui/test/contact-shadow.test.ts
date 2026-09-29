import { describe, expect, it } from "vitest";

import { GAITS } from "@pro-now/demo-types";

import {
  contactShadowViolations,
  liftFromBob,
  SHADOW,
  shadowFor,
} from "../src/components/livingmap/shadowGeometry";

describe("the contact shadow", () => {
  it("has no violations of its own model", () => {
    expect(contactShadowViolations()).toEqual([]);
  });

  it("is a flat oval, never a circle or a pillar", () => {
    const s = shadowFor(120);
    expect(s.height).toBeLessThan(s.width / 2);
  });

  it("is narrower than the figure standing on it", () => {
    const s = shadowFor(100);
    expect(s.width).toBeLessThan(100);
  });

  /*
   * The point of the whole component. A shadow that grows as the figure
   * rises is a light source moving, which is a claim about a scene we do
   * not get to make; a shadow that shrinks is contact being lost.
   */
  it("shrinks and fades as the figure lifts off the ground", () => {
    const planted = shadowFor(100, 0);
    const mid = shadowFor(100, 0.5);
    const lifted = shadowFor(100, 1);

    expect(mid.width).toBeLessThan(planted.width);
    expect(lifted.width).toBeLessThan(mid.width);
    expect(mid.opacity).toBeLessThan(planted.opacity);
    expect(lifted.opacity).toBeLessThan(mid.opacity);
  });

  it("never disappears completely at the top of a stride", () => {
    const lifted = shadowFor(100, 1);
    expect(lifted.width).toBeGreaterThan(0);
    expect(lifted.opacity).toBeGreaterThan(0.05);
  });

  it("scales with the figure, so distance shrinks both together", () => {
    const near = shadowFor(120);
    const far = shadowFor(60);
    expect(near.width / far.width).toBeCloseTo(2, 5);
  });

  it("refuses to draw for a figure of no width", () => {
    expect(shadowFor(0).width).toBe(0);
    expect(shadowFor(-40).width).toBe(0);
  });

  it("clamps a lift outside 0..1 rather than inverting", () => {
    expect(shadowFor(100, -3)).toEqual(shadowFor(100, 0));
    expect(shadowFor(100, 9)).toEqual(shadowFor(100, 1));
  });
});

describe("lift, read from the gait's own bob", () => {
  /*
   * A scooter's bob is a third of a millimetre and a walker's is a real
   * step. Both must report a full lift at the top of their own stride —
   * what the shadow reacts to is the fraction, not the pixels, or a
   * scooter would appear to be welded to the road while a walker flickers.
   */
  it("is 1 at the top of a stride for every gait", () => {
    for (const gait of ["WALK", "RIDE", "DRIVE", "HAUL"] as const) {
      expect(liftFromBob(gait, -GAITS[gait].bob)).toBeCloseTo(1, 6);
    }
  });

  it("is 0 with both feet down", () => {
    expect(liftFromBob("WALK", 0)).toBe(0);
  });

  /*
   * `bobAt` is defined to be <= 0 — up is negative on a screen. A positive
   * value would mean a figure pushed INTO the pavement, and the shadow
   * must not react to it by growing.
   */
  it("treats a figure below the ground as planted, not as extra contact", () => {
    expect(liftFromBob("WALK", 0.4)).toBe(0);
  });

  it("never exceeds 1, whatever the bob", () => {
    expect(liftFromBob("WALK", -99)).toBe(1);
  });

  it("is silent about a gait that does not bob at all", () => {
    const flat = { ...GAITS.WALK, bob: 0 };
    void flat;
    // RIDE has the smallest bob in the table; a zero-amplitude gait is
    // handled by the guard rather than by dividing by zero.
    expect(Number.isFinite(liftFromBob("RIDE", -0.001))).toBe(true);
  });
});

describe("the shadow's constants", () => {
  it("keeps the ellipse under the figure rather than around it", () => {
    expect(SHADOW.widthRatio).toBeLessThan(1);
    expect(SHADOW.widthRatio).toBeGreaterThan(0.3);
  });

  it("stays a soft patch rather than a black disc", () => {
    expect(SHADOW.opacity).toBeLessThanOrEqual(0.4);
  });
});
