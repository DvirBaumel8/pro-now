import { describe, expect, it } from "vitest";
import { catalogHiddenServices, catalogHomeServices } from "@pro-now/ui";
import { CUSTOMER_CATEGORIES } from "@pro-now/types";

import { servicesForCategory } from "./categories";

const SERVICES = [...catalogHomeServices, ...catalogHiddenServices];

describe("servicesForCategory", () => {
  it("gives every home category at least one service to choose", () => {
    for (const category of CUSTOMER_CATEGORIES) {
      expect(servicesForCategory(category, SERVICES).length, category.id).toBeGreaterThan(0);
    }
  });

  it("places every service in some category", () => {
    const placed = new Set(CUSTOMER_CATEGORIES.flatMap((c) => servicesForCategory(c, SERVICES).map((s) => s.id)));
    expect(SERVICES.filter((s) => !placed.has(s.id)).map((s) => s.id)).toEqual([]);
  });
});
