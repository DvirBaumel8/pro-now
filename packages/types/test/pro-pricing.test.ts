import { describe, expect, it } from "vitest";

import {
  CALL_OUT_FEE_BOUNDS,
  customerPriceLineHe,
  formFor,
  payoutNoteHe,
  priceViolations,
  pricedForDispatch,
  proPricingViolations,
  type ProServicePrice,
} from "../src/pro-pricing";
import { pilotCatalog } from "../src/pilot-catalog";

const price = (over: Partial<ProServicePrice> = {}): ProServicePrice => ({
  serviceId: "svc-leak",
  pricingModel: "VISIT_QUOTE",
  amountMinorUnits: 17_900,
  ...over,
});

describe("the rules hold", () => {
  it("has no violations", () => {
    expect(proPricingViolations()).toEqual([]);
  });
});

describe("the service decides what the professional is asked", () => {
  it("asks a call-out fee where a visit precedes a quote", () => {
    expect(formFor("VISIT_QUOTE").kind).toBe("CALL_OUT_FEE");
  });

  it("asks nothing where the price needs a routing vendor", () => {
    // The maps vendor is an open decision (/CLAUDE.md §4), so a per-km
    // tariff cannot be typed here without inventing one.
    const f = formFor("DISTANCE_TIME");
    expect(f.kind).toBe("NOT_SET_HERE");
    if (f.kind === "NOT_SET_HERE") expect(f.reasonHe).toContain("ספק המפות");
  });

  it("covers every pricing model in the pilot catalogue", () => {
    for (const d of pilotCatalog) {
      for (const c of d.categories) {
        for (const s of c.services) {
          expect(() => formFor(s.pricingModel)).not.toThrow();
          expect(formFor(s.pricingModel).kind).toBeTruthy();
        }
      }
    }
  });
});

describe("what a professional may type", () => {
  it("allows free — that is a real offer, not a mistake", () => {
    expect(priceViolations(price({ amountMinorUnits: 0 }))).toEqual([]);
  });

  it("catches a missing decimal point", () => {
    const v = priceViolations(price({ amountMinorUnits: CALL_OUT_FEE_BOUNDS.maxMinorUnits + 1 }));
    expect(v.join(" ")).toContain("נקודה עשרונית");
  });

  it("rejects fractions of an agora", () => {
    expect(priceViolations(price({ amountMinorUnits: 17_900.5 })).length).toBe(1);
  });

  it("refuses a price on a service that has none to set", () => {
    expect(priceViolations(price({ pricingModel: "DISTANCE_TIME", amountMinorUnits: 500 })).length).toBe(1);
    expect(priceViolations(price({ pricingModel: "DISTANCE_TIME", amountMinorUnits: null }))).toEqual([]);
  });

  it("treats not-yet-set as valid but not dispatchable", () => {
    const p = price({ amountMinorUnits: null });
    expect(priceViolations(p)).toEqual([]);
    expect(pricedForDispatch(p)).toBe(false);
  });
});

describe("what the customer is told", () => {
  it("never shows a visit fee as the price of the repair (2026-09-29)", () => {
    // ₪179 is the visit and the diagnosis; the repair is settled with the professional directly.
    expect(customerPriceLineHe(price())).toContain("ביקור ואבחון");
    expect(customerPriceLineHe(price())).toContain("ישירות מול המקצוען");
  });

  it("says nothing at all when there is no price", () => {
    // Silence, not "₪0" and not "מחיר לא ידוע" — those are two different
    // claims and neither is true.
    expect(customerPriceLineHe(price({ amountMinorUnits: null }))).toBeNull();
  });

  it("distinguishes per hour from per job", () => {
    expect(customerPriceLineHe(price({ pricingModel: "HOURLY", amountMinorUnits: 12_000 }))).toBe("₪120 לשעה");
    expect(customerPriceLineHe(price({ pricingModel: "FIXED", amountMinorUnits: 12_000 }))).toBe("₪120 לעבודה");
  });
});

describe("what the professional is told about their own take", () => {
  it("shows the gross and refuses to invent a net", () => {
    const p = payoutNoteHe(price({ pricingModel: "FIXED", amountMinorUnits: 18_000 }), null);
    expect(p?.grossHe).toBe("₪180");
    expect(p?.netHe).toBeNull();
    expect(p?.noteHe).toContain("טרם נקבעו");
  });

  it("computes a net the moment a commission exists", () => {
    const p = payoutNoteHe(price({ pricingModel: "FIXED", amountMinorUnits: 18_000 }), 15);
    expect(p?.netHe).toBe("₪153");
  });
});

import { isAfterHours, withAfterHours } from "../src/pro-pricing";

describe("after-hours surcharge (the professional's own)", () => {
  it("counts nights, Friday afternoon and Saturday — and not a weekday afternoon", () => {
    expect(isAfterHours(new Date(2026, 8, 28, 22, 0))).toBe(true); // Mon 22:00
    expect(isAfterHours(new Date(2026, 8, 28, 6, 30))).toBe(true); // Mon 06:30
    expect(isAfterHours(new Date(2026, 8, 28, 14, 0))).toBe(false); // Mon 14:00
    expect(isAfterHours(new Date(2026, 9, 2, 16, 0))).toBe(true); // Fri 16:00
    expect(isAfterHours(new Date(2026, 9, 3, 12, 0))).toBe(true); // Sat 12:00
  });
  it("adds his percent only when it applies, and never more than 100%", () => {
    expect(withAfterHours(20000, 50, new Date(2026, 8, 28, 22, 0)).amountMinorUnits).toBe(30000);
    expect(withAfterHours(20000, 50, new Date(2026, 8, 28, 14, 0)).amountMinorUnits).toBe(20000);
    expect(withAfterHours(20000, 300, new Date(2026, 8, 28, 22, 0)).amountMinorUnits).toBe(40000);
    expect(withAfterHours(20000, null, new Date(2026, 8, 28, 22, 0)).surchargePercent).toBe(0);
  });
});
