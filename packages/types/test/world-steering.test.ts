import { describe, expect, it } from "vitest";

import {
  STEER_SPEED,
  WALKABLE,
  clampWalkable,
  distanceWalked,
  facingFor,
  insideWalkable,
  stepFrom,
  steeringViolations,
} from "../src/world-steering";
import { pathLength } from "../src/world-motion";

const mid = { u: 0.5, v: 0.5 };

describe("the steering model holds its own rules", () => {
  it("has no violations", () => {
    expect(steeringViolations()).toEqual([]);
  });
});

describe("walking, not panning", () => {
  it("moves the avatar rather than the camera", () => {
    // The whole distinction: a drag moves the world under a fixed viewer
    // and you are reading a map. A steer moves a person through a world
    // that stays where it is. This function returns a POSITION, and there
    // is nowhere in it to express a camera offset.
    const after = stepFrom(mid, "E", 1000);
    expect(after.u).toBeGreaterThan(mid.u);
    expect(Object.keys(after).sort()).toEqual(["u", "v"]);
  });

  it("stands still with no heading", () => {
    expect(stepFrom(mid, null, 5000)).toEqual(mid);
  });

  it("covers the same visible ground north as east", () => {
    // The world is drawn in 3/4. Without correcting for it, holding "up"
    // crosses the street faster than holding "right", which reads as the
    // controls being broken rather than as perspective.
    const east = pathLength([mid, stepFrom(mid, "E", 900)]);
    const north = pathLength([mid, stepFrom(mid, "N", 900)]);
    expect(north).toBeCloseTo(east, 9);
  });

  it("goes further the longer you hold it", () => {
    expect(stepFrom(mid, "E", 2000).u).toBeGreaterThan(stepFrom(mid, "E", 1000).u);
    expect(distanceWalked(2000)).toBeCloseTo(distanceWalked(1000) * 2, 9);
  });

  it("walks at a pace you can read shops at", () => {
    // Not a sprint. The point is not to get anywhere; it is to pass shops
    // at the pace you would pass shops.
    expect(STEER_SPEED).toBeLessThanOrEqual(0.09);
  });
});

describe("the world has edges", () => {
  it("never walks out of it", () => {
    for (const h of ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const) {
      const far = stepFrom(mid, h, 10_000_000);
      expect(far.u).toBeGreaterThanOrEqual(0);
      expect(far.u).toBeLessThanOrEqual(1);
      expect(far.v).toBeGreaterThanOrEqual(0);
      expect(far.v).toBeLessThanOrEqual(1);
    }
  });

  it("keeps a figure inside the walkable box", () => {
    // Bounded rather than blocked: the plate has no collision map, and
    // inventing one from image analysis produces a figure that
    // mysteriously refuses to move.
    const out = clampWalkable({ u: 2, v: -3 });
    expect(insideWalkable(out)).toBe(true);
    expect(out.u).toBe(WALKABLE.maxU);
    expect(out.v).toBe(WALKABLE.minV);
  });
});

describe("facing", () => {
  it("mirrors the one back view rather than demanding a side view", () => {
    // Twelve side views is twelve more files for a case the customer sees
    // for a second at a time while turning.
    expect(facingFor("E")).toBe(-1);
    expect(facingFor("W")).toBe(1);
  });

  it("leaves a figure walking straight away from you as drawn", () => {
    expect(facingFor("N")).toBe(1);
    expect(facingFor("S")).toBe(1);
    expect(facingFor(null)).toBe(1);
  });
});
