import { describe, expect, it } from "vitest";

import {
  DWELL_MS,
  layOutVenues,
  sweepFrame,
  sweepOrder,
  sweepViolations,
  sweptCount,
  TRAVEL_MS,
  VISIT_MS,
} from "../src";

const venues = layOutVenues(["a", "b", "c"], "HAIR");

describe("search sweep", () => {
  it("visits every candidate exactly once per pass", () => {
    const stops = sweepOrder(venues);
    expect(stops).toHaveLength(3);
    expect(sweepViolations({ stops, venues })).toEqual([]);
  });

  it("refuses a sweep that skips a candidate being checked", () => {
    const stops = sweepOrder(venues).slice(0, 2);
    expect(sweepViolations({ stops, venues }).join(" ")).toContain("never looks there");
  });

  it("refuses a sweep that looks at somebody who is not a candidate", () => {
    const stops = [...sweepOrder(venues), { candidateId: "ghost", order: 3 }];
    expect(sweepViolations({ stops, venues }).join(" ")).toContain("never invented");
  });

  it("moves: the camera is on a different venue a visit later", () => {
    const first = sweepFrame({ venues, elapsedMs: TRAVEL_MS + 10 });
    const second = sweepFrame({ venues, elapsedMs: VISIT_MS + TRAVEL_MS + 10 });
    expect(first.candidateId).not.toBeNull();
    expect(second.candidateId).not.toEqual(first.candidateId);
  });

  it("travels, then rests — never a constant glide", () => {
    expect(sweepFrame({ venues, elapsedMs: 10 }).travelling).toBe(true);
    expect(sweepFrame({ venues, elapsedMs: TRAVEL_MS + DWELL_MS / 2 }).travelling).toBe(false);
  });

  it("loops rather than parking on the last shop", () => {
    const start = sweepFrame({ venues, elapsedMs: 0 });
    const afterAPass = sweepFrame({ venues, elapsedMs: VISIT_MS * venues.length });
    expect(afterAPass.candidateId).toEqual(start.candidateId);
  });

  it("looks where a venue actually is", () => {
    const f = sweepFrame({ venues, elapsedMs: TRAVEL_MS + 10 });
    const target = venues.find((v) => v.candidateId === f.candidateId)!;
    expect(f.camera.focus).toEqual({ u: target.worldAnchor.u, v: target.worldAnchor.v });
    expect(f.camera.zoom).toBeGreaterThan(1);
  });

  it("does not spend the VENUE shot before the customer has chosen anyone", () => {
    expect(sweepFrame({ venues, elapsedMs: TRAVEL_MS + 10 }).camera.shot).toBe("DISTRICT");
  });

  it("holds still for reduced motion", () => {
    const f = sweepFrame({ venues, elapsedMs: 5000, reducedMotion: true });
    expect(f.camera.shot).toBe("WIDE");
    expect(f.candidateId).toBeNull();
    expect(f.travelling).toBe(false);
  });

  it("survives having nobody to look at", () => {
    const f = sweepFrame({ venues: [], elapsedMs: 9999 });
    expect(f.candidateId).toBeNull();
    expect(sweptCount({ venues: [], elapsedMs: 9999 })).toBe(0);
  });

  it("counts what it has looked at, and never more than exists", () => {
    expect(sweptCount({ venues, elapsedMs: 0 })).toBe(0);
    expect(sweptCount({ venues, elapsedMs: TRAVEL_MS + 10 })).toBe(1);
    expect(sweptCount({ venues, elapsedMs: VISIT_MS * 50 })).toBe(3);
  });

  it("follows the street from the near end to the far one", () => {
    const stops = sweepOrder(venues);
    const vs = stops.map((s) => venues.find((v) => v.candidateId === s.candidateId)!.worldAnchor.v);
    expect([...vs]).toEqual([...vs].sort((a, b) => a - b));
  });

  it("starts again rather than parking at the far end", () => {
    const stops = sweepOrder(venues);
    expect(sweepFrame({ venues, elapsedMs: VISIT_MS * venues.length }).candidateId).toBe(stops[0]!.candidateId);
  });
});
