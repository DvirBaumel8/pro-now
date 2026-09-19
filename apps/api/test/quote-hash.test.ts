import { describe, it, expect } from "vitest";
import {
  buildQuoteVersion,
  computeLineTotalMinorUnits,
  computeQuoteTotalMinorUnits,
  computeQuoteVersionHash,
  type QuoteLineItemForHash,
} from "../src/domain/pricing/quote-hash";

/**
 * Epic 9 — quote versioning / hash integrity. The customer approves an
 * exact quote version by echoing its hash back; the server refuses a
 * mismatch. That makes these assertions money-integrity assertions.
 */

const jobId = "job_1";

const labour: QuoteLineItemForHash = {
  description: "עבודת חשמלאי",
  quantity: 2,
  unitPriceMinorUnits: 15000, // ₪150.00 per hour
  kind: "LABOR",
};

const materials: QuoteLineItemForHash = {
  description: "חומרים",
  quantity: 1,
  unitPriceMinorUnits: 4550,
  kind: "MATERIALS",
};

describe("quote totals", () => {
  it("multiplies unit price by quantity in whole minor units", () => {
    expect(computeLineTotalMinorUnits(labour)).toBe(30000);
  });

  it("sums line totals", () => {
    expect(computeQuoteTotalMinorUnits([labour, materials])).toBe(34550);
  });

  it("rounds each LINE, so the total always equals the sum of displayed lines", () => {
    // 0.5 h at ₪150.01 -> 7500.5 agorot, which cannot be displayed.
    const half: QuoteLineItemForHash = { description: "חצי שעה", quantity: 0.5, unitPriceMinorUnits: 15001 };
    const lineTotal = computeLineTotalMinorUnits(half);
    expect(Number.isInteger(lineTotal)).toBe(true);
    expect(computeQuoteTotalMinorUnits([half, half])).toBe(lineTotal * 2);
  });

  it("rejects a non-integer unit price — money is integer minor units (/CLAUDE.md §3)", () => {
    expect(() => computeLineTotalMinorUnits({ description: "x", quantity: 1, unitPriceMinorUnits: 10.5 })).toThrow(
      "QUOTE_UNIT_PRICE_NOT_INTEGER"
    );
  });

  it("rejects negative amounts", () => {
    expect(() => computeLineTotalMinorUnits({ description: "x", quantity: -1, unitPriceMinorUnits: 100 })).toThrow(
      "QUOTE_LINE_NEGATIVE"
    );
  });

  it("rejects NaN/Infinity rather than producing a NaN total", () => {
    expect(() =>
      computeLineTotalMinorUnits({ description: "x", quantity: Number.NaN, unitPriceMinorUnits: 100 })
    ).toThrow("QUOTE_LINE_NOT_FINITE");
  });

  it("an empty quote totals zero", () => {
    expect(computeQuoteTotalMinorUnits([])).toBe(0);
  });
});

describe("quote version hash", () => {
  it("is deterministic for identical content", () => {
    const a = buildQuoteVersion(jobId, 1, [labour, materials]);
    const b = buildQuoteVersion(jobId, 1, [labour, materials]);
    expect(a.versionHash).toBe(b.versionHash);
    expect(a.versionHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when a price changes", () => {
    const original = buildQuoteVersion(jobId, 1, [labour]);
    const raised = buildQuoteVersion(jobId, 1, [{ ...labour, unitPriceMinorUnits: 15001 }]);
    expect(raised.versionHash).not.toBe(original.versionHash);
  });

  it("changes when quantity changes", () => {
    const original = buildQuoteVersion(jobId, 1, [labour]);
    const more = buildQuoteVersion(jobId, 1, [{ ...labour, quantity: 3 }]);
    expect(more.versionHash).not.toBe(original.versionHash);
  });

  it("changes between versions of otherwise identical content", () => {
    expect(buildQuoteVersion(jobId, 1, [labour]).versionHash).not.toBe(
      buildQuoteVersion(jobId, 2, [labour]).versionHash
    );
  });

  it("is job-scoped — the same lines on another job hash differently", () => {
    expect(buildQuoteVersion("job_1", 1, [labour]).versionHash).not.toBe(
      buildQuoteVersion("job_2", 1, [labour]).versionHash
    );
  });

  it("changes when a line is added", () => {
    expect(buildQuoteVersion(jobId, 1, [labour]).versionHash).not.toBe(
      buildQuoteVersion(jobId, 1, [labour, materials]).versionHash
    );
  });

  it("defaults a missing kind to OTHER so it hashes like an explicit OTHER", () => {
    const implicit = buildQuoteVersion(jobId, 1, [{ description: "x", quantity: 1, unitPriceMinorUnits: 100 }]);
    const explicit = buildQuoteVersion(jobId, 1, [
      { description: "x", quantity: 1, unitPriceMinorUnits: 100, kind: "OTHER" },
    ]);
    expect(implicit.versionHash).toBe(explicit.versionHash);
  });

  /**
   * REGRESSION — the defect this module was extracted to fix. The route used
   * to hash an unrounded float total while persisting `Math.round(total)`,
   * so the hash could bind a total that was never stored.
   */
  it("REGRESSION: the hashed total is exactly the stored total, even with fractional quantities", () => {
    const lines: QuoteLineItemForHash[] = [{ description: "חצי שעה", quantity: 0.5, unitPriceMinorUnits: 15001 }];
    const { totalMinorUnits, versionHash } = buildQuoteVersion(jobId, 1, lines);

    expect(Number.isInteger(totalMinorUnits)).toBe(true);
    // Recomputing the hash from the STORED total must reproduce it exactly.
    expect(computeQuoteVersionHash({ jobId, version: 1, lineItems: lines, totalMinorUnits })).toBe(versionHash);
  });
});
