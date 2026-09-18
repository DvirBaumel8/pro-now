# 09 — Payments & Ledger

## Ground rule
**No vendor is locked in code.** `packages/types/src/providers/payment-provider.ts`
defines the interface every implementation (sandbox or real) must satisfy.
Do not build any feature that special-cases a specific processor's SDK
outside its adapter. The Israeli marketplace payment vendor is an
intentionally open business/legal decision — see `/docs/18-ROADMAP.md`.

## Required capability surface
```ts
interface PaymentProvider {
  authorize(input: AuthorizeInput): Promise<PaymentAuthResult>;
  capture(paymentId: string, amount?: Money): Promise<PaymentCaptureResult>;
  refund(paymentId: string, amount?: Money, reason?: string): Promise<RefundResult>;
  createPayoutAccount(professionalId: string, kyc: PayoutKycInput): Promise<PayoutAccount>;
  payout(payoutAccountId: string, amount: Money): Promise<PayoutResult>;
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string,string>): boolean;
  handleWebhookEvent(event: unknown): Promise<void>;
}
```
Must support: customer authorization/capture, platform fee split, provider
payable amount, refund (full/partial), payout, failure/retry, webhook
verification, reconciliation, and provider KYC/payout requirements.

## Ledger
Double-entry-style, immutable `ledger_entries`. Every professional-facing
earnings number (today/week/month, net/hour) is *derived from the ledger*,
never from an ad-hoc sum of `jobs` rows. Webhook handlers are idempotent
(unique `provider_event_id`); the server never trusts a client's "payment
succeeded" claim.

## Pricing archetypes → the same dispatch/job engine via adapters
- **FIXED** — beauty/grooming style services: exact price + fees known
  upfront.
- **VISIT_QUOTE** — plumbing/electrical/handyman-adjacent: visit/diagnostic
  fee known upfront; additional work requires an explicit customer-approved
  quote before any additional charge.
- **HOURLY** — cleaning/handyman: rate + minimum + server-authoritative
  timer.
- **DISTANCE_TIME** — independent courier: pickup/dropoff + a transparent
  pricing basis.

All four feed the same `Job`/dispatch pipeline through a
`PricingAdapter` interface (`apps/api/src/domain/pricing/*`) — there is one
job entity, not four.

## Sandbox behavior (until a vendor is chosen)
`apps/api/src/infra/payments/sandbox-payment-provider.ts` simulates
authorize/capture/refund/payout deterministically and is wired by default
in `local`/`test`. It is loudly labeled `SANDBOX — NOT FOR PRODUCTION` in
logs and in the admin dashboard, per the "never mark a mock as production"
rule in `/CLAUDE.md`.
