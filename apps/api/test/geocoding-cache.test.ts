import { describe, expect, it } from "vitest";

import { cacheKeyForReverse, cacheKeyForSearch, normalizeSearchQuery } from "../src/domain/geocoding/cache.js";

describe("geocoding cache keys", () => {
  it("rounds reverse coordinates to a stable five-decimal key", () => {
    expect(cacheKeyForReverse({ lat: 32.0853449, lng: 34.7818441 })).toBe("reverse:32.08534:34.78184");
    expect(cacheKeyForReverse({ lat: -0.000004, lng: 0.000004 })).toBe("reverse:0:0");
  });

  it("normalizes forward queries without making short queries eligible", () => {
    expect(normalizeSearchQuery("  רחוב   הרצל  5 ")).toBe("רחוב הרצל 5");
    expect(cacheKeyForSearch("  רחוב   הרצל  5 ")).toBe("search:רחוב הרצל 5");
    expect(cacheKeyForSearch("אב")).toBeNull();
  });
});
