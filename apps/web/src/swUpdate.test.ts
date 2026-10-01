import { describe, expect, it } from "vitest";

import { FRESH_OPEN_MS, reloadNow } from "./swUpdate";

describe("reloadNow", () => {
  it("reloads straight away while the app has only just been opened", () => {
    expect(reloadNow(0, FRESH_OPEN_MS - 1, false)).toBe(true);
  });

  it("waits while someone may be in the middle of something", () => {
    expect(reloadNow(0, FRESH_OPEN_MS + 1, false)).toBe(false);
  });

  it("reloads when the app is in the background, where nothing is lost", () => {
    expect(reloadNow(0, 10 * FRESH_OPEN_MS, true)).toBe(true);
  });
});
