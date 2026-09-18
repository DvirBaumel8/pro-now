# 11 — Security

## Baseline
Least privilege everywhere. Secrets only via environment/secret manager —
never committed, never shipped inside a mobile bundle. RBAC for every admin
action. Encryption in transit and at rest via infrastructure/provider
capabilities. Sensitive documents (KYC, credentials) served only via
short-lived signed URLs, isolated from public profile media. Upload type/
size validation plus a malware-scanning strategy. OTP and API rate
limiting, tuned per endpoint risk — auth, matching, messaging, location,
and offer-accept are specially protected. Authorization checked on every
object access (no IDOR). Every privileged admin action is audit-logged.
Dependency/security scanning runs in CI.

## OWASP-mapped review checklist (release gate — see `/docs/15-QA-TEST-PLAN.md`)
IDOR tests · RBAC tests · OTP brute-force/rate limits · session revoke/
rotation · admin MFA decision · signed-upload URL scope · malicious-file
strategy · PII-in-logs scan · secret scan · dependency scan · webhook
signature validation · SQL injection (ORM + validation) · admin XSS · CSRF
where relevant · SSRF around any URL-fetching integration · mass-assignment
protection · abuse protection on any financial endpoint.

## Payments
Card data is handled by the payment provider, never by PRO NOW servers,
wherever the vendor's integration allows it. Webhook handlers are
idempotent and signature-verified before any state change.

## Production launch gate
Legal/privacy review is required before production launch — this is a
human sign-off, not a code check, and is tracked in
`/docs/17-APP-STORES.md §Go/No-Go`.
