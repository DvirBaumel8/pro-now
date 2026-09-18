# 16 — Deployment

## Environments
`local` (docker-compose Postgres+PostGIS+Redis) → `test` (CI, ephemeral) →
`staging` → `production`. Each has fully separate vendor keys, databases,
buckets, push credentials and webhook endpoints. **Staging can never send a
production payout or push notification.**

## CI (on every PR)
Install locked deps → lint → typecheck → unit tests → integration tests
where feasible → migration validation → security/dependency scan → build
affected apps only (workspace-aware).

## CD
Production deploy is protected (manual gate or required reviews).
Migrations follow an explicit rollback/forward-fix plan. Release metadata
is tied to the commit SHA. Mobile OTA updates are only pushed within safe
version-compatibility rules (never an OTA that silently breaks an older
build's API contract).

## Production checklist
DNS/domain/backend · TLS · DB backups with point-in-time recovery · Redis
durability expectations documented · object-storage lifecycle rules ·
secret manager wired · production vendor keys separated from staging ·
webhook endpoints registered per environment · push certs/keys per
environment · maps API key restrictions/quotas · admin access reviewed ·
monitoring alerts live · backup-restore actually tested (not assumed) ·
migration dry run · rollback/forward-fix plan documented · feature flags
default to the safe state · only the pilot market is activated at launch.
