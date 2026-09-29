import { describe, expect, it } from "vitest";

import { CUSTOMER_CATEGORIES, allServices, pilotCatalog } from "@pro-now/demo-types";

import { catalogCategoryServices, categoryServiceViolations } from "../src/catalog/catalogAdapter";

/**
 * The category screen used to hold seven hand-written Hebrew strings and
 * send every one of them to the same hard-coded plumbing service. These
 * tests exist so that cannot come back quietly.
 */
describe("catalogCategoryServices", () => {
  it("gives every front door something behind it", () => {
    expect(categoryServiceViolations()).toEqual([]);
  });

  it("offers a different list per category", () => {
    // The old screen's actual behaviour: tap "חיות", get plumbing. This
    // is the assertion that would have caught it.
    const pets = catalogCategoryServices["pets"].map((s) => s.id);
    const vehicle = catalogCategoryServices["vehicle"].map((s) => s.id);
    expect(pets.length).toBeGreaterThan(0);
    expect(vehicle.length).toBeGreaterThan(0);
    expect(pets).not.toEqual(vehicle);
    for (const id of pets) expect(vehicle).not.toContain(id);
  });

  it("invents nothing — every row is a real catalogue service", () => {
    const real = new Set(allServices(pilotCatalog).map((s) => s.id));
    for (const c of CUSTOMER_CATEGORIES) {
      for (const row of catalogCategoryServices[c.id]) {
        expect(real.has(row.id)).toBe(true);
      }
    }
  });

  it("puts no service behind two doors", () => {
    /*
     * Two ways to the same service means two prices, two descriptions and
     * two places to forget to update. `customerCategoryViolations` already
     * forbids a shared department; this proves it at the service level,
     * which is what the customer actually taps.
     */
    const seen = new Map<string, string>();
    for (const c of CUSTOMER_CATEGORIES) {
      for (const row of catalogCategoryServices[c.id]) {
        const first = seen.get(row.id);
        expect(first, `${row.id} is reachable from both ${first} and ${c.id}`).toBeUndefined();
        seen.set(row.id, c.id);
      }
    }
  });

  it("reaches every service in the catalogue", () => {
    // The mirror of the violation check: not just "no empty doors" but
    // "nothing left outside". A service nobody can reach does not exist.
    const reachable = new Set(
      CUSTOMER_CATEGORIES.flatMap((c) => catalogCategoryServices[c.id].map((s) => s.id))
    );
    for (const s of allServices(pilotCatalog)) {
      expect(reachable.has(s.id), `${s.id} cannot be reached from any category`).toBe(true);
    }
  });

  it("claims no availability of its own", () => {
    // A number here may come only from a live snapshot — /CLAUDE.md §3.
    for (const c of CUSTOMER_CATEGORIES) {
      for (const row of catalogCategoryServices[c.id]) {
        expect(row.availableNowCount).toBeNull();
      }
    }
  });
});
