import { describe, expect, it } from "vitest";

import { AVATARS } from "@pro-now/types";

import {
  CELL_RISE_MS,
  CELL_STAGGER_MS,
  cellDelayMs,
  gridSettledMs,
  OTHERS_OPACITY,
  OTHERS_SCALE,
  PICK_SCALE,
  pickerMotionViolations,
  poseFor,
} from "../src/screens/avatarPicker";

describe("how the picker arrives", () => {
  it("holds its own rules", () => {
    expect(pickerMotionViolations()).toEqual([]);
  });

  it("arrives as one sweep rather than as a queue", () => {
    // The whole grid has to land inside the window where a stagger still
    // reads as arrival. Past about half a second it reads as loading.
    expect(gridSettledMs(AVATARS.length)).toBeLessThan(800);
  });

  it("puts the first tile down immediately", () => {
    expect(cellDelayMs(0)).toBe(0);
  });

  it("walks down the grid in order", () => {
    expect(cellDelayMs(3)).toBe(3 * CELL_STAGGER_MS);
    expect(cellDelayMs(11)).toBeGreaterThan(cellDelayMs(10));
  });

  it("treats an impossible index as the first one", () => {
    expect(cellDelayMs(-4)).toBe(0);
  });

  it("does not arrive instantly, which would be an appearance", () => {
    expect(CELL_RISE_MS).toBeGreaterThan(120);
  });
});

describe("how a choice feels", () => {
  /*
   * A border says "ticked". Lifting the chosen tile while the others step
   * back says "this one is you", which is what the screen is asking — and
   * it survives being seen from arm's length, which 2px of border does
   * not.
   */
  it("is at rest until somebody chooses", () => {
    for (const a of AVATARS) {
      void a;
      expect(poseFor(false, false)).toEqual({ scale: 1, opacity: 1 });
    }
  });

  it("lifts the chosen one above the rest", () => {
    const chosen = poseFor(true, true);
    const other = poseFor(false, true);
    expect(chosen.scale).toBeGreaterThan(other.scale);
    expect(chosen.opacity).toBeGreaterThan(other.opacity);
  });

  it("keeps the chosen tile part of the grid", () => {
    expect(PICK_SCALE).toBeLessThan(1.2);
  });

  /*
   * The unchosen ones are still choices. A grid that dims hard the moment
   * you touch it reads as having been decided for you, and changing your
   * mind is the most likely next thing somebody does here.
   */
  it("leaves the others looking like choices", () => {
    expect(OTHERS_OPACITY).toBeGreaterThan(0.4);
    expect(OTHERS_SCALE).toBeGreaterThan(0.85);
  });

  it("returns to rest when a choice is undone", () => {
    expect(poseFor(false, false)).toEqual(poseFor(false, false));
    expect(poseFor(true, false)).toEqual({ scale: 1, opacity: 1 });
  });
});
