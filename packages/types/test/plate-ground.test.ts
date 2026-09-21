import { describe, expect, it } from "vitest";

import { CUSTOMER_POINT } from "../src/assignment-route";
import {
  CARRIAGEWAY,
  PLATE_SPOTS,
  ROAD_SAMPLES,
  WORLD_SIZE,
  roadAt,
} from "../src/world-neighbourhood";

/**
 * TWO MEASUREMENTS OF THE SAME PLATE, MADE TO ARGUE WITH EACH OTHER.
 *
 * `PLATE_SPOTS` comes from `measure-spots.mjs` — where a building may
 * stand. `ROAD_SAMPLES` comes from `measure-road.mjs` — where a vehicle
 * may drive. They read the same image by complementary tests, and for a
 * long time they disagreed silently: one shopfront stood in the middle of
 * the carriageway, on the painted crossing, because the building script
 * was still asking whether the ground was BRIGHT and a zebra crossing is
 * brighter than the pavement beside it.
 *
 * Nothing on screen made that obvious — a shop on a road at dusk, seen
 * from above, looks like a shop. So the two answers are compared here
 * instead, which is the only place the contradiction is cheap to see.
 */
describe("the plate's ground", () => {
  const halfShop = WORLD_SIZE.venue / 2;

  it("stands no shopfront in the road", () => {
    const offenders = PLATE_SPOTS.filter((spot) => {
      const road = roadAt(spot.v);
      return Math.abs(spot.u - road.u) < road.halfWidth;
    }).map((s) => `${s.u.toFixed(3)},${s.v.toFixed(3)}`);

    expect(offenders).toEqual([]);
  });

  it("does not let a shopfront overhang more than a kerb's worth of carriageway", () => {
    // A shop is WORLD_SIZE.venue wide and centred on its spot, so a
    // corner may touch the kerb; a third of the building in the road is a
    // different thing entirely and is what this refuses.
    for (const spot of PLATE_SPOTS) {
      const road = roadAt(spot.v);
      const gap = Math.abs(spot.u - road.u) - road.halfWidth;
      // How much of the shop's half-width crosses the kerb line.
      const overhang = Math.max(0, halfShop - gap) / WORLD_SIZE.venue;
      expect(overhang).toBeLessThan(0.34);
    }
  });

  it("keeps every shopfront behind the customer", () => {
    // A professional leaving a shop nearer the eye than the customer
    // drives AWAY to arrive, and shrinks as they come.
    for (const spot of PLATE_SPOTS) expect(spot.v).toBeLessThan(CUSTOMER_POINT.v);
  });

  it("runs the carriageway from one edge of the world to the other", () => {
    // A road that starts and stops inside the frame is a car park.
    expect(CARRIAGEWAY[0]!.v).toBeLessThan(0.08);
    expect(CARRIAGEWAY.at(-1)!.v).toBeGreaterThan(0.92);
  });

  it("never doubles back on itself", () => {
    // Each sample is a band of the plate taken in order, so v must
    // increase; a road that goes backwards is two roads mistaken for one.
    for (let i = 1; i < ROAD_SAMPLES.length; i++) {
      expect(ROAD_SAMPLES[i]!.v).toBeGreaterThan(ROAD_SAMPLES[i - 1]!.v);
    }
  });

  it("bends rather than jumping", () => {
    // The continuity rule the measurement uses, asserted on its output:
    // a carriageway does not move a fifth of the world between two bands.
    for (let i = 1; i < ROAD_SAMPLES.length; i++) {
      expect(Math.abs(ROAD_SAMPLES[i]!.u - ROAD_SAMPLES[i - 1]!.u)).toBeLessThan(0.18);
    }
  });

  it("gives every trade a spot of its own", () => {
    const keys = new Set(PLATE_SPOTS.map((s) => `${s.u},${s.v}`));
    expect(keys.size).toBe(PLATE_SPOTS.length);
  });
});
