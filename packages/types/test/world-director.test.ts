import { describe, expect, it } from "vitest";
import {
  directWorld,
  isSignificant,
  MOMENT_SPEC,
  RELEVANCE_BOOST,
  weightFor,
  MOTION_BUDGET,
  nextBeatMs,
  type RunningMoment,
  type WorldMoment,
} from "../src/world-director";

const at = (moment: WorldMoment, startedAt = 0): RunningMoment => ({ moment, startedAt });

describe("the world director keeps a street from becoming a screensaver", () => {
  it("starts something when the street is empty", () => {
    expect(directWorld({ now: 0, running: [], roll: 0.1 }).start).not.toBeNull();
  });

  it("never runs more than two significant moments at once", () => {
    const running = [at("COURIER_PASS"), at("TOW_PASS")];
    const d = directWorld({ now: 100, running, roll: 0.01 });
    expect(d.start === null || !isSignificant(d.start)).toBe(true);
  });

  it("still allows a small moment while two big ones play", () => {
    const d = directWorld({ now: 100, running: [at("COURIER_PASS"), at("DOG_WALK")], roll: 0.99 });
    expect(d.start === null || !isSignificant(d.start)).toBe(true);
  });

  it("falls completely silent when every budget is spent", () => {
    const full = [at("COURIER_PASS"), at("DOG_WALK"), at("WINDOW_LIGHT"), at("BIRDS")];
    expect(directWorld({ now: 100, running: full, roll: 0.5 }).start).toBeNull();
  });

  it("never starts a second copy of the same thing", () => {
    // Two tow trucks arriving together is the clearest tell of a loop.
    for (let i = 0; i <= 20; i++) {
      const d = directWorld({ now: 100, running: [at("TOW_PASS")], roll: i / 20 });
      expect(d.start).not.toBe("TOW_PASS");
    }
  });

  it("retires a moment once its time is up", () => {
    const d = directWorld({ now: MOMENT_SPEC.COURIER_PASS.durationMs + 1, running: [at("COURIER_PASS")], roll: 0.5 });
    expect(d.running).toEqual([]);
  });

  it("keeps a moment that is still playing", () => {
    const d = directWorld({ now: 100, running: [at("COURIER_PASS")], roll: 0.5 });
    expect(d.running.map((r) => r.moment)).toEqual(["COURIER_PASS"]);
  });

  it("holds completely still under reduced motion", () => {
    const d = directWorld({ now: 0, running: [], roll: 0.5, reducedMotion: true });
    expect(d.start).toBeNull();
  });

  it("makes the tow truck far rarer than a passing courier", () => {
    expect(MOMENT_SPEC.TOW_PASS.weight).toBeLessThan(MOMENT_SPEC.COURIER_PASS.weight);
  });

  it("varies the gap between moments rather than ticking like a metronome", () => {
    expect(nextBeatMs(0)).toBeLessThan(nextBeatMs(1));
    expect(nextBeatMs(0)).toBeGreaterThanOrEqual(1000);
  });

  it("budgets significant and small moments separately", () => {
    expect(MOTION_BUDGET.significant).toBeLessThanOrEqual(2);
  });
});

describe("the street knows what you are looking for", () => {
  it("makes the searched trade's own traffic more likely", () => {
    expect(weightFor("TOW_PASS", "VEHICLE")).toBe(MOMENT_SPEC.TOW_PASS.weight * RELEVANCE_BOOST);
    expect(weightFor("TOW_PASS", "BEAUTY")).toBe(MOMENT_SPEC.TOW_PASS.weight);
  });

  it("changes nothing when no trade is being searched", () => {
    for (const m of Object.keys(MOMENT_SPEC) as (keyof typeof MOMENT_SPEC)[]) {
      expect(weightFor(m, null)).toBe(MOMENT_SPEC[m].weight);
    }
  });

  it("nudges rather than filters: everything can still happen", () => {
    // Across the whole roll range, a VEHICLE search must still produce
    // moments that are not tow trucks. A world that shows only your trade
    // is a world performing for you.
    const seen = new Set<string>();
    for (let i = 0; i <= 20; i++) {
      const d = directWorld({ now: 0, running: [], roll: i / 20, departmentCode: "VEHICLE" });
      if (d.start) seen.add(d.start);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(seen.has("TOW_PASS")).toBe(true);
  });

  it("never invents supply: a boost is about traffic, not about people", () => {
    // The boosted weight is bounded, so no search can flood the street.
    expect(RELEVANCE_BOOST).toBeLessThanOrEqual(4);
  });
});
