import { describe, expect, it } from "vitest";

import { availableNowFor, readAvailability, type AreaAvailabilityView } from "../src";

/**
 * These tests are all one assertion wearing different clothes: a number the
 * server cannot currently vouch for must not reach the screen.
 *
 * The reason it deserves this much coverage is that every failure here is
 * silent and plausible. A stale count does not throw, does not look wrong,
 * and does not show up in review — it just quietly promises a professional
 * who went offline two minutes ago, which is the exact promise /CLAUDE.md §3
 * exists to protect.
 */

const AT = "2026-09-19T12:00:00.000Z";
const AT_MS = Date.parse(AT);

function snapshot(over: Partial<AreaAvailabilityView> = {}): AreaAvailabilityView {
  return {
    areaLabel: "רמת אביב, תל אביב",
    computedAt: AT,
    staleAfterSeconds: 60,
    services: [
      { serviceId: "svc-leak", availableNow: 4, nearestEtaSeconds: 480 },
      { serviceId: "svc-electric", availableNow: 0, nearestEtaSeconds: null },
    ],
    ...over,
  };
}

describe("readAvailability", () => {
  it("reads a fresh snapshot and totals only its valid entries", () => {
    const r = readAvailability(snapshot(), AT_MS + 10_000);
    expect(r).not.toBeNull();
    expect(r!.totalAvailableNow).toBe(4);
    expect(r!.areaLabel).toBe("רמת אביב, תל אביב");
    expect(Math.round(r!.ageSeconds)).toBe(10);
  });

  it("still reads a snapshot at the exact edge of its freshness window", () => {
    expect(readAvailability(snapshot(), AT_MS + 60_000)).not.toBeNull();
  });

  it("refuses a snapshot one second past the window the SERVER set", () => {
    // The client does not get to decide that 61 seconds is "probably fine".
    expect(readAvailability(snapshot(), AT_MS + 61_000)).toBeNull();
  });

  it("refuses a snapshot dated in the future rather than guessing whose clock is wrong", () => {
    expect(readAvailability(snapshot(), AT_MS - 5_000)).toBeNull();
  });

  it("refuses an unparseable or missing timestamp", () => {
    expect(readAvailability(snapshot({ computedAt: "not a date" }), AT_MS)).toBeNull();
  });

  it("refuses a non-positive freshness window instead of treating it as forever", () => {
    expect(readAvailability(snapshot({ staleAfterSeconds: 0 }), AT_MS)).toBeNull();
    expect(readAvailability(snapshot({ staleAfterSeconds: -30 }), AT_MS)).toBeNull();
  });

  it("returns null for no snapshot at all", () => {
    expect(readAvailability(null, AT_MS)).toBeNull();
    expect(readAvailability(undefined, AT_MS)).toBeNull();
  });

  it("drops a corrupted count rather than letting it render as confident supply", () => {
    const r = readAvailability(
      snapshot({
        services: [
          { serviceId: "good", availableNow: 3, nearestEtaSeconds: null },
          { serviceId: "negative", availableNow: -2, nearestEtaSeconds: null },
          { serviceId: "fractional", availableNow: 1.5, nearestEtaSeconds: null },
        ],
      }),
      AT_MS
    );
    expect(r!.totalAvailableNow).toBe(3);
    expect(availableNowFor(r, "negative")).toBeNull();
    expect(availableNowFor(r, "fractional")).toBeNull();
  });
});

describe("availableNowFor", () => {
  it("keeps 'zero online' and 'no data' distinguishable", () => {
    const r = readAvailability(snapshot(), AT_MS);
    // Zero is a fact the UI may state.
    expect(availableNowFor(r, "svc-electric")).toBe(0);
    // Absence is a silence the UI must admit, and must not print as 0.
    expect(availableNowFor(r, "svc-unheard-of")).toBeNull();
  });

  it("is null for every service once the reading itself is untrustworthy", () => {
    const stale = readAvailability(snapshot(), AT_MS + 600_000);
    expect(availableNowFor(stale, "svc-leak")).toBeNull();
  });
});
