/**
 * Wire contract types — the JSON shapes `apps/api` actually sends, as
 * consumed by `apps/customer-mobile`, `apps/pro-mobile`, `apps/admin` and
 * `packages/api-client`. Source of truth: /docs/06-API-SPEC.md, with field
 * names and nullability taken from `apps/api/prisma/schema.prisma`.
 *
 * These exist so that no client has to reach for `any` to read a response.
 * A client renders what the server says (/CLAUDE.md §3 — the server is
 * authoritative); these types describe that payload, they do not define it.
 *
 * Dates cross the wire as ISO-8601 strings, never as `Date`.
 */

import type { JobActor, JobEvent, JobState, PriceModel, ProPresenceState } from "./job";

// ---------------------------------------------------------------------
// Catalog — GET /v1/catalog
// ---------------------------------------------------------------------

/** Trust tier A–E, see /docs/10-TRUST-VERIFICATION.md. */
export type TrustTier = "A" | "B" | "C" | "D" | "E";

export interface CatalogServiceView {
  id: string;
  code: string;
  nameHe: string;
  nameEn: string;
  priceModel: PriceModel;
  trustTier: TrustTier | string;
}

export interface CatalogCategoryView {
  code: string;
  nameHe: string;
  nameEn: string;
  services: CatalogServiceView[];
}

export interface CatalogDepartmentView {
  code: string;
  nameHe: string;
  nameEn: string;
  categories: CatalogCategoryView[];
}

export interface CatalogResponse {
  marketCode: string;
  departments: CatalogDepartmentView[];
}

// ---------------------------------------------------------------------
// Quotes — /v1/jobs/:id/quotes, /v1/quotes/:id/approve
// ---------------------------------------------------------------------

export type QuoteStatus = "SENT" | "APPROVED" | "DECLINED" | "SUPERSEDED";
export type QuoteItemKind = "LABOR" | "MATERIALS" | "OTHER";

export interface QuoteItemView {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
  kind: QuoteItemKind | string;
}

export interface QuoteView {
  id: string;
  jobId: string;
  version: number;
  /** Integrity hash the customer must echo back on approval. */
  versionHash: string;
  status: QuoteStatus | string;
  totalMinorUnits: number;
  notes: string | null;
  createdAt: string;
  lineItems: QuoteItemView[];
}

// ---------------------------------------------------------------------
// Dispatch offers
// ---------------------------------------------------------------------

export type DispatchOfferStatusView =
  | "CREATED"
  | "SENT"
  | "VIEWED"
  | "ACCEPTED"
  | "SKIPPED"
  | "EXPIRED"
  | "WITHDRAWN";

export interface DispatchOfferView {
  id: string;
  jobId: string;
  professionalId: string;
  status: DispatchOfferStatusView | string;
  offeredAt: string;
  expiresAt: string;
  respondedAt: string | null;
  scoreSnapshot: number | null;
  etaSecondsSnapshot: number | null;
  payoutMinorUnitsSnapshot: number | null;
}

// ---------------------------------------------------------------------
// Jobs — GET /v1/jobs/:id, POST /v1/jobs
// ---------------------------------------------------------------------

export interface JobView {
  id: string;
  customerId: string;
  serviceId: string;
  addressId: string;
  assignedProfessionalId: string | null;
  status: JobState;
  description: string | null;
  structuredAnswers: Record<string, unknown> | null;
  approvedQuoteId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Included by GET /v1/jobs/:id; absent on endpoints that do not expand it. */
  events?: JobEvent[];
  offers?: DispatchOfferView[];
  quotes?: QuoteView[];
}

/** Result of the dispatch attempt that POST /v1/jobs kicks off. */
export interface DispatchResultView {
  status: "OFFER_SENT" | "NO_ELIGIBLE_CANDIDATES" | string;
  offerId?: string;
  professionalId?: string;
  candidatesConsidered: number;
  candidatesEligible: number;
}

// ---------------------------------------------------------------------
// Reviews — POST /v1/jobs/:id/reviews
// ---------------------------------------------------------------------

export interface ReviewView {
  id: string;
  jobId: string;
  reviewerId: string;
  professionalId: string;
  overallRating: number;
  text: string | null;
  moderationStatus: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Professional — GET /v1/pro/verification
// ---------------------------------------------------------------------

export type VerificationStatusView =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "EXPIRED";

export interface ProfessionalVerificationView {
  id: string;
  userId: string;
  legalName: string;
  displayName: string;
  profilePhotoRef: string | null;
  verificationStatus: VerificationStatusView | string;
  presenceState: ProPresenceState;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

/** Every non-2xx response from apps/api uses this envelope. */
export interface ApiErrorResponse {
  code: string;
  message: string;
  requestId?: string;
}

export type { JobActor };

// ---------------------------------------------------------------------
// Match & offer payloads — the two cards the marketplace turns on
// ---------------------------------------------------------------------

/**
 * Factual, enumerated trust facts only. There is deliberately no numeric
 * "trust score" field anywhere in this file — /CLAUDE.md §3 forbids
 * fabricating one, and an enumerated list cannot be quietly turned into one.
 */
export type VerificationBadgeKind =
  | "IDENTITY_VERIFIED"
  | "BUSINESS_VERIFIED"
  | "LICENSE_VERIFIED"
  | "CREDENTIALS_CHECKED"
  | "EXTERNAL_REPUTATION_LINKED";

/**
 * Reputation imported from an external platform. Always carried separately
 * from PRO NOW's own rating and never merged into a single score
 * (/docs/10-TRUST-VERIFICATION.md §Reputation import).
 */
export interface ExternalReputationView {
  source: string;
  ratingAverage: number | null;
  ratingCount: number | null;
  profileUrl: string | null;
}

export interface ProfessionalSummaryView {
  id: string;
  displayName: string;
  profilePhotoUrl: string | null;
  verifications: VerificationBadgeKind[];
  /** Jobs completed through PRO NOW. Never an imported or invented count. */
  proNowCompletedJobs: number;
  /** null until there are enough PRO NOW reviews to show an average. */
  proNowRatingAverage: number | null;
  proNowRatingCount: number;
  externalReputation: ExternalReputationView | null;
}

/**
 * A real ETA. `isRouteBased: false` means it came from the coarse fallback
 * (haversine + average speed), not a routing provider — the UI MUST then
 * present it as approximate rather than as a route ETA
 * (see providers/maps-routing-provider.ts).
 */
export interface EtaView {
  etaSeconds: number;
  distanceMeters: number | null;
  isRouteBased: boolean;
  computedAt: string;
}

/**
 * What the customer is committing to at the moment of match. Structured
 * numbers only — the Hebrew explanation of each pricing model is client
 * copy, not an API field, so wording can change without an API release.
 *
 * Exactly the fields relevant to `priceModel` are populated.
 */
export interface PriceQuoteView {
  priceModel: PriceModel;
  currency: string;
  /** FIXED */
  fixedTotalMinorUnits?: number | null;
  /** VISIT_QUOTE — the visit fee is knowable; the job total is not, yet. */
  visitFeeMinorUnits?: number | null;
  /** HOURLY — rate per hour plus the minimum charged duration. */
  hourlyRateMinorUnits?: number | null;
  minimumBillableMinutes?: number | null;
  /** DISTANCE_TIME — fixed base, per-kilometre rate, and a fare floor. */
  baseMinorUnits?: number | null;
  perKmMinorUnits?: number | null;
  minimumFareMinorUnits?: number | null;
}

/** GET /v1/jobs/:id/match — everything the customer's match card renders. */
export interface JobMatchView {
  jobId: string;
  status: JobState;
  serviceNameHe: string;
  professional: ProfessionalSummaryView;
  /** null when no ETA has been computed yet — never substitute a guess. */
  eta: EtaView | null;
  price: PriceQuoteView;
}

/** GET /v1/pro/offers/current — everything the professional's offer card renders. */
export interface OfferCardView {
  offerId: string;
  jobId: string;
  serviceNameHe: string;
  serviceCode: string;
  priceModel: PriceModel;
  currency: string;
  /** Server-authoritative deadline; the client only counts down to it. */
  expiresAt: string;
  offeredAt: string;
  /** Travel from the professional's current position to the customer. */
  eta: EtaView | null;
  /**
   * Expected payout, shown BEFORE accepting whenever the amount is knowable
   * (/CLAUDE.md §3 — transparent provider payout). null means genuinely not
   * knowable yet (e.g. VISIT_QUOTE before the quote exists); the UI must say
   * so rather than display a plausible number.
   */
  expectedPayoutMinorUnits: number | null;
  /** True when the payout depends on outcome (hours worked, final quote). */
  payoutIsEstimate: boolean;
  /**
   * Approximate area only. The exact address is released after acceptance —
   * pre-assignment location precision is a privacy rule
   * (/docs/12-PRIVACY.md), not a UI nicety.
   */
  customerAreaLabel: string;
  jobDescription: string | null;
}
