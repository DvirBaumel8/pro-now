import { describe, expect, it } from "vitest";

import {
  BEARING_ALIGN_MS,
  BEARING_DEADZONE,
  BEARING_HOLD_MS,
  type BearingInput,
  type BearingState,
  angleDelta,
  cameraViolations,
  entityRotationFor,
  headingOf,
  restingBearing,
  rotateWorld,
  stepBearing,
} from "../src/world-camera";
import { PLAN_METRES, STREET_METRES } from "../src/world-geo";

const FRAME = 16;
const EAST = Math.PI / 2;

function run(steps: number, input: BearingInput, from: BearingState = restingBearing()) {
  let s = from;
  for (let i = 0; i < steps; i++) s = stepBearing(s, input);
  return s;
}

describe("which way is up", () => {
  it("everything the camera has to be true of", () => {
    expect(cameraViolations()).toEqual([]);
  });

  it("reads a heading off a direction of travel", () => {
    expect(headingOf({ u: 0, v: -1 })).toBeCloseTo(0, 9);
    expect(headingOf({ u: 1, v: 0 })).toBeCloseTo(Math.PI / 2, 9);
    expect(headingOf({ u: 0, v: 1 })).toBeCloseTo(Math.PI, 9);
    // Standing still is not a direction, and must not be read as north.
    expect(headingOf({ u: 0, v: 0 })).toBe(0);
  });

  it("takes the short way round", () => {
    expect(angleDelta(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6, 6);
    expect(angleDelta(-3.0, 3.0)).toBeCloseTo(6 - 2 * Math.PI, 6);
  });
});

describe("the hold before the turn", () => {
  /*
   * ChatGPT: *"פנייה קטנה לא מסובבת עולם שלם. שינוי כיוון אמיתי כן."*
   * The camera has to be able to tell the difference, and the only thing
   * that distinguishes them is how long the heading is held.
   */
  it("ignores a glance", () => {
    const frames = Math.floor(BEARING_HOLD_MS / FRAME) - 4;
    const s = run(frames, { heading: EAST, metresAcross: STREET_METRES, dtMs: FRAME });
    expect(Math.abs(s.bearing)).toBeLessThan(0.02);
  });

  it("follows a walk", () => {
    const s = run(140, { heading: EAST, metresAcross: STREET_METRES, dtMs: FRAME });
    expect(Math.abs(angleDelta(s.bearing, EAST))).toBeLessThan(0.05);
  });

  it("arrives inside the window ChatGPT asked for", () => {
    // Visually finished at about two and a half time constants.
    const afterMs = BEARING_HOLD_MS + BEARING_ALIGN_MS * 2.5;
    const s = run(Math.round(afterMs / FRAME), {
      heading: EAST,
      metresAcross: STREET_METRES,
      dtMs: FRAME,
    });
    expect(Math.abs(angleDelta(s.bearing, EAST))).toBeLessThan(0.15);
    expect(afterMs).toBeGreaterThan(600);
    expect(afterMs).toBeLessThan(1400);
  });

  /*
   * THE ONE THAT IS ONLY VISIBLE IN A SIMULATION.
   *
   * Without a deadzone, a joystick's own tremble hands the camera a
   * heading two degrees away every frame, the hold timer restarts every
   * frame, and somebody walking in a straight line never turns the world
   * at all. The formula looks correct the whole time.
   */
  it("commits despite a trembling joystick", () => {
    let s = restingBearing();
    for (let i = 0; i < 200; i++) {
      s = stepBearing(s, {
        heading: EAST + Math.sin(i * 1.7) * BEARING_DEADZONE * 0.45,
        metresAcross: STREET_METRES,
        dtMs: FRAME,
      });
    }
    expect(Math.abs(angleDelta(s.bearing, EAST))).toBeLessThan(0.2);
  });

  it("holds still when nobody is walking", () => {
    const standing = run(200, { heading: null, metresAcross: STREET_METRES, dtMs: FRAME }, {
      bearing: 1.1,
      candidate: 1.1,
      heldMs: 900,
    });
    expect(standing.bearing).toBeCloseTo(1.1, 6);
  });
});

describe("close is a game, far is a map", () => {
  it("returns to north as the camera goes overhead", () => {
    const s = run(300, { heading: EAST, metresAcross: PLAN_METRES + 100, dtMs: FRAME }, {
      bearing: EAST,
      candidate: EAST,
      heldMs: 2000,
    });
    expect(Math.abs(s.bearing)).toBeLessThan(0.02);
  });

  it("and does not, while still in the street", () => {
    const s = run(300, { heading: EAST, metresAcross: STREET_METRES, dtMs: FRAME });
    expect(Math.abs(angleDelta(s.bearing, EAST))).toBeLessThan(0.05);
  });
});

describe("bearing turns the world, never the sprites", () => {
  /*
   * ChatGPT, unprompted, and it is the kind of note that saves a
   * fortnight: *"camera rotation must never rotate world entities
   * independently of their ground anchors."* The tempting shortcut —
   * turn the ground, then turn each shopfront back so it still faces the
   * reader — gives a world where a building and its pavement disagree
   * about where they are, and it is invisible until somebody walks a
   * full circle.
   */
  it("moves an entity and its ground together", () => {
    const aspect = 0.57;
    const anchor = { u: 0.31, v: 0.62 };
    for (const b of [0.3, 1.2, -2.4]) {
      expect(rotateWorld(anchor, b, aspect)).toEqual(rotateWorld({ ...anchor }, b, aspect));
      expect(entityRotationFor(b)).toBe(0);
    }
  });

  it("is reversible", () => {
    const aspect = 0.57;
    const p = { u: 0.22, v: 0.81 };
    for (const b of [0.3, 1.2, -2.4]) {
      const back = rotateWorld(rotateWorld(p, b, aspect), -b, aspect);
      expect(back.u).toBeCloseTo(p.u, 9);
      expect(back.v).toBeCloseTo(p.v, 9);
    }
  });

  it("leaves the world alone at north", () => {
    const p = { u: 0.22, v: 0.81 };
    expect(rotateWorld(p, 0, 0.57)).toBe(p);
  });

  /*
   * THE SHEAR, WHICH IS THE ONE A TEST HAS TO CATCH.
   *
   * Rotating in normalised coordinates without the aspect stretches
   * everything, because a step of 0.1 in u is a different distance from
   * a step of 0.1 in v. A quarter turn of a square should still be a
   * square.
   */
  it("does not shear a quarter turn", () => {
    const aspect = 0.57;
    const a = rotateWorld({ u: 0.5, v: 0.3 }, Math.PI / 2, aspect);
    const b = rotateWorld({ u: 0.5, v: 0.7 }, Math.PI / 2, aspect);
    // Two points 0.4 apart vertically are now that far apart
    // horizontally, measured in the same (square) space.
    const gap = Math.abs(a.u - b.u) * aspect;
    expect(gap).toBeCloseTo(0.4, 9);
  });
});
