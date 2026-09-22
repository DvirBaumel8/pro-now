/**
 * THE PRICE A PROFESSIONAL SETS FOR THEMSELVES.
 *
 * ---------------------------------------------------------------------
 * THE HOLE THIS CLOSES
 * ---------------------------------------------------------------------
 * `settle()` refuses to charge a job whose professional has no configured
 * price, and it is right to: `ProfessionalService` says plainly that
 * "nulls mean 'not configured', never 'free'".
 *
 * Nothing in the product could set one. `/v1/pro/services` was GET only,
 * `ProPricingBody` — the screen designed for exactly this — was rendered
 * in the prototype and nowhere else, and the only writer of
 * `basePriceMinorUnits` in the whole repository was the development seed.
 *
 * So the payment chain worked end to end for six demonstration
 * professionals and dead-ended for every real one: they would accept a
 * job, drive to it, finish it, and the settlement would answer
 * NO_CONFIGURED_PRICE.
 *
 * ---------------------------------------------------------------------
 * WHAT THE SERVER IS ALLOWED TO HAVE AN OPINION ABOUT
 * ---------------------------------------------------------------------
 * Almost nothing. `/CLAUDE.md §4` puts the pilot price points outside this
 * codebase, and `ProfessionalService` adds the sharper rule: actual prices
 * are "a professional's own commercial decision".
 *
 * So there is no default, no suggested range, no floor or ceiling, and no
 * warning that a number looks low. What is validated is STRUCTURE, not
 * amount:
 *
 *   - which fields mean anything at all, which the SERVICE's price model
 *     decides — an hourly minimum on a fixed-price haircut is not a
 *     cheaper haircut, it is a field nobody will ever read;
 *   - that money is a whole number of agorot and not negative, because
 *     half an agora and minus forty shekels are not prices;
 *   - that a professional cannot price a service they do not offer.
 *
 * Clearing a field back to null is allowed and is not the same as zero.
 * A professional who stops offering a price should not have the platform
 * charging nothing on their behalf.
 */
import type { PriceModel } from "../payments/settlement";

export interface PricingInput {
  basePriceMinorUnits?: number | null;
  minimumBillableMinutes?: number | null;
  perKmMinorUnits?: number | null;
  minimumFareMinorUnits?: number | null;
}

export interface PricingFieldError {
  field: string;
  messageHe: string;
}

export type PricingValidation =
  | { ok: true; value: Required<PricingInput> }
  | { ok: false; errors: PricingFieldError[] };

/**
 * Which fields the SERVICE's price model gives meaning to.
 *
 * Mirrors the table in `ProfessionalService`, which is the only place the
 * meaning of `basePriceMinorUnits` is written down: the whole price for
 * FIXED, the visit fee for VISIT_QUOTE, the rate per hour for HOURLY, the
 * fixed component for DISTANCE_TIME.
 */
const FIELDS_BY_MODEL: Record<PriceModel, readonly (keyof PricingInput)[]> = {
  FIXED: ["basePriceMinorUnits"],
  VISIT_QUOTE: ["basePriceMinorUnits"],
  HOURLY: ["basePriceMinorUnits", "minimumBillableMinutes"],
  DISTANCE_TIME: ["basePriceMinorUnits", "perKmMinorUnits", "minimumFareMinorUnits"],
};

const FIELD_LABELS_HE: Record<keyof PricingInput, string> = {
  basePriceMinorUnits: "המחיר",
  minimumBillableMinutes: "מינימום דקות לחיוב",
  perKmMinorUnits: "תעריף לקילומטר",
  minimumFareMinorUnits: "מחיר מינימום לנסיעה",
};

function checkAmount(
  field: keyof PricingInput,
  value: unknown,
  errors: PricingFieldError[]
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push({ field, messageHe: `${FIELD_LABELS_HE[field]} חייב להיות מספר.` });
    return null;
  }
  if (!Number.isInteger(value)) {
    // Money is integer minor units everywhere in this codebase
    // (/CLAUDE.md §3). Half an agora is not a price, it is a rounding
    // error that would be argued about later.
    errors.push({ field, messageHe: `${FIELD_LABELS_HE[field]} חייב להיות מספר שלם של אגורות.` });
    return null;
  }
  if (value < 0) {
    errors.push({ field, messageHe: `${FIELD_LABELS_HE[field]} לא יכול להיות שלילי.` });
    return null;
  }
  return value;
}

export function validatePricing(priceModel: PriceModel, input: PricingInput): PricingValidation {
  const errors: PricingFieldError[] = [];
  const allowed = FIELDS_BY_MODEL[priceModel];
  if (!allowed) {
    return { ok: false, errors: [{ field: "priceModel", messageHe: "מודל תמחור לא מוכר." }] };
  }

  const out: Required<PricingInput> = {
    basePriceMinorUnits: null,
    minimumBillableMinutes: null,
    perKmMinorUnits: null,
    minimumFareMinorUnits: null,
  };

  for (const field of Object.keys(FIELD_LABELS_HE) as (keyof PricingInput)[]) {
    const provided = input[field];
    if (provided === undefined) continue;

    if (!allowed.includes(field)) {
      /*
       * Refused rather than ignored. Silently dropping a field means a
       * professional types a minimum into an hourly box on a fixed-price
       * service, sees it accepted, and is never charged it — and finds
       * out on the invoice.
       */
      errors.push({
        field,
        messageHe: `${FIELD_LABELS_HE[field]} לא רלוונטי לשירות הזה.`,
      });
      continue;
    }

    out[field] = checkAmount(field, provided, errors);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: out };
}

/**
 * Whether this configuration is enough for a job to be charged.
 *
 * The same question `settle()` asks, answered before the work rather than
 * after it — so the professional's own screen can say "this service
 * cannot be paid for yet" instead of them discovering it at settlement.
 */
export function isChargeable(priceModel: PriceModel, value: PricingInput): boolean {
  if (value.basePriceMinorUnits === null || value.basePriceMinorUnits === undefined) {
    return false;
  }
  if (priceModel === "DISTANCE_TIME") {
    return value.perKmMinorUnits !== null && value.perKmMinorUnits !== undefined;
  }
  return true;
}
