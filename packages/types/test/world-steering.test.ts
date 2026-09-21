import { describe, expect, it } from "vitest";

import {
  STEER_SPEED,
  WALKABLE,
  clampWalkable,
  distanceWalked,
  facingFor,
  insideWalkable,
  onPavement,
  PAVEMENT_COLS,
  PAVEMENT_ROWS,
  stepFrom,
  stepOnPavement,
  steeringViolations,
  walkStep,
  WALK_START,
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


/**
 * The pavement map. It exists because the walkable rectangle covered
 * almost the whole plate, so the figure could stand in a flowerbed, on a
 * bench, or in the middle of the road.
 */
describe("walking on the ground rather than through it", () => {
  it("keeps the figure out of the road", () => {
    /*
     * The road runs down the right of the promenade plate, and this
     * compares the two rather than naming a point: the measurement is a
     * reading of one drawing, so an absolute coordinate would be a
     * different assertion on the next plate while the PROPERTY — you can
     * walk the promenade and you cannot walk the road — is the thing that
     * has to stay true.
     *
     * The band is not empty: a kerb and the far pavement beyond the road
     * are warm stone too and are correctly walkable. What must not happen
     * is the band reading like open ground.
     */
    const shareIn = (fromCol: number, toCol: number) => {
      let open = 0;
      let seen = 0;
      for (let row = 4; row < PAVEMENT_ROWS - 4; row += 1) {
        for (let col = fromCol; col < toCol; col += 1) {
          seen += 1;
          if (onPavement({ u: (col + 0.5) / PAVEMENT_COLS, v: (row + 0.5) / PAVEMENT_ROWS })) open += 1;
        }
      }
      return open / Math.max(1, seen);
    };

    const promenade = shareIn(4, 20);
    const road = shareIn(25, 30);
    expect(promenade).toBeGreaterThan(0.6);
    expect(road).toBeLessThan(promenade / 2);
  });

  it("starts the customer somewhere they can stand", () => {
    // The one point every walk begins at. If this is ever off the
    // pavement, the figure cannot take a single step.
    expect(onPavement(WALK_START)).toBe(true);
  });

  it("leaves most of the promenade open", () => {
    // A mask that refuses everything is as broken as one that allows
    // everything, and it would fail silently: the figure would simply
    // never move, which reads as a dead control rather than as a wall.
    let open = 0;
    for (let row = 0; row < PAVEMENT_ROWS; row += 1) {
      for (let col = 0; col < PAVEMENT_COLS; col += 1) {
        if (onPavement({ u: (col + 0.5) / PAVEMENT_COLS, v: (row + 0.5) / PAVEMENT_ROWS })) open += 1;
      }
    }
    const share = open / (PAVEMENT_COLS * PAVEMENT_ROWS);
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.9);
  });

  it("refuses a step off the pavement rather than sliding along it", () => {
    // A figure that keeps moving while pressed against a hedge reads as
    // broken; one that stops reads as a person who has reached something.
    const from = WALK_START;
    const intoNothing = { u: 1.4, v: WALK_START.v };
    expect(stepOnPavement(from, intoNothing)).toEqual(from);
  });

  it("carries a diagonal along a kerb instead of stopping dead", () => {
    /*
     * The property that makes a narrow pavement usable: walking
     * diagonally into an edge should still move you along it. Proven
     * generally rather than at one point — find any cell whose diagonal
     * neighbour is blocked but whose side neighbour is not.
     */
    let found = false;
    for (let row = 1; row < PAVEMENT_ROWS - 1 && !found; row += 1) {
      for (let col = 1; col < PAVEMENT_COLS - 1 && !found; col += 1) {
        const at = { u: (col + 0.5) / PAVEMENT_COLS, v: (row + 0.5) / PAVEMENT_ROWS };
        if (!onPavement(at)) continue;
        const diag = { u: (col + 1.5) / PAVEMENT_COLS, v: (row + 1.5) / PAVEMENT_ROWS };
        const side = { u: (col + 1.5) / PAVEMENT_COLS, v: at.v };
        if (onPavement(diag) || !onPavement(side)) continue;
        found = true;
        // The diagonal is refused, and what comes back is the sideways
        // part of it rather than standing still.
        expect(stepOnPavement(at, diag)).toEqual({ u: diag.u, v: at.v });
      }
    }
    expect(found, "the plate has no kerb to test against").toBe(true);
  });

  it("keeps both rules: inside the world AND on the ground", () => {
    // `walkStep` composes them so no call site has to remember both.
    const outside = { u: 1.6, v: 1.6 };
    const result = walkStep(WALK_START, outside);
    expect(insideWalkable(result)).toBe(true);
    expect(onPavement(result)).toBe(true);
  });
});
