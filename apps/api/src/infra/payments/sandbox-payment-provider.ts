import type {
  PaymentProvider,
  AuthorizeInput,
  PaymentAuthResult,
  PaymentCaptureResult,
  RefundResult,
  PayoutKycInput,
  PayoutAccount,
  PayoutResult,
} from "@pro-now/types";
import { money } from "@pro-now/types";

/**
 * SANDBOX — NOT FOR PRODUCTION.
 *
 * Deterministic in-memory simulation of a marketplace payment provider so
 * the rest of the system (ledger, webhooks, admin UI) can be built and
 * tested against a stable contract before a real Israeli payment vendor
 * is selected (open business/legal decision — /docs/18-ROADMAP.md). Every
 * public surface (logs, admin dashboard) that shows this provider's name
 * must render `isSandbox === true` visibly, per /CLAUDE.md §"never mark a
 * mock as production".
 */
export class SandboxPaymentProvider implements PaymentProvider {
  readonly vendorName = "sandbox-payments";
  readonly isSandbox = true;

  private readonly authorizedPayments = new Map<string, AuthorizeInput>();

  async authorize(input: AuthorizeInput): Promise<PaymentAuthResult> {
    const paymentId = `sandbox_pay_${input.idempotencyKey}`;
    this.authorizedPayments.set(paymentId, input);
    return {
      paymentId,
      status: "AUTHORIZED",
      providerReference: `sandbox_ref_${paymentId}`,
    };
  }

  async capture(paymentId: string, amount?: import("@pro-now/types").Money): Promise<PaymentCaptureResult> {
    const original = this.authorizedPayments.get(paymentId);
    const capturedAmount = amount ?? original?.amount ?? money(0);
    return { paymentId, status: "CAPTURED", capturedAmount };
  }

  async refund(paymentId: string, amount?: import("@pro-now/types").Money): Promise<RefundResult> {
    const refundedAmount = amount ?? money(0);
    return { refundId: `sandbox_refund_${paymentId}`, status: "REFUNDED", refundedAmount };
  }

  async createPayoutAccount(input: PayoutKycInput): Promise<PayoutAccount> {
    return { payoutAccountId: `sandbox_payout_acct_${input.professionalId}`, status: "ACTIVE" };
  }

  async payout(payoutAccountId: string, amount: import("@pro-now/types").Money): Promise<PayoutResult> {
    return { payoutId: `sandbox_payout_${payoutAccountId}_${Date.now()}`, status: "PAID", amount };
  }

  verifyWebhookSignature(): boolean {
    // Sandbox never receives real webhooks; always "valid" in dev/test.
    return true;
  }
}
