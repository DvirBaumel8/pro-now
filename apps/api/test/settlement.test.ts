import { describe, it, expect } from "vitest";
import { settle, splitCommission, type SettlementInput } from "../src/domain/payments/settlement.js";

const base: SettlementInput = {
  priceModel: "FIXED",
  basePriceMinorUnits: null,
  minimumBillableMinutes: null,
  perKmMinorUnits: null,
  minimumFareMinorUnits: null,
  approvedQuoteTotalMinorUnits: null,
  workedMinutes: null,
  distanceKm: null,
};

describe("settlement — /docs/09-PAYMENTS.md §Pricing archetypes", () => {
  describe("FIXED", () => {
    it("charges the configured price", () => {
      const r = settle({ ...base, priceModel: "FIXED", basePriceMinorUnits: 18000 });
      expect(r).toEqual({ ok: true, amount: { minorUnits: 18000, currency: "ILS" }, basis: "FIXED_PRICE" });
    });

    it("refuses when the professional never configured one", () => {
      // Null means "not configured", never "free" — ProfessionalService
      // says so, and charging zero would be inventing a price.
      expect(settle({ ...base, priceModel: "FIXED" })).toEqual({
        ok: false,
        reason: "NO_CONFIGURED_PRICE",
      });
    });
  });

  describe("VISIT_QUOTE", () => {
    it("charges the approved quote, not the quote plus the visit fee", () => {
      const r = settle({
        ...base,
        priceModel: "VISIT_QUOTE",
        basePriceMinorUnits: 15000,
        approvedQuoteTotalMinorUnits: 37000,
      });
      expect(r).toEqual({
        ok: true,
        amount: { minorUnits: 37000, currency: "ILS" },
        basis: "APPROVED_QUOTE",
      });
    });

    it("charges the visit fee alone when no quote was approved", () => {
      // The diagnosis-only outcome: somebody came, looked, and was
      // declined. They are still owed the journey.
      const r = settle({ ...base, priceModel: "VISIT_QUOTE", basePriceMinorUnits: 15000 });
      expect(r).toEqual({
        ok: true,
        amount: { minorUnits: 15000, currency: "ILS" },
        basis: "VISIT_FEE_ONLY",
      });
    });

    it("refuses when there is neither a quote nor a visit fee", () => {
      expect(settle({ ...base, priceModel: "VISIT_QUOTE" })).toEqual({
        ok: false,
        reason: "NO_APPROVED_QUOTE_AND_NO_VISIT_FEE",
      });
    });
  });

  describe("HOURLY", () => {
    it("charges per minute of the hourly rate, not per whole hour", () => {
      // 90 minutes at ₪90/hour is ₪135. Rounding up to two hours would
      // overcharge by ₪45 on every job of this shape.
      const r = settle({
        ...base,
        priceModel: "HOURLY",
        basePriceMinorUnits: 9000,
        workedMinutes: 90,
      });
      expect(r).toEqual({ ok: true, amount: { minorUnits: 13500, currency: "ILS" }, basis: "HOURLY_RATE" });
    });

    it("applies the minimum when the work was shorter", () => {
      const r = settle({
        ...base,
        priceModel: "HOURLY",
        basePriceMinorUnits: 9000,
        minimumBillableMinutes: 120,
        workedMinutes: 25,
      });
      expect(r).toEqual({ ok: true, amount: { minorUnits: 18000, currency: "ILS" }, basis: "HOURLY_RATE" });
    });

    it("does not apply the minimum when the work was longer", () => {
      const r = settle({
        ...base,
        priceModel: "HOURLY",
        basePriceMinorUnits: 9000,
        minimumBillableMinutes: 120,
        workedMinutes: 180,
      });
      expect(r).toEqual({ ok: true, amount: { minorUnits: 27000, currency: "ILS" }, basis: "HOURLY_RATE" });
    });

    it("refuses when nobody measured the work", () => {
      // The timer is server-authoritative (/docs/09-PAYMENTS.md). An
      // unmeasured job has no honest amount, and the minimum is not a
      // stand-in for one.
      expect(
        settle({ ...base, priceModel: "HOURLY", basePriceMinorUnits: 9000, minimumBillableMinutes: 120 })
      ).toEqual({ ok: false, reason: "WORK_DURATION_NOT_MEASURED" });
    });
  });

  describe("DISTANCE_TIME", () => {
    it("charges base plus distance", () => {
      const r = settle({
        ...base,
        priceModel: "DISTANCE_TIME",
        basePriceMinorUnits: 2000,
        perKmMinorUnits: 500,
        distanceKm: 6,
      });
      expect(r).toEqual({ ok: true, amount: { minorUnits: 5000, currency: "ILS" }, basis: "DISTANCE_AND_TIME" });
    });

    it("never charges below the minimum fare", () => {
      const r = settle({
        ...base,
        priceModel: "DISTANCE_TIME",
        basePriceMinorUnits: 2000,
        perKmMinorUnits: 500,
        minimumFareMinorUnits: 3000,
        distanceKm: 1,
      });
      expect(r).toEqual({ ok: true, amount: { minorUnits: 3000, currency: "ILS" }, basis: "DISTANCE_AND_TIME" });
    });

    it("refuses when the distance was never recorded", () => {
      // Settling at the base fee "for now" would undercharge every
      // courier job silently, and nobody would report it.
      expect(
        settle({ ...base, priceModel: "DISTANCE_TIME", basePriceMinorUnits: 2000, perKmMinorUnits: 500 })
      ).toEqual({ ok: false, reason: "DISTANCE_NOT_RECORDED" });
    });
  });
});

describe("commission split — /CLAUDE.md §4", () => {
  it("returns nothing at all when no commission has been set", () => {
    // The screen has already had a flat 20% written into it once. Absent
    // must mean absent, not zero and not a guess.
    expect(splitCommission(37000, null)).toBeNull();
  });

  it("splits a charge so the parts sum to it exactly", () => {
    const split = splitCommission(37000, 15)!;
    expect(split.platformFeeMinorUnits + split.professionalPayableMinorUnits).toBe(37000);
    expect(split.customerChargeMinorUnits).toBe(37000);
  });

  it("rounds the fee down, so rounding never costs the professional", () => {
    // 15% of ₪333.33 is 4999.95 agorot. Rounding up would take an extra
    // agora from the professional on every job that lands here.
    const split = splitCommission(33333, 15)!;
    expect(split.platformFeeMinorUnits).toBe(4999);
    expect(split.professionalPayableMinorUnits).toBe(28334);
  });

  it("gives the professional everything at zero commission", () => {
    const split = splitCommission(10000, 0)!;
    expect(split.platformFeeMinorUnits).toBe(0);
    expect(split.professionalPayableMinorUnits).toBe(10000);
  });

  it("refuses a nonsensical rate rather than applying it", () => {
    for (const bad of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(splitCommission(10000, bad), String(bad)).toBeNull();
    }
  });
});
