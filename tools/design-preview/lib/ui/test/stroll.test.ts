import { describe, expect, it } from "vitest";

import { districtCentre, WORLD_DISTRICTS, type DepartmentCode } from "@pro-now/demo-types";

import { DEPTH_STEP, DEPTH_WEIGHT, depthChanged, NEAR, nearestDistrict } from "../src/screens/stroll";

const codes = Object.keys(WORLD_DISTRICTS) as DepartmentCode[];

/** A point on this plate that is far enough from every shop to be nowhere. */
function findOpenPoint(): { u: number; v: number } | null {
  for (let u = 0.1; u < 0.95; u += 0.03) {
    for (let v = 0.1; v < 0.95; v += 0.03) {
      const at = { u, v };
      const clear = codes.every((c) => {
        const s = districtCentre(c);
        return Math.hypot(s.u - at.u, (s.v - at.v) * DEPTH_WEIGHT) >= NEAR;
      });
      if (clear) return at;
    }
  }
  return null;
}

describe("the trade the walker is standing by", () => {
  it("names the shop you are standing on", () => {
    for (const code of codes) {
      expect(nearestDistrict(districtCentre(code))).toBe(code);
    }
  });

  /*
   * Saying nothing is a real answer and the common one. A label that is
   * always showing something is a label that is sometimes lying about
   * which shop you are at.
   */
  /*
   * Saying nothing is a real answer and the common one — but WHERE the
   * open ground is belongs to the plate, not to this file. Both of these
   * used to name a hardcoded point, and both broke the day a new plate
   * moved the pavement under them, which is the test being wrong rather
   * than the code. So the open point is searched for.
   */
  it("says nothing out in the open", () => {
    const open = findOpenPoint();
    expect(open, "this plate has no open ground at all").not.toBeNull();
    expect(nearestDistrict(open!)).toBeNull();
  });

  it("stays silent everywhere that is genuinely far from a shop", () => {
    // Not one lucky point: every point more than the threshold from all
    // eleven must be silent, or the label is reaching.
    for (let u = 0.05; u < 1; u += 0.07) {
      for (let v = 0.05; v < 1; v += 0.07) {
        const at = { u, v };
        const far = codes.every((c) => {
          const s = districtCentre(c);
          return Math.hypot(s.u - at.u, (s.v - at.v) * DEPTH_WEIGHT) >= NEAR;
        });
        if (far) expect(nearestDistrict(at), `${u.toFixed(2)},${v.toFixed(2)}`).toBeNull();
      }
    }
  });

  /*
   * The world is drawn in 3/4, so a step north covers less visible ground
   * than a step east. Without the weighting a shop up the street would
   * claim you before one beside you.
   */
  it("measures depth the way the world draws it", () => {
    // The same number of world units counts for less across the street
    // than along it, because the world is drawn in 3/4.
    expect(Math.hypot(0, 0.1 * DEPTH_WEIGHT)).toBeLessThan(Math.hypot(0.1, 0));
  });

  it("still belongs to the shop you have barely left", () => {
    /*
     * My first version of this stepped 0.1 into depth from PETS and
     * asserted it was still PETS — and it is not, because LOGISTICS is
     * 0.13 below it. The test was wrong, not the code, and it is worth
     * keeping the corrected version: a step of a few percent must not
     * hand you to the neighbours, or the label changes while somebody is
     * standing still enough to read it.
     */
    const at = districtCentre("PETS");
    expect(nearestDistrict({ u: at.u + 0.03, v: at.v })).toBe("PETS");
    expect(nearestDistrict({ u: at.u, v: at.v + 0.03 })).toBe("PETS");
    expect(nearestDistrict({ u: at.u, v: at.v - 0.03 })).toBe("PETS");
  });

  it("picks the nearer of two shops rather than the first in the table", () => {
    const pets = districtCentre("PETS");
    const logistics = districtCentre("LOGISTICS");
    // A point nudged off PETS towards LOGISTICS still belongs to PETS.
    const at = { u: pets.u + (logistics.u - pets.u) * 0.2, v: pets.v + (logistics.v - pets.v) * 0.2 };
    expect(nearestDistrict(at)).toBe("PETS");
    const other = { u: pets.u + (logistics.u - pets.u) * 0.8, v: pets.v + (logistics.v - pets.v) * 0.8 };
    expect(nearestDistrict(other)).toBe("LOGISTICS");
  });

  it("is generous enough not to flicker as somebody walks", () => {
    // Tight enough to mean "at the door" and the label blinks on and off
    // with every step, which turns a street into a tooltip.
    expect(NEAR).toBeGreaterThan(0.08);
    // And loose enough would have one shop claiming half the world.
    expect(NEAR).toBeLessThan(0.3);
  });

  it("never claims a shop that is not in the world", () => {
    const found = nearestDistrict(districtCentre("BEAUTY"));
    expect(found === null || codes.includes(found)).toBe(true);
  });
});

describe("when the street reorders itself around the walker", () => {
  /*
   * The position is an Animated value precisely so walking re-renders
   * nothing. Draw order cannot be interpolated, so it is state — and this
   * is what stops that state changing sixty times a second.
   */
  it("ignores a step smaller than the question it answers", () => {
    expect(depthChanged(0.5, 0.505)).toBe(false);
    expect(depthChanged(0.5, 0.5)).toBe(false);
  });

  it("notices a real move, in either direction", () => {
    expect(depthChanged(0.5, 0.56)).toBe(true);
    expect(depthChanged(0.5, 0.44)).toBe(true);
  });

  it("is far coarser than the walk and fine enough for eleven shops", () => {
    expect(DEPTH_STEP).toBeLessThan(0.05);
    expect(DEPTH_STEP).toBeGreaterThan(0.005);
  });
});
