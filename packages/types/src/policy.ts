/**
 * Cross-cutting display/domain policy shared by the API and the clients.
 * These live in @pro-now/types so the server and the UI cannot drift apart
 * on a rule that is really one rule.
 */

/**
 * Minimum number of published PRO NOW reviews before an average rating may
 * be shown.
 *
 * This is 1 by product decision: hiding a rating until an arbitrary
 * threshold means a professional can complete a job, receive a genuine
 * verified review, and have it disappear from their card — which reads as
 * the platform withholding real information. Showing it from the first
 * review is honest as long as the COUNT is always displayed beside it, so
 * the customer can judge how much weight one review carries.
 *
 * The count is therefore not optional: `formatProNowRating` returns the
 * rating and the count together, and the card renders both. What is still
 * forbidden is manufacturing confidence around a thin sample — no
 * "highly recommended" style copy derived from a handful of reviews
 * (/CLAUDE.md §3 — never fabricate a trust score).
 */
export const MIN_REVIEWS_FOR_RATING = 1;
