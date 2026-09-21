/*
 * LOADING .env, FOR LOCAL DEVELOPMENT ONLY.
 *
 * `packages/config` reads everything from `process.env` and validates it,
 * on the stated assumption that something else has populated it — a secret
 * manager in staging and production. Locally that something is this file,
 * and until it existed nothing read `.env` at all: the documented setup
 * ("cp .env.example .env, then npm run dev:api") could not work, because
 * the build container had its variables exported in the shell and never
 * needed the file.
 *
 * `dotenv` never overwrites a variable that is already set, so a real
 * environment still wins and this is inert wherever `.env` is absent.
 *
 * Two paths because the repository documents the file at the root while
 * every tool that needs it — the Prisma CLI included — runs with
 * `apps/api` as the working directory. Whichever exists is used; if both
 * do, the nearer one wins.
 *
 * Import this FIRST, before anything that reads config.
 */
import { config } from "dotenv";

config({ path: [".env", "../../.env"] });
