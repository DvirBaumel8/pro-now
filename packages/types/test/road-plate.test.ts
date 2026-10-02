import { describe, expect, it } from "vitest";

import { ROAD_PLATE_ASSET_ID, roadIsMeasuredFor } from "../src/world-neighbourhood";

/**
 * TRAFFIC ONLY ON THE PICTURE ITS ROAD WAS MEASURED ON.
 *
 * `ROAD_SAMPLES` are not a road in the abstract. They are where the
 * tarmac is in one illustration, to three decimal places. Two screens
 * forgot that and Amit found both: a scooter flying across the welcome
 * screen's café terrace — which is where a DIFFERENT painting's road
 * happens to be — and vans driving over a real map of somebody's
 * neighbourhood.
 */
describe("where ambient traffic may run", () => {
  it("runs on the plate the road was measured on", () => {
    expect(roadIsMeasuredFor({ groundAssetId: ROAD_PLATE_ASSET_ID })).toBe(true);
  });

  it("defaults to that plate when no ground is named", () => {
    // Most callers do not pass one, and the default must be the safe,
    // correct answer rather than "whatever happens to be showing".
    expect(roadIsMeasuredFor({})).toBe(true);
  });

  it("refuses any other painting", () => {
    // The welcome screen's own hero, and the one it falls back to.
    for (const ground of ["welcome_hero", "hair_barbershop_hero", "district_auto", "shared_ground_street"]) {
      expect(roadIsMeasuredFor({ groundAssetId: ground }), ground).toBe(false);
    }
  });

  it("refuses a real map even when the ground asset looks right", () => {
    /*
     * The stricter of the two, and the order matters: a real map has no
     * painted road at all, so invented traffic on one is not a
     * misalignment, it is a claim about a real street.
     */
    expect(roadIsMeasuredFor({ groundAssetId: ROAD_PLATE_ASSET_ID, realMap: true })).toBe(false);
    expect(roadIsMeasuredFor({ realMap: true })).toBe(false);
  });
});
