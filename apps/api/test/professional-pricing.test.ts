import { describe, it, expect } from "vitest";
import {
  validatePricing,
  isChargeable,
} from "../src/domain/pricing/professional-pricing.js";

describe("a professional's own price — /CLAUDE.md §4", () => {
  it("stores what they set, without an opinion about the amount", () => {
    // No floor, no ceiling, no "that looks low". ₪5 and ₪5,000 are both
    // somebody's commercial decision and neither is the server's.
    for (const amount of [1, 500, 18000, 5_000_00]) {
      const r = validatePricing("FIXED", { basePriceMinorUnits: amount });
      expect(r.ok, String(amount)).toBe(true);
      if (r.ok) expect(r.value.basePriceMinorUnits).toBe(amount);
    }
  });

  it("allows zero, because somebody may genuinely not charge for a visit", () => {
    const r = validatePricing("VISIT_QUOTE", { basePriceMinorUnits: 0 });
    expect(r.ok).toBe(true);
  });

  it("allows clearing a price back to null, which is not zero", () => {
    /*
     * "Nulls mean not configured, never free" — ProfessionalService. A
     * professional who withdraws a price must not have the platform
     * charging nothing on their behalf.
     */
    const r = validatePricing("FIXED", { basePriceMinorUnits: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.basePriceMinorUnits).toBeNull();
  });

  it("refuses a negative price", () => {
    const r = validatePricing("FIXED", { basePriceMinorUnits: -4000 });
    expect(r.ok).toBe(false);
  });

  it("refuses a fraction of an agora", () => {
    // Money is integer minor units everywhere here; half an agora is a
    // rounding error that would be argued about later.
    const r = validatePricing("FIXED", { basePriceMinorUnits: 180.5 });
    expect(r.ok).toBe(false);
  });

  it("refuses something that is not a number at all", () => {
    for (const bad of ["180", null === undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = validatePricing("FIXED", { basePriceMinorUnits: bad as never });
      if (bad === null) continue;
      expect(r.ok, String(bad)).toBe(false);
    }
  });

  describe("only the fields the price model gives meaning to", () => {
    it("takes an hourly minimum on an hourly service", () => {
      const r = validatePricing("HOURLY", {
        basePriceMinorUnits: 9000,
        minimumBillableMinutes: 120,
      });
      expect(r.ok).toBe(true);
    });

    it("REFUSES an hourly minimum on a fixed-price service", () => {
      /*
       * Refused rather than ignored. Silently dropping it means a
       * professional types a minimum, sees it accepted, is never charged
       * it, and finds out on an invoice.
       */
      const r = validatePricing("FIXED", {
        basePriceMinorUnits: 18000,
        minimumBillableMinutes: 120,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.map((e) => e.field)).toContain("minimumBillableMinutes");
    });

    it("refuses a per-kilometre rate on a visit-quote service", () => {
      const r = validatePricing("VISIT_QUOTE", {
        basePriceMinorUnits: 15000,
        perKmMinorUnits: 500,
      });
      expect(r.ok).toBe(false);
    });

    it("takes the whole distance set on a courier service", () => {
      const r = validatePricing("DISTANCE_TIME", {
        basePriceMinorUnits: 2000,
        perKmMinorUnits: 500,
        minimumFareMinorUnits: 3000,
      });
      expect(r.ok).toBe(true);
    });

    it("leaves a field alone when it is not mentioned at all", () => {
      // Absent is different from null: one is "I did not say", the other
      // is "clear it". A partial edit must not wipe the rest.
      const r = validatePricing("HOURLY", { minimumBillableMinutes: 60 });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.basePriceMinorUnits).toBeNull();
    });

    it("says every message in Hebrew, because a professional reads them", () => {
      const r = validatePricing("FIXED", { basePriceMinorUnits: -1 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]!.messageHe).toMatch(/[֐-׿]/);
    });
  });
});

describe("chargeable — the question settle() will ask later", () => {
  it("is false with no price at all", () => {
    // The state every real professional was in, forever, because nothing
    // in the product could write one.
    expect(isChargeable("FIXED", { basePriceMinorUnits: null })).toBe(false);
  });

  it("is true once a fixed price is set", () => {
    expect(isChargeable("FIXED", { basePriceMinorUnits: 18000 })).toBe(true);
  });

  it("needs the distance rate too, for a courier", () => {
    // settle() refuses DISTANCE_TIME without perKm, so the screen should
    // say so before the job rather than after it.
    expect(isChargeable("DISTANCE_TIME", { basePriceMinorUnits: 2000 })).toBe(false);
    expect(
      isChargeable("DISTANCE_TIME", { basePriceMinorUnits: 2000, perKmMinorUnits: 500 })
    ).toBe(true);
  });

  it("does not require an hourly minimum", () => {
    // A minimum is optional; an hourly job with none is charged for the
    // time worked, which settle() handles.
    expect(isChargeable("HOURLY", { basePriceMinorUnits: 9000 })).toBe(true);
  });
});
