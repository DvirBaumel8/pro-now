/**
 * Presentation formatting for the two cards the marketplace turns on.
 *
 * These live here, not inside a component, because every one of them is a
 * place where a UI could quietly start lying — rounding an ETA up to look
 * better, showing a rating that does not exist yet, printing a payout that
 * was never calculated. Keeping them as pure functions makes each of those
 * a testable assertion rather than a code-review opinion.
 *
 * See /CLAUDE.md §3: "Real supply only. Real ETA only. Never fabricate
 * availability, demand, or a trust score."
 */

import { MIN_REVIEWS_FOR_RATING, type EtaView } from "@pro-now/types";

export { MIN_REVIEWS_FOR_RATING };

/**
 * ETA in whole minutes, never rounded down to zero — "0 דקות" would read as
 * "already here". Anything under a minute is presented as 1.
 */
export function etaMinutes(etaSeconds: number): number {
  if (!Number.isFinite(etaSeconds) || etaSeconds < 0) {
    throw new Error("ETA_NOT_FINITE");
  }
  return Math.max(1, Math.round(etaSeconds / 60));
}

export interface EtaDisplay {
  minutes: number;
  /** "12" — the number alone, so the UI can size it as the hero. */
  value: string;
  /** "דקות" / "דקה" */
  unit: string;
  /**
   * True when this came from the coarse fallback rather than a routing
   * provider. The card MUST visibly mark it — presenting a haversine
   * estimate as a route ETA is exactly the fabrication the invariant bans.
   */
  isApproximate: boolean;
}

export function formatEta(eta: EtaView | null): EtaDisplay | null {
  if (!eta) return null;
  const minutes = etaMinutes(eta.etaSeconds);
  return {
    minutes,
    value: String(minutes),
    unit: minutes === 1 ? "דקה" : "דקות",
    isApproximate: !eta.isRouteBased,
  };
}

/** "450 מ׳" under a kilometre, "2.4 ק״מ" above it. */
export function formatDistance(meters: number | null): string | null {
  if (meters === null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) return `${Math.round(meters)} מ׳`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : String(Math.round(km))} ק״מ`;
}

/**
 * A PRO NOW rating is shown from the first verified review, and ALWAYS
 * together with the review count — see MIN_REVIEWS_FOR_RATING for why.
 * The count is what stops a single review from reading as an established
 * reputation, so the two are returned together and must be rendered
 * together.
 */
export function formatProNowRating(
  ratingAverage: number | null,
  ratingCount: number
): { rating: string; count: number } | null {
  if (ratingAverage === null || ratingCount < MIN_REVIEWS_FOR_RATING) return null;
  return { rating: ratingAverage.toFixed(1), count: ratingCount };
}

/**
 * Minimum billable duration for HOURLY pricing, in natural Hebrew.
 * Minutes are the stored unit (schema.prisma), because "half an hour" is a
 * real minimum and hours-as-a-float reads badly.
 */
export function formatMinimumBillable(minutes: number | null | undefined): string | null {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) return null;
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole} דקות`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  // Hebrew uses a distinct singular form: "שעה", not "1 שעות".
  const hoursLabel = hours === 1 ? "שעה" : `${hours} שעות`;
  return rest === 0 ? hoursLabel : `${hoursLabel} ו-${rest} דקות`;
}

/** "עבודות דרך PRO NOW" — always attributed, never a generic job count. */
export function formatCompletedJobs(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  // Hebrew has a distinct singular: "עבודה אחת", never "1 עבודות".
  const whole = Math.round(count);
  return whole === 1 ? "עבודה אחת דרך PRO NOW" : `${whole} עבודות דרך PRO NOW`;
}

export interface CountdownDisplay {
  /** "0:23" */
  label: string;
  secondsRemaining: number;
  /** 1 at full time, 0 at expiry — drives the progress ring. */
  fraction: number;
  expired: boolean;
  /** Visual urgency, so the colour rule lives here and not in three places. */
  urgency: "calm" | "warning" | "critical";
}

/**
 * Countdown to a SERVER-issued deadline. The client never decides when an
 * offer expires — it only renders the remaining time until `expiresAt`
 * (/CLAUDE.md §3: the server is authoritative for timers).
 */
export function formatCountdown(expiresAtIso: string, nowMs: number, totalSeconds: number): CountdownDisplay {
  const expiresAtMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresAtMs)) throw new Error("EXPIRES_AT_INVALID");

  const remainingMs = Math.max(0, expiresAtMs - nowMs);
  const secondsRemaining = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  const safeTotal = totalSeconds > 0 ? totalSeconds : 1;
  const fraction = Math.max(0, Math.min(1, secondsRemaining / safeTotal));

  return {
    label: `${minutes}:${String(seconds).padStart(2, "0")}`,
    secondsRemaining,
    fraction,
    expired: secondsRemaining <= 0,
    urgency: fraction > 0.5 ? "calm" : fraction > 0.25 ? "warning" : "critical",
  };
}

/**
 * Payout copy for the professional. `null` minor units means the amount is
 * genuinely not knowable yet — the card must say so rather than print a
 * plausible-looking number (/CLAUDE.md §3: transparent provider payout,
 * shown "whenever the amount is knowable").
 */
export function payoutDisclosure(
  expectedPayoutMinorUnits: number | null,
  payoutIsEstimate: boolean
): { known: false; reasonHe: string } | { known: true; isEstimate: boolean; qualifierHe: string | null } {
  if (expectedPayoutMinorUnits === null) {
    return { known: false, reasonHe: "הסכום ייקבע לאחר אבחון באתר" };
  }
  return {
    known: true,
    isEstimate: payoutIsEstimate,
    qualifierHe: payoutIsEstimate ? "משוער" : null,
  };
}
