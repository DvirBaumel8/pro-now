import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { WORLD_SHOPS } from "./street";
import { FOUND_FLIGHT, FOUND_SHOP_BY_DEPARTMENT, SEARCH_FLIGHT, foundFlightPose, searchFlightFactor, searchFlightPose } from "./searchFlight";

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

describe("found: the flight into the trade's shop", () => {
  const home = WORLD_SHOPS.find((shop) => shop.shopId === "home")!;
  const shop = { faceX: home.x, z: home.z, side: home.side };
  const from = new THREE.Vector3(0, 30, home.z + 40);
  const aimFrom = new THREE.Vector3(0, 0, home.z + 20);

  it("starts where the search left the camera", () => {
    const pose = foundFlightPose(from, aimFrom, shop, 0);
    expect(pose.position.distanceTo(from)).toBeCloseTo(0);
    expect(pose.look.distanceTo(aimFrom)).toBeCloseTo(0);
  });

  it("ends at eye height in front of the window, looking into the shop", () => {
    const pose = foundFlightPose(from, aimFrom, shop, FOUND_FLIGHT.seconds);
    expect(pose.position.y).toBeCloseTo(FOUND_FLIGHT.up);
    // Out over the pavement, on the street side of the facade.
    expect(Math.abs(pose.position.x)).toBeCloseTo(Math.abs(home.x) - FOUND_FLIGHT.out);
    expect(pose.position.z).toBeCloseTo(home.z + FOUND_FLIGHT.along);
    // Aimed inside the shop, past its front.
    expect(Math.abs(pose.look.x)).toBeGreaterThan(Math.abs(home.x));
    expect(pose.look.y).toBeCloseTo(FOUND_FLIGHT.aimUp);
    // And it stays there.
    expect(foundFlightPose(from, aimFrom, shop, 60).position.distanceTo(pose.position)).toBeCloseTo(0);
  });

  it("comes down in an arc, never through the roofs", () => {
    for (let s = 0; s <= FOUND_FLIGHT.seconds; s += 0.3) {
      const pose = foundFlightPose(from, aimFrom, shop, s);
      expect(pose.position.y).toBeGreaterThanOrEqual(FOUND_FLIGHT.up - 1e-6);
    }
  });

  it("knows each department's shop, as the demo's", () => {
    for (const code of Object.keys(FOUND_SHOP_BY_DEPARTMENT)) {
      expect(WORLD_SHOPS.some((s) => s.shopId === FOUND_SHOP_BY_DEPARTMENT[code])).toBe(true);
    }
  });
});
