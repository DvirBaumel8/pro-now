import { describe, expect, it } from "vitest";

import { keyboardCover } from "./keyboard";

describe("keyboardCover", () => {
  it("is the height the keyboard takes from the page", () => {
    expect(keyboardCover(844, 508)).toBe(336);
  });

  it("ignores Safari's toolbars growing and shrinking", () => {
    expect(keyboardCover(844, 790)).toBe(0);
    expect(keyboardCover(844, 844)).toBe(0);
    expect(keyboardCover(844, 900)).toBe(0);
  });
});
