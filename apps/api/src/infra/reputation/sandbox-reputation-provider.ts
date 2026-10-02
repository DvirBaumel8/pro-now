import type {
  ExternalReputationProvider,
  ExternalReputationSnapshot,
} from "@pro-now/types";

/**
 * SANDBOX — returns no external profiles. See
 * /docs/10-TRUST-VERIFICATION.md: "If integration is not ready, UI hides
 * external reputation rather than using mock production data." This
 * adapter enforces exactly that by always returning an empty result.
 */
export class SandboxExternalReputationProvider implements ExternalReputationProvider {
  readonly vendorName = "sandbox-reputation";
  readonly isSandbox = true;

  async findProfile(): Promise<ExternalReputationSnapshot[]> {
    return [];
  }

  async refreshSnapshot(): Promise<ExternalReputationSnapshot | null> {
    return null;
  }
}
