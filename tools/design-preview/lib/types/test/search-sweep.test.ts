import { describe, expect, it } from "vitest";

import {
  DWELL_MS,
  layOutVenues,
  MAX_TRAVEL_MS,
  MIN_TRAVEL_MS,
  nextSweepBoundary,
  sweepFrame,
  sweepOrder,
  sweepSchedule,
  sweepViolations,
  sweptCount,
  travelMsFor,
  VISIT_MS,
} from "../src";

const venues = layOutVenues(["a", "b", "c"], "HAIR");

/*
 * Visits are no longer all the same length — the travel half of each one
 * comes from how far the camera has to move (see `search-sweep.ts`), so
 * the tests below ask the schedule where a stop begins rather than
 * multiplying a constant. Five of them used to divide `VISIT_MS` out of
 * the clock, which is precisely the arithmetic that made the camera crawl
 * between neighbouring shops and whip-pan across distant ones.
 */
const plan = sweepSchedule(venues);
const lapMs = plan.lapMs;
/** When the camera has arrived at the nth stop and is resting on it. */
const restingOn = (n: number) => plan.stops[n]!.startsAt + plan.stops[n]!.travelMs + 10;

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
    const first = sweepFrame({ venues, elapsedMs: restingOn(0) });
    const second = sweepFrame({ venues, elapsedMs: restingOn(1) });
    expect(first.candidateId).not.toBeNull();
    expect(second.candidateId).not.toEqual(first.candidateId);
  });

  it("travels, then rests — never a constant glide", () => {
    expect(sweepFrame({ venues, elapsedMs: 10 }).travelling).toBe(true);
    expect(sweepFrame({ venues, elapsedMs: restingOn(0) + DWELL_MS / 2 }).travelling).toBe(false);
  });

  it("loops rather than parking on the last shop", () => {
    const start = sweepFrame({ venues, elapsedMs: 0 });
    const afterAPass = sweepFrame({ venues, elapsedMs: lapMs });
    expect(afterAPass.candidateId).toEqual(start.candidateId);
  });

  it("looks where a venue actually is", () => {
    const f = sweepFrame({ venues, elapsedMs: restingOn(0) });
    const target = venues.find((v) => v.candidateId === f.candidateId)!;
    expect(f.camera.focus).toEqual({ u: target.worldAnchor.u, v: target.worldAnchor.v });
    expect(f.camera.zoom).toBeGreaterThan(1);
  });

  it("does not spend the VENUE shot before the customer has chosen anyone", () => {
    expect(sweepFrame({ venues, elapsedMs: restingOn(0) }).camera.shot).toBe("DISTRICT");
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
    expect(sweptCount({ venues, elapsedMs: restingOn(0) })).toBe(1);
    expect(sweptCount({ venues, elapsedMs: lapMs * 50 })).toBe(3);
  });

  it("follows the street from the near end to the far one", () => {
    const stops = sweepOrder(venues);
    const vs = stops.map((s) => venues.find((v) => v.candidateId === s.candidateId)!.worldAnchor.v);
    expect([...vs]).toEqual([...vs].sort((a, b) => a - b));
  });

  it("starts again rather than parking at the far end", () => {
    const stops = sweepOrder(venues);
    expect(sweepFrame({ venues, elapsedMs: lapMs }).candidateId).toBe(stops[0]!.candidateId);
  });
});

describe("the beat the camera moves on", () => {
  const venues = layOutVenues(["a", "b", "c"], "HOME");
  const plan = sweepSchedule(venues);
  const secondStopAt = plan.stops[1]!.startsAt;

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
    const justBefore = sweepFrame({ venues, elapsedMs: secondStopAt - 1 });
    const atBoundary = sweepFrame({ venues, elapsedMs: secondStopAt });
    const first = sweepFrame({ venues, elapsedMs: 0 });

    expect(justBefore.candidateId).toBe(first.candidateId);
    expect(atBoundary.candidateId).not.toBe(first.candidateId);
  });

  it("holds one stop for the whole visit", () => {
    // Nothing in between should move the camera, which is what lets the
    // scene sleep until the next boundary instead of polling.
    const at = (ms: number) => sweepFrame({ venues, elapsedMs: ms });
    const start = at(0);
    for (const ms of [1, 200, 700, 1100, 1500, 2000, secondStopAt - 1]) {
      expect(at(ms).camera.focus, String(ms)).toEqual(start.camera.focus);
    }
  });

  it("comes back round to the first venue after a full lap", () => {
    const first = sweepFrame({ venues, elapsedMs: 0 });
    const lapLater = sweepFrame({ venues, elapsedMs: plan.lapMs });
    expect(lapLater.candidateId).toBe(first.candidateId);
  });

  it("asks for a move no longer than the visit that contains it", () => {
    // A travel longer than the visit would mean the camera is still
    // moving when it is meant to be resting, and the settle — the half
    // that makes it read as looking rather than drifting — disappears.
    for (const stop of plan.stops) {
      expect(stop.travelMs, stop.candidateId).toBeLessThan(stop.visitMs);
    }
    expect(sweepFrame({ venues, elapsedMs: 0 }).camera.durationMs).toBe(plan.stops[0]!.travelMs);
  });

  it("wakes the scene exactly when the frame changes", () => {
    // The clock and the frame are two readings of one schedule, and the
    // scene SLEEPS between them — so a boundary either side is a stop
    // that begins late and a move that begins without the camera.
    for (const stop of plan.stops) {
      const justInside = stop.startsAt + 1;
      expect(nextSweepBoundary(venues, justInside), stop.candidateId).toBe(
        stop.startsAt + stop.visitMs
      );
    }
  });
});

describe("a camera that moves at a speed, not on a timer", () => {
  /*
   * Amit: *"גם את התנועתיות של איתור המקצוען זה זז לא טוב."*
   *
   * Eight candidates, which is the case that showed it: the hops between
   * them run from 0.237 to 0.642 of the world across — a factor of 2.7 —
   * and every one of them used to take the same 1100ms. So the camera
   * crawled between neighbouring shops and whip-panned across far ones,
   * in the same breath.
   */
  const eight = layOutVenues(
    Array.from({ length: 8 }, (_, i) => `c${i}`),
    "HOME"
  );
  const plan = sweepSchedule(eight);
  const byId = new Map(eight.map((v) => [v.candidateId, v.worldAnchor]));

  const hopOf = (i: number) => {
    const here = byId.get(plan.stops[i]!.candidateId)!;
    const before = byId.get(plan.stops[(i - 1 + plan.stops.length) % plan.stops.length]!.candidateId)!;
    return Math.hypot(here.u - before.u, here.v - before.v);
  };

  it("takes longer over a longer move", () => {
    const hops = plan.stops.map((_, i) => ({ d: hopOf(i), ms: plan.stops[i]!.travelMs }));
    const shortest = hops.reduce((a, b) => (b.d < a.d ? b : a));
    const longest = hops.reduce((a, b) => (b.d > a.d ? b : a));
    expect(longest.d / shortest.d).toBeGreaterThan(2);
    expect(longest.ms).toBeGreaterThan(shortest.ms);
  });

  it("holds the speed far steadier than the old fixed timer did", () => {
    /*
     * The claim being tested, in the only terms that mean anything: how
     * much the camera's SPEED varies across a lap. On a fixed 1100ms it
     * varied by the full spread of the distances — 2.7x. It must now be
     * a small fraction of that, and the clamp is why it is not 1.0.
     */
    const speeds = plan.stops.map((s, i) => hopOf(i) / s.travelMs);
    const spread = Math.max(...speeds) / Math.min(...speeds);
    const distances = plan.stops.map((_, i) => hopOf(i));
    const oldSpread = Math.max(...distances) / Math.min(...distances);
    expect(oldSpread).toBeGreaterThan(2.5);
    expect(spread).toBeLessThan(1.6);
  });

  it("never snaps and never drifts, whatever the layout", () => {
    // The clamp is the beat's guardrail: two shops on top of each other
    // must not produce a cut, and two at opposite corners must not
    // produce a move so slow it stops reading as one gesture.
    expect(travelMsFor(0)).toBe(MIN_TRAVEL_MS);
    expect(travelMsFor(10)).toBe(MAX_TRAVEL_MS);
    for (const stop of plan.stops) {
      expect(stop.travelMs).toBeGreaterThanOrEqual(MIN_TRAVEL_MS);
      expect(stop.travelMs).toBeLessThanOrEqual(MAX_TRAVEL_MS);
    }
  });

  it("gives the lone candidate a move rather than a jump cut", () => {
    const one = layOutVenues(["only"], "HOME");
    const solo = sweepSchedule(one);
    expect(solo.stops).toHaveLength(1);
    expect(solo.stops[0]!.travelMs).toBeGreaterThan(0);
  });
});
