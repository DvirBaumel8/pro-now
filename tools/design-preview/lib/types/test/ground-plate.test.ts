import { describe, expect, it } from "vitest";

import { CUSTOMER_POINT } from "../src/assignment-route";
import { PLATE_SPOTS, WORLD_SIZE } from "../src/world-neighbourhood";
import {
  FOOTPRINT,
  GROUND_RULES,
  groundPlateViolations,
  PLATE_RATIO,
  PLATE_SIZE,
  reachable,
  requiredFootings,
} from "../src/ground-plate";
import { WALKABLE } from "../src/world-steering";

describe("what the ground has to be", () => {
  it("holds its own rules", () => {
    expect(groundPlateViolations()).toEqual([]);
  });

  it("is portrait, because every measured coordinate assumes it", () => {
    expect(PLATE_RATIO).toBeLessThan(1);
    expect(PLATE_SIZE.height).toBeGreaterThan(PLATE_SIZE.width);
  });

  /*
   * The rule that is not about drawing. A shop painted into the ground is
   * on screen when three professionals are online, when one is, and when
   * none is — a business that exists whether or not anybody is behind it,
   * which /CLAUDE.md §3 forbids. The plate in the build today has
   * shopfronts baked into it and has been making that claim quietly.
   */
  it("forbids businesses in the artwork", () => {
    expect(GROUND_RULES.noEntities).toBe(true);
  });

  it("forbids an island, because the camera clamps to the edge", () => {
    expect(GROUND_RULES.fullBleed).toBe(true);
  });

  it("asks every trade to stand somewhere a person can actually walk", () => {
    // A footing outside the walk's clamp is a trade nobody can visit, and
    // it would stay invisible until somebody tried to walk to it.
    for (const { department, at } of requiredFootings()) {
      expect(reachable(at), `${department} at ${at.u},${at.v}`).toBe(true);
    }
  });

  it("names every trade exactly once", () => {
    const names = requiredFootings().map((f) => f.department);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(11);
  });

  it("agrees with the walk about where the edges are", () => {
    expect(reachable({ u: WALKABLE.minU, v: WALKABLE.minV })).toBe(true);
    expect(reachable({ u: WALKABLE.minU - 0.01, v: 0.5 })).toBe(false);
    expect(reachable({ u: 0.5, v: WALKABLE.maxV + 0.01 })).toBe(false);
  });
});

/**
 * The footprint rules, which exist because the point rules passed while
 * six of eleven buildings stood in flowerbeds and on a zebra crossing.
 */
describe("what a shopfront needs under it", () => {
  it("asks for a box, not a pixel", () => {
    // If this ever becomes zero the contract has quietly gone back to
    // testing the doorstep.
    expect(FOOTPRINT.width).toBeGreaterThan(0.05);
    expect(FOOTPRINT.aspect).toBeGreaterThan(0);
  });

  it("is stricter about the base than about the body", () => {
    // A lamp post in front of a shop is fine. A flowerbed under it is not.
    expect(FOOTPRINT.baseClear).toBeGreaterThan(FOOTPRINT.bodyClear);
  });

  it("does not demand perfection, because perfection returned nothing", () => {
    // 100% clear found zero usable slots on a real plate. A test nothing
    // can pass is not a test of the world.
    expect(FOOTPRINT.bodyClear).toBeLessThan(1);
  });

  it("keeps every shop behind the customer", () => {
    expect(FOOTPRINT.maxV).toBeLessThan(CUSTOMER_POINT.v);
    for (const s of PLATE_SPOTS) {
      expect(s.v, `a shop at v=${s.v} stands in front of the customer`).toBeLessThanOrEqual(
        FOOTPRINT.maxV
      );
    }
  });

  it("agrees with the size the world actually draws", () => {
    // Two numbers for one building is how the measurement and the render
    // came apart in the first place.
    expect(FOOTPRINT.width).toBeCloseTo(WORLD_SIZE.venue, 5);
  });
});
