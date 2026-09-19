import { describe, expect, it } from "vitest";
import type { AreaAvailabilityView } from "@pro-now/types";

import { resolveHomeSupply } from "../src/home-supply";

/**
 * The first test below is a regression test for a real bug, and it is the
 * reason this file exists.
 *
 * The freshness rule was implemented correctly in `readAvailability`, and
 * then quietly undone by a fallback one line later: when the snapshot
 * expired, the header went blank while the tiles kept rendering counts from
 * the older prop. It passed typecheck, passed lint, and looked fine in
 * review. It was caught by looking at a screenshot.
 */

const AT = "2026-09-19T12:00:00.000Z";
const AT_MS = Date.parse(AT);

const snapshot: AreaAvailabilityView = {
  areaLabel: "רמת אביב",
  computedAt: AT,
  staleAfterSeconds: 60,
  services: [
    { serviceId: "leak", availableNow: 4, nearestEtaSeconds: 480 },
    { serviceId: "ac", availableNow: 0, nearestEtaSeconds: null },
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
    expect(s.countFor("leak")).toBeNull();
    expect(s.countFor("ac")).toBeNull();
    expect(s.countFor("paint")).toBeNull();
  });

  it("uses the snapshot, not the props, while it is fresh", () => {
    const s = resolveHomeSupply({ availability: snapshot, nowMs: AT_MS + 10_000, ...legacy });
    expect(s.total).toBe(4);
    expect(s.countFor("leak")).toBe(4);
    // The server says zero for this one; the prop says 3. The server wins.
    expect(s.countFor("ac")).toBe(0);
    // Absent from the snapshot entirely — unknown, despite the prop.
    expect(s.countFor("paint")).toBeNull();
  });

  it("treats an explicit null snapshot as opting in, so a failed fetch cannot leak props", () => {
    const s = resolveHomeSupply({ availability: null, ...legacy });
    expect(s.live).toBe(true);
    expect(s.total).toBeNull();
    expect(s.countFor("leak")).toBeNull();
  });

  it("still honours the legacy props for callers with no snapshot at all", () => {
    const s = resolveHomeSupply(legacy);
    expect(s.live).toBe(false);
    expect(s.expired).toBe(false);
    expect(s.total).toBe(7);
    expect(s.countFor("leak")).toBe(4);
    expect(s.countFor("unknown-service")).toBeNull();
  });

  it("keeps a legacy zero as zero rather than collapsing it to unknown", () => {
    const s = resolveHomeSupply({ legacyTotal: 0, legacyCounts: { leak: 0 } });
    expect(s.total).toBe(0);
    expect(s.countFor("leak")).toBe(0);
  });
});
