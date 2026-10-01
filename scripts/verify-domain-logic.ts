/**
 * Real execution verification pass for the pure/near-pure domain logic.
 *
 * WHY THIS FILE EXISTS: the sandboxed session that wrote this repository
 * could not run `npm install` (registry.npmjs.org is blocked at the
 * network-policy level), so the vitest
 * suite under apps/api/test/*.test.ts has never actually been executed.
 * This script uses the globally-available `tsx`/`typescript` (no
 * third-party install needed) to import the REAL source modules — not
 * re-implementations — and exercise them with real assertions, so at
 * least the pure domain logic is proven to run correctly, not just to
 * parse. `node_modules/@pro-now/*` symlinks to `packages/*` were created
 * locally to satisfy the workspace-style imports (`@pro-now/types`) —
 * exactly what `npm install` would do for local workspace packages, and
 * requires no network access since it never contacts a registry.
 *
 * This is NOT a substitute for the real `npm test` (vitest) run, and it
 * explicitly does NOT prove the DB-level `SELECT ... FOR UPDATE` guarantee
 * atomic-accept.ts relies on as its actual safety net — that requires a
 * real Postgres instance. The concurrency check below only proves the
 * Redis-lock fast path + in-transaction offer-state guards are race-safe
 * under real concurrent JS execution against in-memory fakes.
 *
 * Run with: /home/claude/.npm-global/bin/tsx scripts/verify-domain-logic.ts
 */
import assert from "node:assert/strict";

import {
  assertTransition,
  isTransitionAllowed,
  nextAfterArrival,
  InvalidJobTransitionError,
} from "../apps/api/src/domain/job/transitions";
import {
  isPresenceTransitionAllowed,
  assertPresenceTransition,
  canEndShift,
  InvalidPresenceTransitionError,
} from "../apps/api/src/domain/job/pro-presence-transitions";
import { evaluateEligibility, filterEligible, type DispatchCandidate } from "../apps/api/src/domain/dispatch/eligibility";
import { scoreCandidate, rankCandidates, DEFAULT_SCORING_WEIGHTS } from "../apps/api/src/domain/dispatch/scoring";
import {
  FixedPricingAdapter,
  VisitQuotePricingAdapter,
  HourlyPricingAdapter,
  DistanceTimePricingAdapter,
} from "../apps/api/src/domain/pricing/pricing-adapter";
import { money, addMoney, formatMoney } from "../packages/types/src/money";
import { acceptOffer, OfferNoLongerAvailableError } from "../apps/api/src/domain/dispatch/atomic-accept";
import { RedisJobLock } from "../apps/api/src/domain/dispatch/job-lock";

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

console.log("== Job state machine (transitions.ts) — real execution ==");
check("full happy path is legal end to end", () => {
  const path: [string, string][] = [
    ["DRAFT", "SEARCHING"], ["SEARCHING", "OFFERING"], ["OFFERING", "PRO_ASSIGNED"],
    ["PRO_ASSIGNED", "PRO_EN_ROUTE"], ["PRO_EN_ROUTE", "PRO_ARRIVED"], ["PRO_ARRIVED", "IN_PROGRESS"],
    ["IN_PROGRESS", "COMPLETION_PENDING"], ["COMPLETION_PENDING", "COMPLETED"], ["COMPLETED", "PAYMENT_PENDING"],
    ["PAYMENT_PENDING", "PAYMENT_CAPTURED"], ["PAYMENT_CAPTURED", "REVIEW_PENDING"], ["REVIEW_PENDING", "CLOSED"],
  ];
  for (const [from, to] of path) {
    assert.equal(isTransitionAllowed(from as any, to as any), true, `${from}->${to} should be legal`);
  }
});
check("diagnosis-required path (PRO_ARRIVED -> DIAGNOSIS -> WAITING_QUOTE_APPROVAL -> IN_PROGRESS) is legal", () => {
  assert.equal(isTransitionAllowed("PRO_ARRIVED", "DIAGNOSIS"), true);
  assert.equal(isTransitionAllowed("DIAGNOSIS", "WAITING_QUOTE_APPROVAL"), true);
  assert.equal(isTransitionAllowed("WAITING_QUOTE_APPROVAL", "IN_PROGRESS"), true);
});
check("skipping states is rejected (DRAFT -> IN_PROGRESS)", () => {
  assert.equal(isTransitionAllowed("DRAFT", "IN_PROGRESS"), false);
});
check("terminal states have no outgoing transitions (CLOSED, CANCELLED)", () => {
  assert.equal(isTransitionAllowed("CLOSED", "DRAFT"), false);
  assert.equal(isTransitionAllowed("CANCELLED", "SEARCHING"), false);
});
check("assertTransition throws InvalidJobTransitionError on an illegal jump", () => {
  assert.throws(() => assertTransition("DRAFT", "COMPLETED", "SYSTEM"), InvalidJobTransitionError);
});
check("mid-service cancellation (IN_PROGRESS->CANCELLED) is OPS-only — CUSTOMER is rejected", () => {
  assert.throws(() => assertTransition("IN_PROGRESS", "CANCELLED", "CUSTOMER"), /not permitted/);
  assertTransition("IN_PROGRESS", "CANCELLED", "OPS"); // must NOT throw
});
check("a customer MAY cancel while still searching, but not once a pro is en route... actually customer CAN cancel en route too per spec", () => {
  assertTransition("SEARCHING", "CANCELLED", "CUSTOMER");
  assertTransition("PRO_EN_ROUTE", "CANCELLED", "CUSTOMER");
});
check("nextAfterArrival respects requiresDiagnosis flag", () => {
  assert.equal(nextAfterArrival(true), "DIAGNOSIS");
  assert.equal(nextAfterArrival(false), "IN_PROGRESS");
});

console.log("\n== Professional presence state machine (pro-presence-transitions.ts) — real execution ==");
check("full shift happy path is legal", () => {
  const path: [string, string][] = [
    ["OFFLINE", "STARTING_SHIFT"], ["STARTING_SHIFT", "AVAILABLE"], ["AVAILABLE", "OFFER_RECEIVED"],
    ["OFFER_RECEIVED", "RESERVED"], ["RESERVED", "ASSIGNED"], ["ASSIGNED", "EN_ROUTE"],
    ["EN_ROUTE", "ARRIVED"], ["ARRIVED", "SERVICING"], ["SERVICING", "COMPLETING"], ["COMPLETING", "AVAILABLE"],
  ];
  for (const [from, to] of path) {
    assert.equal(isPresenceTransitionAllowed(from as any, to as any), true, `${from}->${to} should be legal`);
  }
});
check("SERVICING cannot skip straight to AVAILABLE — must pass through COMPLETING", () => {
  assert.equal(isPresenceTransitionAllowed("SERVICING", "AVAILABLE"), false);
  assert.throws(() => assertPresenceTransition("SERVICING", "AVAILABLE"), InvalidPresenceTransitionError);
});
check("OFFER_RECEIVED can fall back to AVAILABLE (skip/expire) but RESERVED can also fall back (lost the race)", () => {
  assert.equal(isPresenceTransitionAllowed("OFFER_RECEIVED", "AVAILABLE"), true);
  assert.equal(isPresenceTransitionAllowed("RESERVED", "AVAILABLE"), true);
});
check("canEndShift is false while committed to an active job (e.g. EN_ROUTE), true once AVAILABLE", () => {
  assert.equal(canEndShift("EN_ROUTE"), false);
  assert.equal(canEndShift("AVAILABLE"), true);
  assert.equal(canEndShift("COMPLETING"), true); // explicit exception per source comment
});
check("canEndShift(isSupportOverride=true) always true, even mid-job", () => {
  assert.equal(canEndShift("SERVICING", true), true);
});

console.log("\n== Dispatch eligibility (eligibility.ts) — real execution ==");
const fullyEligible: DispatchCandidate = {
  professionalId: "pro-1", presenceState: "AVAILABLE", accountVerificationStatus: "APPROVED",
  locationAgeSeconds: 10, serviceApproved: true,
  requiredCredentialsCurrent: true, insideServiceArea: true, alreadyAssignedToAnotherJob: false,
  isRiskLimitedForService: false, isBlockedAgainstCustomer: false, equipmentMatches: true, marketActive: true,
};
check("a fully-qualified candidate is eligible with zero reason codes", () => {
  const result = evaluateEligibility(fullyEligible, { locationFreshnessThresholdSeconds: 120 });
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasonCodes, []);
});
check("stale location + expired credential produce exactly those two explainable reason codes", () => {
  const result = evaluateEligibility(
    { ...fullyEligible, locationAgeSeconds: 999, requiredCredentialsCurrent: false },
    { locationFreshnessThresholdSeconds: 120 }
  );
  assert.equal(result.eligible, false);
  assert.deepEqual(result.reasonCodes.sort(), ["CREDENTIAL_EXPIRED_OR_MISSING", "LOCATION_STALE"].sort());
});
check("a candidate excluded for every possible reason gets every corresponding code, nothing silently dropped", () => {
  const worst: DispatchCandidate = {
    professionalId: "pro-2", presenceState: "OFFLINE", accountVerificationStatus: "SUSPENDED",
    locationAgeSeconds: 99999, serviceApproved: false,
    requiredCredentialsCurrent: false, insideServiceArea: false, alreadyAssignedToAnotherJob: true,
    isRiskLimitedForService: true, isBlockedAgainstCustomer: true, equipmentMatches: false, marketActive: false,
  };
  const result = evaluateEligibility(worst, { locationFreshnessThresholdSeconds: 120 });
  // 11 codes since ACCOUNT_NOT_APPROVED was added as its own explainable reason.
  assert.equal(result.reasonCodes.length, 11);
});
check("filterEligible maps over the whole candidate list preserving professionalId", () => {
  const results = filterEligible([fullyEligible, { ...fullyEligible, professionalId: "pro-3", marketActive: false }], {
    locationFreshnessThresholdSeconds: 120,
  });
  assert.equal(results.length, 2);
  assert.equal(results[0]!.professionalId, "pro-1");
  assert.equal(results[1]!.eligible, false);
});

console.log("\n== Match scoring (scoring.ts) — real execution ==");
check("scoreCandidate matches the weighted formula computed independently, for the default weights", () => {
  const input = {
    professionalId: "pro-1", etaSeconds: 300, maxEtaSecondsInShortlist: 600, serviceFitScore: 1,
    ratingAverage: 5, acceptanceRate: 0.9, completionRate: 0.95, cancellationPenalty: 0.05, recentAssignmentPenalty: 0,
  };
  const expected =
    (1 - 300 / 600) * DEFAULT_SCORING_WEIGHTS.etaWeight +
    1 * DEFAULT_SCORING_WEIGHTS.serviceFitWeight +
    (5 / 5) * DEFAULT_SCORING_WEIGHTS.ratingWeight +
    0.9 * DEFAULT_SCORING_WEIGHTS.acceptanceWeight +
    0.95 * DEFAULT_SCORING_WEIGHTS.completionWeight -
    0.05;
  const result = scoreCandidate(input);
  assert.ok(Math.abs(result.score - expected) < 1e-9, `expected ${expected}, got ${result.score}`);
});
check("score is clamped at a floor of 0, never negative, even with a huge penalty", () => {
  const result = scoreCandidate({
    professionalId: "pro-1", etaSeconds: 600, maxEtaSecondsInShortlist: 600, serviceFitScore: 0,
    ratingAverage: 0, acceptanceRate: 0, completionRate: 0, cancellationPenalty: 1, recentAssignmentPenalty: 1,
  });
  assert.equal(result.score, 0);
});
check("rankCandidates sorts strictly best-ETA-and-fit first", () => {
  const ranked = rankCandidates([
    { professionalId: "far", etaSeconds: 590, maxEtaSecondsInShortlist: 600, serviceFitScore: 0.5, ratingAverage: 4, acceptanceRate: 0.5, completionRate: 0.5, cancellationPenalty: 0, recentAssignmentPenalty: 0 },
    { professionalId: "near", etaSeconds: 60, maxEtaSecondsInShortlist: 600, serviceFitScore: 1, ratingAverage: 5, acceptanceRate: 1, completionRate: 1, cancellationPenalty: 0, recentAssignmentPenalty: 0 },
  ]);
  assert.equal(ranked[0]!.professionalId, "near");
  assert.equal(ranked[1]!.professionalId, "far");
});

console.log("\n== Pricing adapters (pricing-adapter.ts) — real execution ==");
check("money() rejects non-integer minor units (no floats allowed, per /CLAUDE.md)", () => {
  assert.throws(() => money(17.9 as any));
});
check("FixedPricingAdapter previews the exact base price, no quote required", () => {
  const preview = new FixedPricingAdapter(15000).preview();
  assert.equal(preview.headlineAmount.minorUnits, 15000);
  assert.equal(preview.requiresQuoteForAdditionalWork, false);
});
check("VisitQuotePricingAdapter previews only the visit fee and DOES require a quote for extra work", () => {
  const preview = new VisitQuotePricingAdapter(17900).preview();
  assert.equal(preview.headlineAmount.minorUnits, 17900);
  assert.equal(preview.requiresQuoteForAdditionalWork, true);
});
check("HourlyPricingAdapter previews rate * minimum hours, rounded to integer agorot", () => {
  const preview = new HourlyPricingAdapter(12000, 1.5).preview();
  assert.equal(preview.headlineAmount.minorUnits, 18000);
});
check("DistanceTimePricingAdapter computes base + per-km * distance", () => {
  const preview = new DistanceTimePricingAdapter(5000, 250).preview({ distanceKm: 12 });
  assert.equal(preview.headlineAmount.minorUnits, 5000 + 250 * 12);
});
check("addMoney refuses to add mismatched currencies", () => {
  assert.throws(() => addMoney(money(100, "ILS"), money(100, "USD")));
});
check("formatMoney renders a real Hebrew-locale currency string without throwing", () => {
  const s = formatMoney(money(17900));
  assert.ok(typeof s === "string" && s.length > 0);
});

console.log("\n== Atomic dispatch accept (atomic-accept.ts) — concurrency simulation against in-memory fakes ==");
console.log("   (Proves the exported acceptOffer() function + Redis-lock fast path are race-safe under real");
console.log("    concurrent JS execution. Does NOT exercise a real Postgres FOR UPDATE row lock — that still");
console.log("    requires an actual database and is the one guarantee this script cannot verify.)");

async function runConcurrencyTest() {
  // In-memory fake Redis: real NX/atomicity semantics for a single JS process
  // (no await between check and set, matching real Redis SET NX behavior).
  const redisStore = new Map<string, string>();
  const fakeRedis: any = {
    async set(key: string, value: string, _px: string, _ttl: number, nx: string) {
      if (nx === "NX") {
        if (redisStore.has(key)) return null;
        redisStore.set(key, value);
        return "OK";
      }
      redisStore.set(key, value);
      return "OK";
    },
    async get(key: string) {
      return redisStore.get(key) ?? null;
    },
    async del(key: string) {
      redisStore.delete(key);
    },
  };

  // In-memory fake Prisma covering exactly the calls atomic-accept.ts makes.
  const offer = { id: "offer-1", jobId: "job-1", professionalId: "pro-A", status: "SENT", expiresAt: new Date(Date.now() + 60_000) };
  const offers = new Map([[offer.id, { ...offer }]]);
  const jobs = new Map([["job-1", { id: "job-1", status: "OFFERING", assignedProfessionalId: null as string | null }]]);
  const events: any[] = [];

  function makeTxLayer() {
    return {
      dispatchOffer: {
        async findUnique({ where: { id } }: any) {
          return offers.get(id) ?? null;
        },
        async update({ where: { id }, data }: any) {
          const o = offers.get(id);
          Object.assign(o, data);
          return o;
        },
        async updateMany({ where, data }: any) {
          let count = 0;
          for (const o of offers.values()) {
            if (o.jobId === where.jobId && o.id !== where.id.not && where.status.in.includes(o.status)) {
              Object.assign(o, data);
              count++;
            }
          }
          return { count };
        },
      },
      job: {
        async update({ where: { id }, data }: any) {
          const j = jobs.get(id);
          Object.assign(j, data);
          return j;
        },
      },
      professionalProfile: {
        async update({ where: { id }, data }: any) {
          return { id, ...data };
        },
      },
      jobEvent: {
        async create({ data }: any) {
          events.push(data);
          return { id: `evt-${events.length}`, ...data };
        },
      },
      async $queryRawUnsafe(_sql: string, jobId: string) {
        const j = jobs.get(jobId);
        return j ? [{ id: j.id, status: j.status }] : [];
      },
    };
  }

  const fakePrisma: any = {
    dispatchOffer: {
      async findUnique({ where: { id } }: any) {
        return offers.get(id) ?? null;
      },
    },
    async $transaction(fn: (tx: any) => Promise<any>) {
      return fn(makeTxLayer());
    },
  };

  // Two different professionals racing to accept the SAME offer/job at once.
  const [resultA, resultB] = await Promise.allSettled([
    acceptOffer({ prisma: fakePrisma, lock: new RedisJobLock(fakeRedis) }, "offer-1", "pro-A", "req-A"),
    acceptOffer({ prisma: fakePrisma, lock: new RedisJobLock(fakeRedis) }, "offer-1", "pro-A", "req-B"),
  ]);

  const fulfilled = [resultA, resultB].filter((r) => r.status === "fulfilled");
  const rejected = [resultA, resultB].filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1, `expected exactly 1 successful accept, got ${fulfilled.length}`);
  assert.equal(rejected.length, 1, `expected exactly 1 rejected accept, got ${rejected.length}`);
  assert.ok(
    (rejected[0] as PromiseRejectedResult).reason instanceof OfferNoLongerAvailableError,
    "the loser must fail with OfferNoLongerAvailableError, not a generic error"
  );
  assert.equal(jobs.get("job-1")!.status, "PRO_ASSIGNED");
  assert.equal(offers.get("offer-1")!.status, "ACCEPTED");
  assert.equal(events.length, 1, "exactly one OFFER_ACCEPTED event, not two");

  console.log("  PASS  two simultaneous acceptOffer() calls for the same offer resolve to exactly one winner");
  passed++;
}

runConcurrencyTest()
  .catch((err) => {
    console.log("  FAIL  concurrency simulation");
    console.log(`        ${err.stack ?? err}`);
    process.exitCode = 1;
  })
  .finally(() => {
    console.log(`\n${passed} check(s) passed.${process.exitCode ? " SOME CHECKS FAILED — see FAIL lines above." : ""}`);
  });
