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

## When the money moves (decided 2026-09-23)

Amit, setting it:

> "האישור הראשון זה אישור תשלום אבחון והגעה לבית הלקוח, ברגע שסיים את
> האבחון אז מגיע שלב ההצעת מחיר לפני העבודה. הלקוח מחליט אם לאשר לפני לפי
> כל הפרטים וההצעת מחיר. ברגע שלחץ אישור הכסף כאילו עובר אבל מגיע רק
> בסיום ביצוע העבודה — שלא יקרה מצב שהלקוח פתאום מתחרט אחרי ביצוע העבודה
> ואז אין מה לעשות."

Three moments, and each one protects one side:

| Job state | Call | What it protects |
| --- | --- | --- |
| `PRO_ARRIVED` | visit fee charged | the professional drove out and looked, and that has a price whether or not work follows |
| `WAITING_QUOTE_APPROVAL` → approved | `authorize` — the amount is **held** | the professional is not working against a promise |
| `COMPLETION_PENDING` → customer confirms | `capture` | the money does not leave until the customer agrees the job was done |

Both halves are load-bearing. A capture on approval lets a customer be
charged for work that was never finished; a capture with no prior hold
lets a customer walk away after three hours in their kitchen. Neither is
a marketplace anybody uses twice.

This is a decision about WHEN `authorize` and `capture` are called. It
names no vendor and changes nothing above: the provider interface
already has both, and the Israeli marketplace payment vendor stays open.

`packages/types/src/payment-moments.ts` is this table in code, with the
sentences each side is shown at each moment, and
`paymentFlowViolations` asserts the ordering against `VISIT_ORDER` —
including that none of the sentences may claim a card has been charged
while no provider exists.

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
