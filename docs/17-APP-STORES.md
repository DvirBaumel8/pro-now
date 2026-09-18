# 17 — App Store / Play Store Readiness

App name/icon/splash · privacy policy URL · terms URL · support URL ·
in-app account deletion flow · permission purpose strings written in plain
language (location, camera/photo, notifications) · location justification
tied directly to app functionality (matches `/docs/12-PRIVACY.md`) ·
screenshots · review notes/demo account for reviewers where needed. **No
unsupported claims in store copy** — "licensed", "background-checked",
"100% safe" etc. are only ever used if the exact underlying check is true
and current, mirroring the trust-badge rule in
`/docs/10-TRUST-VERIFICATION.md`.

Google Play's exemption for physical/real-world services from mandatory
Play Billing is relevant to this business model and should be re-validated
against current Play policy before submission, not assumed permanently
true.

## Go/No-Go for store submission
Same gate as `/docs/15-QA-TEST-PLAN.md §Go/No-Go`, plus: store listing
content reviewed by a human for accuracy, and demo/reviewer account
credentials prepared and tested end-to-end on both platforms.
