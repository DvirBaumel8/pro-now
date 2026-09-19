import { describe, it, expect } from "vitest";
import type { EtaView } from "@pro-now/types";

import {
  MIN_REVIEWS_FOR_RATING,
  etaMinutes,
  formatCompletedJobs,
  formatCountdown,
  formatDistance,
  formatEta,
  formatMinimumBillable,
  formatProNowRating,
  payoutDisclosure,
} from "../src/format";

/**
 * Each of these is a place the UI could quietly fabricate something —
 * an ETA that was never measured, a rating that does not exist yet, a
 * payout that was never calculated. /CLAUDE.md §3 makes those defects,
 * so they are asserted here rather than reviewed by eye.
 */

function eta(overrides: Partial<EtaView> = {}): EtaView {
  return {
    etaSeconds: 720,
    distanceMeters: 3400,
    isRouteBased: true,
    computedAt: "2026-09-19T12:00:00.000Z",
    ...overrides,
  };
}

describe("ETA", () => {
  it("rounds to whole minutes", () => {
    expect(etaMinutes(720)).toBe(12);
    expect(etaMinutes(750)).toBe(13);
  });

  it("never shows 0 minutes — that would read as 'already here'", () => {
    expect(etaMinutes(0)).toBe(1);
    expect(etaMinutes(20)).toBe(1);
  });

  it("uses the singular unit at exactly one minute", () => {
    expect(formatEta(eta({ etaSeconds: 60 }))!.unit).toBe("דקה");
    expect(formatEta(eta({ etaSeconds: 120 }))!.unit).toBe("דקות");
  });

  it("returns null when there is no ETA — the card must render an absence, not a guess", () => {
    expect(formatEta(null)).toBeNull();
  });

  it("flags a non-route-based ETA as approximate", () => {
    expect(formatEta(eta({ isRouteBased: false }))!.isApproximate).toBe(true);
    expect(formatEta(eta({ isRouteBased: true }))!.isApproximate).toBe(false);
  });

  it("rejects a nonsensical ETA rather than rendering it", () => {
    expect(() => etaMinutes(Number.NaN)).toThrow("ETA_NOT_FINITE");
    expect(() => etaMinutes(-5)).toThrow("ETA_NOT_FINITE");
  });
});

describe("distance", () => {
  it("uses metres below a kilometre", () => {
    expect(formatDistance(450)).toBe("450 מ׳");
  });

  it("uses one decimal for single-digit kilometres", () => {
    expect(formatDistance(2400)).toBe("2.4 ק״מ");
  });

  it("drops the decimal above ten kilometres", () => {
    expect(formatDistance(12400)).toBe("12 ק״מ");
  });

  it("returns null for unknown or invalid distances", () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(-1)).toBeNull();
    expect(formatDistance(Number.NaN)).toBeNull();
  });
});

describe("PRO NOW reputation", () => {
  it("shows an average once there are enough reviews", () => {
    expect(formatProNowRating(4.86, 342)).toEqual({ rating: "4.9", count: 342 });
  });

  it("shows a rating from the very first verified review, together with its count", () => {
    // Product decision: hiding a real review until an arbitrary threshold
    // reads as the platform withholding information. The count is what
    // keeps a single review from looking like an established reputation.
    expect(formatProNowRating(5, 1)).toEqual({ rating: "5.0", count: 1 });
  });

  it("shows nothing when there are no reviews at all", () => {
    expect(formatProNowRating(5, 0)).toBeNull();
    expect(formatProNowRating(5, MIN_REVIEWS_FOR_RATING - 1)).toBeNull();
  });

  it("returns null when there is no average at all", () => {
    expect(formatProNowRating(null, 500)).toBeNull();
  });

  it("formats the hourly minimum in natural Hebrew", () => {
    expect(formatMinimumBillable(30)).toBe("30 דקות");
    expect(formatMinimumBillable(60)).toBe("שעה");
    expect(formatMinimumBillable(120)).toBe("2 שעות");
    expect(formatMinimumBillable(90)).toBe("שעה ו-30 דקות");
    expect(formatMinimumBillable(150)).toBe("2 שעות ו-30 דקות");
  });

  it("returns nothing for an unconfigured or nonsensical minimum", () => {
    expect(formatMinimumBillable(null)).toBeNull();
    expect(formatMinimumBillable(undefined)).toBeNull();
    expect(formatMinimumBillable(0)).toBeNull();
    expect(formatMinimumBillable(-30)).toBeNull();
  });

  it("always attributes the job count to PRO NOW", () => {
    expect(formatCompletedJobs(342)).toBe("342 עבודות דרך PRO NOW");
  });

  it("uses the Hebrew singular for a single completed job", () => {
    expect(formatCompletedJobs(1)).toBe("עבודה אחת דרך PRO NOW");
  });

  it("shows nothing rather than '0 jobs' for a brand-new professional", () => {
    expect(formatCompletedJobs(0)).toBeNull();
    expect(formatCompletedJobs(-1)).toBeNull();
  });
});

describe("offer countdown", () => {
  const offeredAt = Date.parse("2026-09-19T12:00:00.000Z");
  const expiresAt = "2026-09-19T12:00:30.000Z"; // a 30 second offer

  it("formats remaining time as m:ss", () => {
    expect(formatCountdown(expiresAt, offeredAt, 30).label).toBe("0:30");
    expect(formatCountdown(expiresAt, offeredAt + 7000, 30).label).toBe("0:23");
  });

  it("clamps at zero and reports expiry rather than going negative", () => {
    const past = formatCountdown(expiresAt, offeredAt + 45000, 30);
    expect(past.secondsRemaining).toBe(0);
    expect(past.label).toBe("0:00");
    expect(past.expired).toBe(true);
    expect(past.fraction).toBe(0);
  });

  it("escalates urgency as the deadline approaches", () => {
    expect(formatCountdown(expiresAt, offeredAt, 30).urgency).toBe("calm");
    expect(formatCountdown(expiresAt, offeredAt + 20000, 30).urgency).toBe("warning");
    expect(formatCountdown(expiresAt, offeredAt + 27000, 30).urgency).toBe("critical");
  });

  it("keeps the fraction inside 0..1 even if the clock is skewed ahead of the server", () => {
    const skewed = formatCountdown(expiresAt, offeredAt - 60000, 30);
    expect(skewed.fraction).toBeLessThanOrEqual(1);
    expect(skewed.fraction).toBeGreaterThanOrEqual(0);
  });

  it("rejects an invalid deadline instead of rendering NaN", () => {
    expect(() => formatCountdown("not-a-date", offeredAt, 30)).toThrow("EXPIRES_AT_INVALID");
  });
});

describe("payout disclosure", () => {
  it("states plainly when the amount is not knowable yet", () => {
    const result = payoutDisclosure(null, false);
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reasonHe).toContain("אבחון");
  });

  it("marks an outcome-dependent payout as an estimate", () => {
    const result = payoutDisclosure(18000, true);
    expect(result.known).toBe(true);
    if (result.known) {
      expect(result.isEstimate).toBe(true);
      expect(result.qualifierHe).toBe("משוער");
    }
  });

  it("carries no qualifier for a fixed, knowable payout", () => {
    const result = payoutDisclosure(18000, false);
    expect(result.known).toBe(true);
    if (result.known) expect(result.qualifierHe).toBeNull();
  });

  it("treats a zero payout as known, not as missing", () => {
    expect(payoutDisclosure(0, false).known).toBe(true);
  });
});
