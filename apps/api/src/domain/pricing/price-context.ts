/**
 * IS THIS QUOTE EXPENSIVE? — ANSWERED FROM WHAT WE ACTUALLY KNOW.
 *
 * ---------------------------------------------------------------------
 * WHAT WAS ASKED FOR
 * ---------------------------------------------------------------------
 * Amit: *"אחרי שמקבלים הצעת מחיר, צריך שיהיה מחיר בהשוואה לשוק לראות אם
 * יקר או לא יקר. המטרה שלנו לתת מחיר נח לכל כיס עם מקצוענים מקסימום."*
 *
 * A customer holding a quote for ₪450 has no idea whether that is the
 * going rate or double it, and the one thing a marketplace can give them
 * that a phone book cannot is that context.
 *
 * ---------------------------------------------------------------------
 * THE LINE THIS MUST NOT CROSS
 * ---------------------------------------------------------------------
 * /CLAUDE.md §3: never fabricate. A "market average" that is not measured
 * from real transactions is a made-up number attached to somebody's real
 * bill, and in Israel telling a consumer a price is below market without
 * a basis is not only dishonest, it is a legal exposure. There is no
 * default here, no seeded "typical price per trade", and no blend with an
 * outside source — /docs/10 forbids scraping, and no price feed has been
 * licensed (/CLAUDE.md §4).
 *
 * So the source is PRO NOW's own approved quotes, and nothing else. Until
 * enough of those exist this returns `available: false` and the screen
 * says nothing at all. A silent screen is the correct behaviour of a
 * marketplace on its first day; a confident range built from four jobs is
 * not.
 *
 * ---------------------------------------------------------------------
 * WHY APPROVED QUOTES AND NOT CONFIGURED PRICES
 * ---------------------------------------------------------------------
 * It is tempting to widen the sample with what professionals have PUT in
 * their price list, and for a VISIT_QUOTE service it would be wrong in a
 * way that is hard to see: `basePriceMinorUnits` there is the VISIT FEE,
 * and the quote is the visit plus the work. Comparing the two would
 * reliably make every quote look expensive. An asking price is also not a
 * transaction — nobody has agreed to it.
 *
 * A comparison is only ever drawn between quotes for the SAME service,
 * for the same reason: "plumbing" is not a price.
 *
 * ---------------------------------------------------------------------
 * WHY QUARTILES AND NOT AN AVERAGE
 * ---------------------------------------------------------------------
 * One burst pipe at 3am at ₪2,400 drags a mean far enough to make every
 * ordinary job look cheap, and a min-to-max range is that same outlier
 * shown directly. The middle half of what people actually paid is robust
 * to one strange job and is the honest shape of "what this usually costs".
 */

import type { PrismaClient } from "@prisma/client";

/**
 * ---------------------------------------------------------------------
 * WHAT THIS IS FOR, AFTER THE SECOND ROUND
 * ---------------------------------------------------------------------
 * The first version answered "is this cheap or expensive". Amit:
 *
 *   "אם זה עושה בעיות אז אל. אני לא מחפש להיות הכי זול, מחפש להיות
 *    מהיר, הוגן, חדשני."
 *
 * He is right and the change is narrow. Telling somebody their quote is
 * CHEAPER than usual is price-shopping — it serves nothing but choosing
 * on price, on work where that is the wrong instinct, and it quietly
 * pushes professionals downward, which is the opposite of the product
 * that wants the best of them.
 *
 * So the engine still measures all three positions, because the truth is
 * the truth and ops will want it. What the CUSTOMER is shown is one
 * thing only: a quote well above what this work usually costs, offered
 * as a question rather than a verdict. That is the fairness guardrail;
 * it is not a comparison feature, and `shouldPromptAboutPrice` is where
 * that line is kept so a later screen cannot quietly cross it.
 */

/** Below this, a "range" is one or two people's opinions, not a market. */
export const MIN_SAMPLE = 8;

/**
 * How far back the sample reaches.
 *
 * A window is a BUSINESS decision — it trades freshness against sample
 * size, and it is the sort of thing a regulator asks about. Ninety days
 * is a defensible default and it is recorded as open in
 * /docs/18-ROADMAP.md rather than pretended to be settled.
 */
export const SAMPLE_WINDOW_DAYS = 90;

/** Where a quote sits against what people have actually paid. */
export type PriceBand = "BELOW" | "WITHIN" | "ABOVE";

export type PriceContext =
  | {
      available: false;
      /** Always reported, so a screen can say "not enough yet" honestly. */
      sampleSize: number;
      needed: number;
    }
  | {
      available: true;
      sampleSize: number;
      /** 25th percentile of what was actually paid. */
      lowMinorUnits: number;
      /** The median. */
      typicalMinorUnits: number;
      /** 75th percentile. */
      highMinorUnits: number;
      band: PriceBand;
    };

/**
 * A percentile by linear interpolation, on a sorted array.
 *
 * Nearest-rank would be defensible too; interpolation is used because it
 * moves smoothly as the sample grows, and a band boundary that jumps by
 * ₪40 when one job lands would put the same quote on either side of
 * "usual" from one minute to the next.
 */
export function percentile(sortedAscending: readonly number[], p: number): number {
  if (sortedAscending.length === 0) throw new Error("percentile of an empty sample");
  if (sortedAscending.length === 1) return sortedAscending[0]!;
  const position = (sortedAscending.length - 1) * p;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  if (below === above) return sortedAscending[below]!;
  const weight = position - below;
  return sortedAscending[below]! * (1 - weight) + sortedAscending[above]! * weight;
}

/**
 * Where `amountMinorUnits` sits among `paid`.
 *
 * `paid` is every approved quote total for ONE service inside the window.
 * The caller does that query; this is pure so the judgement can be tested
 * against a list of numbers rather than against a database.
 */
export function priceContextFor(args: {
  amountMinorUnits: number;
  paid: readonly number[];
}): PriceContext {
  const sample = [...args.paid].filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);

  if (sample.length < MIN_SAMPLE) {
    return { available: false, sampleSize: sample.length, needed: MIN_SAMPLE };
  }

  const low = Math.round(percentile(sample, 0.25));
  const typical = Math.round(percentile(sample, 0.5));
  const high = Math.round(percentile(sample, 0.75));

  /*
   * The boundaries are inclusive of the band, so a quote sitting exactly
   * on the 25th percentile reads as "within" rather than "below". The
   * gentler reading of an edge is the right one when the thing being
   * labelled is a real person's bill.
   */
  const band: PriceBand =
    args.amountMinorUnits < low ? "BELOW" : args.amountMinorUnits > high ? "ABOVE" : "WITHIN";

  return {
    available: true,
    sampleSize: sample.length,
    lowMinorUnits: low,
    typicalMinorUnits: typical,
    highMinorUnits: high,
    band,
  };
}

/**
 * The sample, read from the database.
 *
 * Kept beside the pure function rather than in the route because the
 * SHAPE of the query is part of the claim being made: same service,
 * approved (so somebody agreed to pay it), inside the window. A route
 * that assembled its own sample could quietly widen any of those and the
 * number on screen would mean something different with nothing to show
 * for it.
 */
export async function loadPaidTotals(
  prisma: PrismaClient,
  args: { serviceId: string; excludeJobId?: string; now?: Date }
): Promise<number[]> {
  const since = new Date((args.now ?? new Date()).getTime() - SAMPLE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.quote.findMany({
    where: {
      status: "APPROVED",
      createdAt: { gte: since },
      // The job being looked at is never part of its own comparison.
      ...(args.excludeJobId ? { jobId: { not: args.excludeJobId } } : {}),
      job: { serviceId: args.serviceId },
    },
    select: { totalMinorUnits: true },
  });
  return rows.map((r) => r.totalMinorUnits);
}

/**
 * Whether the CUSTOMER should be told anything at all.
 *
 * True only for a quote above the usual range. Deliberately not a
 * parameter, not a flag, and not configurable: "below" and "within" are
 * measured and never shown, because the product is not competing on
 * being the cheapest (`מהיר, הוגן, חדשני`) and a screen that says "good
 * price!" is doing exactly that.
 *
 * The prompt that follows must be a QUESTION. A job at 2am, with parts,
 * in a flat with no shut-off valve costs more for reasons the quote's
 * own line items explain, and the customer already has a way to ask.
 */
export function shouldPromptAboutPrice(context: PriceContext): boolean {
  return context.available && context.band === "ABOVE";
}
