/**
 * Row-lock verification against a REAL PostgreSQL server.
 *
 * Why this script exists
 * ----------------------
 * `apps/api/src/domain/dispatch/atomic-accept.ts` says, in its own doc
 * comment, that the Redis lock is "a latency optimization, not the safety
 * mechanism", and that the database row lock
 *
 *     SELECT id, status FROM jobs WHERE id = $1 FOR UPDATE
 *
 * is "the actual source of correctness". `scripts/verify-domain-logic.ts`
 * proves `acceptOffer()` is race-safe against in-memory fakes — but fakes
 * cannot exercise a row lock, so that specific guarantee has never been
 * tested. /docs/EPIC-0-REPORT.md calls it the single most important
 * unverified item in the repository.
 *
 * This script closes that gap without Prisma (whose engines cannot be
 * downloaded in this environment): it talks to Postgres directly with
 * `pg`, using the exact locking statement `atomic-accept.ts` issues and
 * the same check-then-act sequence, under genuine concurrency.
 *
 * It proves two things, and the second is what matters:
 *
 *   A. CONTROL — the same sequence WITHOUT `FOR UPDATE` really does
 *      double-assign under READ COMMITTED. This shows the test harness can
 *      actually produce the race, so a pass in (B) means something.
 *   B. THE GUARANTEE — with `FOR UPDATE`, two simultaneous accepts against
 *      one job produce exactly one winner.
 *
 * It is self-contained: it creates its own schema, and drops it at the end.
 * It touches no application table.
 *
 * Run: npm run verify:rowlock   (requires DATABASE_URL and a live Postgres)
 */

import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA = "rowlock_verify";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function connect(): Client {
  return new Client({ connectionString: DATABASE_URL });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function setup(admin: Client) {
  await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await admin.query(`CREATE SCHEMA ${SCHEMA}`);
  // Mirrors the columns atomic-accept.ts actually reads and writes.
  await admin.query(`
    CREATE TABLE ${SCHEMA}.jobs (
      id                       text PRIMARY KEY,
      status                   text NOT NULL,
      assigned_professional_id text
    )
  `);
  await admin.query(`
    CREATE TABLE ${SCHEMA}.dispatch_offers (
      id              text PRIMARY KEY,
      job_id          text NOT NULL REFERENCES ${SCHEMA}.jobs(id),
      professional_id text NOT NULL,
      status          text NOT NULL
    )
  `);
}

async function resetFixture(admin: Client) {
  await admin.query(`DELETE FROM ${SCHEMA}.dispatch_offers`);
  await admin.query(`DELETE FROM ${SCHEMA}.jobs`);
  await admin.query(`INSERT INTO ${SCHEMA}.jobs (id, status) VALUES ('job_1', 'OFFERING')`);
  await admin.query(`
    INSERT INTO ${SCHEMA}.dispatch_offers (id, job_id, professional_id, status) VALUES
      ('offer_a', 'job_1', 'pro_a', 'SENT'),
      ('offer_b', 'job_1', 'pro_b', 'SENT')
  `);
}

type AcceptResult = { winner: string } | { rejected: true };

/**
 * One accept attempt, mirroring atomic-accept.ts's transaction body.
 * `useRowLock: false` is the control — the same logic with the lock removed.
 */
async function attemptAccept(
  client: Client,
  offerId: string,
  professionalId: string,
  opts: { useRowLock: boolean; thinkMs: number }
): Promise<AcceptResult> {
  await client.query("BEGIN");
  try {
    const lockClause = opts.useRowLock ? " FOR UPDATE" : "";
    const job = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM ${SCHEMA}.jobs WHERE id = (SELECT job_id FROM ${SCHEMA}.dispatch_offers WHERE id = $1)${lockClause}`,
      [offerId]
    );
    const row = job.rows[0];
    if (!row) throw new Error("JOB_NOT_FOUND");

    // The window a real handler spends validating the offer. Without the
    // row lock this is where the second request overtakes the first.
    await sleep(opts.thinkMs);

    if (row.status !== "OFFERING" && row.status !== "SEARCHING") {
      await client.query("ROLLBACK");
      return { rejected: true };
    }

    await client.query(`UPDATE ${SCHEMA}.dispatch_offers SET status = 'ACCEPTED' WHERE id = $1`, [offerId]);
    await client.query(
      `UPDATE ${SCHEMA}.dispatch_offers SET status = 'REVOKED' WHERE job_id = $1 AND id <> $2 AND status IN ('CREATED','SENT','VIEWED')`,
      [row.id, offerId]
    );
    await client.query(
      `UPDATE ${SCHEMA}.jobs SET status = 'PRO_ASSIGNED', assigned_professional_id = $1 WHERE id = $2`,
      [professionalId, row.id]
    );
    await client.query("COMMIT");
    return { winner: professionalId };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  }
}

async function runRace(admin: Client, useRowLock: boolean) {
  await resetFixture(admin);

  const a = connect();
  const b = connect();
  await a.connect();
  await b.connect();

  try {
    const results = await Promise.allSettled([
      attemptAccept(a, "offer_a", "pro_a", { useRowLock, thinkMs: 150 }),
      // Staggered barely, so both are genuinely inside the critical section.
      sleep(20).then(() => attemptAccept(b, "offer_b", "pro_b", { useRowLock, thinkMs: 150 })),
    ]);

    const winners = results
      .filter((r): r is PromiseFulfilledResult<AcceptResult> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is { winner: string } => "winner" in v)
      .map((v) => v.winner);

    const job = await admin.query<{ status: string; assigned_professional_id: string | null }>(
      `SELECT status, assigned_professional_id FROM ${SCHEMA}.jobs WHERE id = 'job_1'`
    );
    const offers = await admin.query<{ id: string; status: string }>(
      `SELECT id, status FROM ${SCHEMA}.dispatch_offers ORDER BY id`
    );

    return { winners, job: job.rows[0]!, offers: offers.rows };
  } finally {
    await a.end();
    await b.end();
  }
}

async function main() {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL is not set — cannot verify the row lock against a real database.");
    process.exit(1);
  }

  const admin = connect();
  await admin.connect();

  try {
    const version = await admin.query<{ version: string }>("SELECT version()");
    console.log(`\nConnected to: ${version.rows[0]!.version.split(",")[0]}`);
    const isolation = await admin.query<{ default_transaction_isolation: string }>(
      "SHOW default_transaction_isolation"
    );
    console.log(`Default isolation level: ${isolation.rows[0]!.default_transaction_isolation}\n`);

    await setup(admin);

    console.log("== A. CONTROL — same sequence WITHOUT `FOR UPDATE` ==");
    console.log("   (this SHOULD double-assign; if it does not, the harness is not");
    console.log("    actually racing and test B below would prove nothing)\n");
    const control = await runRace(admin, false);
    console.log(`   winners: [${control.winners.join(", ")}]  job.assigned=${control.job.assigned_professional_id}`);
    check(
      "without the row lock, BOTH accepts succeed — the race is real and reproducible",
      control.winners.length === 2,
      `expected 2 winners, got ${control.winners.length}`
    );

    console.log("\n== B. THE GUARANTEE — `SELECT ... FOR UPDATE`, as atomic-accept.ts issues it ==\n");
    const locked = await runRace(admin, true);
    console.log(`   winners: [${locked.winners.join(", ")}]  job.assigned=${locked.job.assigned_professional_id}`);

    check(
      "exactly ONE professional wins under two simultaneous accepts",
      locked.winners.length === 1,
      `expected 1 winner, got ${locked.winners.length} [${locked.winners.join(", ")}]`
    );
    check(
      "the job ends up PRO_ASSIGNED",
      locked.job.status === "PRO_ASSIGNED",
      `status=${locked.job.status}`
    );
    check(
      "the job is assigned to the professional who actually won",
      locked.job.assigned_professional_id === locked.winners[0],
      `assigned=${locked.job.assigned_professional_id} winner=${locked.winners[0]}`
    );

    const accepted = locked.offers.filter((o) => o.status === "ACCEPTED");
    const revoked = locked.offers.filter((o) => o.status === "REVOKED");
    check("exactly one offer row is ACCEPTED", accepted.length === 1, JSON.stringify(locked.offers));
    check("the losing offer is REVOKED, not left live", revoked.length === 1, JSON.stringify(locked.offers));

    // Third attempt after the job is settled must be refused outright.
    const late = connect();
    await late.connect();
    try {
      const lateResult = await attemptAccept(late, revoked[0]!.id, "pro_late", { useRowLock: true, thinkMs: 0 });
      check("a late accept on a settled job is refused", "rejected" in lateResult);
    } finally {
      await late.end();
    }
  } finally {
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`).catch(() => undefined);
    await admin.end();
  }

  console.log(`\n${passed} check(s) passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
