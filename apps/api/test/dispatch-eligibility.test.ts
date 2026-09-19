import { describe, it, expect } from "vitest";
import { evaluateEligibility, filterEligible, type DispatchCandidate } from "../src/domain/dispatch/eligibility";

const baseCandidate: DispatchCandidate = {
  professionalId: "pro_1",
  presenceState: "AVAILABLE",
  accountVerificationStatus: "APPROVED",
  locationAgeSeconds: 10,
  serviceApproved: true,
  requiredCredentialsCurrent: true,
  insideServiceArea: true,
  alreadyAssignedToAnotherJob: false,
  isRiskLimitedForService: false,
  isBlockedAgainstCustomer: false,
  equipmentMatches: true,
  marketActive: true,
};

const policy = { locationFreshnessThresholdSeconds: 90 };

describe("dispatch eligibility — /docs/08-DISPATCH-ENGINE.md §Pipeline step 2", () => {
  it("is eligible when every condition holds", () => {
    const result = evaluateEligibility(baseCandidate, policy);
    expect(result.eligible).toBe(true);
    expect(result.reasonCodes).toEqual([]);
  });

  it("is ineligible with an explainable reason when location is stale", () => {
    const result = evaluateEligibility({ ...baseCandidate, locationAgeSeconds: 999 }, policy);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain("LOCATION_STALE");
  });

  it("removes only the affected service when a required credential is expired (not the whole account)", () => {
    const result = evaluateEligibility({ ...baseCandidate, requiredCredentialsCurrent: false }, policy);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toEqual(["CREDENTIAL_EXPIRED_OR_MISSING"]);
  });

  it("excludes a professional already assigned to another job", () => {
    const result = evaluateEligibility({ ...baseCandidate, alreadyAssignedToAnotherJob: true }, policy);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain("ALREADY_ASSIGNED");
  });

  it("excludes a blocked customer/professional pair without needing a reason exposed to either party", () => {
    const result = evaluateEligibility({ ...baseCandidate, isBlockedAgainstCustomer: true }, policy);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain("BLOCKED_RELATIONSHIP");
  });

  it("excludes a SUSPENDED account even when presence says AVAILABLE", () => {
    const result = evaluateEligibility({ ...baseCandidate, accountVerificationStatus: "SUSPENDED" }, policy);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain("ACCOUNT_NOT_APPROVED");
  });

  it("excludes an account still mid-onboarding (IDENTITY_VERIFIED is not APPROVED)", () => {
    const result = evaluateEligibility({ ...baseCandidate, accountVerificationStatus: "IDENTITY_VERIFIED" }, policy);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain("ACCOUNT_NOT_APPROVED");
  });

  it("filterEligible returns a result per candidate, never silently drops one", () => {
    const results = filterEligible([baseCandidate, { ...baseCandidate, professionalId: "pro_2", marketActive: false }], policy);
    expect(results).toHaveLength(2);
    expect(results[1].eligible).toBe(false);
    expect(results[1].reasonCodes).toContain("MARKET_NOT_ACTIVE");
  });
});
