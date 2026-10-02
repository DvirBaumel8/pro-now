import { describe, expect, it } from "vitest";

import { ART_FACES, facingScaleX } from "../src/world-motion";

/**
 * NOTHING DRIVES BACKWARDS.
 *
 * Amit: *"המשאית סתם מרחפת נגד הכיוון ולא נראית נוסעת בכלל."*
 *
 * The old rule mirrored a vehicle when it entered from the far end of
 * the road. For the courier's scooter that happened to be correct, which
 * is why it survived — it is the commonest thing on the street. For the
 * van and the tow truck, whose art faces the other way, it was wrong in
 * BOTH directions, always.
 *
 * A browser check found this only by luck: across ninety samples it
 * caught the scooter sixteen times and never once caught the van. So the
 * rule is a pure function and the proof is here.
 */
describe("which way a sprite points", () => {
  it("never mirrors art that already faces the way it is going", () => {
    expect(facingScaleX("courier_scooter", true)).toBe(1);
    expect(facingScaleX("moving_van", false)).toBe(1);
    expect(facingScaleX("tow_truck", false)).toBe(1);
  });

  it("mirrors art that faces the other way", () => {
    expect(facingScaleX("courier_scooter", false)).toBe(-1);
    // The exact case Amit reported: a left-facing van driving right.
    expect(facingScaleX("moving_van", true)).toBe(-1);
    expect(facingScaleX("tow_truck", true)).toBe(-1);
  });

  it("leaves a sprite with no side alone, both ways", () => {
    // The dog walker faces the camera. Mirroring him does nothing except
    // swap which hand holds the lead.
    expect(facingScaleX("dog_walker", true)).toBe(1);
    expect(facingScaleX("dog_walker", false)).toBe(1);
  });

  it("is the identity for anything it has never been told about", () => {
    // An unknown asset must not be flipped on a guess. A sprite drawn
    // the wrong way round is worse than one that never turns.
    expect(facingScaleX("something_new", true)).toBe(1);
    expect(facingScaleX("something_new", false)).toBe(1);
  });

  it("reverses when the direction reverses, for every asset it knows", () => {
    for (const id of Object.keys(ART_FACES)) {
      expect(facingScaleX(id, true), id).toBe(-facingScaleX(id, false) as 1 | -1);
    }
  });
});
