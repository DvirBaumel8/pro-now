import type { PricingModel } from "./catalog";

/**
 * WHAT A PROFESSIONAL SETS, AND WHAT THEY MAY NOT.
 *
 * ---------------------------------------------------------------------
 * THE QUESTION THIS ANSWERS
 * ---------------------------------------------------------------------
 * דורון, to Amit: *"איפה נקבע המחיר?"* Amit's answer is the product rule,
 * and it has three steps:
 *
 *   1. The professional sets their own CALL-OUT PRICE — what it costs for
 *      them to come and look. It belongs to them, not to the platform, and
 *      it is part of their card.
 *   2. After they have seen the fault with their own eyes, they send a
 *      QUOTE for the work.
 *   3. Nothing starts until both sides have approved that quote.
 *
 * The price model existed in the types before this file. What did not exist
 * was the place a professional actually types a number — so the answer to
 * דורון was "it is designed and not built". This is the design, stated
 * where it can be tested.
 *
 * ---------------------------------------------------------------------
 * WHY THE SERVICE DECIDES WHAT THE FORM ASKS
 * ---------------------------------------------------------------------
 * Not every service is priced the same way, and letting a professional set
 * a call-out fee for all of them would produce nonsense: a call-out fee for
 * a haircut, which has no visit and no diagnosis, is a fee for arriving.
 * So each pricing model gets its own question, and a service whose price is
 * the platform's is read-only with a reason. `formFor` is that decision,
 * and it is exhaustive over the union — adding a fifth pricing model will
 * not compile until somebody decides what the professional types for it.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS FILE REFUSES TO KNOW
 * ---------------------------------------------------------------------
 * The commission. /CLAUDE.md §4 lists the commission percentage as a
 * business decision this codebase must not invent, and a pricing screen is
 * exactly where a guess would slip in — "you charge ₪180, you receive
 * ₪153" is a number nobody has decided. So a professional is shown what the
 * CUSTOMER will pay, which is the thing they are setting, and told plainly
 * that the payout terms are not final. That is less satisfying than a net
 * figure and it is the only honest thing available.
 *
 * Nor is there a recommended or average price. An average is a claim about
 * a market that has not opened, and a "recommended" price on an empty
 * marketplace is the platform setting the price while appearing not to.
 */

/** Money, in agorot, because floats and money do not mix. */
export type MinorUnits = number;

/**
 * The bounds on a call-out fee.
 *
 * A floor of zero is allowed and meant: a professional who does not charge
 * for coming is making a real offer, and a marketplace that forbids it is
 * deciding their business for them. The ceiling is a typo guard rather
 * than a policy — ₪2,000 to knock on a door is a missing decimal point far
 * more often than it is an intention.
 */
export const CALL_OUT_FEE_BOUNDS = { minMinorUnits: 0, maxMinorUnits: 200_000 } as const;

/** The bounds on an hourly rate. Same reasoning, different magnitude. */
export const HOURLY_RATE_BOUNDS = { minMinorUnits: 2_000, maxMinorUnits: 100_000 } as const;

/**
 * NIGHT, SHABBAT AND HOLIDAY SURCHARGE — the professional's own.
 *
 * Amit, 2026-09-27: each professional may set one, and the customer sees it
 * inside the price before they order. Locksmiths and plumbers in Israel
 * commonly add 50–100% at night and on Shabbat; the bound is a typo guard.
 */
export const AFTER_HOURS_BOUNDS = { minPercent: 0, maxPercent: 100 } as const;

/**
 * Whether `at` is after hours: 20:00–07:00, and Friday 15:00 to Saturday
 * 20:00. Holidays follow the same rule once a holiday calendar is chosen —
 * until then they are not detected, and nothing claims they are.
 */
export function isAfterHours(at: Date): boolean {
  const h = at.getHours();
  const d = at.getDay(); // 5 = Friday, 6 = Saturday
  if (h >= 20 || h < 7) return true;
  if (d === 5 && h >= 15) return true;
  if (d === 6) return true;
  return false;
}

/** A price with the professional's after-hours surcharge applied, when it applies. */
export function withAfterHours(amountMinorUnits: number, percent: number | null, at: Date): { amountMinorUnits: number; surchargePercent: number } {
  const pct = percent && isAfterHours(at) ? Math.max(AFTER_HOURS_BOUNDS.minPercent, Math.min(AFTER_HOURS_BOUNDS.maxPercent, percent)) : 0;
  return { amountMinorUnits: Math.round(amountMinorUnits * (1 + pct / 100)), surchargePercent: pct };
}

/** One line of a professional's price list: a job they do and what it costs. */
export interface PriceListItem {
  id: string;
  nameHe: string;
  amountMinorUnits: number;
}

/** What the professional is asked for, for one service. */
export type PricingField =
  /** "What does it cost for you to come and look?" */
  | { kind: "CALL_OUT_FEE"; labelHe: string; helpHe: string; bounds: typeof CALL_OUT_FEE_BOUNDS }
  /** "What do you charge per hour?" */
  | { kind: "HOURLY_RATE"; labelHe: string; helpHe: string; bounds: typeof HOURLY_RATE_BOUNDS }
  /** "What do you charge for this job?" */
  | { kind: "FIXED_PRICE"; labelHe: string; helpHe: string; bounds: typeof CALL_OUT_FEE_BOUNDS }
  /** Nothing to set here, and the reason. */
  | { kind: "NOT_SET_HERE"; reasonHe: string };

/**
 * The question this service asks its professionals.
 *
 * The switch is exhaustive on purpose: `PricingModel` is a closed union, so
 * a new model is a compile error here rather than a service that silently
 * shows no field.
 */
export function formFor(model: PricingModel): PricingField {
  switch (model) {
    case "VISIT_QUOTE":
      return {
        kind: "CALL_OUT_FEE",
        labelHe: "מחיר ביקור",
        // Says what the customer sees, because that is what the number is.
        helpHe: "כמה עולה להגיע ולאבחן. הלקוח רואה את הסכום הזה לפני ששולח קריאה.",
        bounds: CALL_OUT_FEE_BOUNDS,
      };
    case "HOURLY":
      return {
        kind: "HOURLY_RATE",
        labelHe: "תעריף לשעה",
        helpHe: "הלקוח רואה את התעריף מראש. הסכום הסופי נקבע לפי הזמן בפועל.",
        bounds: HOURLY_RATE_BOUNDS,
      };
    case "FIXED":
      return {
        kind: "FIXED_PRICE",
        labelHe: "מחיר לעבודה",
        helpHe: "מחיר סגור לשירות הזה. הלקוח יודע כמה ישלם עוד לפני שהמקצוען יוצא.",
        bounds: CALL_OUT_FEE_BOUNDS,
      };
    case "DISTANCE_TIME":
      return {
        kind: "NOT_SET_HERE",
        // A distance-and-time price needs a routing vendor to compute, and
        // the maps vendor is an open §4 decision. Inventing a per-kilometre
        // rate here would be inventing the tariff as well as the vendor.
        reasonHe: "המחיר נקבע לפי מרחק וזמן. התעריף ייקבע כשייבחר ספק המפות.",
      };
  }
}

/** One service's price, as the professional set it. */
export interface ProServicePrice {
  serviceId: string;
  pricingModel: PricingModel;
  /**
   * What they typed, in agorot. NULL means not set yet — which is a real
   * and common state, and is NOT the same as free. A service with no price
   * cannot be dispatched, and the screen says so rather than sending
   * somebody out for an amount nobody agreed.
   */
  amountMinorUnits: MinorUnits | null;
}

/** Why one price is not acceptable. Empty means it is. */
export function priceViolations(price: ProServicePrice): string[] {
  const field = formFor(price.pricingModel);
  const out: string[] = [];

  if (field.kind === "NOT_SET_HERE") {
    if (price.amountMinorUnits !== null) {
      out.push("לשירות הזה לא נקבע מחיר במסך הזה.");
    }
    return out;
  }

  if (price.amountMinorUnits === null) return out;

  if (!Number.isInteger(price.amountMinorUnits)) {
    out.push("סכום חייב להיות במספר שלם של אגורות.");
  }
  if (price.amountMinorUnits < field.bounds.minMinorUnits) {
    out.push(`הסכום נמוך מהמינימום (${field.bounds.minMinorUnits / 100} ₪).`);
  }
  if (price.amountMinorUnits > field.bounds.maxMinorUnits) {
    // Worded as a question rather than as a rule, because it usually is one.
    out.push(`הסכום גבוה מהצפוי (${field.bounds.maxMinorUnits / 100} ₪). בדקו שלא חסרה נקודה עשרונית.`);
  }
  return out;
}

/**
 * Can this professional be dispatched for this service?
 *
 * Price is one gate among several — eligibility and credentials are the
 * others and live elsewhere. What this adds is the rule that follows from
 * Amit's answer: a customer must know what the visit costs BEFORE they send
 * the call, so a service with no price set cannot take one.
 */
export function pricedForDispatch(price: ProServicePrice): boolean {
  if (priceViolations(price).length > 0) return false;
  const field = formFor(price.pricingModel);
  if (field.kind === "NOT_SET_HERE") return false;
  return price.amountMinorUnits !== null;
}

/**
 * What the CUSTOMER is told this costs, in one line, before they commit.
 *
 * Returns null when there is nothing honest to say, and null renders as
 * silence rather than as "₪0" or "מחיר לא ידוע" — a price of zero and an
 * unknown price are different claims and neither is true here.
 */
export function customerPriceLineHe(price: ProServicePrice): string | null {
  if (!pricedForDispatch(price)) return null;
  const shekels = (price.amountMinorUnits! / 100).toLocaleString("he-IL");
  switch (formFor(price.pricingModel).kind) {
    case "CALL_OUT_FEE":
      // The second half is the part that keeps this honest: the visit fee
      // is knowable now, the job total is not, and saying only the first
      // number would read as the price of the repair.
      return `מחיר ביקור ואבחון ₪${shekels} · את התיקון סוגרים ישירות מול המקצוען`;
    case "HOURLY_RATE":
      return `₪${shekels} לשעה`;
    case "FIXED_PRICE":
      return `₪${shekels} לעבודה`;
    case "NOT_SET_HERE":
      return null;
  }
}

/**
 * What the PROFESSIONAL is told about their own take, and why it is short.
 *
 * `commissionPercent` is the platform's cut and is an open §4 decision. It
 * is a parameter rather than a constant so that the day it is decided this
 * function starts returning a net figure and nothing else changes — and so
 * that nobody can reach for a default, because there is none.
 */
export function payoutNoteHe(
  price: ProServicePrice,
  commissionPercent: number | null
): { grossHe: string; netHe: string | null; noteHe: string } | null {
  if (!pricedForDispatch(price)) return null;
  const gross = price.amountMinorUnits!;
  const grossHe = `₪${(gross / 100).toLocaleString("he-IL")}`;
  if (commissionPercent === null) {
    return {
      grossHe,
      netHe: null,
      noteHe: "זה מה שהלקוח משלם.",
    };
  }
  const net = Math.round(gross * (1 - commissionPercent / 100));
  return {
    grossHe,
    netHe: `₪${(net / 100).toLocaleString("he-IL")}`,
    noteHe: `אחרי עמלת פלטפורמה של ${commissionPercent}%.`,
  };
}

/** The rules that must hold, as a test rather than as prose. */
export function proPricingViolations(): string[] {
  const out: string[] = [];

  // A call-out fee with no quote line is the fault this whole model exists
  // to prevent: a number that reads as the price of the repair.
  const visit = customerPriceLineHe({
    serviceId: "x",
    pricingModel: "VISIT_QUOTE",
    amountMinorUnits: 17_900,
  });
  if (!visit || !visit.includes("ישירות")) {
    out.push("a call-out fee must say the repair is settled directly with the professional");
  }

  // Nothing may invent a payout. With no commission decided, there is no
  // net figure — see /CLAUDE.md §4.
  const pay = payoutNoteHe({ serviceId: "x", pricingModel: "FIXED", amountMinorUnits: 12_000 }, null);
  if (pay?.netHe !== null) out.push("a net payout must not be computed without a commission");

  // An unpriced service must not be dispatchable.
  if (pricedForDispatch({ serviceId: "x", pricingModel: "FIXED", amountMinorUnits: null })) {
    out.push("a service with no price must not be dispatchable");
  }

  return out;
}
