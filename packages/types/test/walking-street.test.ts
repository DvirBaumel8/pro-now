import { describe, expect, it } from "vitest";

import { STREETS, walkingStreet } from "../src/world-neighbourhood";

/**
 * A WALK HAS TO LOOK LIKE ONE.
 *
 * Amit, about the dog walker: *"סתם מרחף לי פה... סתם זז למעלה למטה."*
 * Measured in a browser at the time: 727 pixels of vertical travel
 * against 214 horizontal. He was walking a long way, straight toward the
 * camera, where nothing slides past him — so the eye read it as bouncing
 * on the spot. The gait was never at fault; the walk's bob is 0.03 of a
 * figure's height, under a pixel on screen.
 */
describe("which pavement a pedestrian walks", () => {
  const ends = (s: { path: readonly { u: number; v: number }[] }) => ({
    a: s.path[0]!,
    b: s.path[s.path.length - 1]!,
  });

  it("crosses the frame rather than running into it", () => {
    const { a, b } = ends(walkingStreet());
    const across = Math.abs(b.u - a.u);
    // The same 0.6 the gait and `pathLength` use: a step into the picture
    // covers less screen than a step across it.
    const into = Math.abs(b.v - a.v) * 0.6;
    expect(across).toBeGreaterThan(into);
  });

  it("is the most lateral of the streets, not merely a lateral one", () => {
    const score = (s: { path: readonly { u: number; v: number }[] }) => {
      const { a, b } = ends(s);
      return Math.abs(b.u - a.u) / Math.max(0.001, Math.abs(b.v - a.v) * 0.6);
    };
    const best = Math.max(...STREETS.map(score));
    expect(score(walkingStreet())).toBe(best);
  });

  it("refuses the street the dog walker was on", () => {
    /*
     * Street 0 runs 0.12 to 0.9 in v with u pinned between 0.48 and 0.52
     * — a straight walk toward the lens and the single worst direction
     * to read travel in. It is the default index, which is how a
     * pedestrian ended up on it.
     */
    const main = STREETS[0]!;
    const { a, b } = ends(main);
    expect(Math.abs(b.u - a.u)).toBeLessThan(0.05);
    expect(walkingStreet().id).not.toBe(main.id);
  });

  it("picks by measurement, so re-drawing the streets cannot silently break it", () => {
    // Not an index. If every street were vertical this would still return
    // one rather than throw, and the first test above would fail loudly —
    // which is the right way round.
    expect(STREETS.map((s) => s.id)).toContain(walkingStreet().id);
  });
});
