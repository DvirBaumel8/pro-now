import { describe, it, expect } from "vitest";
import {
  FixedPricingAdapter,
  VisitQuotePricingAdapter,
  HourlyPricingAdapter,
  DistanceTimePricingAdapter,
} from "../src/domain/pricing/pricing-adapter";

describe("pricing adapters — /docs/09-PAYMENTS.md §Pricing archetypes", () => {
  it("FIXED shows the exact price with no additional-work flag", () => {
    const preview = new FixedPricingAdapter(17900).preview({});
    expect(preview.headlineAmount.minorUnits).toBe(17900);
    expect(preview.requiresQuoteForAdditionalWork).toBe(false);
  });

  it("VISIT_QUOTE flags that additional work needs a customer-approved quote", () => {
    const preview = new VisitQuotePricingAdapter(17900).preview({});
    expect(preview.headlineAmount.minorUnits).toBe(17900);
    expect(preview.requiresQuoteForAdditionalWork).toBe(true);
    expect(preview.headlineLabel).toBe("דמי ביקור");
  });

  it("HOURLY computes the minimum-duration floor, never a per-second guess", () => {
    const preview = new HourlyPricingAdapter(8000, 2).preview({});
    expect(preview.headlineAmount.minorUnits).toBe(16000);
  });

  it("DISTANCE_TIME combines a base fee with a per-km rate", () => {
    const preview = new DistanceTimePricingAdapter(1000, 200).preview({ distanceKm: 5 });
    expect(preview.headlineAmount.minorUnits).toBe(2000);
  });
});
