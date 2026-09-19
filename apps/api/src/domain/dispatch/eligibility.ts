/**
 * Dispatch eligibility filter — see /docs/08-DISPATCH-ENGINE.md §Pipeline
 * step 2. Pure function over plain data so it is trivially unit-testable
 * without a database; the route/service layer is responsible for loading
 * these candidates (PostGIS pre-filter happens in SQL before this runs).
 */

import { isAccountDispatchable } from "./credential-eligibility";

export interface DispatchCandidate {
  professionalId: string;
  presenceState: string; // expect "AVAILABLE"
  /**
   * `ProfessionalProfile.verificationStatus`. Only APPROVED may be
   * dispatched — see /docs/10-TRUST-VERIFICATION.md §Verification status
   * model. Being "AVAILABLE" is a presence fact, not a trust fact.
   */
  accountVerificationStatus: string;
  locationAgeSeconds: number;
  serviceApproved: boolean;
  requiredCredentialsCurrent: boolean;
  insideServiceArea: boolean;
  alreadyAssignedToAnotherJob: boolean;
  isRiskLimitedForService: boolean;
  isBlockedAgainstCustomer: boolean;
  equipmentMatches: boolean;
  marketActive: boolean;
}

export interface EligibilityPolicy {
  locationFreshnessThresholdSeconds: number;
}

export interface EligibilityResult {
  professionalId: string;
  eligible: boolean;
  reasonCodes: string[];
}

/**
 * Returns an explainable result per candidate — never a single opaque
 * boolean — so Ops can see exactly why a professional was excluded
 * (see /docs/05-DATABASE.md §Professional service eligibility).
 */
export function evaluateEligibility(
  candidate: DispatchCandidate,
  policy: EligibilityPolicy
): EligibilityResult {
  const reasonCodes: string[] = [];

  if (candidate.presenceState !== "AVAILABLE") reasonCodes.push("NOT_AVAILABLE");
  if (!isAccountDispatchable(candidate.accountVerificationStatus)) reasonCodes.push("ACCOUNT_NOT_APPROVED");
  if (candidate.locationAgeSeconds > policy.locationFreshnessThresholdSeconds) reasonCodes.push("LOCATION_STALE");
  if (!candidate.serviceApproved) reasonCodes.push("SERVICE_NOT_APPROVED");
  if (!candidate.requiredCredentialsCurrent) reasonCodes.push("CREDENTIAL_EXPIRED_OR_MISSING");
  if (!candidate.insideServiceArea) reasonCodes.push("OUTSIDE_SERVICE_AREA");
  if (candidate.alreadyAssignedToAnotherJob) reasonCodes.push("ALREADY_ASSIGNED");
  if (candidate.isRiskLimitedForService) reasonCodes.push("RISK_LIMITED");
  if (candidate.isBlockedAgainstCustomer) reasonCodes.push("BLOCKED_RELATIONSHIP");
  if (!candidate.equipmentMatches) reasonCodes.push("EQUIPMENT_MISMATCH");
  if (!candidate.marketActive) reasonCodes.push("MARKET_NOT_ACTIVE");

  return {
    professionalId: candidate.professionalId,
    eligible: reasonCodes.length === 0,
    reasonCodes,
  };
}

export function filterEligible(
  candidates: DispatchCandidate[],
  policy: EligibilityPolicy
): EligibilityResult[] {
  return candidates.map((c) => evaluateEligibility(c, policy));
}
