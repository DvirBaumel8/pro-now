import { describe, expect, it } from "vitest";

import {
  dispatchableNow,
  pilotCatalog,
  pilotMarket,
  resolveMarket,
  type MarketDef,
} from "../src/index";

const market = (ids: string[]): MarketDef => ({
  code: "TEST",
  nameHe: "בדיקה",
  activatedServiceIds: ids,
});

describe("resolveMarket", () => {
  it("activates only what the market named", () => {
    const r = resolveMarket(pilotCatalog, market(["svc-leak", "svc-lock"]));
    expect(r.live.map((s) => s.id).sort()).toEqual(["svc-leak", "svc-lock"]);
  });

  it("REFUSES to activate a SCHEDULED_ONLY service, even if a market asks", () => {
    // A market file must not be able to promise "now" for work nobody sits
    // online waiting for. This is the whole reason activation is resolved
    // against the catalogue rather than trusted.
    const r = resolveMarket(pilotCatalog, market(["svc-paint", "svc-furniture"]));
    expect(r.live).toEqual([]);
    expect(r.rejectedIds.sort()).toEqual(["svc-furniture", "svc-paint"]);
  });

  it("REFUSES to activate an INACTIVE service", () => {
    const r = resolveMarket(pilotCatalog, market(["svc-gas"]));
    expect(r.live).toEqual([]);
    expect(r.rejectedIds).toEqual(["svc-gas"]);
  });

  it("reports a typo rather than silently dropping it", () => {
    const r = resolveMarket(pilotCatalog, market(["svc-leek"]));
    expect(r.rejectedIds).toEqual(["svc-leek"]);
  });

  it("ignores a repeated id without double-listing the service", () => {
    const r = resolveMarket(pilotCatalog, market(["svc-leak", "svc-leak"]));
    expect(r.live).toHaveLength(1);
  });

  it("separates 'not here yet' from 'not offered at all'", () => {
    const r = resolveMarket(pilotCatalog, market(["svc-leak"]));
    const notHere = r.notInThisMarket.map((s) => s.id);
    // Dispatchable in principle, just not activated here.
    expect(notHere).toContain("svc-courier");
    // Never dispatchable, so it is not a market decision at all.
    expect(notHere).not.toContain("svc-paint");
    expect(notHere).not.toContain("svc-gas");
  });

  it("covers every dispatchable service between live and not-in-market", () => {
    const r = resolveMarket(pilotCatalog, market(["svc-leak"]));
    const all = dispatchableNow(pilotCatalog).map((s) => s.id).sort();
    const seen = [...r.live, ...r.notInThisMarket].map((s) => s.id).sort();
    expect(seen).toEqual(all);
  });

  it("activates nothing for an empty market", () => {
    const r = resolveMarket(pilotCatalog, market([]));
    expect(r.live).toEqual([]);
    expect(r.rejectedIds).toEqual([]);
  });
});

describe("the pilot market", () => {
  const r = resolveMarket(pilotCatalog, pilotMarket);

  it("names only services the catalogue accepts", () => {
    expect(r.rejectedIds).toEqual([]);
  });

  it("launches with a fraction of the catalogue, not all of it", () => {
    // The bound is a product judgement, not arithmetic: past roughly a dozen
    // live services one city's supply spreads thin enough that most taps
    // find nobody, and the app reads as empty rather than as quiet. Raising
    // it is allowed — but only alongside the professionals to answer it.
    expect(r.live.length).toBeGreaterThanOrEqual(6);
    expect(r.live.length).toBeLessThanOrEqual(12);
    expect(r.live.length).toBeLessThan(dispatchableNow(pilotCatalog).length);
  });

  it("opens more than half its services without needing a van", () => {
    // The liquidity argument, as a test: a launch that depends on vans is a
    // launch that waits for vans.
    const light = r.live.filter((s) => s.mobilityProfile !== "NEEDS_VEHICLE");
    expect(light.length * 2).toBeGreaterThan(r.live.length);
  });

  it("exercises every pricing model the platform has", () => {
    const models = new Set(r.live.map((s) => s.pricingModel));
    expect([...models].sort()).toEqual(["DISTANCE_TIME", "FIXED", "HOURLY", "VISIT_QUOTE"]);
  });

  it("includes a licensed trade and an enhanced-trust service", () => {
    const profiles = new Set(r.live.map((s) => s.trustProfile));
    expect(profiles.has("LICENSE_REQUIRED")).toBe(true);
    expect(profiles.has("ENHANCED")).toBe(true);
  });

  it("leads with urgent work", () => {
    const urgent = r.live.filter((s) => s.fulfillmentProfile === "URGENT_NOW");
    expect(urgent.length).toBeGreaterThanOrEqual(4);
  });
});
