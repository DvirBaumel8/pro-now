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

describe("a professional with no history — /CLAUDE.md §3, never fabricate a trust score", () => {
  const near = {
    etaSeconds: 300,
    maxEtaSecondsInShortlist: 600,
    serviceFitScore: 1,
    cancellationPenalty: 0,
    recentAssignmentPenalty: 0,
  };

  const unrated = {
    professionalId: "first_shift",
    ...near,
    ratingAverage: null,
    acceptanceRate: null,
    completionRate: null,
  };

  it("does not treat an unrated professional as worthless", () => {
    /*
     * Scoring a missing rating as zero makes a professional's first shift
     * their last: no jobs, so no reviews; no reviews, so no jobs. The
     * score must come from what IS known — their ETA and their fit.
     */
    const { score } = scoreCandidate(unrated);
    expect(score).toBeGreaterThan(0);
  });

  it("does not let an unrated professional outrank a well-reviewed one", () => {
    // Otherwise a stranger beats four years of five-star work, which is a
    // promise to the customer that nobody made.
    const ranked = rankCandidates([
      unrated,
      {
        professionalId: "five_stars",
        ...near,
        ratingAverage: 5,
        acceptanceRate: 1,
        completionRate: 1,
      },
    ]);
    expect(ranked[0]!.professionalId).toBe("five_stars");
  });

  it("ranks an unrated professional ABOVE one with a poor record", () => {
    // A bad record is worse than no record. This is the half that makes
    // the rating worth collecting at all.
    const ranked = rankCandidates([
      {
        professionalId: "poor_record",
        ...near,
        ratingAverage: 1.5,
        acceptanceRate: 0.2,
        completionRate: 0.4,
      },
      unrated,
    ]);
    expect(ranked[0]!.professionalId).toBe("first_shift");
  });

  it("is unchanged from the old arithmetic when everything is known", () => {
    /*
     * The renormalisation must be a no-op for a complete candidate, or
     * every ranking in the product shifts silently on the day this landed.
     * Weights sum to 1, so dividing by the applied weight divides by 1.
     */
    const complete = {
      professionalId: "complete",
      etaSeconds: 300,
      maxEtaSecondsInShortlist: 600,
      serviceFitScore: 1,
      ratingAverage: 4,
      acceptanceRate: 0.8,
      completionRate: 0.9,
      cancellationPenalty: 0,
      recentAssignmentPenalty: 0,
    };
    const byHand =
      0.5 * 0.4 + // eta: 1 - 300/600
      1 * 0.25 + // fit
      (4 / 5) * 0.15 + // rating
      0.8 * 0.1 + // acceptance
      0.9 * 0.1; // completion
    expect(scoreCandidate(complete).score).toBeCloseTo(byHand, 10);
  });

  it("still applies penalties to a professional with no history", () => {
    // Not knowing their rating is not a shield. A cancellation penalty is
    // a record of something that did happen.
    const { score } = scoreCandidate({ ...unrated, cancellationPenalty: 1 });
    expect(score).toBe(0);
  });
});
