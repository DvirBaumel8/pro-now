/**
 * WHAT IS ACTUALLY KNOWN ABOUT A PROFESSIONAL.
 *
 * `dispatch-service.ts` handed the scoring engine three constants for
 * every candidate on every job:
 *
 *     ratingAverage: 4.8,   // placeholder until reviews aggregate is wired
 *     acceptanceRate: 0.9,
 *     completionRate: 0.95,
 *
 * A fabricated trust score, inside the engine that decides who is sent to
 * somebody's home. `/CLAUDE.md §3` forbids it in as many words — "never
 * fabricate availability, demand, or a trust score" — and the comment
 * beside it named itself as a placeholder. It could not be removed
 * earlier: reviews were unreachable until payment existed, and payment
 * did not exist until §21.
 *
 * These are counted from rows now, and a professional with no history
 * gets `null` rather than a flattering number. `scoreCandidate` leaves
 * unknown components out of the score entirely rather than guessing at
 * them — the reasoning is there.
 *
 * ---------------------------------------------------------------------
 * ONE QUERY, NOT ONE PER CANDIDATE
 * ---------------------------------------------------------------------
 * A shortlist is up to twenty-five people and this runs inside a customer
 * request. Three aggregates per candidate would be seventy-five queries
 * between the tap and the offer.
 */
import type { PrismaClient } from "@prisma/client";

export interface ProfessionalRecord {
  /** Mean of published reviews, 0..5. Null when nobody has reviewed them. */
  ratingAverage: number | null;
  /** Offers accepted ÷ offers answered or timed out. Null when never offered. */
  acceptanceRate: number | null;
  /** Jobs carried to completion ÷ jobs assigned. Null when never assigned. */
  completionRate: number | null;
  /** How many reviews the average is made of — for the screens, not the score. */
  reviewCount: number;
}

const EMPTY: ProfessionalRecord = {
  ratingAverage: null,
  acceptanceRate: null,
  completionRate: null,
  reviewCount: 0,
};

/**
 * Offer outcomes that count as "the professional had their chance".
 *
 * An offer still live is not a miss — it is a question nobody has
 * answered yet, and counting it against them would penalise a
 * professional for the thirty seconds they are given to decide.
 * REVOKED is excluded for the same reason from the other direction: the
 * platform withdrew it because somebody else accepted first, which is not
 * a fact about this professional at all.
 */
const ANSWERED_OFFER_STATUSES = ["ACCEPTED", "SKIPPED", "EXPIRED"] as const;

/** Job states that mean the professional saw the work through. */
const COMPLETED_JOB_STATUSES = [
  "COMPLETION_PENDING",
  "COMPLETED",
  "PAYMENT_PENDING",
  "PAYMENT_CAPTURED",
  "REVIEW_PENDING",
  "CLOSED",
] as const;

export async function recordsFor(
  prisma: PrismaClient,
  professionalIds: readonly string[]
): Promise<Map<string, ProfessionalRecord>> {
  const out = new Map<string, ProfessionalRecord>();
  if (professionalIds.length === 0) return out;
  for (const id of professionalIds) out.set(id, { ...EMPTY });

  const ids = [...professionalIds];

  const [reviews, offers, assigned, completed] = await Promise.all([
    prisma.review.groupBy({
      by: ["professionalId"],
      where: { professionalId: { in: ids }, moderationStatus: "PUBLISHED" },
      _avg: { overallRating: true },
      _count: { _all: true },
    }),
    prisma.dispatchOffer.groupBy({
      by: ["professionalId", "status"],
      where: { professionalId: { in: ids }, status: { in: [...ANSWERED_OFFER_STATUSES] } },
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ["assignedProfessionalId"],
      where: { assignedProfessionalId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.job.groupBy({
      by: ["assignedProfessionalId"],
      where: {
        assignedProfessionalId: { in: ids },
        status: { in: [...COMPLETED_JOB_STATUSES] },
      },
      _count: { _all: true },
    }),
  ]);

  for (const row of reviews) {
    const record = out.get(row.professionalId);
    if (!record) continue;
    record.ratingAverage = row._avg.overallRating ?? null;
    record.reviewCount = row._count._all;
  }

  const answered = new Map<string, { accepted: number; total: number }>();
  for (const row of offers) {
    const bucket = answered.get(row.professionalId) ?? { accepted: 0, total: 0 };
    bucket.total += row._count._all;
    if (row.status === "ACCEPTED") bucket.accepted += row._count._all;
    answered.set(row.professionalId, bucket);
  }
  for (const [id, bucket] of answered) {
    const record = out.get(id);
    if (record && bucket.total > 0) record.acceptanceRate = bucket.accepted / bucket.total;
  }

  const assignedCounts = new Map(
    assigned
      .filter((r) => r.assignedProfessionalId !== null)
      .map((r) => [r.assignedProfessionalId!, r._count._all])
  );
  const completedCounts = new Map(
    completed
      .filter((r) => r.assignedProfessionalId !== null)
      .map((r) => [r.assignedProfessionalId!, r._count._all])
  );
  for (const [id, total] of assignedCounts) {
    const record = out.get(id);
    if (record && total > 0) record.completionRate = (completedCounts.get(id) ?? 0) / total;
  }

  return out;
}
