/**
 * Service-specific credential evaluation — see /docs/10-TRUST-VERIFICATION.md
 * §Onboarding step 4:
 *
 *   "Expired/revoked required credentials automatically remove the affected
 *    service from dispatch eligibility."
 *
 * and /CLAUDE.md §3:
 *
 *   "Service-specific verification. A professional is dispatch-eligible per
 *    *service*, not merely per account."
 *
 * This is a pure function over plain data so the rule can be tested without a
 * database — the rule itself is what the marketplace's trust promise rests on,
 * so it must be provable, not merely reviewed.
 *
 * Why this file exists at all: the rule used to live inline inside
 * `dispatch-service.ts` as
 *
 *   pro.credentials.length === 0 || (pro.credentials[0]?.status === "VERIFIED" && ...)
 *
 * which had three defects, each of which would have dispatched an
 * insufficiently-verified professional to a customer's home:
 *
 *   1. It never consulted `ServiceRequirement` at all, so a professional with
 *      NO credential for a service that mandates one was treated as current
 *      ("length === 0" short-circuits to eligible).
 *   2. It only ever examined `credentials[0]`, so with two required
 *      credentials an expired second one passed unnoticed.
 *   3. It ignored `ServiceRequirement.mandatory`, so optional and mandatory
 *      requirements could not be told apart.
 */

/** Credential kinds a `ProfessionalCredential.type` can hold (schema.prisma). */
export const CREDENTIAL_REQUIREMENT_KINDS = ["LICENSE", "CERTIFICATE", "INSURANCE"] as const;
export type CredentialRequirementKind = (typeof CREDENTIAL_REQUIREMENT_KINDS)[number];

/**
 * A row of `ServiceRequirement`. `requirement` is a string such as
 * "LICENSE:ELECTRICAL", "INSURANCE" or "IDENTITY" — the part before the colon
 * is the kind, the part after (when present) is the specialisation.
 */
export interface ServiceRequirementInput {
  requirement: string;
  mandatory: boolean;
}

/** A row of `ProfessionalCredential`, already scoped to one service. */
export interface ProfessionalCredentialInput {
  type: string;
  status: string;
  expiresAt: Date | null;
}

export interface CredentialEvaluation {
  /** True only when every MANDATORY credential requirement is met. */
  satisfied: boolean;
  /** Mandatory requirements with no matching credential on file at all. */
  missing: string[];
  /** Requirements matched by a credential whose `expiresAt` is in the past. */
  expired: string[];
  /** Requirements matched by a credential that is not yet VERIFIED. */
  unverified: string[];
  /**
   * Requirements that are NOT credential-shaped (e.g. "IDENTITY", "BUSINESS").
   * They are account-level and are evaluated from `verificationStatus`, not
   * from credential rows — returned rather than silently dropped so the
   * caller can never mistake "not handled here" for "satisfied".
   */
  accountLevelRequirements: string[];
}

/** "LICENSE:ELECTRICAL" -> "LICENSE" */
function requirementKind(requirement: string): string {
  const [kind] = requirement.split(":");
  return (kind ?? "").trim().toUpperCase();
}

function isCredentialRequirement(requirement: string): boolean {
  return (CREDENTIAL_REQUIREMENT_KINDS as readonly string[]).includes(requirementKind(requirement));
}

function isExpired(credential: ProfessionalCredentialInput, now: Date): boolean {
  // A credential with no expiry never expires — that is a real case
  // (e.g. a lifetime certificate), not missing data.
  return credential.expiresAt !== null && credential.expiresAt.getTime() <= now.getTime();
}

/**
 * Evaluates one professional's credentials for ONE service.
 *
 * `credentials` must already be scoped to the service being dispatched.
 * `now` is injected rather than read from the clock so expiry is testable at
 * an exact boundary.
 *
 * A credential satisfies a requirement when its `type` matches the
 * requirement's kind, its status is VERIFIED, and it has not expired. Every
 * mandatory requirement must be satisfied; a non-mandatory requirement never
 * blocks dispatch, but a failure on one is still reported so Ops can see it.
 */
export function evaluateServiceCredentials(
  requirements: ServiceRequirementInput[],
  credentials: ProfessionalCredentialInput[],
  now: Date = new Date()
): CredentialEvaluation {
  const missing: string[] = [];
  const expired: string[] = [];
  const unverified: string[] = [];
  const accountLevelRequirements: string[] = [];

  let mandatoryFailure = false;

  for (const requirement of requirements) {
    if (!isCredentialRequirement(requirement.requirement)) {
      accountLevelRequirements.push(requirement.requirement);
      continue;
    }

    const kind = requirementKind(requirement.requirement);
    const matching = credentials.filter((c) => c.type.trim().toUpperCase() === kind);

    if (matching.length === 0) {
      missing.push(requirement.requirement);
      if (requirement.mandatory) mandatoryFailure = true;
      continue;
    }

    // The requirement is met if ANY matching credential is verified and
    // current — a professional may legitimately hold an old expired licence
    // alongside the renewed one.
    const satisfying = matching.find((c) => c.status.trim().toUpperCase() === "VERIFIED" && !isExpired(c, now));
    if (satisfying) continue;

    if (matching.some((c) => isExpired(c, now))) {
      expired.push(requirement.requirement);
    } else {
      unverified.push(requirement.requirement);
    }
    if (requirement.mandatory) mandatoryFailure = true;
  }

  return {
    satisfied: !mandatoryFailure,
    missing,
    expired,
    unverified,
    accountLevelRequirements,
  };
}

/**
 * Account-level gate. `ProfessionalProfile.verificationStatus` must be
 * APPROVED for the professional to receive any dispatch at all — LIMITED,
 * SUSPENDED, REVERIFY_REQUIRED, REJECTED and every in-progress onboarding
 * state must not (/docs/10-TRUST-VERIFICATION.md §Verification status model).
 */
export function isAccountDispatchable(verificationStatus: string): boolean {
  return verificationStatus.trim().toUpperCase() === "APPROVED";
}
