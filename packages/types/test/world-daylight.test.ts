import { describe, expect, it } from "vitest";

import {
  daylightAt,
  daylightAtMinute,
  daylightViolations,
  daylightWashColor,
  greetingAtMinute,
} from "../src";

/**
 * THE WORLD IS AT THE SAME HOUR THE PERSON IS.
 *
 * Amit: *"חייב לייצר פה משהו שלא ראו בשום אפליקציה."* The light over the
 * neighbourhood is taken from the clock on the phone. It invents
 * nothing — the hour is a fact the device already holds — and these are
 * the properties that keep it that way.
 */
describe("daylight", () => {
  it("holds its own invariants at every minute of the day", () => {
    expect(daylightViolations()).toEqual([]);
  });

  it("is dark at night and barely there at midday", () => {
    expect(daylightAtMinute(2 * 60).wash.opacity).toBeGreaterThan(0.4);
    expect(daylightAtMinute(13 * 60).wash.opacity).toBeLessThan(0.08);
  });

  it("lights the lamps after dusk and puts them out after dawn", () => {
    expect(daylightAtMinute(19 * 60).lampsLit).toBe(true);
    expect(daylightAtMinute(3 * 60).lampsLit).toBe(true);
    expect(daylightAtMinute(8 * 60).lampsLit).toBe(false);
    expect(daylightAtMinute(16 * 60).lampsLit).toBe(false);
  });

  it("warms towards the ends of the day", () => {
    // The golden hour is warmer than midday: more red than blue.
    const golden = daylightAtMinute(17 * 60 + 30).wash;
    expect(golden.r - golden.b).toBeGreaterThan(80);
    // And the middle of the night is the other way round.
    const night = daylightAtMinute(1 * 60).wash;
    expect(night.b - night.r).toBeGreaterThan(20);
  });

  it("wraps around midnight rather than falling off either end", () => {
    expect(daylightAtMinute(-30)).toEqual(daylightAtMinute(1410));
    expect(daylightAtMinute(1500)).toEqual(daylightAtMinute(60));
  });

  it("reads the local hour of the clock it is given", () => {
    const at = new Date();
    at.setHours(23, 30, 0, 0);
    expect(daylightAt(at).lampsLit).toBe(true);
    at.setHours(12, 0, 0, 0);
    expect(daylightAt(at).lampsLit).toBe(false);
  });

  it("writes a colour a style can take", () => {
    expect(daylightWashColor(daylightAtMinute(0))).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/);
  });
});

describe("greeting", () => {
  it("agrees with the light above it", () => {
    expect(greetingAtMinute(8 * 60)).toBe("בוקר טוב");
    expect(greetingAtMinute(13 * 60)).toBe("צהריים טובים");
    expect(greetingAtMinute(20 * 60)).toBe("ערב טוב");
    expect(greetingAtMinute(2 * 60)).toBe("לילה טוב");
  });

  it("never says good evening while the lamps are out", () => {
    for (let m = 0; m < 1440; m += 1) {
      if (greetingAtMinute(m) === "ערב טוב") {
        expect(daylightAtMinute(m).lampsLit).toBe(true);
      }
    }
  });
});
