#!/usr/bin/env node
/**
 * What is live at the production URL, read-only (docs/16 §Production).
 *
 *   npm run smoke:prod                       # https://pro-now.onrender.com
 *   npm run smoke:prod -- https://other.host
 *
 * Only GET requests, never signed in: nothing is created, nothing is sent.
 * Each epic is recognised by a route it added: a route that exists answers
 * 401 to a stranger, one that does not answers 404. That tells, after a
 * deploy, whether the build that serves the URL is the one on master.
 * Exits 1 when anything checked is missing or failing.
 */
const base = (process.argv[2] ?? "https://pro-now.onrender.com").replace(/\/$/, "");

async function get(path) {
  const started = Date.now();
  // The free plan sleeps; the first request can take a minute to wake it.
  const res = await fetch(base + path, { redirect: "manual", signal: AbortSignal.timeout(90_000) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, ms: Date.now() - started };
}

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const health = await get("/health");
check("liveness /health", health.status === 200, `${health.status} in ${health.ms} ms`);

const ready = await get("/api/ready");
check(
  "readiness /api/ready (W10)",
  ready.status === 200,
  ready.status === 404 ? "404: the deployed build predates W10" : `${ready.status} ${ready.text.slice(0, 120)}`
);

const page = await get("/");
check("web app /", page.status === 200 && page.text.includes('id="root"'), `${page.status}`);
const csp = page.headers.get("content-security-policy");
const hsts = page.headers.get("strict-transport-security");
check("CSP header (W10)", Boolean(csp), csp ? "present" : "missing");
check("HSTS header (W10)", Boolean(hsts), hsts ?? "missing");

const catalog = await get("/api/v1/catalog");
let services = 0;
try {
  // { marketCode, departments: [{ categories: [{ services: [...] }] }] }
  for (const d of JSON.parse(catalog.text).departments ?? []) for (const c of d.categories ?? []) services += c.services?.length ?? 0;
} catch {
  /* counted as 0, reported below */
}
check(
  "catalogue /api/v1/catalog",
  catalog.status === 200 && services > 0,
  services > 0 ? `${services} services` : `${catalog.status}, EMPTY: the catalogue seed has not run (docs/16 §Production)`
);

// Per-person limits key on the client's address (docs/16 §Client address):
// the address the server resolves for this machine must be this machine's.
const seen = await get("/api/v1/client-address");
let mine = null;
try {
  mine = (await (await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(10_000) })).json()).ip;
} catch {
  /* no way to know our own address; reported below */
}
if (seen.status === 404) check("client address (TRUST_PROXY_HOPS)", false, "404: not in the deployed build");
else {
  const body = JSON.parse(seen.text);
  check(
    "client address (TRUST_PROXY_HOPS)",
    mine !== null && body.address === mine,
    mine === null
      ? `server sees ${body.address}; own public IP unknown`
      : body.address === mine
        ? `server sees this machine (${body.trustedHops} hop${body.trustedHops === 1 ? "" : "s"} trusted)`
        : `server sees ${body.address}, this machine is ${mine}; chain ${JSON.stringify(body.forwardedFor)} with ${body.trustedHops} trusted`
  );
}

// A route each epic added, asked as a stranger: 401 = deployed, 404 = not.
const epics = [
  ["W6 customer jobs", "/api/v1/jobs"],
  ["W7 professional application", "/api/v1/pro/application"],
  ["W8 admin", "/api/v1/admin/jobs"],
  ["W9 notifications", "/api/v1/me/notifications"],
];
for (const [name, path] of epics) {
  const r = await get(path);
  check(`${name} (${path})`, r.status === 401, r.status === 404 ? "404: not in the deployed build" : `${r.status}`);
}

const width = Math.max(...results.map((r) => r.name.length));
console.log(`PRO NOW production smoke — ${base} — ${new Date().toISOString()}\n`);
for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.name.padEnd(width)}  ${r.detail}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} of ${results.length} checks failed.` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
