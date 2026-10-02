import { describe, expect, it } from "vitest";
import {
  MIN_SAMPLE,
  percentile,
  priceContextFor,
  shouldPromptAboutPrice,
} from "../src/domain/pricing/price-context.js";

/** A sample of `n` values from ₪100 upwards, in whole shekels. */
const run = (n: number, from = 100, step = 10) =>
  Array.from({ length: n }, (_, i) => (from + i * step) * 100);

describe("what a quote is compared against — /CLAUDE.md §3", () => {
  it("says nothing at all until there are enough real jobs", () => {
    /*
     * The state the product is in on its first day, and for a while
     * after. A confident "below market" drawn from four jobs is a made-up
     * number attached to somebody's real bill.
     */
    for (const n of [0, 1, 4, MIN_SAMPLE - 1]) {
      const c = priceContextFor({ amountMinorUnits: 18000, paid: run(n) });
      expect(c.available, `n=${n}`).toBe(false);
      if (!c.available) {
        expect(c.sampleSize).toBe(n);
        expect(c.needed).toBe(MIN_SAMPLE);
      }
    }
  });

  it("speaks once it has enough, and always says how many", () => {
    // A range with no sample size is a claim pretending to be data.
    const c = priceContextFor({ amountMinorUnits: 18000, paid: run(MIN_SAMPLE) });
    expect(c.available).toBe(true);
    if (c.available) expect(c.sampleSize).toBe(MIN_SAMPLE);
  });

  it("is not dragged about by one emergency at 3am", () => {
    /*
     * The reason this reports quartiles rather than a mean. One burst
     * pipe at ₪2,400 among ordinary ₪100–₪300 jobs must not make every
     * ordinary job read as a bargain.
     */
    const ordinary = run(12, 100, 20);
    const withOutlier = [...ordinary, 240000];
    const a = priceContextFor({ amountMinorUnits: 30000, paid: ordinary });
    const b = priceContextFor({ amountMinorUnits: 30000, paid: withOutlier });
    expect(a.available && b.available).toBe(true);
    if (a.available && b.available) {
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      // The mean moves by more than a third; the median barely stirs.
      expect(mean(withOutlier) / mean(ordinary)).toBeGreaterThan(1.3);
      expect(Math.abs(b.typicalMinorUnits - a.typicalMinorUnits) / a.typicalMinorUnits).toBeLessThan(0.15);
      expect(b.band).toBe(a.band);
    }
  });

  it("places a quote below, within and above the middle half", () => {
    const paid = run(20, 100, 10); // ₪100 … ₪290
    const at = (shekels: number) =>
      priceContextFor({ amountMinorUnits: shekels * 100, paid });
    const within = at(195);
    expect(within.available && within.band).toBe("WITHIN");
    const below = at(110);
    expect(below.available && below.band).toBe("BELOW");
    const above = at(280);
    expect(above.available && above.band).toBe("ABOVE");
  });

  it("reads an exact boundary as the gentler answer", () => {
    /*
     * A quote sitting precisely on the 25th percentile is "within", not
     * "below" — and on the 75th it is "within", not "above". The thing
     * being labelled is a real person's bill and a real professional's
     * work, so an edge is not resolved against either of them.
     */
    const paid = run(20, 100, 10);
    const c = priceContextFor({ amountMinorUnits: 0, paid });
    if (!c.available) throw new Error("expected a sample");
    const onLow = priceContextFor({ amountMinorUnits: c.lowMinorUnits, paid });
    const onHigh = priceContextFor({ amountMinorUnits: c.highMinorUnits, paid });
    expect(onLow.available && onLow.band).toBe("WITHIN");
    expect(onHigh.available && onHigh.band).toBe("WITHIN");
  });

  it("keeps low ≤ typical ≤ high, whatever the sample", () => {
    for (const paid of [run(9), run(30, 50, 3), run(11, 1000, 250), [...run(8), 1, 999999]]) {
      const c = priceContextFor({ amountMinorUnits: 1, paid });
      if (!c.available) continue;
      expect(c.lowMinorUnits).toBeLessThanOrEqual(c.typicalMinorUnits);
      expect(c.typicalMinorUnits).toBeLessThanOrEqual(c.highMinorUnits);
    }
  });

  it("ignores a negative or non-finite total rather than reporting it", () => {
    // Money is never negative here; a bad row should shrink the sample,
    // not poison the range.
    const paid = [...run(MIN_SAMPLE), -500, Number.NaN, Number.POSITIVE_INFINITY];
    const c = priceContextFor({ amountMinorUnits: 18000, paid });
    expect(c.available).toBe(true);
    if (c.available) expect(c.sampleSize).toBe(MIN_SAMPLE);
  });

  it("survives every job having cost exactly the same", () => {
    // A real possibility for a fixed-price service, and the case where
    // quartiles collapse onto one number.
    const paid = Array.from({ length: 10 }, () => 18000);
    const c = priceContextFor({ amountMinorUnits: 18000, paid });
    expect(c.available).toBe(true);
    if (c.available) {
      expect(c.lowMinorUnits).toBe(18000);
      expect(c.highMinorUnits).toBe(18000);
      expect(c.band).toBe("WITHIN");
    }
  });
});

describe("percentile", () => {
  it("interpolates rather than jumping to the nearest rank", () => {
    // A boundary that jumped by ₪40 when one job landed would put the
    // same quote on either side of "usual" from one minute to the next.
    expect(percentile([0, 100], 0.5)).toBe(50);
    expect(percentile([0, 100, 200, 300], 0.25)).toBe(75);
  });

  it("answers a single-value sample with that value", () => {
    expect(percentile([42], 0.9)).toBe(42);
  });

  it("refuses an empty sample instead of inventing a number", () => {
    expect(() => percentile([], 0.5)).toThrow();
  });
});

describe("what the customer is actually shown — fair, not cheapest", () => {
  /*
   * Amit: *"אני לא מחפש להיות הכי זול, מחפש להיות מהיר, הוגן, חדשני."*
   *
   * The engine measures all three positions because the truth is the
   * truth and ops will want it. Only ONE of them reaches the customer.
   * These tests exist so a later screen cannot quietly widen that.
   */
  const paid = run(20, 100, 10); // ₪100 … ₪290
  const at = (shekels: number) => priceContextFor({ amountMinorUnits: shekels * 100, paid });

  it("prompts on a quote above what the work usually costs", () => {
    const above = at(280);
    expect(above.available && above.band).toBe("ABOVE");
    expect(shouldPromptAboutPrice(above)).toBe(true);
  });

  it("says NOTHING about a cheap quote", () => {
    /*
     * The whole point. "מחיר טוב!" is a price-comparison site talking:
     * it pushes professionals downward, and it encourages choosing
     * plumbing on price, which is the wrong instinct on work that has to
     * be done once and done right.
     */
    const below = at(110);
    expect(below.available && below.band).toBe("BELOW");
    expect(shouldPromptAboutPrice(below)).toBe(false);
  });

  it("says nothing about an ordinary quote either", () => {
    // No tick, no reassurance badge. Silence is the design.
    const within = at(195);
    expect(within.available && within.band).toBe("WITHIN");
    expect(shouldPromptAboutPrice(within)).toBe(false);
  });

  it("says nothing before there are enough real jobs", () => {
    expect(shouldPromptAboutPrice(priceContextFor({ amountMinorUnits: 999999, paid: run(3) }))).toBe(false);
  });
});
