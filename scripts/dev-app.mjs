#!/usr/bin/env node
/**
 * `npm run dev:app` — the real app, locally: the API and the web app side by
 * side, on one origin (http://localhost:5180; Vite proxies /api to :4000).
 *
 * Needs `docker compose up -d` (Postgres, Mailpit, the mock Google issuer)
 * and a migrated, seeded database. Sign-in emails land in Mailpit:
 * http://localhost:8025.
 *
 * PUBLIC_URL is the web app's address here, so the links in sign-in emails
 * and Google's redirect come back through the app, the way they will when
 * Fastify serves it in production.
 */
import { spawn } from "node:child_process";

const WEB = "http://localhost:5180";
const children = [
  spawn("npm", ["run", "dev:api"], { stdio: "inherit", env: { ...process.env, PUBLIC_URL: WEB } }),
  spawn("npm", ["run", "dev:web"], { stdio: "inherit", env: process.env }),
];

const stop = () => children.forEach((c) => c.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const c of children) c.on("exit", (code) => code && code !== 143 && (stop(), process.exit(code)));

console.log(`\n  PRO NOW → ${WEB}   (sign-in emails: http://localhost:8025)\n`);
