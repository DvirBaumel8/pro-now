import crypto from "node:crypto";

/**
 * Quote totals and version hashing — see /docs/05-DATABASE.md §Quote
 * versioning and /docs/09-PAYMENTS.md.
 *
 * A quote is immutable once sent; an edit creates a new version. The
 * customer approves an exact version by echoing back its hash, and the
 * server refuses the approval if the hash does not match. That makes the
 * hash a money-integrity mechanism, not a cache key — so it is computed
 * here, in one pure function, and tested.
 *
 * Bug this module exists to fix: the hash used to be computed over an
 * UNROUNDED float total while the row stored `Math.round(total)`. The two
 * numbers could differ, so the hash bound a total that was never stored —
 * exactly the drift the hash is supposed to make impossible. Rounding now
 * happens once, before both hashing and persistence.
 */

export interface QuoteLineItemForHash {
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
  kind?: string;
}

/**
 * Rounding policy: each line is rounded to whole minor units FIRST, then
 * summed. A line is shown to the customer as its own currency amount, so a
 * line total must itself be representable — there is no half-agora. Summing
 * floats and rounding once at the end would produce a total that does not
 * equal the sum of the displayed lines.
 *
 * Half-up rounding via `Math.round` is used deliberately and applies to the
 * line, not the total. If finance later requires bankers' rounding or
 * per-currency minor-unit exponents, that is a business decision
 * (/CLAUDE.md §4) and belongs in `/docs/09-PAYMENTS.md`, not a silent change
 * here.
 */
export function computeLineTotalMinorUnits(lineItem: QuoteLineItemForHash): number {
  if (!Number.isFinite(lineItem.quantity) || !Number.isFinite(lineItem.unitPriceMinorUnits)) {
    throw new Error("QUOTE_LINE_NOT_FINITE");
  }
  if (!Number.isInteger(lineItem.unitPriceMinorUnits)) {
    // Money is integer minor units everywhere (/CLAUDE.md §3).
    throw new Error("QUOTE_UNIT_PRICE_NOT_INTEGER");
  }
  if (lineItem.quantity < 0 || lineItem.unitPriceMinorUnits < 0) {
    throw new Error("QUOTE_LINE_NEGATIVE");
  }
  return Math.round(lineItem.unitPriceMinorUnits * lineItem.quantity);
}

export function computeQuoteTotalMinorUnits(lineItems: QuoteLineItemForHash[]): number {
  return lineItems.reduce((sum, li) => sum + computeLineTotalMinorUnits(li), 0);
}

export interface QuoteHashInput {
  jobId: string;
  version: number;
  lineItems: QuoteLineItemForHash[];
  totalMinorUnits: number;
}

/**
 * The hash covers the job, the version, every line item's economically
 * meaningful fields, and the stored total. It deliberately does NOT cover
 * `description` ordering artefacts or any server-generated id, so that the
 * same quote content always hashes identically.
 */
export function computeQuoteVersionHash(input: QuoteHashInput): string {
  const canonical = {
    jobId: input.jobId,
    version: input.version,
    totalMinorUnits: input.totalMinorUnits,
    lineItems: input.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPriceMinorUnits: li.unitPriceMinorUnits,
      kind: li.kind ?? "OTHER",
    })),
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Builds the total and the hash together so they can never disagree. */
export function buildQuoteVersion(jobId: string, version: number, lineItems: QuoteLineItemForHash[]) {
  const totalMinorUnits = computeQuoteTotalMinorUnits(lineItems);
  const versionHash = computeQuoteVersionHash({ jobId, version, lineItems, totalMinorUnits });
  return { totalMinorUnits, versionHash };
}
