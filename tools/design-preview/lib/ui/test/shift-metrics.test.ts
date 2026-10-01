import { describe, expect, it } from "vitest";

import {
  PILOT_RATE_STABILITY,
  RATE_MIN_ONLINE_MINUTES,
  briefingLines,
  formatOnlineDuration,
  rateWithheldCopy,
  readShift,
  type ShiftSnapshot,
} from "../src/shift-metrics";

const MIN = 60_000;
const NOW = Date.parse("2026-09-19T18:00:00.000Z");

function shift(over: Partial<ShiftSnapshot> = {}): ShiftSnapshot {
  return {
    onlineSinceMs: NOW - 120 * MIN,
    settledNetMinorUnits: 48000,
    completedJobs: 3,
    ...over,
  };
}

describe("readShift", () => {
  it("returns a reading when offline rather than null", () => {
    const r = readShift(shift({ onlineSinceMs: null }), NOW);
    expect(r.phase).toBe("OFFLINE");
    expect(r.onlineMinutes).toBe(0);
    expect(r.perOnlineHourMinorUnits).toBeNull();
    expect(r.rateWithheldReason).toBe("OFFLINE");
  });

  it("counts whole minutes online", () => {
    expect(readShift(shift({ onlineSinceMs: NOW - 125 * MIN - 30_000 }), NOW).onlineMinutes).toBe(125);
  });

  it("computes net per online hour once the shift is long enough", () => {
    // ₪480 over two hours.
    expect(readShift(shift(), NOW).perOnlineHourMinorUnits).toBe(24000);
  });

  it("WITHHOLDS the rate on a short shift, however good it looks", () => {
    // Nine minutes, one ₪120 job — arithmetically ₪800/hour, and meaningless.
    const r = readShift(
      shift({ onlineSinceMs: NOW - 9 * MIN, settledNetMinorUnits: 12000, completedJobs: 1 }),
      NOW
    );
    expect(r.phase).toBe("WARMING");
    expect(r.perOnlineHourMinorUnits).toBeNull();
    expect(r.rateWithheldReason).toBe("TOO_SHORT");
    expect(rateWithheldCopy(r)).toContain(String(RATE_MIN_ONLINE_MINUTES));
  });

  it("WITHHOLDS the rate after one job, however long the shift", () => {
    // Three hours and a single job is one data point with a long
    // denominator. ChatGPT's correction to the first version of this rule:
    // time alone does not make a rate stable.
    const r = readShift(shift({ completedJobs: 1 }), NOW);
    expect(r.perOnlineHourMinorUnits).toBeNull();
    expect(r.rateWithheldReason).toBe("TOO_FEW_JOBS");
    expect(r.phase).toBe("WARMING");
  });

  it("takes the rule from config rather than from a constant in the code", () => {
    const loose = { minOnlineMinutes: 5, minCompletedJobs: 1 };
    const r = readShift(shift({ onlineSinceMs: NOW - 10 * MIN, completedJobs: 1 }), NOW, loose);
    expect(r.perOnlineHourMinorUnits).not.toBeNull();
    expect(r.rule).toEqual(loose);
    // Same shift, pilot rule: withheld.
    expect(readShift(shift({ onlineSinceMs: NOW - 10 * MIN, completedJobs: 1 }), NOW)
      .perOnlineHourMinorUnits).toBeNull();
  });

  it("states the pilot rule as pilot config, not as a law", () => {
    expect(PILOT_RATE_STABILITY).toEqual({ minOnlineMinutes: 45, minCompletedJobs: 2 });
    expect(RATE_MIN_ONLINE_MINUTES).toBe(PILOT_RATE_STABILITY.minOnlineMinutes);
  });

  it("shows the rate at exactly the threshold and not one minute before", () => {
    const at = readShift(shift({ onlineSinceMs: NOW - RATE_MIN_ONLINE_MINUTES * MIN }), NOW);
    const before = readShift(shift({ onlineSinceMs: NOW - (RATE_MIN_ONLINE_MINUTES - 1) * MIN }), NOW);
    expect(at.perOnlineHourMinorUnits).not.toBeNull();
    expect(before.perOnlineHourMinorUnits).toBeNull();
  });

  it("shows a rate of zero on a long quiet shift instead of hiding it", () => {
    // Zero jobs is the one case where "too few jobs" must NOT apply: a shift
    // that earned nothing per hour is a fact the professional needs, and
    // hiding it behind a sample-size rule would hide exactly the bad news
    // they came to the screen for.
    const r = readShift(shift({ settledNetMinorUnits: 0, completedJobs: 0 }), NOW);
    expect(r.perOnlineHourMinorUnits).toBe(0);
    expect(r.rateWithheldReason).toBeNull();
  });

  it("distinguishes 'nothing settled yet' from 'earned nothing'", () => {
    const r = readShift(shift({ settledNetMinorUnits: null }), NOW);
    expect(r.settledNetMinorUnits).toBeNull();
    expect(r.perOnlineHourMinorUnits).toBeNull();
    expect(r.rateWithheldReason).toBe("NO_SETTLED_EARNINGS");
  });

  it("never counts a job in progress as money", () => {
    const r = readShift(
      shift({ settledNetMinorUnits: 12000, completedJobs: 2, inProgressJobs: 1 }),
      NOW
    );
    expect(r.settledNetMinorUnits).toBe(12000);
    expect(r.inProgressJobs).toBe(1);
    // ₪120 over two hours — the in-progress job contributes nothing.
    expect(r.perOnlineHourMinorUnits).toBe(6000);
  });

  it("treats a future start time as just-started, not as negative time", () => {
    const r = readShift(shift({ onlineSinceMs: NOW + 30 * MIN }), NOW);
    expect(r.onlineMinutes).toBe(0);
    expect(r.phase).toBe("WARMING");
  });

  it("refuses to let a bad number through as a count", () => {
    const r = readShift(shift({ completedJobs: -4, settledNetMinorUnits: -900 }), NOW);
    expect(r.completedJobs).toBe(0);
    expect(r.settledNetMinorUnits).toBe(0);
  });

  it("clamps utilisation to 0–1 and hides it on a short shift", () => {
    expect(readShift(shift({ busyMinutes: 90 }), NOW).utilisation).toBeCloseTo(0.75);
    expect(readShift(shift({ busyMinutes: 400 }), NOW).utilisation).toBe(1);
    expect(readShift(shift({ onlineSinceMs: NOW - 5 * MIN, busyMinutes: 4 }), NOW).utilisation).toBeNull();
  });

  it("leaves utilisation null when the server did not report busy time", () => {
    expect(readShift(shift(), NOW).utilisation).toBeNull();
  });
});

describe("formatOnlineDuration", () => {
  it("reads as Hebrew rather than as a stopwatch", () => {
    expect(formatOnlineDuration(0)).toBe("פחות מדקה");
    expect(formatOnlineDuration(42)).toBe("42 דק׳");
    expect(formatOnlineDuration(60)).toBe("שעה");
    expect(formatOnlineDuration(120)).toBe("שעתיים");
    expect(formatOnlineDuration(125)).toBe("שעתיים ו־5 דק׳");
    expect(formatOnlineDuration(195)).toBe("3 שעות ו־15 דק׳");
  });

  it("does not render negative time", () => {
    expect(formatOnlineDuration(-10)).toBe("פחות מדקה");
  });
});

describe("briefingLines", () => {
  it("returns nothing when the server reported nothing", () => {
    expect(briefingLines({})).toEqual([]);
  });

  it("NEVER invents demand from a missing window", () => {
    expect(briefingLines({ recentCallsInArea: 12 })).toEqual([]);
    expect(briefingLines({ windowMinutes: 60 })).toEqual([]);
  });

  it("states demand only when both the count and its window are known", () => {
    const [line] = briefingLines({ recentCallsInArea: 7, windowMinutes: 120 });
    expect(line!.kind).toBe("DEMAND");
    expect(line!.textHe).toBe("7 קריאות באזור שלך ב2 השעות האחרונות");
  });

  it("says 'קריאה אחת', not '1 קריאות'", () => {
    const [line] = briefingLines({ recentCallsInArea: 1, windowMinutes: 30 });
    expect(line!.textHe).toBe("קריאה אחת באזור שלך ב30 הדקות האחרונות");
  });

  it("reports an empty area honestly instead of dropping the line", () => {
    const [line] = briefingLines({ peersOnline: 0 });
    expect(line!.textHe).toContain("אין עוד מקצוען");
  });

  it("keeps last week's rate out when the week was too thin to divide", () => {
    expect(briefingLines({ lastWeekNetMinorUnits: 20000, lastWeekOnlineMinutes: 12 })).toEqual([]);
  });

  it("states last week from the professional's own settled history", () => {
    const [line] = briefingLines({ lastWeekNetMinorUnits: 384000, lastWeekOnlineMinutes: 1200 });
    expect(line!.kind).toBe("HISTORY");
    expect(line!.textHe).toContain("₪3840");
    expect(line!.textHe).toContain("₪192 לשעה");
  });
});
