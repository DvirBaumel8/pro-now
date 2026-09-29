import type { Money } from "../money";

/**
 * Vendor-neutral payment interface — see /docs/09-PAYMENTS.md.
 * No feature may special-case a specific processor's SDK outside an
 * adapter that implements this interface. The real Israeli marketplace
 * vendor is an open business/legal decision (see /docs/18-ROADMAP.md);
 * `SandboxPaymentProvider` in apps/api is the only implementation wired
 * by default, and it is loudly labeled non-production everywhere it
 * surfaces.
 */
export interface AuthorizeInput {
  jobId: string;
  customerId: string;
  amount: Money;
  paymentMethodToken: string;
  idempotencyKey: string;
}

export interface PaymentAuthResult {
  paymentId: string;
  status: "AUTHORIZED" | "FAILED";
  providerReference: string;
  failureReason?: string;
}

export interface PaymentCaptureResult {
  paymentId: string;
  status: "CAPTURED" | "FAILED";
  capturedAmount: Money;
  failureReason?: string;
}

export interface RefundResult {
  refundId: string;
  status: "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED";
  refundedAmount: Money;
}

export interface PayoutKycInput {
  professionalId: string;
  legalName: string;
  bankDetailsToken: string;
}

export interface PayoutAccount {
  payoutAccountId: string;
  status: "PENDING" | "ACTIVE" | "RESTRICTED";
}

export interface PayoutResult {
  payoutId: string;
  status: "PAID" | "FAILED" | "PENDING";
  amount: Money;
}

export interface PaymentProvider {
  readonly vendorName: string;
  readonly isSandbox: boolean;
  authorize(input: AuthorizeInput): Promise<PaymentAuthResult>;
  capture(paymentId: string, amount?: Money): Promise<PaymentCaptureResult>;
  refund(paymentId: string, amount?: Money, reason?: string): Promise<RefundResult>;
  createPayoutAccount(input: PayoutKycInput): Promise<PayoutAccount>;
  payout(payoutAccountId: string, amount: Money): Promise<PayoutResult>;
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string>): boolean;
}
