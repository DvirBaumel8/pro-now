import { describe, expect, it } from "vitest";

import {
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
