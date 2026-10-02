/**
 * WHAT THE CUSTOMER OWES WHEN THE WORK IS DONE.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS NOT THE PRICING ADAPTERS
 * ---------------------------------------------------------------------
 * `pricing-adapter.ts` answers a question asked BEFORE the job: what
 * headline does the customer see when deciding. Its output is a preview —
 * "דמי ביקור", "מינימום שעתיים" — and a preview is deliberately not a
 * bill. Nothing in this codebase has ever computed the bill.
 *
 * That is why the journey stopped at COMPLETION_PENDING: the professional
 * could finish, and there was no answer to "how much".
 *
 * ---------------------------------------------------------------------
 * WHAT IT REFUSES TO DO
 * ---------------------------------------------------------------------
 * Every branch here either returns an amount or returns the reason it
 * cannot. There is no fallback amount, because a wrong number in this file
 * is money taken from somebody. A DISTANCE_TIME job whose distance was
 * never recorded does not settle at the base fee "for now"; it refuses,
 * and the refusal is visible in the job's events.
 *
 * ---------------------------------------------------------------------
 * THE ONE READING THAT IS A JUDGEMENT
 * ---------------------------------------------------------------------
 * For VISIT_QUOTE, an approved quote's total REPLACES the visit fee
 * rather than adding to it.
 *
 * `/docs/02-UX-FLOWS.md` C12 shows the customer a quote with its own
 * total and asks them to approve it; what a person approves is what they
 * expect to pay, and presenting a total and then charging that total plus
 * a fee from earlier would make the approval screen a lie. `pro-jobs.ts`
 * already reads it this way when it tells the professional what they will
 * earn, so the two agree.
 *
 * If the intent is the other one — visit fee always payable, quote on top
 * — it is one line here and one line there, and it is a business decision
 * rather than a bug. Recorded in `/docs/18-ROADMAP.md`.
 */
import type { Money } from "@pro-now/types";
import { money } from "@pro-now/types";

export type PriceModel = "FIXED" | "HOURLY" | "VISIT_QUOTE" | "DISTANCE_TIME";

export interface SettlementInput {
  priceModel: PriceModel;
  /**
   * The professional's own configured price for this service, in minor
   * units. What it MEANS depends on the price model — see
   * `ProfessionalService`. Null when they never configured one, which is
   * not the same as zero.
   */
  basePriceMinorUnits: number | null;
  minimumBillableMinutes: number | null;
  perKmMinorUnits: number | null;
  minimumFareMinorUnits: number | null;
  /** The total of the quote the customer approved, when there is one. */
  approvedQuoteTotalMinorUnits: number | null;
  /** Server-measured, from SERVICE_STARTED to completion. Null if unmeasured. */
  workedMinutes: number | null;
  /** Server-measured trip distance for a courier job. Null if unrecorded. */
  distanceKm: number | null;
}

export type SettlementReason =
  | "NO_CONFIGURED_PRICE"
  | "NO_APPROVED_QUOTE_AND_NO_VISIT_FEE"
  | "WORK_DURATION_NOT_MEASURED"
  | "DISTANCE_NOT_RECORDED"
  | "UNKNOWN_PRICE_MODEL";

export type Settlement =
  | { ok: true; amount: Money; basis: string }
  | { ok: false; reason: SettlementReason };

/** Minutes to billable hours, rounded UP to the minute the rate is quoted in. */
function billableMinutes(worked: number, minimum: number | null): number {
  return Math.max(worked, minimum ?? 0);
}

export function settle(input: SettlementInput): Settlement {
  switch (input.priceModel) {
    case "FIXED": {
      if (input.basePriceMinorUnits === null) return { ok: false, reason: "NO_CONFIGURED_PRICE" };
      return { ok: true, amount: money(input.basePriceMinorUnits), basis: "FIXED_PRICE" };
    }

    case "VISIT_QUOTE": {
      if (input.approvedQuoteTotalMinorUnits !== null) {
        return {
          ok: true,
          amount: money(input.approvedQuoteTotalMinorUnits),
          basis: "APPROVED_QUOTE",
        };
      }
      // No quote was approved: the customer owes the visit, and only the
      // visit. This is the diagnosis-only outcome, and it is a real one —
      // a professional who comes, looks and is declined is still owed the
      // journey.
      if (input.basePriceMinorUnits === null) {
        return { ok: false, reason: "NO_APPROVED_QUOTE_AND_NO_VISIT_FEE" };
      }
      return { ok: true, amount: money(input.basePriceMinorUnits), basis: "VISIT_FEE_ONLY" };
    }

    case "HOURLY": {
      if (input.basePriceMinorUnits === null) return { ok: false, reason: "NO_CONFIGURED_PRICE" };
      if (input.workedMinutes === null) return { ok: false, reason: "WORK_DURATION_NOT_MEASURED" };
      const minutes = billableMinutes(input.workedMinutes, input.minimumBillableMinutes);
      // The rate is per hour; the charge is per minute of it, rounded to
      // the agora. Rounding to whole hours would overcharge by up to an
      // hour on every job, which is the sort of error that never gets
      // reported and always gets noticed.
      const amount = Math.round((input.basePriceMinorUnits * minutes) / 60);
      return { ok: true, amount: money(amount), basis: "HOURLY_RATE" };
    }

    case "DISTANCE_TIME": {
      if (input.basePriceMinorUnits === null || input.perKmMinorUnits === null) {
        return { ok: false, reason: "NO_CONFIGURED_PRICE" };
      }
      if (input.distanceKm === null) return { ok: false, reason: "DISTANCE_NOT_RECORDED" };
      const computed = Math.round(
        input.basePriceMinorUnits + input.distanceKm * input.perKmMinorUnits
      );
      const amount = Math.max(computed, input.minimumFareMinorUnits ?? 0);
      return { ok: true, amount: money(amount), basis: "DISTANCE_AND_TIME" };
    }

    default:
      return { ok: false, reason: "UNKNOWN_PRICE_MODEL" };
  }
}

// ---------------------------------------------------------------------
// The split
// ---------------------------------------------------------------------

export interface CommissionSplit {
  customerChargeMinorUnits: number;
  platformFeeMinorUnits: number;
  professionalPayableMinorUnits: number;
}

/**
 * Split a charge between the platform and the professional.
 *
 * `commissionPercent` comes from `app_config` and has NO default. The
 * commission percentage is named in `/CLAUDE.md §4` as a decision this
 * codebase must not invent, and the professional's earnings screen has
 * already had one hard-written into it once — "עמלת פלטפורמה −₪420", a
 * flat 20% to everybody, announcing a rate nobody had set.
 *
 * So when it is unset this returns null and the caller writes only the
 * CUSTOMER_CHARGE row. The professional's earnings then show nothing
 * payable, which is true: what they are owed depends on a number the
 * business has not chosen.
 *
 * The fee is rounded DOWN, so rounding never takes an extra agora from
 * the professional, and the payable is the remainder rather than a second
 * percentage — the two always sum to the charge exactly.
 */
export function splitCommission(
  chargeMinorUnits: number,
  commissionPercent: number | null
): CommissionSplit | null {
  if (commissionPercent === null) return null;
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    return null;
  }
  const platformFeeMinorUnits = Math.floor((chargeMinorUnits * commissionPercent) / 100);
  return {
    customerChargeMinorUnits: chargeMinorUnits,
    platformFeeMinorUnits,
    professionalPayableMinorUnits: chargeMinorUnits - platformFeeMinorUnits,
  };
}
