# Source package

This folder preserves the pre-development package exactly as authored in
Google Drive, before any code existed, for traceability. Two documents are
long enough that they are kept condensed here (`00-claude-handoff-readme.md`,
`01-master-product-bible.md`); the remaining five were read in full and
distilled directly into the numbered working docs (`/docs/00-*.md` …
`/docs/19-*.md`) rather than duplicated verbatim, to avoid two copies
drifting apart. Their original locations (read-only reference, not a runtime
dependency):

| Document | Distilled into |
|---|---|
| PRO NOW — Claude Handoff README v1.0 | `_source/00-claude-handoff-readme.md`, `/CLAUDE.md` |
| PRO NOW — Master Product Bible v1.0 | `_source/01-master-product-bible.md`, `/docs/00-VISION.md`, `/docs/01-PRD.md` |
| PRO NOW — Claude Code Build Specification v1.0 | `/docs/02-UX-FLOWS.md` … `/docs/19-CLAUDE-RULES.md` (primary technical source) |
| PRO NOW — UX/UI Design Specification v1.0 | `/docs/03-DESIGN-SYSTEM.md`, `/docs/02-UX-FLOWS.md` |
| PRO NOW — Database, API & State Machines v1.0 | `/docs/05-DATABASE.md`, `/docs/06-API-SPEC.md`, `/docs/07-JOB-STATE-MACHINE.md`, `/docs/08-DISPATCH-ENGINE.md` |
| PRO NOW — QA, Security & Launch Checklist v1.0 | `/docs/15-QA-TEST-PLAN.md`, `/docs/11-SECURITY.md` |
| PRO NOW — Final Pre-Development Decisions v1.0 | `/docs/01-PRD.md §Freeze`, `/docs/18-ROADMAP.md §Open Decisions` |
| PRO NOW — Service Catalog & Pilot Matrix v1.0 (sheet) | `/docs/09b-SERVICE-CATALOG.md`, `apps/api/prisma/seed.ts` |

Source of truth precedence when anything conflicts is defined in `/CLAUDE.md
§1`, exactly as the Handoff README specified.
