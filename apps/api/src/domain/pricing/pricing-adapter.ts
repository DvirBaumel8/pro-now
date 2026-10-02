import { money, type Money } from "@pro-now/types";

/**
 * One PricingAdapter per price-model archetype, all feeding the same Job
 * entity — see /docs/09-PAYMENTS.md §Pricing archetypes and
 * /docs/_source/01-master-product-bible.md §27.7.
 */
export interface PricePreview {
  headlineAmount: Money;
  headlineLabel: string; // e.g. "דמי ביקור" vs "מחיר קבוע"
  requiresQuoteForAdditionalWork: boolean;
}

export interface PricingAdapter {
  readonly priceModel: "FIXED" | "HOURLY" | "VISIT_QUOTE" | "DISTANCE_TIME";
  preview(input: Record<string, unknown>): PricePreview;
}

export class FixedPricingAdapter implements PricingAdapter {
  readonly priceModel = "FIXED" as const;
  constructor(private readonly basePriceMinorUnits: number) {}
  preview(): PricePreview {
    return {
      headlineAmount: money(this.basePriceMinorUnits),
      headlineLabel: "מחיר קבוע",
      requiresQuoteForAdditionalWork: false,
    };
  }
}

export class VisitQuotePricingAdapter implements PricingAdapter {
  readonly priceModel = "VISIT_QUOTE" as const;
  constructor(private readonly visitFeeMinorUnits: number) {}
  preview(): PricePreview {
    return {
      headlineAmount: money(this.visitFeeMinorUnits),
      headlineLabel: "דמי ביקור",
      requiresQuoteForAdditionalWork: true,
    };
  }
}

export class HourlyPricingAdapter implements PricingAdapter {
  readonly priceModel = "HOURLY" as const;
  constructor(private readonly ratePerHourMinorUnits: number, private readonly minimumHours: number) {}
  preview(): PricePreview {
    const minimum = Math.round(this.ratePerHourMinorUnits * this.minimumHours);
    return {
      headlineAmount: money(minimum),
      headlineLabel: `מינימום ${this.minimumHours} שעות`,
      requiresQuoteForAdditionalWork: false,
    };
  }
}

export class DistanceTimePricingAdapter implements PricingAdapter {
  readonly priceModel = "DISTANCE_TIME" as const;
  constructor(
    private readonly baseFeeMinorUnits: number,
    private readonly perKmMinorUnits: number
  ) {}
  preview(input: { distanceKm?: number }): PricePreview {
    const distanceKm = input.distanceKm ?? 0;
    const amount = Math.round(this.baseFeeMinorUnits + distanceKm * this.perKmMinorUnits);
    return {
      headlineAmount: money(amount),
      headlineLabel: "מחיר משוער למרחק",
      requiresQuoteForAdditionalWork: false,
    };
  }
}
