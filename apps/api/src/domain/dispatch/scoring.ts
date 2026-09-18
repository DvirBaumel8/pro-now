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
  ratingAverage: number; // 0..5
  acceptanceRate: number; // 0..1
  completionRate: number; // 0..1
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

export function scoreCandidate(input: ScoringInput, weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS): ScoredCandidate {
  const etaComponent = normalizeEtaInverse(input.etaSeconds, input.maxEtaSecondsInShortlist) * weights.etaWeight;
  const fitComponent = input.serviceFitScore * weights.serviceFitWeight;
  const ratingComponent = (input.ratingAverage / 5) * weights.ratingWeight;
  const acceptanceComponent = input.acceptanceRate * weights.acceptanceWeight;
  const completionComponent = input.completionRate * weights.completionWeight;

  const raw =
    etaComponent +
    fitComponent +
    ratingComponent +
    acceptanceComponent +
    completionComponent -
    input.cancellationPenalty -
    input.recentAssignmentPenalty;

  return { professionalId: input.professionalId, score: Math.max(0, raw) };
}

/** Ranks candidates highest-score-first; ties broken by lowest ETA via stable sort input order. */
export function rankCandidates(inputs: ScoringInput[], weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS): ScoredCandidate[] {
  return inputs
    .map((i) => scoreCandidate(i, weights))
    .sort((a, b) => b.score - a.score);
}
