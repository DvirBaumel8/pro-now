/**
 * Pilot market code. Lives under `src/` (not `prisma/seed-data/`) so that
 * runtime code and seed data can share one constant without the API's
 * compiled output reaching outside its `rootDir` — see /CLAUDE.md §6.
 *
 * The real pilot geography is an open business decision
 * (/docs/18-ROADMAP.md §Open Decisions); this value is only the local
 * development market key, not a recommendation.
 */
export const PILOT_MARKET_CODE = "IL-PILOT-DEV";
