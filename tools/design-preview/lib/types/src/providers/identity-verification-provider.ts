/**
 * KYC / identity verification — see /docs/10-TRUST-VERIFICATION.md.
 * "Do not build proprietary biometric verification for MVP." Vendor TBD;
 * only a sandbox adapter ships by default.
 */
export interface IdentityVerificationInput {
  professionalId: string;
  documentImageRef: string; // signed-upload reference, never a raw file in this interface
  selfieImageRef: string;
  declaredLegalName: string;
  declaredDateOfBirth: string;
}

export type IdentityVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "MANUAL_REVIEW";

export interface IdentityVerificationResult {
  verificationId: string;
  status: IdentityVerificationStatus;
  nameMatch: boolean | null;
  livenessPassed: boolean | null;
  documentValid: boolean | null;
  reasonCodes: string[];
}

export interface IdentityVerificationProvider {
  readonly vendorName: string;
  readonly isSandbox: boolean;
  submit(input: IdentityVerificationInput): Promise<IdentityVerificationResult>;
  getStatus(verificationId: string): Promise<IdentityVerificationResult>;
}
