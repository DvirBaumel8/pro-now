import { describe, expect, it } from "vitest";

import { FRONT_X, WORLD_SHOPS } from "./street";
import {
  ENTRY_MS,
  ROOM_SPOT_IN,
  ROOM_VEIL_S,
  doorShot,
  entryProgress,
  entryVeil,
  faceFade,
  roomVeil,
  streetShot,
} from "./shopEntry";

const left = { x: -FRONT_X, z: 52.8, side: -1 as const };
const right = { x: FRONT_X, z: 0, side: 1 as const };

describe("the walk in, as the demo's", () => {
  it("takes a second and a half, eased at both ends", () => {
    expect(ENTRY_MS).toBe(1500);
    expect(entryProgress(0, 1)).toBe(0);
    expect(entryProgress(0.5, 1)).toBeCloseTo(0.5);
    expect(entryProgress(1, 1)).toBe(1);
    expect(entryProgress(0.1, 1)).toBeLessThan(0.1);
    // Past the end it holds.
    expect(entryProgress(2, 1)).toBe(1);
  });

  it("plays backwards on the way out", () => {
    expect(entryProgress(0, -1)).toBe(1);
    expect(entryProgress(1, -1)).toBe(0);
  });

  it("ends 3.4 m inside the shop, the camera 0.2 m short of the frontage at 1.95 m, looking in", () => {
    expect(ROOM_SPOT_IN).toBe(3.4);
    for (const shop of [left, right]) {
      const shot = doorShot(shop);
      expect(shot.walkTo).toEqual({ x: shop.x + shop.side * 3.4, y: 0, z: shop.z });
      expect(shot.camera.x).toBeCloseTo(shop.x - shop.side * 0.2);
      expect(shot.camera.y).toBe(1.95);
      expect(shot.camera.z).toBeCloseTo(shop.z + 0.6);
      expect(shot.aim.x).toBeCloseTo(shop.x + shop.side * 6.4);
      expect(shot.aim.y).toBe(2.0);
    }
  });

  it("goes INTO the building, away from the road, on either side of the street", () => {
    for (const shop of WORLD_SHOPS) {
      const { walkTo } = doorShot(shop);
      expect(Math.abs(walkTo.x)).toBeGreaterThan(FRONT_X);
      expect(Math.sign(walkTo.x)).toBe(shop.side);
    }
  });

  it("comes back out to the pavement, 2.4 m from the frontage, the camera 6.6 m out and 2.6 m up", () => {
    for (const shop of [left, right]) {
      const out = streetShot(shop);
      expect(out.walker).toEqual({ x: shop.x - shop.side * 2.4, y: 0, z: shop.z + 1.2 });
      expect(out.camera).toEqual({ x: shop.x - shop.side * 6.6, y: 2.6, z: shop.z + 4.6 });
      expect(Math.abs(out.walker.x)).toBeLessThan(FRONT_X);
    }
  });

  it("fades the shopfront over the middle of the move", () => {
    expect(faceFade(0.25)).toBe(0);
    expect(faceFade(0.4)).toBeCloseTo(0.5);
    expect(faceFade(0.55)).toBeCloseTo(1);
    expect(faceFade(1)).toBe(1);
  });

  it("raises the shop's colour over the last 40% of the way in, and never on the way out", () => {
    expect(entryVeil(0.6, 1)).toBe(0);
    expect(entryVeil(0.77, 1)).toBeCloseTo(0.5);
    expect(entryVeil(0.94, 1)).toBeCloseTo(1);
    expect(entryVeil(1, 1)).toBe(1);
    expect(entryVeil(0.8, -1)).toBe(0);
  });

  it("lifts the colour off the room over 0.7 s", () => {
    expect(ROOM_VEIL_S).toBe(0.7);
    expect(roomVeil(0)).toBe(1);
    expect(roomVeil(0.35)).toBeCloseTo(0.5);
    expect(roomVeil(0.7)).toBe(0);
    expect(roomVeil(3)).toBe(0);
  });
});
