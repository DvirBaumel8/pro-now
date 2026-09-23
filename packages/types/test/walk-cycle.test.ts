import { describe, expect, it } from "vitest";

import { STRIDE, walkCycleIds, walkCycleViolations, walkFrameAt, WALK_FRAMES } from "../src";

/**
 * Amit: *"לא יכול להיות שהדמות שבחרתי בעיגול קטן וגרוע."* He had a walk
 * cycle drawn; these are the rules that make it read as walking rather
 * than as a flipbook.
 */
describe("a walk cycle", () => {
  it("holds its own rules", () => {
    expect(walkCycleViolations("amit")).toEqual([]);
  });

  it("names its poses in order", () => {
    const ids = walkCycleIds("amit", "WALK");
    expect(ids).toHaveLength(WALK_FRAMES);
    expect(ids[0]).toBe("avatar_amit_walk_01");
    expect(ids.at(-1)).toBe("avatar_amit_walk_08");
  });

  /*
   * THE ONE THAT MATTERS. A cycle driven by a clock plays at the same
   * rate however fast the figure is moving, and the feet slide — the
   * clearest tell of a cheap animation. Driven by ground covered, the
   * same distance always shows the same pose.
   */
  it("advances with the ground covered, not with time", () => {
    const quarter = STRIDE.WALK / 4;
    expect(walkFrameAt(0, "WALK")).toBe(0);
    expect(walkFrameAt(quarter, "WALK")).toBe(2);
    expect(walkFrameAt(quarter * 2, "WALK")).toBe(4);
    // And it loops: a whole stride is back at the first pose.
    expect(walkFrameAt(STRIDE.WALK, "WALK")).toBe(0);
    expect(walkFrameAt(STRIDE.WALK * 3, "WALK")).toBe(0);
  });

  it("holds one pose while nothing moves", () => {
    expect(walkFrameAt(0.4, "WALK")).toBe(walkFrameAt(0.4, "WALK"));
  });

  it("plays a run over a longer stride than a walk", () => {
    // Same ground, further through a walk's cycle than a run's.
    const d = 0.05;
    expect(walkFrameAt(d, "WALK")).toBeGreaterThan(walkFrameAt(d, "RUN"));
  });

  it("survives a distance nobody expected", () => {
    expect(walkFrameAt(-1.7, "WALK")).toBeGreaterThanOrEqual(0);
    expect(walkFrameAt(Number.NaN, "WALK")).toBe(0);
    expect(walkFrameAt(1e9, "RUN")).toBeLessThan(WALK_FRAMES);
  });
});
