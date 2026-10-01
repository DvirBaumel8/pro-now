import { describe, expect, it } from "vitest";

import { keyboardCover } from "./keyboard";

describe("keyboardCover", () => {
  it("is the height the keyboard takes from the page", () => {
    expect(keyboardCover(844, 508)).toBe(336);
  });

  it("does not take a zoomed page for a taller keyboard", () => {
    // Zoomed 1.2×, the 508px of glass above the keyboard measure 423 CSS px.
    expect(keyboardCover(844, 508 / 1.2, 1.2)).toBe(336);
    // Zoomed with no keyboard at all: nothing to make room for.
    expect(keyboardCover(844, 844 / 1.5, 1.5)).toBe(0);
  });

  it("ignores Safari's toolbars growing and shrinking", () => {
    expect(keyboardCover(844, 790)).toBe(0);
    expect(keyboardCover(844, 844)).toBe(0);
    expect(keyboardCover(844, 900)).toBe(0);
  });
});
