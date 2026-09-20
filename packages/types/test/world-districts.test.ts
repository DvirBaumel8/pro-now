import { describe, expect, it } from "vitest";
import {
  districtFor,
  districtSign,
  missingDistrictAssets,
  requiredDistrictAssets,
  WORLD_DISTRICTS,
  type DepartmentCode,
} from "../src/world-districts";

describe("every trade has a district, not just hair", () => {
  it("covers all eleven departments in the catalogue", () => {
    expect(Object.keys(WORLD_DISTRICTS)).toHaveLength(11);
  });

  it("gives each department its own venue and character art", () => {
    const ids = requiredDistrictAssets();
    // No id asked for twice: a trade's own front usually appears in its
    // variant list as well, and a commission that repeats itself is a
    // commission nobody checks.
    expect(new Set(ids).size).toBe(ids.length);
    // Eleven trades x (venue + world character + portrait), plus the extra
    // shopfronts that let one trade look like several businesses.
    const variants = Object.values(WORLD_DISTRICTS).flatMap((d) =>
      (d.venueVariantAssetIds ?? []).filter((v) => v !== d.venueAssetId)
    );
    expect(ids).toHaveLength(11 * 3 + new Set(variants).size);
  });

  it("keys every entry to itself, so a copy-paste cannot cross two trades", () => {
    for (const [code, d] of Object.entries(WORLD_DISTRICTS)) {
      expect(d.department).toBe(code as DepartmentCode);
    }
  });

  it("keeps the wordmark in English and the trade in Hebrew", () => {
    // Only the logo is English. A street of signs reading HOME, APPLIANCE
    // and BUILD is legible to a designer and not to the customer.
    expect(districtSign(WORLD_DISTRICTS.BEAUTY)).toBe("PRO NOW שיער");
    expect(districtSign(WORLD_DISTRICTS.VEHICLE)).toBe("PRO NOW רכב");
  });

  it("writes every trade in Hebrew", () => {
    for (const d of Object.values(WORLD_DISTRICTS)) {
      expect(d.brandHe).toMatch(/[\u0590-\u05FF]/);
      expect(d.brandHe).not.toMatch(/[A-Za-z]/);
    }
  });

  it("names characters by trade and never by gender", () => {
    // Gender is not tied to trade. A file name that said so would make the
    // roster impossible to vary later without renaming the world.
    for (const id of requiredDistrictAssets()) {
      expect(id).not.toMatch(/_m\d|_f\d|male|female|man|woman/i);
    }
  });

  it("still gives a world to a department it has never heard of", () => {
    expect(districtFor("NOT_A_DEPARTMENT").department).toBe("HOME_URGENT");
  });

  it("reports honestly on what art is still missing", () => {
    expect(missingDistrictAssets([])).toHaveLength(requiredDistrictAssets().length);
    const all = requiredDistrictAssets();
    expect(missingDistrictAssets(all)).toEqual([]);
    expect(missingDistrictAssets([WORLD_DISTRICTS.BEAUTY.venueAssetId])).toHaveLength(
      requiredDistrictAssets().length - 1
    );
  });
});
