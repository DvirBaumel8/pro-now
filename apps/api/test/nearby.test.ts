import { describe, expect, it } from "vitest";

import { NEARBY_SECONDS, isNearby } from "../src/domain/notifications/nearby.js";

describe("near: three minutes or less", () => {
  it("is near within three minutes, not beyond, and never without an ETA", () => {
    expect(NEARBY_SECONDS).toBe(180);
    expect([0, 60, 180].map(isNearby)).toEqual([true, true, true]);
    expect([181, 600].map(isNearby)).toEqual([false, false]);
    expect([null, undefined, Number.NaN, -1].map(isNearby)).toEqual([false, false, false, false]);
  });
});
