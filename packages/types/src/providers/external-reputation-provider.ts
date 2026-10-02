/**
 * External reputation — see /docs/10-TRUST-VERIFICATION.md. Never scrape.
 * Never merge with internal PRO NOW ratings. If no real integration is
 * configured, the caller must hide this block entirely rather than fake it.
 */
export interface ExternalReputationSnapshot {
  source: "GOOGLE" | "OTHER";
  externalProfileId: string;
  displayName: string;
  rating: number | null;
  reviewCount: number | null;
  profileUrl: string | null;
  lastVerifiedAt: string | null;
}

export interface ExternalReputationProvider {
  readonly vendorName: string;
  readonly isSandbox: boolean;
  findProfile(query: string): Promise<ExternalReputationSnapshot[]>;
  refreshSnapshot(externalProfileId: string): Promise<ExternalReputationSnapshot | null>;
}
