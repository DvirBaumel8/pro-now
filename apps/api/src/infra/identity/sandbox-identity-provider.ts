import type {
  IdentityVerificationProvider,
  IdentityVerificationInput,
  IdentityVerificationResult,
} from "@pro-now/types";

/**
 * SANDBOX — NOT FOR PRODUCTION. See /docs/10-TRUST-VERIFICATION.md:
 * "Do not build proprietary biometric verification for MVP." This adapter
 * exists purely so onboarding, credential-gating and dispatch-eligibility
 * logic can be built and tested before a compliant KYC vendor is chosen.
 */
export class SandboxIdentityProvider implements IdentityVerificationProvider {
  readonly vendorName = "sandbox-identity";
  readonly isSandbox = true;

  private readonly results = new Map<string, IdentityVerificationResult>();

  async submit(input: IdentityVerificationInput): Promise<IdentityVerificationResult> {
    const verificationId = `sandbox_kyc_${input.professionalId}`;
    // Deterministic "always manual review" outcome — sandbox never
    // auto-approves a real professional into production trust state.
    const result: IdentityVerificationResult = {
      verificationId,
      status: "MANUAL_REVIEW",
      nameMatch: null,
      livenessPassed: null,
      documentValid: null,
      reasonCodes: ["SANDBOX_ALWAYS_MANUAL_REVIEW"],
    };
    this.results.set(verificationId, result);
    return result;
  }

  async getStatus(verificationId: string): Promise<IdentityVerificationResult> {
    const existing = this.results.get(verificationId);
    if (existing) return existing;
    return {
      verificationId,
      status: "PENDING",
      nameMatch: null,
      livenessPassed: null,
      documentValid: null,
      reasonCodes: [],
    };
  }
}
