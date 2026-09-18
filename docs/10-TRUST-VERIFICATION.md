# 10 — Trust, Verification & Reputation Engine

Product principle: PRO NOW sends professionals into customers' homes and
locations. Trust is a core marketplace engine, not a profile decoration. A
provider cannot become dispatch-eligible merely by entering a name and
phone number.

## Verification status model
```
DRAFT → IDENTITY_PENDING → IDENTITY_REVIEW → IDENTITY_VERIFIED
      → BUSINESS_PENDING → CREDENTIALS_PENDING → SERVICE_REVIEW
      → APPROVED
APPROVED → LIMITED | SUSPENDED | REVERIFY_REQUIRED | REJECTED (per risk/expiry events)
```
Dispatch eligibility is **service-specific**, not merely account-specific —
an expired required credential removes only the affected service from
eligibility, not the whole account, where possible.

## Onboarding steps (see `/docs/02-UX-FLOWS.md` P01–P12 for screens)
1. **Account** — phone OTP, email where required, legal name, DOB/
   eligibility where lawful, profile photo, terms/privacy/location consent.
2. **Identity verification** — government ID capture through an approved
   vendor, selfie/liveness, identity/name match, document validity/expiry,
   duplicate-identity detection, manual review fallback. **Do not build
   proprietary biometric verification** — integrate a compliant KYC vendor
   after legal/security review (vendor TBD, see `/docs/18-ROADMAP.md`).
3. **Business profile** — trading name, tax/business status where
   applicable, experience, service areas/radius, transport/vehicle,
   languages, categories, equipment, portfolio, public business links.
4. **Professional credentials** — category-dependent: license number/type
   where legally required, certificates/training, insurance where required,
   expiry, issuer, verification status, manual reviewer + audit trail.
   Expired/revoked required credentials automatically remove the affected
   service from dispatch eligibility.
5. **Service setup** — per enabled service: pricing model, price/visit fee,
   estimated duration, equipment checklist, travel radius, add-ons,
   customer-prep notes.
6. **Reputation import/linking** — connect an existing public business
   profile where platform terms/APIs allow. External reputation is always
   displayed **separately** from PRO NOW reputation — never merge into one
   misleading score.

## Customer-facing trust badges (factual only)
`זהות אומתה` · `עסק אומת` · `רישיון מקצועי אומת` (where applicable) ·
`תעודות נבדקו` · `מוניטין חיצוני מקושר` (when verified) · `X עבודות הושלמו
ב-PRO NOW` · `משתמש ותיק` (only with a defined threshold). **Never** display
an arbitrary trust score like "92/100" unless the methodology is validated
and genuinely useful. **Never** claim "100% safe", "background checked" or
"licensed" unless the exact applicable check is current.

## External reputation
Interface `ExternalReputationProvider`. Data model:
`external_reputation_sources, professional_external_profiles,
external_rating_snapshots, external_review_references,
external_profile_verifications` with fields `source,
external_place/profile_id, profile_url, display_name, rating, review_count,
last_verified_at, ownership/link_status, data_provenance,
allowed_display_fields, sync_status`. Candidate integration: official Google
business/place APIs, subject to terms/attribution/authorization. **Never
scrape.** UI always labels source + freshness, e.g.
`Google ★4.9 · 127 ביקורות` next to `PRO NOW ★4.8 · 43 עבודות מאומתות`. If
the integration isn't ready, hide the external reputation block entirely —
never show mock data as if it were live.

## Fraud / impersonation controls
Risk signals: duplicate identity, duplicate payout destination, suspicious
device/account reuse, repeated phone/account patterns, identity/business
mismatch, edited/suspicious credentials, expired credentials, abnormal
location behavior, account-takeover indicators, unusual complaint/refund/
no-show patterns, attempts to move payment off-platform where prohibited.

Risk actions: `ALLOW · STEP_UP_VERIFICATION · MANUAL_REVIEW ·
TEMPORARY_LIMIT · SERVICE_DISABLE · SUSPEND · REVERIFY`. High-impact
enforcement requires an auditable reason code and a human-review/appeal
path — never a silent automatic ban with no trail.

## Re-verification triggers
Credential expiry · material identity/business change · payout change ·
high-risk account event · suspicious login/device · serious complaint ·
long inactivity where appropriate · periodic category-specific requirement.

## Safety center
Both apps: report issue, block counterpart, contact support, active-job
safety shortcut, incident categorization, jurisdiction-reviewed emergency
guidance (never promise an emergency-response capability we do not
operate), full audit trail of critical job events.
