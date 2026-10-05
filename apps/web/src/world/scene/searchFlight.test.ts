import { describe, expect, it } from "vitest";

import { WORLD_SHOPS } from "./street";
import { SEARCH_FLIGHT, searchFlightFactor, searchFlightPose } from "./searchFlight";

describe("the search flight", () => {
  it("stays high over the street, looking down on it", () => {
    for (let s = 0; s < 120; s += 3) {
      const pose = searchFlightPose(s);
      expect(pose.position.y).toBe(SEARCH_FLIGHT.height);
      expect(pose.look.y).toBe(0);
      // Looking forward and down, never up or back.
      expect(pose.look.z).toBeLessThan(pose.position.z);
      expect(Math.abs(pose.position.x)).toBeLessThanOrEqual(SEARCH_FLIGHT.sway);
    }
  });

  it("moves: the view a few seconds on is somewhere else along the street", () => {
    expect(searchFlightPose(10).look.z).not.toBeCloseTo(searchFlightPose(0).look.z, 0);
  });

  it("sweeps the street's shops, end to end", () => {
    const zs = Array.from({ length: 200 }, (_, i) => searchFlightPose(i).look.z);
    const shopZ = WORLD_SHOPS.map((shop) => shop.z);
    expect(Math.min(...zs)).toBeLessThan(Math.min(...shopZ) + 20);
    expect(Math.max(...zs)).toBeGreaterThan(Math.max(...shopZ) - 20);
  });

  it("eases by time, not by frame", () => {
    expect(searchFlightFactor(0)).toBe(0);
    expect(searchFlightFactor(1)).toBeCloseTo(0.97);
    // Two half-frames cover what one whole frame does.
    const half = searchFlightFactor(0.5);
    expect(1 - (1 - half) * (1 - half)).toBeCloseTo(searchFlightFactor(1));
  });
});
