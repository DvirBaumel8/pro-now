# 12 — Privacy

## Location — Privacy by Design, not a pre-launch patch
`OFFLINE` → **zero** dispatch location tracking. The moment a professional
goes `ONLINE`: "To send you nearby jobs and calculate arrival times, PRO
NOW uses your location while you're available for work." Active job →
location sufficient for ETA/job-flow, with a battery-aware cadence.

This mirrors Apple's requirement that location use be directly tied to
app functionality with a clear explanation and explicit consent, and that
background location be scoped to the app's actual purpose — treated here
as a product principle from day one, not an App Store checklist item added
at the end.

## Data minimization & retention
Location retention is minimized and configurable (exact period is an open
business/legal decision, `/docs/18-ROADMAP.md`). No precise professional
location is ever shown publicly beyond genuine product need (e.g., never
before assignment). Account deletion/export workflows are designed before
launch, not bolted on after.

## Consent & documentation
Consent text is reviewed before launch. Vendor DPAs are in place where
required. Analytics events exclude unnecessary PII (see
`/docs/13-ADMIN-OPS.md §Analytics` for the event shape). Crash logs scrub
sensitive fields. Raw KYC documents never appear in analytics or support
screenshots/tools.

## Sensitive document isolation
Credential/license/identity documents are stored and served separately
from public profile media, via short-lived signed URLs, accessible only to
authorized reviewers — see `/docs/10-TRUST-VERIFICATION.md` and
`/docs/11-SECURITY.md`.
