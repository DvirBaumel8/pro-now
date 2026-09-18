import { describe, it, expect } from "vitest";
import { rankCandidates, scoreCandidate, DEFAULT_SCORING_WEIGHTS } from "../src/domain/dispatch/scoring";

describe("dispatch scoring — /docs/08-DISPATCH-ENGINE.md §Scoring", () => {
  it("ranks a closer, better-rated professional above a farther, lower-rated one", () => {
    const ranked = rankCandidates([
      {
        professionalId: "far_low_rating",
        etaSeconds: 900,
        maxEtaSecondsInShortlist: 900,
        serviceFitScore: 1,
        ratingAverage: 4.0,
        acceptanceRate: 0.7,
        completionRate: 0.8,
        cancellationPenalty: 0,
        recentAssignmentPenalty: 0,
      },
      {
        professionalId: "near_high_rating",
        etaSeconds: 120,
        maxEtaSecondsInShortlist: 900,
        serviceFitScore: 1,
        ratingAverage: 4.9,
        acceptanceRate: 0.95,
        completionRate: 0.98,
        cancellationPenalty: 0,
        recentAssignmentPenalty: 0,
      },
    ]);

    expect(ranked[0].professionalId).toBe("near_high_rating");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });

  it("respects admin-configured weights instead of a hard-coded split", () => {
    const ratingOnlyWeights = { etaWeight: 0, serviceFitWeight: 0, ratingWeight: 1, acceptanceWeight: 0, completionWeight: 0 };
    const farButBetterRated = scoreCandidate(
      { professionalId: "a", etaSeconds: 900, maxEtaSecondsInShortlist: 900, serviceFitScore: 1, ratingAverage: 5, acceptanceRate: 0, completionRate: 0, cancellationPenalty: 0, recentAssignmentPenalty: 0 },
      ratingOnlyWeights
    );
    const nearButWorseRated = scoreCandidate(
      { professionalId: "b", etaSeconds: 60, maxEtaSecondsInShortlist: 900, serviceFitScore: 1, ratingAverage: 3, acceptanceRate: 1, completionRate: 1, cancellationPenalty: 0, recentAssignmentPenalty: 0 },
      ratingOnlyWeights
    );
    expect(farButBetterRated.score).toBeGreaterThan(nearButWorseRated.score);
  });

  it("never produces a negative score even with heavy penalties", () => {
    const result = scoreCandidate(
      {
        professionalId: "penalized",
        etaSeconds: 900,
        maxEtaSecondsInShortlist: 900,
        serviceFitScore: 0,
        ratingAverage: 0,
        acceptanceRate: 0,
        completionRate: 0,
        cancellationPenalty: 5,
        recentAssignmentPenalty: 5,
      },
      DEFAULT_SCORING_WEIGHTS
    );
    expect(result.score).toBe(0);
  });
});
