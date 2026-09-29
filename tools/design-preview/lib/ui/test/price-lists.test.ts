import { describe, expect, it } from "vitest";
import { allServices, pilotCatalog } from "@pro-now/demo-types";
import { lowestListed, previewPriceLists, priceListFor, priceListLineHe } from "../src/catalog/priceLists";

describe("two kinds of work, each priced one way (Amit, 2026-09-29)", () => {
  const services = allServices(pilotCatalog);

  it("every price-list service has a list, and no visit-and-diagnosis service has one", () => {
    for (const s of services) {
      const has = Boolean(previewPriceLists[s.id]?.length);
      expect(has, `${s.id} (${s.pricingModel})`).toBe(s.pricingModel === "FIXED");
    }
  });

  it("the trades whose price nobody knows until they look are visit-and-diagnosis", () => {
    const byId = Object.fromEntries(services.map((s) => [s.id, s.pricingModel]));
    for (const id of ["svc-blockage", "svc-leak", "svc-tap", "svc-electric", "svc-socket", "svc-ac", "svc-jump-start", "svc-phone-fix", "svc-handyman"]) {
      expect(byId[id], id).toBe("VISIT_QUOTE");
    }
    for (const id of ["svc-haircut", "svc-dog-walk", "svc-pet-groom", "svc-clean", "svc-flat-tyre", "svc-lock"]) {
      expect(byId[id], id).toBe("FIXED");
    }
  });

  it("a professional's own base price scales his whole list", () => {
    const example = priceListFor("svc-haircut");
    const mine = priceListFor("svc-haircut", example[0]!.amountMinorUnits * 2);
    expect(mine[1]!.amountMinorUnits).toBe(example[1]!.amountMinorUnits * 2);
  });

  it("starts from the cheapest line and reads as a short line", () => {
    expect(lowestListed("svc-haircut")).toBe(4000);
    expect(lowestListed("svc-leak")).toBeNull();
    expect(priceListLineHe(priceListFor("svc-haircut"))).toMatch(/^תספורת גבר ₪90 · /);
  });
});
