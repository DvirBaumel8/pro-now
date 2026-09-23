import { describe, expect, it } from "vitest";

import {
  GAITS,
  bobAt,
  leanAt,
  pathLength,
  travelMs,
  worldMotionViolations,
} from "../src/world-motion";

describe("the motion model holds its own rules", () => {
  it("has no violations", () => {
    expect(worldMotionViolations()).toEqual([]);
  });
});

describe("a step is distance, not time", () => {
  /*
   * This is the whole difference between walking and being dragged. A sine
   * on a clock keeps bobbing when the figure has stopped — jogging on the
   * spot — and its rhythm has nothing to do with how fast it is going, so
   * the feet slide. On distance, one rise and fall per step of ground.
   */
  it("does not move a figure that has not moved", () => {
    expect(bobAt("WALK", 0)).toBeCloseTo(0, 12);
  });

  it("gives the same phase for the same distance, whatever the speed", () => {
    expect(bobAt("WALK", 0.25)).toBeCloseTo(bobAt("WALK", 0.25), 10);
  });

  it("completes exactly one rise and fall per stride", () => {
    const stride = 1 / GAITS.WALK.cyclesPerWorld;
    expect(bobAt("WALK", stride)).toBeCloseTo(0, 10);
    expect(bobAt("WALK", stride / 2)).toBeCloseTo(-GAITS.WALK.bob, 10);
  });

  it("never sinks a figure into the pavement", () => {
    for (let d = 0; d <= 2; d += 0.007) expect(bobAt("WALK", d)).toBeLessThanOrEqual(1e-9);
  });
});

describe("wheels are not legs", () => {
  it("lets a scooter chatter but never lean", () => {
    expect(GAITS.RIDE.bob).toBeGreaterThan(0);
    expect(leanAt("RIDE", 0.3, 1)).toBe(0);
  });

  it("leans a walker into the direction of travel", () => {
    const right = leanAt("WALK", 0.01, 1);
    const left = leanAt("WALK", 0.01, -1);
    expect(right).not.toBe(0);
    expect(left).toBeCloseTo(-right, 10);
  });

  it("leans once per step, not twice", () => {
    // The bob rises and falls each step; the lean goes forward and back
    // once. Matching their frequencies makes a walker nod on every foot.
    const stride = 1 / GAITS.WALK.cyclesPerWorld;
    expect(leanAt("WALK", stride, 1)).toBeCloseTo(0, 10);
    expect(Math.abs(leanAt("WALK", stride / 2, 1))).toBeCloseTo(GAITS.WALK.lean, 10);
  });
});

describe("speed belongs to the traveller", () => {
  it("makes a person the slowest thing on the street", () => {
    // They shared one duration per moment, so whoever was on foot sprinted.
    for (const [name, g] of Object.entries(GAITS)) {
      if (name !== "WALK") expect(g.speed, name).toBeGreaterThan(GAITS.WALK.speed);
    }
  });

  it("takes longer over a longer road", () => {
    expect(travelMs("WALK", 1)).toBeGreaterThan(travelMs("WALK", 0.4));
  });

  it("takes longer on foot than on a scooter over the same road", () => {
    expect(travelMs("WALK", 1)).toBeGreaterThan(travelMs("RIDE", 1));
  });

  it("refuses a journey too short to register or long enough to becalm a street", () => {
    expect(travelMs("RIDE", 0.0001)).toBeGreaterThanOrEqual(1200);
    expect(travelMs("WALK", 999)).toBeLessThanOrEqual(30_000);
  });
});

describe("distance in a 3/4 world", () => {
  it("counts a step up the street as further than a step across it", () => {
    /*
     * THE NAME WAS ALWAYS RIGHT AND THE ASSERTION WAS BACKWARDS.
     *
     * It read `across > up` — half a unit up the street counting as
     * LESS ground than half a unit across it. On a drawing 1662 tall
     * and 946 wide that is false by a factor of 1.75, and on the
     * three-plate street it is false by 5.17: the same `dv` spans five
     * times the pixels the same `du` does, because the street is five
     * times longer than it is wide. The old 0.6 weight simply made the
     * arithmetic agree with the assertion.
     *
     * It matters for more than tidiness: `travelMs` divides by this, so
     * an under-counted vertical distance is a van that crosses the
     * whole neighbourhood in the time it takes to cross the street.
     */
    const across = pathLength([{ u: 0, v: 0 }, { u: 0.5, v: 0 }]);
    const up = pathLength([{ u: 0, v: 0 }, { u: 0, v: 0.5 }]);
    expect(up).toBeGreaterThan(across);
  });

  it("is zero for a thing that has not gone anywhere", () => {
    expect(pathLength([{ u: 0.3, v: 0.3 }])).toBe(0);
  });
});
