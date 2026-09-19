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
