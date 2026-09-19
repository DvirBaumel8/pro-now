import { describe, expect, it } from "vitest";
import type { AreaAvailabilityView } from "@pro-now/types";

import { resolveHomeSupply } from "../src/home-supply";

/**
 * The first test is a regression test for a real bug, and it is why this
 * file exists.
 *
 * The freshness rule was implemented correctly in `readAvailability` and then
 * quietly undone one line later: when the snapshot expired, the header went
 * blank while the tiles carried on rendering counts from an older prop. It
 * passed typecheck, passed lint, and read fine. It was caught by putting the
 * same snapshot on screen at three different moments and looking at the
 * third one.
 */

const AT = "2026-09-19T12:00:00.000Z";
const AT_MS = Date.parse(AT);

const snapshot: AreaAvailabilityView = {
  areaLabel: "רמת אביב",
  computedAt: AT,
  staleAfterSeconds: 60,
  services: [
    { serviceId: "leak", state: "AVAILABLE", availableProviderCount: 4, nearestRouteEtaMinutes: 8 },
    { serviceId: "ac", state: "UNAVAILABLE", availableProviderCount: 0, reasonCode: "NO_ELIGIBLE_SUPPLY" },
  ],
};

// What a caller would ALSO be passing from an earlier, dumber code path.
const legacy = { legacyTotal: 7, legacyCounts: { leak: 4, ac: 3, paint: 2 } };

describe("resolveHomeSupply", () => {
  it("does not fall back to stale props when the snapshot has expired", () => {
    const s = resolveHomeSupply({ availability: snapshot, nowMs: AT_MS + 61_000, ...legacy });
    expect(s.expired).toBe(true);
    expect(s.total).toBeNull();
    // The bug: these used to come back as 4, 3 and 2.
    for (const id of ["leak", "ac", "paint"]) {
      expect(s.supplyFor(id).state).toBe("UNKNOWN");
      expect(s.supplyFor(id).count).toBeNull();
    }
  });

  it("uses the snapshot, not the props, while it is fresh", () => {
    const s = resolveHomeSupply({ availability: snapshot, nowMs: AT_MS + 10_000, ...legacy });
    expect(s.total).toBe(4);
    expect(s.supplyFor("leak").count).toBe(4);
    expect(s.supplyFor("leak").nearestRouteEtaMinutes).toBe(8);
    // The server says nobody for this one; the prop says 3. The server wins.
    expect(s.supplyFor("ac").state).toBe("UNAVAILABLE");
    expect(s.supplyFor("ac").count).toBe(0);
    // Absent from the snapshot entirely — unknown, despite the prop saying 2.
    expect(s.supplyFor("paint").state).toBe("UNKNOWN");
  });

  it("treats an explicit null snapshot as opting in, so a failed fetch cannot leak props", () => {
    const s = resolveHomeSupply({ availability: null, ...legacy });
    expect(s.live).toBe(true);
    expect(s.total).toBeNull();
    expect(s.supplyFor("leak").state).toBe("UNKNOWN");
  });

  it("still honours the legacy props for callers with no snapshot at all", () => {
    const s = resolveHomeSupply(legacy);
    expect(s.live).toBe(false);
    expect(s.expired).toBe(false);
    expect(s.total).toBe(7);
    expect(s.supplyFor("leak").count).toBe(4);
    expect(s.supplyFor("unknown-service").state).toBe("UNKNOWN");
  });

  it("maps a legacy zero to UNAVAILABLE, not to UNKNOWN", () => {
    const s = resolveHomeSupply({ legacyTotal: 0, legacyCounts: { leak: 0 } });
    expect(s.total).toBe(0);
    expect(s.supplyFor("leak").state).toBe("UNAVAILABLE");
    expect(s.supplyFor("leak").count).toBe(0);
  });
});
