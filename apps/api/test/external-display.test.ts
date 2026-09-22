import { describe, it, expect } from "vitest";
import {
  externalReputationDisplay,
  DISPLAY_FIELD,
  MAX_SNAPSHOT_AGE_DAYS,
  type ExternalProfileState,
} from "../src/domain/reputation/external-display";

const NOW = new Date("2026-09-22T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const linked: ExternalProfileState = {
  linkStatus: "LINKED",
  dataProvenance: "PROVIDER_API",
  allowedDisplayFields: [DISPLAY_FIELD.RATING, DISPLAY_FIELD.REVIEW_COUNT, DISPLAY_FIELD.PROFILE_URL],
  sourceIntegrationEnabled: true,
  sourceDisplayNameHe: "Google",
  profileUrl: "https://example.com/p/1",
  rating: 4.9,
  reviewCount: 127,
  lastVerifiedAt: daysAgo(2),
};

describe("external reputation display — /docs/10 §External reputation", () => {
  it("shows a verified, fresh, permitted rating with its source and its age", () => {
    const shown = externalReputationDisplay(linked, NOW)!;
    expect(shown.source).toBe("Google");
    expect(shown.ratingAverage).toBe(4.9);
    expect(shown.ratingCount).toBe(127);
    expect(shown.lastVerifiedAt).toBe(daysAgo(2).toISOString());
    expect(shown.withheldReason).toBeNull();
  });

  it("renders nothing at all for a profile that was never linked", () => {
    // Not an empty card and not a zero — nothing.
    expect(externalReputationDisplay({ ...linked, linkStatus: "PENDING" }, NOW)).toBeNull();
    expect(externalReputationDisplay({ ...linked, linkStatus: "UNLINKED" }, NOW)).toBeNull();
  });

  it("withholds the number when the source has no integration yet", () => {
    /*
     * "If the integration isn't ready, hide the external reputation block
     * entirely — never show mock data as if it were live."
     */
    const shown = externalReputationDisplay({ ...linked, sourceIntegrationEnabled: false }, NOW)!;
    expect(shown.ratingAverage).toBeNull();
    expect(shown.ratingCount).toBeNull();
    expect(shown.withheldReason).toBe("INTEGRATION_NOT_ENABLED");
  });

  it("withholds a number the professional supplied about themselves", () => {
    /*
     * A rating repeated by the person it flatters is not evidence, and
     * placing it beside a PRO NOW rating earned through verified jobs
     * would put the two on a footing they do not share. The LINK is
     * still theirs to state, and is still shown.
     */
    const shown = externalReputationDisplay(
      { ...linked, dataProvenance: "PROFESSIONAL_DECLARED" },
      NOW
    )!;
    expect(shown.ratingAverage).toBeNull();
    expect(shown.profileUrl).toBe("https://example.com/p/1");
    expect(shown.withheldReason).toBe("NOT_VERIFIED_BY_PROVIDER");
  });

  it("withholds a rating the source's terms do not permit showing", () => {
    const shown = externalReputationDisplay(
      { ...linked, allowedDisplayFields: [DISPLAY_FIELD.PROFILE_URL] },
      NOW
    )!;
    expect(shown.ratingAverage).toBeNull();
    expect(shown.withheldReason).toBe("DISPLAY_NOT_PERMITTED");
  });

  it("withholds a count the terms do not permit, while still showing the rating", () => {
    // A rating with no count invites a customer to read one review as a
    // reputation, so the count is its own permission rather than a
    // decoration on the rating's.
    const shown = externalReputationDisplay(
      { ...linked, allowedDisplayFields: [DISPLAY_FIELD.RATING] },
      NOW
    )!;
    expect(shown.ratingAverage).toBe(4.9);
    expect(shown.ratingCount).toBeNull();
    expect(shown.withheldReason).toBeNull();
  });

  it("withholds the profile link when the terms do not permit it", () => {
    const shown = externalReputationDisplay(
      { ...linked, allowedDisplayFields: [DISPLAY_FIELD.RATING] },
      NOW
    )!;
    expect(shown.profileUrl).toBeNull();
  });

  describe("freshness", () => {
    it("shows a rating fetched inside the window", () => {
      const shown = externalReputationDisplay(
        { ...linked, lastVerifiedAt: daysAgo(MAX_SNAPSHOT_AGE_DAYS) },
        NOW
      )!;
      expect(shown.ratingAverage).toBe(4.9);
    });

    it("withholds one fetched outside it", () => {
      /*
       * "★4.9 · 127 reviews" was true when it was fetched. A year later
       * it is a claim about the past presented as a claim about now.
       */
      const shown = externalReputationDisplay(
        { ...linked, lastVerifiedAt: daysAgo(MAX_SNAPSHOT_AGE_DAYS + 1) },
        NOW
      )!;
      expect(shown.ratingAverage).toBeNull();
      expect(shown.withheldReason).toBe("STALE");
    });

    it("withholds one that was never fetched at all", () => {
      const shown = externalReputationDisplay({ ...linked, lastVerifiedAt: null }, NOW)!;
      expect(shown.withheldReason).toBe("NEVER_FETCHED");
    });

    it("withholds a snapshot that has a date and no number", () => {
      const shown = externalReputationDisplay({ ...linked, rating: null }, NOW)!;
      expect(shown.withheldReason).toBe("NEVER_FETCHED");
    });
  });

  it("never invents a source label", () => {
    const shown = externalReputationDisplay({ ...linked, sourceDisplayNameHe: "" }, NOW)!;
    expect(shown.source).toBe("");
  });
});
