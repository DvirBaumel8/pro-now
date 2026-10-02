import { describe, expect, it } from "vitest";

import { liveAreaLineHe, readAvailability, type AreaAvailabilityView } from "../src";

/**
 * Every test here is the same assertion in different clothes: a fact the
 * server cannot currently vouch for must not reach the screen as a number.
 *
 * It deserves this much coverage because each failure is silent and
 * plausible. A stale count does not throw, does not look wrong, and does not
 * show up in review. It just quietly promises a professional who went
 * offline two minutes ago.
 */

const AT = "2026-09-19T12:00:00.000Z";
const AT_MS = Date.parse(AT);

function snapshot(over: Partial<AreaAvailabilityView> = {}): AreaAvailabilityView {
  return {
    areaLabel: "רמת אביב, תל אביב",
    computedAt: AT,
    staleAfterSeconds: 60,
    services: [
      { serviceId: "leak", state: "AVAILABLE", availableProviderCount: 4, nearestRouteEtaMinutes: 8 },
      { serviceId: "lock", state: "LIMITED", availableProviderCount: 1, nearestRouteEtaMinutes: 21 },
      { serviceId: "ac", state: "UNAVAILABLE", availableProviderCount: 0, reasonCode: "NO_ELIGIBLE_SUPPLY" },
      { serviceId: "paint", state: "UNKNOWN" },
    ],
    ...over,
  };
}

describe("readAvailability — the four states", () => {
  it("reads a fresh snapshot and totals only the services with a known count", () => {
    const r = readAvailability(snapshot(), AT_MS + 10_000);
    expect(r.fresh).toBe(true);
    expect(r.areaLabel).toBe("רמת אביב, תל אביב");
    // 4 + 1 + 0; the UNKNOWN service contributes nothing at all.
    expect(r.total).toBe(5);
  });

  it("keeps UNAVAILABLE distinct from UNKNOWN — the whole point of the contract", () => {
    const r = readAvailability(snapshot(), AT_MS);

    const none = r.supplyFor("ac");
    expect(none.state).toBe("UNAVAILABLE");
    expect(none.count).toBe(0); // a real answer: we checked, there is nobody
    expect(none.reasonCode).toBe("NO_ELIGIBLE_SUPPLY");

    const silent = r.supplyFor("paint");
    expect(silent.state).toBe("UNKNOWN");
    expect(silent.count).toBeNull(); // a silence: we did not check
  });

  it("treats a service missing from the snapshot as UNKNOWN, never as zero", () => {
    const s = readAvailability(snapshot(), AT_MS).supplyFor("never-heard-of-it");
    expect(s.state).toBe("UNKNOWN");
    expect(s.count).toBeNull();
    expect(s.reasonCode).toBe("NOT_COMPUTED");
  });

  it("carries a route ETA only where supply actually exists", () => {
    const r = readAvailability(snapshot(), AT_MS);
    expect(r.supplyFor("leak").nearestRouteEtaMinutes).toBe(8);
    expect(r.supplyFor("ac").nearestRouteEtaMinutes).toBeNull();
    expect(r.supplyFor("paint").nearestRouteEtaMinutes).toBeNull();
  });
});

describe("readAvailability — freshness", () => {
  it("still reads at the exact edge of the server's window", () => {
    expect(readAvailability(snapshot(), AT_MS + 60_000).fresh).toBe(true);
  });

  it("turns EVERY service unknown one second past the window", () => {
    // The client does not get to decide that 61 seconds is probably fine,
    // and no service may survive the expiry on its own.
    const r = readAvailability(snapshot(), AT_MS + 61_000);
    expect(r.fresh).toBe(false);
    expect(r.total).toBeNull();
    for (const id of ["leak", "lock", "ac", "paint"]) {
      expect(r.supplyFor(id).state).toBe("UNKNOWN");
      expect(r.supplyFor(id).count).toBeNull();
      expect(r.supplyFor(id).reasonCode).toBe("DATA_STALE");
    }
  });

  it("refuses a future-dated snapshot rather than guessing whose clock is wrong", () => {
    expect(readAvailability(snapshot(), AT_MS - 5_000).fresh).toBe(false);
  });

  it("refuses an unparseable timestamp and a non-positive window", () => {
    expect(readAvailability(snapshot({ computedAt: "nope" }), AT_MS).fresh).toBe(false);
    expect(readAvailability(snapshot({ staleAfterSeconds: 0 }), AT_MS).fresh).toBe(false);
    expect(readAvailability(snapshot({ staleAfterSeconds: -30 }), AT_MS).fresh).toBe(false);
  });

  it("returns a usable reading, never null, when there is no snapshot at all", () => {
    // No `if (reading)` for a caller to forget.
    for (const empty of [null, undefined]) {
      const r = readAvailability(empty, AT_MS);
      expect(r.total).toBeNull();
      expect(r.supplyFor("leak").state).toBe("UNKNOWN");
    }
  });
});

describe("readAvailability — a server that contradicts itself", () => {
  it("does not believe AVAILABLE without a usable count", () => {
    for (const bad of [undefined, 0, -3, 1.5]) {
      const r = readAvailability(
        snapshot({ services: [{ serviceId: "x", state: "AVAILABLE", availableProviderCount: bad as number }] }),
        AT_MS
      );
      expect(r.supplyFor("x").state).toBe("UNKNOWN");
      expect(r.supplyFor("x").count).toBeNull();
    }
  });

  it("does not believe a non-zero count alongside UNAVAILABLE", () => {
    const r = readAvailability(
      snapshot({ services: [{ serviceId: "x", state: "UNAVAILABLE", availableProviderCount: 5 }] }),
      AT_MS
    );
    expect(r.supplyFor("x").state).toBe("UNAVAILABLE");
    // The contradiction costs us the count, not the state.
    expect(r.supplyFor("x").count).toBeNull();
  });

  it("drops a zero or negative ETA rather than rendering 'arrives in 0 minutes'", () => {
    const r = readAvailability(
      snapshot({
        services: [
          { serviceId: "x", state: "AVAILABLE", availableProviderCount: 2, nearestRouteEtaMinutes: 0 },
          { serviceId: "y", state: "AVAILABLE", availableProviderCount: 2, nearestRouteEtaMinutes: -4 },
        ],
      }),
      AT_MS
    );
    expect(r.supplyFor("x").nearestRouteEtaMinutes).toBeNull();
    expect(r.supplyFor("y").nearestRouteEtaMinutes).toBeNull();
  });
});

describe("liveAreaLineHe", () => {
  const services = [{ hasSupply: true }, { hasSupply: true }, { hasSupply: false }];

  it("says how many services can happen, not how many people exist", () => {
    const line = liveAreaLineHe({ fresh: true, areaLabel: "חולון", services });
    expect(line).toBe("2 שירותים זמינים עכשיו בחולון");
  });

  it("says nothing at all when the snapshot is stale", () => {
    expect(liveAreaLineHe({ fresh: false, areaLabel: "חולון", services })).toBeNull();
  });

  it("says nothing rather than announcing zero", () => {
    expect(liveAreaLineHe({ fresh: true, areaLabel: "חולון", services: [{ hasSupply: false }] })).toBeNull();
  });

  it("copes with no area label", () => {
    expect(liveAreaLineHe({ fresh: true, areaLabel: null, services: [{ hasSupply: true }] })).toBe(
      "שירות אחד זמין עכשיו"
    );
  });
});
