import { formatMoney, money, type PriceQuoteView } from "@pro-now/types";

import { formatMinimumBillable } from "./format";

/**
 * Turns the structured price quote into Hebrew the customer can act on.
 * Kept as a pure function so each pricing model's wording is a testable
 * assertion rather than JSX buried in a branch.
 */
export function priceExplainer(price: PriceQuoteView): { headline: string; detail: string } {
  const m = (v: number | null | undefined) =>
    v === null || v === undefined ? null : formatMoney(money(v, "ILS"));

  switch (price.priceModel) {
    case "FIXED": {
      const total = m(price.fixedTotalMinorUnits);
      return {
        headline: total ?? "—",
        detail: total
          ? "מחיר קבוע לעבודה. לא ייגבה סכום נוסף ללא הצעת מחיר שתאשר."
          : "המחיר טרם הוגדר לשירות זה.",
      };
    }
    case "VISIT_QUOTE": {
      const fee = m(price.visitFeeMinorUnits);
      return {
        headline: fee ?? "—",
        detail: fee
          ? "דמי ביקור ואבחון. עלות התיקון עצמו תישלח כהצעת מחיר לאישורך לפני תחילת העבודה."
          : "דמי הביקור טרם הוגדרו לשירות זה.",
      };
    }
    case "HOURLY": {
      const rate = m(price.hourlyRateMinorUnits);
      const min = formatMinimumBillable(price.minimumBillableMinutes);
      return {
        headline: rate ? `${rate} לשעה` : "—",
        detail: min
          ? `חיוב לפי זמן עבודה בפועל, עם מינימום של ${min}.`
          : "חיוב לפי זמן עבודה בפועל.",
      };
    }
    case "DISTANCE_TIME": {
      const base = m(price.baseMinorUnits);
      const perKm = m(price.perKmMinorUnits);
      const floor = m(price.minimumFareMinorUnits);
      return {
        headline: base ? `${base} + ${perKm ?? "—"} לק״מ` : "—",
        detail: floor ? `מחיר מינימום לנסיעה: ${floor}.` : "המחיר הסופי נקבע לפי המרחק בפועל.",
      };
    }
    default:
      return { headline: "—", detail: "מודל התמחור לשירות זה טרם הוגדר." };
  }
}
