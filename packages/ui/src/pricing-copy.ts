import { formatMoney, money, type PriceQuoteView } from "@pro-now/types";

import { formatMinimumBillable } from "./format";

/**
 * Turns the structured price quote into Hebrew the customer can act on.
 * Kept as a pure function so each pricing model's wording is a testable
 * assertion rather than JSX buried in a branch.
 */
export function priceExplainer(
  price: PriceQuoteView,
  /**
   * `service` is the page before anybody is found. A visit fee is set by
   * each professional (Amit, 2026-09-26), so there it has no one figure —
   * a tester asked, of the number that used to sit there, *"של מי המחיר?
   * לבעלי המקצוע יש מחירים שונים."* It is shown on the person instead.
   */
  opts: { stage?: "service" | "match"; proFirstNameHe?: string | null } = {}
): { headline: string; detail: string } {
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
      if (opts.stage === "service") {
        return {
          headline: "דמי ביקור לפי המקצוען",
          detail:
            "כל מקצוען קובע את דמי הביקור והאבחון שלו — ותראו אותם אצל מי שנמצא, לפני שאתם מאשרים. עלות התיקון עצמו תישלח כהצעת מחיר לאישורכם לפני תחילת העבודה.",
        };
      }
      const fee = m(price.visitFeeMinorUnits);
      const whose = opts.proFirstNameHe ? `דמי הביקור והאבחון של ${opts.proFirstNameHe}.` : "דמי ביקור ואבחון.";
      return {
        headline: fee ?? "—",
        detail: fee
          ? `${whose} עלות התיקון עצמו תישלח כהצעת מחיר לאישורך לפני תחילת העבודה.`
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
