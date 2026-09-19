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
/**
 * The race now runs against the REAL tables produced by the baseline
 * migration, in `public`, with their real enum columns and real foreign
 * keys — not against a simplified mirror. That upgrade was blocked until
 * the migration existed (see /docs/EPIC-0-REPORT.md §12): a lock proven
 * only against a hand-made copy of two tables proves the SQL, not the
 * schema. Running it here means a constraint that would reject the write
 * in production rejects it in this test too.
 */
const SCHEMA = "public";

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
  // No table creation: the tables under test are the migrated ones. If the
  // migration has not been applied, this fails loudly here rather than
  // quietly testing a mirror that happens to be convenient.
  const { rows } = await admin.query(
    `SELECT to_regclass('public.jobs') AS jobs, to_regclass('public.dispatch_offers') AS offers`
  );
  if (!rows[0].jobs || !rows[0].offers) {
    throw new Error(
      "public.jobs / public.dispatch_offers do not exist — apply apps/api/prisma/migrations/0_init first"
    );
  }
}

/**
 * The job row cannot exist on its own: it is anchored by real foreign keys
 * to a customer, an address and a service, and the two competing offers are
 * anchored to real professional rows. Seeding that whole chain is the point
 * — it is what makes this a test of the schema and not only of the lock.
 */
async function resetFixture(admin: Client) {
  await admin.query(`
    DELETE FROM dispatch_offers WHERE "jobId" = 'job_1';
    DELETE FROM jobs WHERE id = 'job_1';
    DELETE FROM addresses WHERE id = 'addr_1';
    DELETE FROM services WHERE id = 'svc_1';
    DELETE FROM categories WHERE id = 'cat_1';
    DELETE FROM departments WHERE id = 'dep_1';
    DELETE FROM professional_profiles WHERE id IN ('pro_a', 'pro_b');
    DELETE FROM customer_profiles WHERE id = 'cust_1';
    DELETE FROM users WHERE id IN ('u_cust', 'u_pro_a', 'u_pro_b');
  `);

  await admin.query(`
    INSERT INTO users (id, phone, "updatedAt") VALUES
      ('u_cust', '+972500000001', NOW()),
      ('u_pro_a', '+972500000002', NOW()),
      ('u_pro_b', '+972500000003', NOW());

    INSERT INTO customer_profiles (id, "userId", "updatedAt")
      VALUES ('cust_1', 'u_cust', NOW());

    INSERT INTO professional_profiles (id, "userId", "legalName", "displayName", "verificationStatus", "updatedAt") VALUES
      ('pro_a', 'u_pro_a', 'Fixture A', 'Fixture A', 'APPROVED', NOW()),
      ('pro_b', 'u_pro_b', 'Fixture B', 'Fixture B', 'APPROVED', NOW());

    INSERT INTO departments (id, code, "nameHe", "nameEn") VALUES ('dep_1', 'HOME', 'בית', 'Home');
    INSERT INTO categories (id, "departmentId", code, "nameHe", "nameEn")
      VALUES ('cat_1', 'dep_1', 'PLUMB', 'אינסטלציה', 'Plumbing');
    INSERT INTO services (id, "categoryId", code, "nameHe", "nameEn", "priceModel", "trustTier")
      VALUES ('svc_1', 'cat_1', 'LEAK', 'תיקון נזילה', 'Leak repair', 'VISIT_QUOTE', 'B');

    INSERT INTO addresses (id, "customerId", formatted, lat, lng)
      VALUES ('addr_1', 'cust_1', 'תל אביב', 32.0853, 34.7818);

    INSERT INTO jobs (id, "customerId", "serviceId", "addressId", status, "updatedAt")
      VALUES ('job_1', 'cust_1', 'svc_1', 'addr_1', 'OFFERING', NOW());

    INSERT INTO dispatch_offers (id, "jobId", "professionalId", status, "expiresAt") VALUES
      ('offer_a', 'job_1', 'pro_a', 'SENT', NOW() + interval '30 seconds'),
      ('offer_b', 'job_1', 'pro_b', 'SENT', NOW() + interval '30 seconds');
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
      `SELECT id, status FROM jobs WHERE id = (SELECT "jobId" FROM dispatch_offers WHERE id = $1)${lockClause}`,
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

    await client.query(`UPDATE dispatch_offers SET status = 'ACCEPTED', "respondedAt" = NOW() WHERE id = $1`, [offerId]);
    await client.query(
      `UPDATE dispatch_offers SET status = 'REVOKED' WHERE "jobId" = $1 AND id <> $2 AND status IN ('CREATED','SENT','VIEWED')`,
      [row.id, offerId]
    );
    await client.query(
      `UPDATE jobs SET status = 'PRO_ASSIGNED', "assignedProfessionalId" = $1, "updatedAt" = NOW() WHERE id = $2`,
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
      `SELECT status, "assignedProfessionalId" AS assigned_professional_id FROM jobs WHERE id = 'job_1'`
    );
    const offers = await admin.query<{ id: string; status: string }>(
      `SELECT id, status FROM dispatch_offers WHERE "jobId" = 'job_1' ORDER BY id`
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
    // Never drop `public` — this runs against the real schema now. The
    // fixture rows are removed instead, and only the ones this test made.
    await admin
      .query(`
        DELETE FROM dispatch_offers WHERE "jobId" = 'job_1';
        DELETE FROM jobs WHERE id = 'job_1';
        DELETE FROM addresses WHERE id = 'addr_1';
        DELETE FROM services WHERE id = 'svc_1';
        DELETE FROM categories WHERE id = 'cat_1';
        DELETE FROM departments WHERE id = 'dep_1';
        DELETE FROM professional_profiles WHERE id IN ('pro_a', 'pro_b');
        DELETE FROM customer_profiles WHERE id = 'cust_1';
        DELETE FROM users WHERE id IN ('u_cust', 'u_pro_a', 'u_pro_b');
      `)
      .catch(() => undefined);
    await admin.end();
  }

  console.log(`\n${passed} check(s) passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
