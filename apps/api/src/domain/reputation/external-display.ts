/**
 * WHETHER AN EXTERNAL RATING MAY BE SHOWN, AND WHETHER IT IS STILL TRUE.
 *
 * ---------------------------------------------------------------------
 * THE RULES THIS ENFORCES ARE NOT MINE
 * ---------------------------------------------------------------------
 * `/docs/10-TRUST-VERIFICATION.md §External reputation` is unusually
 * specific, and every line of it is a constraint on this file:
 *
 *   "connect an existing public business profile **where platform
 *    terms/APIs allow**"
 *   "Candidate integration: official Google business/place APIs, subject
 *    to terms/attribution/authorization. **Never scrape.**"
 *   "UI always labels source + freshness"
 *   "If the integration isn't ready, **hide the external reputation block
 *    entirely** — never show mock data as if it were live."
 *
 * And `/CLAUDE.md §3`, which the whole product rests on: never fabricate a
 * trust score.
 *
 * ---------------------------------------------------------------------
 * WHY A LINK AND A NUMBER ARE DIFFERENT THINGS
 * ---------------------------------------------------------------------
 * A professional can always tell us where their public profile is — it is
 * theirs, and a link is a fact they are entitled to state. What they
 * cannot do is tell us their rating, because a rating repeated by the
 * person it flatters is not evidence of anything, and showing it beside a
 * PRO NOW rating earned through verified jobs would put the two on a
 * footing they do not share.
 *
 * So provenance decides what may be rendered:
 *
 *   PROVIDER_API          — an integration under its terms. The number may
 *                           be shown, labelled with its source and its age.
 *   PROFESSIONAL_DECLARED — a link, and only a link.
 *
 * There is no SCRAPED. The interface says "Never scrape" and so does the
 * document; a value that cannot be produced legitimately is not given a
 * name in the type.
 *
 * ---------------------------------------------------------------------
 * FRESHNESS IS PART OF TRUTH
 * ---------------------------------------------------------------------
 * "★4.9 · 127 reviews" was true when it was fetched. Fetched a year ago it
 * is a claim about the past presented as a claim about now. Past the
 * staleness window the number is withheld and the link is not — the same
 * split as an unverified provenance, for the same reason.
 */

/** How this profile's numbers reach us. */
export type DataProvenance = "PROVIDER_API" | "PROFESSIONAL_DECLARED";

/** Fields a source's terms may permit rendering. */
export const DISPLAY_FIELD = {
  RATING: "RATING",
  REVIEW_COUNT: "REVIEW_COUNT",
  PROFILE_URL: "PROFILE_URL",
} as const;

/**
 * How old a snapshot may be and still be shown, in days.
 *
 * Thirty is the number Google's own terms use as a caching limit for
 * Places content, and adopting it means one rule rather than two. It is
 * not a business decision so much as the strictest constraint any
 * candidate integration is likely to impose; a source whose terms are
 * tighter needs its own value, and this is where that would live.
 */
export const MAX_SNAPSHOT_AGE_DAYS = 30;

export interface ExternalProfileState {
  linkStatus: string;
  dataProvenance: string;
  allowedDisplayFields: readonly string[];
  /** The source's own switch — false until an integration exists under its terms. */
  sourceIntegrationEnabled: boolean;
  sourceDisplayNameHe: string;
  profileUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  lastVerifiedAt: Date | null;
}

export interface ExternalReputationDisplay {
  /** Null means render nothing at all — not an empty card, not a zero. */
  source: string;
  ratingAverage: number | null;
  ratingCount: number | null;
  profileUrl: string | null;
  /** When the number was last confirmed. Shown beside it, never omitted. */
  lastVerifiedAt: string | null;
  /**
   * Why a number is absent when it is. For the professional's own screen
   * and for Ops — a customer is shown nothing rather than an excuse.
   */
  withheldReason:
    | "NOT_LINKED"
    | "INTEGRATION_NOT_ENABLED"
    | "NOT_VERIFIED_BY_PROVIDER"
    | "DISPLAY_NOT_PERMITTED"
    | "STALE"
    | "NEVER_FETCHED"
    | null;
}

function ageInDays(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / 86_400_000;
}

/**
 * What, if anything, to render for one external profile.
 *
 * Returns null when the block must not appear at all. Returns a display
 * with a null rating when the LINK may be shown and the number may not —
 * which is a different and useful state, not a degraded one.
 */
export function externalReputationDisplay(
  state: ExternalProfileState,
  now: Date = new Date()
): ExternalReputationDisplay | null {
  if (state.linkStatus !== "LINKED") return null;

  const source = state.sourceDisplayNameHe || "";
  const mayShowUrl = state.allowedDisplayFields.includes(DISPLAY_FIELD.PROFILE_URL);
  const linkOnly = (reason: ExternalReputationDisplay["withheldReason"]) => ({
    source,
    ratingAverage: null,
    ratingCount: null,
    profileUrl: mayShowUrl ? state.profileUrl : null,
    lastVerifiedAt: null,
    withheldReason: reason,
  });

  // The source has no integration yet. /docs/10: hide the block rather
  // than show anything that looks live.
  if (!state.sourceIntegrationEnabled) return linkOnly("INTEGRATION_NOT_ENABLED");

  // A number the professional told us about themselves is not evidence.
  if (state.dataProvenance !== "PROVIDER_API") return linkOnly("NOT_VERIFIED_BY_PROVIDER");

  if (!state.allowedDisplayFields.includes(DISPLAY_FIELD.RATING)) {
    return linkOnly("DISPLAY_NOT_PERMITTED");
  }

  if (state.rating === null || state.lastVerifiedAt === null) {
    return linkOnly("NEVER_FETCHED");
  }

  if (ageInDays(state.lastVerifiedAt, now) > MAX_SNAPSHOT_AGE_DAYS) {
    return linkOnly("STALE");
  }

  return {
    source,
    ratingAverage: state.rating,
    // The count is its own permission: a rating with no count beside it
    // invites a customer to read one review as a reputation.
    ratingCount: state.allowedDisplayFields.includes(DISPLAY_FIELD.REVIEW_COUNT)
      ? state.reviewCount
      : null,
    profileUrl: mayShowUrl ? state.profileUrl : null,
    lastVerifiedAt: state.lastVerifiedAt.toISOString(),
    withheldReason: null,
  };
}
