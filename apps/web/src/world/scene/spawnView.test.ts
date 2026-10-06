import { describe, expect, it } from "vitest";

import { FRONT_X, inSpawnView, SPAWN, WORLD_PLACES, WORLD_SHOPS } from "./street";

describe("the first view", () => {
  it("contains the player", () => {
    expect(inSpawnView(SPAWN.x, SPAWN.z)).toBe(true);
  });

  it("has no place's picture standing in it (each is 6 m wide)", () => {
    for (const place of WORLD_PLACES) {
      expect(inSpawnView(place.x, place.z, 3), place.id).toBe(false);
    }
  });

  it("would have caught the dog park where it stood, on the walker's own pavement", () => {
    expect(inSpawnView(-FRONT_X + 2, 58.4, 3)).toBe(true);
    // Where the demo builds it, across the road, it is clear.
    const dogpark = WORLD_PLACES.find((place) => place.id === "dogpark")!;
    expect(dogpark).toMatchObject({ x: FRONT_X - 2.2, z: 58.4 });
  });

  it("leaves the shopfronts on the building line, the home shop just ahead of it", () => {
    for (const shop of WORLD_SHOPS) expect(inSpawnView(shop.x, shop.z), shop.shopId).toBe(false);
  });
});
