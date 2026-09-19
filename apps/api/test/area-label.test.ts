import { describe, it, expect } from "vitest";
import { AREA_LABEL_FALLBACK, coarseAreaLabel } from "../src/domain/privacy/area-label";

/**
 * Pre-assignment location privacy (/docs/12-PRIVACY.md). Every assertion
 * here is "the professional must NOT be able to see this yet".
 */

describe("coarse area label", () => {
  it("drops the street and number, keeping neighbourhood and city", () => {
    expect(coarseAreaLabel("הרצל 12, רמת אביב, תל אביב-יפו")).toBe("רמת אביב, תל אביב-יפו");
  });

  it("keeps only the two broadest components", () => {
    expect(coarseAreaLabel("דירה ב, הרצל 12, רמת אביב, תל אביב-יפו, ישראל")).toBe("תל אביב-יפו, ישראל");
  });

  it("returns the city alone when that is all there is", () => {
    expect(coarseAreaLabel("חיפה")).toBe("חיפה");
  });

  it("NEVER emits a digit — no house number, no postcode", () => {
    const inputs = [
      "הרצל 12, תל אביב",
      "12, 4567890",
      "רחוב 60, באר שבע",
      "Apartment 4B, 221B Baker Street, London NW1",
    ];
    for (const input of inputs) {
      expect(coarseAreaLabel(input)).not.toMatch(/\d/);
    }
  });

  it("falls back to a vague label when every component carries a number", () => {
    expect(coarseAreaLabel("12, 4567890")).toBe(AREA_LABEL_FALLBACK);
  });

  it("falls back for missing or empty input rather than throwing", () => {
    expect(coarseAreaLabel(null)).toBe(AREA_LABEL_FALLBACK);
    expect(coarseAreaLabel(undefined)).toBe(AREA_LABEL_FALLBACK);
    expect(coarseAreaLabel("")).toBe(AREA_LABEL_FALLBACK);
    expect(coarseAreaLabel("   ")).toBe(AREA_LABEL_FALLBACK);
    expect(coarseAreaLabel(",,,")).toBe(AREA_LABEL_FALLBACK);
  });

  it("tolerates untidy spacing", () => {
    expect(coarseAreaLabel("  הרצל 12 ,  רמת אביב ,  תל אביב  ")).toBe("רמת אביב, תל אביב");
  });

  it("does not leak an apartment identifier that carries no digit", () => {
    // "דירה ב" has no digit, but it is not a broad component either — it is
    // dropped by the "two broadest" rule, which is what this asserts.
    expect(coarseAreaLabel("דירה ב, הרצל 12, רמת אביב, תל אביב")).toBe("רמת אביב, תל אביב");
  });
});
