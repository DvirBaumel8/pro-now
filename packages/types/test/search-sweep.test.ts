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

describe("the beat the camera moves on", () => {
  const venues = layOutVenues(["a", "b", "c"], "HOME");

  it("changes stop exactly on the visit boundary and not before", () => {
    /*
     * The scene wakes its clock at these moments and nowhere else, so the
     * boundary has to be the only place the frame changes. It used to be
     * sampled on a 200ms grid instead, which meant every move began up to
     * a fifth of a second late — a different amount of late each time.
     *
     * `search-sweep.ts` is explicit that the point is a rhythm: travel,
     * settle, travel. A beat that wanders is not that rhythm, and Amit
     * felt it before anybody measured it.
     */
    const justBefore = sweepFrame({ venues, elapsedMs: VISIT_MS - 1 });
    const atBoundary = sweepFrame({ venues, elapsedMs: VISIT_MS });
    const first = sweepFrame({ venues, elapsedMs: 0 });

    expect(justBefore.candidateId).toBe(first.candidateId);
    expect(atBoundary.candidateId).not.toBe(first.candidateId);
  });

  it("holds one stop for the whole visit", () => {
    // Nothing in between should move the camera, which is what lets the
    // scene sleep until the next boundary instead of polling.
    const at = (ms: number) => sweepFrame({ venues, elapsedMs: ms });
    const start = at(0);
    for (const ms of [1, 200, 700, 1100, 1500, 2000, VISIT_MS - 1]) {
      expect(at(ms).camera.focus, String(ms)).toEqual(start.camera.focus);
    }
  });

  it("comes back round to the first venue after a full lap", () => {
    const first = sweepFrame({ venues, elapsedMs: 0 });
    const lapLater = sweepFrame({ venues, elapsedMs: VISIT_MS * venues.length });
    expect(lapLater.candidateId).toBe(first.candidateId);
  });

  it("asks for a move no longer than the visit that contains it", () => {
    // A travel longer than the visit would mean the camera is still
    // moving when it is meant to be resting, and the settle — the half
    // that makes it read as looking rather than drifting — disappears.
    const frame = sweepFrame({ venues, elapsedMs: 0 });
    expect(frame.camera.durationMs ?? 0).toBeLessThan(VISIT_MS);
  });
});
