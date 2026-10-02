/**
 * Match scoring — see /docs/08-DISPATCH-ENGINE.md §Scoring. Weights are
 * loaded from app_config at runtime (never hard-coded); this module only
 * implements the pure math given a weights object, so it can be unit
 * tested and so Admin-configured weights actually take effect.
 */

export interface ScoringWeights {
  etaWeight: number;
  serviceFitWeight: number;
  ratingWeight: number;
  acceptanceWeight: number;
  completionWeight: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  etaWeight: 0.4,
  serviceFitWeight: 0.25,
  ratingWeight: 0.15,
  acceptanceWeight: 0.1,
  completionWeight: 0.1,
};

export interface ScoringInput {
  professionalId: string;
  etaSeconds: number;
  maxEtaSecondsInShortlist: number; // for normalization
  serviceFitScore: number; // 0..1, e.g. exact-service match vs adjacent

  /*
   * THREE THINGS THAT MAY NOT BE KNOWN YET, AND NULL IS HOW THAT IS SAID.
   *
   * These were plain numbers, and `dispatch-service.ts` filled all three
   * with constants — 4.8, 0.9, 0.95 — for every candidate, every time.
   * That is a fabricated trust score inside the engine that decides who
   * is sent to somebody's home, which /CLAUDE.md §3 forbids in as many
   * words, and the comment beside it admitted as much.
   *
   * A professional on their first shift has no rating. Not a low one, not
   * an average one: none. Every way of writing a number there is a claim
   * about work nobody has seen. So the type allows the truth, and
   * `scoreCandidate` handles it by leaving the component out — see below.
   */
  ratingAverage: number | null; // 0..5, null until somebody has reviewed them
  acceptanceRate: number | null; // 0..1, null until they have been offered a job
  completionRate: number | null; // 0..1, null until they have been assigned one

  cancellationPenalty: number; // 0..1, subtracted
  recentAssignmentPenalty: number; // 0..1, subtracted — fairness/anti-starvation
}

export interface ScoredCandidate {
  professionalId: string;
  score: number;
}

function normalizeEtaInverse(etaSeconds: number, maxEtaSeconds: number): number {
  if (maxEtaSeconds <= 0) return 1;
  // Lower ETA -> higher score. Clamp to [0,1].
  const normalized = 1 - etaSeconds / maxEtaSeconds;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Score a candidate on what is KNOWN about them.
 *
 * An unknown component is dropped from the numerator AND from the
 * denominator, so the professional is judged on the evidence that exists
 * rather than on a stand-in for evidence that does not.
 *
 * The three obvious alternatives are all worse, and each is a decision
 * about somebody's livelihood:
 *
 *   treat unknown as ZERO — a professional's first shift is also their
 *     last. No jobs, so no reviews; no reviews, so no jobs.
 *   treat unknown as FULL MARKS — a stranger outranks a professional with
 *     four years of five-star work, which is a promise to the customer
 *     that nobody made.
 *   treat unknown as the MARKET AVERAGE — quieter, and still a number
 *     assembled out of other people's work and attached to this one.
 *
 * Leaving it out says the true thing: we do not know. A professional with
 * a genuinely poor record still ranks below an unrated one, because a bad
 * record is worse than no record — and a great one still ranks above,
 * which is what a rating is for.
 *
 * When every component is known and the weights sum to 1, this is exactly
 * the arithmetic it replaced.
 */
export function scoreCandidate(input: ScoringInput, weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS): ScoredCandidate {
  const components: Array<{ value: number; weight: number }> = [
    {
      value: normalizeEtaInverse(input.etaSeconds, input.maxEtaSecondsInShortlist),
      weight: weights.etaWeight,
    },
    { value: input.serviceFitScore, weight: weights.serviceFitWeight },
  ];

  if (input.ratingAverage !== null) {
    components.push({ value: input.ratingAverage / 5, weight: weights.ratingWeight });
  }
  if (input.acceptanceRate !== null) {
    components.push({ value: input.acceptanceRate, weight: weights.acceptanceWeight });
  }
  if (input.completionRate !== null) {
    components.push({ value: input.completionRate, weight: weights.completionWeight });
  }

  const appliedWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weighted = components.reduce((sum, c) => sum + c.value * c.weight, 0);

  // Renormalised so a candidate missing a component is still comparable
  // with one that has it. Zero total weight means an admin has switched
  // scoring off entirely; the penalties are all that is left to say.
  const merit = appliedWeight > 0 ? weighted / appliedWeight : 0;

  const raw = merit - input.cancellationPenalty - input.recentAssignmentPenalty;

  return { professionalId: input.professionalId, score: Math.max(0, raw) };
}

/** Ranks candidates highest-score-first; ties broken by lowest ETA via stable sort input order. */
export function rankCandidates(inputs: ScoringInput[], weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS): ScoredCandidate[] {
  return inputs
    .map((i) => scoreCandidate(i, weights))
    .sort((a, b) => b.score - a.score);
}
