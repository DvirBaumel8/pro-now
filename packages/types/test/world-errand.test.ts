import { describe, expect, it } from "vitest";

import {
  errandsBetween,
  errandViolations,
  REACH_RADIUS,
  reachedNow,
  withinReach,
  type Errand,
} from "../src/world-errand";
import { PLATE_SPOTS } from "../src/world-neighbourhood";
import { GAITS } from "../src/world-motion";

const LINES = ["חתול יצא מתחת לספסל", "הזרקור נדלק", "יונים עפו מהעץ"];
const errands: Errand[] = errandsBetween(PLATE_SPOTS, LINES);

describe("things you find by going to them", () => {
  it("holds its own rules on the real street", () => {
    expect(errandViolations(errands)).toEqual([]);
  });

  it("finds what you are standing on", () => {
    for (const e of errands) {
      expect(reachedNow(e.at, errands, [])).toContain(e.id);
    }
  });

  it("finds nothing from across the neighbourhood", () => {
    expect(reachedNow({ u: 0.02, v: 0.02 }, errands, [])).toEqual([]);
  });

  /*
   * Idempotence is what stops standing still on top of something from
   * counting over and over. `discover()` is already idempotent; this
   * keeps the two from disagreeing about it.
   */
  it("does not find the same thing twice", () => {
    const first = errands[0]!;
    expect(reachedNow(first.at, errands, [first.id])).not.toContain(first.id);
  });

  it("reaches across the street no more easily than along it", () => {
    // The world is drawn in 3/4, so a step into depth covers less visible
    // ground. Reaching must use the same weighting or the radius is an
    // ellipse in the wrong direction.
    const e = errands[0]!;
    const along = { u: e.at.u + REACH_RADIUS * 0.9, v: e.at.v };
    const into = { u: e.at.u, v: e.at.v + REACH_RADIUS * 0.9 };
    expect(withinReach(along, e)).toBe(true);
    expect(withinReach(into, e)).toBe(true);
    const farAlong = { u: e.at.u + REACH_RADIUS * 1.4, v: e.at.v };
    expect(withinReach(farAlong, e)).toBe(false);
  });

  it("puts things between the shops, not in their doorways", () => {
    for (const e of errands) {
      const onAShop = PLATE_SPOTS.some(
        (s) => Math.hypot(s.u - e.at.u, (s.v - e.at.v) * 0.6) < REACH_RADIUS * 0.5
      );
      expect(onAShop, e.id).toBe(false);
    }
  });
});

describe("play may not touch the job", () => {
  /*
   * The rule from `world-play.ts`, enforced here because this file adds
   * a line of text and a line of text is where a claim sneaks in. A
   * discovery may not carry an ETA, a price or a promise — /CLAUDE.md §3
   * and §4.
   */
  it("refuses a line that mentions when the professional arrives", () => {
    const bad: Errand[] = [{ id: "x", at: { u: 0.5, v: 0.5 }, foundHe: "המקצוען מגיע עוד 5 דק׳" }];
    expect(errandViolations(bad).join(" ")).toContain("says something about the job");
  });

  it("refuses a line that offers money off", () => {
    const bad: Errand[] = [{ id: "x", at: { u: 0.5, v: 0.5 }, foundHe: "מצאת הנחה של 10%" }];
    expect(errandViolations(bad).join(" ")).toContain("says something about the job");
  });

  it("refuses two things standing in the same place", () => {
    const bad: Errand[] = [
      { id: "a", at: { u: 0.5, v: 0.5 }, foundHe: "חתול" },
      { id: "b", at: { u: 0.505, v: 0.5 }, foundHe: "כלב" },
    ];
    expect(errandViolations(bad).join(" ")).toContain("same spot");
  });

  it("refuses something with nothing to say", () => {
    const bad: Errand[] = [{ id: "a", at: { u: 0.5, v: 0.5 }, foundHe: "  " }];
    expect(errandViolations(bad).join(" ")).toContain("says nothing");
  });
});

describe("running is not a faster walk", () => {
  /*
   * A run built by multiplying a walk's speed gives a figure doing tiny
   * frantic steps, which reads as a video played fast. Each stride has to
   * cover more ground, rise higher and lean further.
   */
  it("covers more ground per stride", () => {
    expect(GAITS.RUN.cyclesPerWorld).toBeLessThan(GAITS.WALK.cyclesPerWorld);
  });

  it("rises higher and leans further", () => {
    expect(GAITS.RUN.bob).toBeGreaterThan(GAITS.WALK.bob);
    expect(GAITS.RUN.lean).toBeGreaterThan(GAITS.WALK.lean);
  });

  it("is faster, but not a scooter", () => {
    expect(GAITS.RUN.speed).toBeGreaterThan(GAITS.WALK.speed);
    expect(GAITS.RUN.speed).toBeLessThan(GAITS.RIDE.speed);
  });
});
