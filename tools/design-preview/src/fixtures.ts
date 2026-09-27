import { buildIntakeBrief, pilotIntakeByService } from "@pro-now/types";
import type { JobMatchView, OfferCardView } from "@pro-now/types";

/**
 * PREVIEW FIXTURES — developer-only sample payloads for the design gallery.
 *
 * These are NOT used by any application. They exist so the cards can be
 * reviewed in a browser without a running API. The names are deliberately
 * obvious placeholders rather than plausible-looking people, so that a
 * screenshot of this gallery can never be mistaken for real marketplace
 * supply (/CLAUDE.md §3).
 *
 * The shapes are the real wire types — if the API contract changes, this
 * file stops compiling, which is the point.
 */

const NOW = "2026-09-19T12:00:00.000Z";

export const matchFixture: JobMatchView = {
  jobId: "job_preview_1",
  status: "PRO_ASSIGNED",
  serviceNameHe: "תיקון נזילה בברז",
  professional: {
    id: "pro_preview_1",
    displayName: "יוסי (תצוגה)",
    profilePhotoUrl: null,
    verifications: ["IDENTITY_VERIFIED", "BUSINESS_VERIFIED", "LICENSE_VERIFIED"],
    proNowCompletedJobs: 342,
    proNowRatingAverage: 4.86,
    proNowRatingCount: 211,
    externalReputation: {
      source: "Google",
      ratingAverage: 4.7,
      ratingCount: 88,
      profileUrl: null,
    },
  },
  eta: {
    etaSeconds: 840,
    distanceMeters: 3400,
    isRouteBased: true,
    computedAt: NOW,
  },
  price: {
    priceModel: "VISIT_QUOTE",
    currency: "ILS",
    visitFeeMinorUnits: 17900,
  },
};

/** A brand-new professional: no rating, no job history, coarse ETA. */
export const matchNewProFixture: JobMatchView = {
  ...matchFixture,
  jobId: "job_preview_2",
  serviceNameHe: "התקנת מזגן",
  professional: {
    ...matchFixture.professional,
    id: "pro_preview_2",
    displayName: "דוגמה ב׳ (תצוגה)",
    verifications: ["IDENTITY_VERIFIED"],
    proNowCompletedJobs: 0,
    proNowRatingAverage: null,
    proNowRatingCount: 0,
    externalReputation: null,
  },
  eta: {
    etaSeconds: 1500,
    distanceMeters: 11200,
    isRouteBased: false, // coarse fallback — the card must say so
    computedAt: NOW,
  },
  price: {
    priceModel: "FIXED",
    currency: "ILS",
    fixedTotalMinorUnits: 45000,
  },
};

/** ETA not yet computed, hourly pricing, and a professional with exactly one verified review. */
export const matchPendingEtaFixture: JobMatchView = {
  ...matchFixture,
  jobId: "job_preview_3",
  serviceNameHe: "עבודות חשמל",
  professional: {
    ...matchFixture.professional,
    id: "pro_preview_3",
    displayName: "דוגמה ג׳ (תצוגה)",
    verifications: ["IDENTITY_VERIFIED", "CREDENTIALS_CHECKED"],
    proNowCompletedJobs: 1,
    proNowRatingAverage: 5,
    proNowRatingCount: 1,
    externalReputation: null,
  },
  eta: null,
  price: {
    priceModel: "HOURLY",
    currency: "ILS",
    hourlyRateMinorUnits: 15000,
    minimumBillableMinutes: 60,
  },
};

export const offerFixture: OfferCardView = {
  offerId: "offer_preview_1",
  jobId: "job_preview_1",
  serviceNameHe: "תיקון נזילה בברז",
  serviceCode: "PLM-LEAK-001",
  priceModel: "VISIT_QUOTE",
  currency: "ILS",
  offeredAt: NOW,
  expiresAt: "2026-09-19T12:00:30.000Z",
  eta: {
    etaSeconds: 540,
    distanceMeters: 2400,
    isRouteBased: true,
    computedAt: NOW,
  },
  expectedPayoutMinorUnits: 13400,
  payoutIsEstimate: false,
  customerAreaLabel: "רמת אביב, תל אביב",
  jobDescription: "נזילה מתחת לכיור במטבח, מים מצטברים בארון. דחוף.",
  /*
   * The intake answers, verbatim. Note that one of them is "לא יודע" — a
   * real answer, kept on the card, because a customer who admitted they
   * cannot find the source has told the plumber something useful.
   */
  intakeBrief: buildIntakeBrief(pilotIntakeByService["svc-leak"], [
    { questionId: "where", optionIds: ["under_sink"] },
    { questionId: "rate", optionIds: ["stream"] },
    { questionId: "shutoff", optionIds: ["no"] },
    { questionId: "since", optionIds: ["today"] },
  ]),
  mediaSummary: { photos: 2, voiceSeconds: 18 },
  // The customer said the floor and the lift, and said nothing about
  // parking — so parking does not appear at all.
  arrival: { floor: 4, hasLift: true },
  typicalServiceMinutes: [45, 120],
};

/** Payout genuinely unknowable before diagnosis. */
export const offerUnknownPayoutFixture: OfferCardView = {
  ...offerFixture,
  offerId: "offer_preview_2",
  serviceNameHe: "אבחון תקלת חשמל",
  expectedPayoutMinorUnits: null,
  payoutIsEstimate: false,
  jobDescription: null,
  // A thin offer, on purpose: the customer answered two questions, sent
  // nothing, and said nothing about the building. The card has to look
  // correct like this, not broken.
  intakeBrief: buildIntakeBrief(pilotIntakeByService["svc-electric"], [
    { questionId: "scope", optionIds: ["part"] },
    { questionId: "danger", optionIds: ["unknown"] },
  ]),
  mediaSummary: undefined,
  arrival: undefined,
  typicalServiceMinutes: null,
  eta: {
    etaSeconds: 1320,
    distanceMeters: 8600,
    isRouteBased: false,
    computedAt: NOW,
  },
};

/** Estimate-based payout, deep into the countdown. */
export const offerEstimateFixture: OfferCardView = {
  ...offerFixture,
  offerId: "offer_preview_3",
  serviceNameHe: "פינוי והובלה",
  priceModel: "HOURLY",
  expectedPayoutMinorUnits: 24000,
  payoutIsEstimate: true,
  customerAreaLabel: "הרצליה פיתוח",
  jobDescription: "פינוי ריהוט מדירת 3 חדרים, קומה 2 ללא מעלית.",
};

/** The clock used for deterministic screenshots of the countdown. */
export const FROZEN_NOW_MS = Date.parse(NOW);
