import { describe, expect, it } from "vitest";

import {
  assignmentRoute,
  assignmentRouteViolations,
  CUSTOMER_POINT,
  routeAt,
  routeProgress,
} from "../src";

describe("the professional on the way", () => {
  const route = assignmentRoute("BEAUTY");

  it("passes its own rules", () => {
    expect(assignmentRouteViolations({ route, progress: 0.5 })).toEqual([]);
  });

  it("arrives at the customer rather than driving past", () => {
    const end = route.at(-1)!.at;
    expect(Math.hypot(end.u - CUSTOMER_POINT.u, end.v - CUSTOMER_POINT.v)).toBeLessThan(0.08);
  });

  it("starts in the professional's own district, not in the same place every time", () => {
    const hair = assignmentRoute("BEAUTY")[0]!.at;
    const movers = assignmentRoute("LOGISTICS")[0]!.at;
    expect(hair).not.toEqual(movers);
  });

  it("gets nearer as it goes, so it grows rather than drifting", () => {
    expect(routeAt("BEAUTY", 1).scale).toBeGreaterThan(routeAt("BEAUTY", 0).scale);
  });

  it("moves with progress and holds at the ends", () => {
    expect(routeAt("BEAUTY", 0).at).toEqual(route[0]!.at);
    expect(routeAt("BEAUTY", 1).at).toEqual(route.at(-1)!.at);
    expect(routeAt("BEAUTY", 0.5).at).not.toEqual(route[0]!.at);
  });

  it("clamps rather than driving off the end of the trip", () => {
    expect(routeAt("BEAUTY", -5).at).toEqual(route[0]!.at);
    expect(routeAt("BEAUTY", 9).at).toEqual(route.at(-1)!.at);
  });

  it("stays inside the world the whole way", () => {
    for (const step of route) {
      expect(step.at.u).toBeGreaterThanOrEqual(0);
      expect(step.at.u).toBeLessThanOrEqual(1);
      expect(step.at.v).toBeGreaterThanOrEqual(0);
      expect(step.at.v).toBeLessThanOrEqual(1);
    }
  });

  it("never carries a real position", () => {
    for (const step of route) {
      expect(step.at).not.toHaveProperty("lat");
      expect(step.at).not.toHaveProperty("lng");
    }
  });

  it("refuses a route that ends somewhere other than at the customer", () => {
    const wrong = [...route.slice(0, -1), { ...route.at(-1)!, at: { u: 0.1, v: 0.1 } }];
    expect(assignmentRouteViolations({ route: wrong, progress: 0.5 }).join(" ")).toContain("arrive");
  });
});

describe("progress comes from the server's ETA", () => {
  it("is the fraction of the trip already done", () => {
    expect(routeProgress({ etaSecondsAtAssignment: 600, etaSecondsNow: 300 })).toBeCloseTo(0.5);
    expect(routeProgress({ etaSecondsAtAssignment: 600, etaSecondsNow: 600 })).toBe(0);
    expect(routeProgress({ etaSecondsAtAssignment: 600, etaSecondsNow: 0 })).toBe(1);
  });

  it("returns nothing rather than guessing when the ETA is unknown", () => {
    expect(routeProgress({ etaSecondsAtAssignment: null, etaSecondsNow: 300 })).toBeNull();
    expect(routeProgress({ etaSecondsAtAssignment: 600, etaSecondsNow: null })).toBeNull();
    expect(routeProgress({ etaSecondsAtAssignment: 0, etaSecondsNow: 0 })).toBeNull();
  });

  it("never runs past the end when the professional is late", () => {
    // The ETA grew: they hit traffic. The van must not reverse or overshoot.
    expect(routeProgress({ etaSecondsAtAssignment: 600, etaSecondsNow: 900 })).toBe(0);
  });
});

describe("the journey continues between readings", () => {
  /*
   * The fault: readings arrive every few seconds and the figure was pinned
   * to the last one, so it sat motionless in the road and then jumped. A
   * still figure on a road reads as a broken animation, and reasonably so.
   */
  it("moves as the seconds pass, without a new reading", () => {
    const read = 1_000_000;
    const a = routeProgress({
      etaSecondsAtAssignment: 600,
      etaSecondsNow: 600,
      etaReadAtMs: read,
      nowMs: read,
    });
    const b = routeProgress({
      etaSecondsAtAssignment: 600,
      etaSecondsNow: 600,
      etaReadAtMs: read,
      nowMs: read + 60_000,
    });
    expect(a).toBe(0);
    expect(b).toBeCloseTo(0.1, 6);
  });

  it("behaves exactly as before when no clock is supplied", () => {
    // Every existing caller passes no clock, and must be unaffected.
    expect(routeProgress({ etaSecondsAtAssignment: 600, etaSecondsNow: 300 })).toBeCloseTo(0.5, 6);
  });

  it("stops at the door rather than walking through it", () => {
    // Inventing progress would mean continuing past the end. A late
    // professional is late; the drawing must not resolve that for them.
    const read = 1_000_000;
    expect(
      routeProgress({
        etaSecondsAtAssignment: 600,
        etaSecondsNow: 30,
        etaReadAtMs: read,
        nowMs: read + 10 * 60_000,
      })
    ).toBe(1);
  });

  it("still refuses to move at all without an ETA", () => {
    expect(
      routeProgress({
        etaSecondsAtAssignment: null,
        etaSecondsNow: null,
        etaReadAtMs: 1,
        nowMs: 99_999,
      })
    ).toBeNull();
  });
});
