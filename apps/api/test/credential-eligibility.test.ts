import { describe, it, expect } from "vitest";
import {
  evaluateServiceCredentials,
  isAccountDispatchable,
  type ProfessionalCredentialInput,
  type ServiceRequirementInput,
} from "../src/domain/dispatch/credential-eligibility";

/**
 * Epic 3's Definition of Done, stated in /docs/19-CLAUDE-RULES.md and
 * /docs/10-TRUST-VERIFICATION.md §Onboarding step 4: an expired required
 * credential must actually remove that service's dispatch eligibility.
 *
 * These are the tests that bar asks for. They are deliberately written
 * against the boundary conditions that a review reading the old inline
 * version would have waved through.
 */

const NOW = new Date("2026-09-19T12:00:00.000Z");

const licenceRequired: ServiceRequirementInput[] = [
  { requirement: "LICENSE:ELECTRICAL", mandatory: true },
];

function credential(overrides: Partial<ProfessionalCredentialInput> = {}): ProfessionalCredentialInput {
  return {
    type: "LICENSE",
    status: "VERIFIED",
    expiresAt: new Date("2027-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("service credential evaluation — /docs/10-TRUST-VERIFICATION.md §4", () => {
  it("is satisfied when a mandatory licence is verified and unexpired", () => {
    const result = evaluateServiceCredentials(licenceRequired, [credential()], NOW);
    expect(result.satisfied).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.expired).toEqual([]);
    expect(result.unverified).toEqual([]);
  });

  it("REMOVES eligibility when the mandatory licence has expired", () => {
    const result = evaluateServiceCredentials(
      licenceRequired,
      [credential({ expiresAt: new Date("2026-09-01T00:00:00.000Z") })],
      NOW
    );
    expect(result.satisfied).toBe(false);
    expect(result.expired).toEqual(["LICENSE:ELECTRICAL"]);
  });

  it("treats expiry as inclusive — a credential expiring exactly now is expired", () => {
    const result = evaluateServiceCredentials(licenceRequired, [credential({ expiresAt: NOW })], NOW);
    expect(result.satisfied).toBe(false);
    expect(result.expired).toEqual(["LICENSE:ELECTRICAL"]);
  });

  it("still accepts a credential expiring one second from now", () => {
    const result = evaluateServiceCredentials(
      licenceRequired,
      [credential({ expiresAt: new Date(NOW.getTime() + 1000) })],
      NOW
    );
    expect(result.satisfied).toBe(true);
  });

  it("accepts a credential with no expiry date at all (e.g. a lifetime certificate)", () => {
    const result = evaluateServiceCredentials(licenceRequired, [credential({ expiresAt: null })], NOW);
    expect(result.satisfied).toBe(true);
  });

  /**
   * REGRESSION — the defect that made this module necessary. The previous
   * inline rule short-circuited on `credentials.length === 0`, so a
   * professional who had never uploaded a legally-required licence was
   * dispatched as if fully credentialed.
   */
  it("REGRESSION: a mandatory requirement with NO credential on file is NOT satisfied", () => {
    const result = evaluateServiceCredentials(licenceRequired, [], NOW);
    expect(result.satisfied).toBe(false);
    expect(result.missing).toEqual(["LICENSE:ELECTRICAL"]);
  });

  /**
   * REGRESSION — the previous rule only ever read `credentials[0]`, so the
   * second of two mandatory credentials was never checked.
   */
  it("REGRESSION: checks EVERY mandatory requirement, not just the first", () => {
    const requirements: ServiceRequirementInput[] = [
      { requirement: "LICENSE:ELECTRICAL", mandatory: true },
      { requirement: "INSURANCE", mandatory: true },
    ];
    const result = evaluateServiceCredentials(
      requirements,
      [
        credential({ type: "LICENSE" }),
        credential({ type: "INSURANCE", expiresAt: new Date("2026-01-01T00:00:00.000Z") }),
      ],
      NOW
    );
    expect(result.satisfied).toBe(false);
    expect(result.expired).toEqual(["INSURANCE"]);
  });

  it("rejects a credential that is on file but not yet VERIFIED", () => {
    const result = evaluateServiceCredentials(licenceRequired, [credential({ status: "PENDING" })], NOW);
    expect(result.satisfied).toBe(false);
    expect(result.unverified).toEqual(["LICENSE:ELECTRICAL"]);
    expect(result.expired).toEqual([]);
  });

  it("rejects a REJECTED credential", () => {
    const result = evaluateServiceCredentials(licenceRequired, [credential({ status: "REJECTED" })], NOW);
    expect(result.satisfied).toBe(false);
  });

  it("accepts a renewed credential held alongside an old expired one", () => {
    const result = evaluateServiceCredentials(
      licenceRequired,
      [
        credential({ expiresAt: new Date("2025-01-01T00:00:00.000Z") }),
        credential({ expiresAt: new Date("2028-01-01T00:00:00.000Z") }),
      ],
      NOW
    );
    expect(result.satisfied).toBe(true);
  });

  it("a NON-mandatory requirement never blocks dispatch, but is still reported", () => {
    const result = evaluateServiceCredentials(
      [{ requirement: "CERTIFICATE:GAS", mandatory: false }],
      [],
      NOW
    );
    expect(result.satisfied).toBe(true);
    expect(result.missing).toEqual(["CERTIFICATE:GAS"]);
  });

  it("is satisfied when the service requires no credentials at all", () => {
    expect(evaluateServiceCredentials([], [], NOW).satisfied).toBe(true);
  });

  it("does not silently swallow account-level requirements", () => {
    const result = evaluateServiceCredentials(
      [
        { requirement: "IDENTITY", mandatory: true },
        { requirement: "BUSINESS", mandatory: true },
      ],
      [],
      NOW
    );
    // They are evaluated from verificationStatus, not from credential rows —
    // so they must be surfaced, never treated as met by this function.
    expect(result.accountLevelRequirements).toEqual(["IDENTITY", "BUSINESS"]);
    expect(result.missing).toEqual([]);
  });

  it("matches requirement kinds case-insensitively and ignores the specialisation suffix", () => {
    const result = evaluateServiceCredentials(
      [{ requirement: "license:plumbing", mandatory: true }],
      [credential({ type: "license" })],
      NOW
    );
    expect(result.satisfied).toBe(true);
  });

  it("does not let a CERTIFICATE satisfy a LICENSE requirement", () => {
    const result = evaluateServiceCredentials(licenceRequired, [credential({ type: "CERTIFICATE" })], NOW);
    expect(result.satisfied).toBe(false);
    expect(result.missing).toEqual(["LICENSE:ELECTRICAL"]);
  });
});

describe("account-level dispatch gate — /docs/10-TRUST-VERIFICATION.md §Verification status model", () => {
  it("only APPROVED may be dispatched", () => {
    expect(isAccountDispatchable("APPROVED")).toBe(true);
  });

  it.each([
    "DRAFT",
    "IDENTITY_PENDING",
    "IDENTITY_REVIEW",
    "IDENTITY_VERIFIED",
    "BUSINESS_PENDING",
    "CREDENTIALS_PENDING",
    "SERVICE_REVIEW",
    "LIMITED",
    "SUSPENDED",
    "REVERIFY_REQUIRED",
    "REJECTED",
  ])("REGRESSION: %s is never dispatchable", (status) => {
    expect(isAccountDispatchable(status)).toBe(false);
  });
});
