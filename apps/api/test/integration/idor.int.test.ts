import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { PrismaClient, type JobStatus } from "@prisma/client";

import { startApp } from "./harness.js";
import { CookieJar, signInByEmail, uniqueEmail, whoAmI } from "./auth-helpers.js";
import { createPrisma } from "../../src/db/prisma-client.js";

/**
 * Access to another person's records (IDOR), route by route (docs/21 W1).
 *
 * Every case asks as the WRONG person and expects 404 with nothing
 * changed, then asks as the RIGHT person and expects success, so a 404
 * cannot come from a broken fixture instead of the access rule.
 */

let app: FastifyInstance;
let db: PrismaClient;

type Person = { jar: CookieJar; userId: string };
let alice: Person; // customer who owns the jobs below
let bob: Person; // another customer
let pat: Person & { proId: string }; // professional assigned to Alice's jobs
let quinn: Person & { proId: string }; // another professional
let serviceId: string;
let aliceAddressId: string;

async function customer(tag: string): Promise<Person> {
  const jar = await signInByEmail(app, uniqueEmail(tag));
  const userId = (await whoAmI(app, jar))!.user.id;
  await db.customerProfile.upsert({ where: { userId }, update: {}, create: { userId } });
  return { jar, userId };
}

async function professional(tag: string): Promise<Person & { proId: string }> {
  const email = uniqueEmail(tag);
  const user = await db.user.create({ data: { email, emailVerified: true, name: tag } });
  await db.userRole.create({ data: { userId: user.id, role: "PROFESSIONAL" } });
  const pro = await db.professionalProfile.create({
    data: { userId: user.id, legalName: tag, displayName: tag, verificationStatus: "APPROVED" },
  });
  return { jar: await signInByEmail(app, email), userId: user.id, proId: pro.id };
}

async function aliceJob(status: JobStatus) {
  const customerId = (await db.customerProfile.findUniqueOrThrow({ where: { userId: alice.userId } })).id;
  return db.job.create({
    data: { customerId, serviceId, addressId: aliceAddressId, status, assignedProfessionalId: pat.proId },
  });
}

const as = (p: Person) => ({ cookie: p.jar.header(), origin: "http://localhost:4000" });

beforeAll(async () => {
  app = await startApp();
  db = createPrisma();
  alice = await customer("alice");
  bob = await customer("bob");
  pat = await professional("pat");
  quinn = await professional("quinn");
  serviceId = (await db.service.findFirstOrThrow({ where: { priceModel: "VISIT_QUOTE" } })).id;
  const aliceCustomer = await db.customerProfile.findUniqueOrThrow({ where: { userId: alice.userId } });
  aliceAddressId = (
    await db.address.create({ data: { customerId: aliceCustomer.id, formatted: "Alice's home", lat: 32.07, lng: 34.78 } })
  ).id;
});

afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("a customer cannot reach another customer's job", () => {
  it("GET /v1/jobs/:id", async () => {
    const job = await aliceJob("PRO_ASSIGNED");
    const wrong = await app.inject({ method: "GET", url: `/api/v1/jobs/${job.id}`, headers: as(bob) });
    expect(wrong.statusCode).toBe(404);
    const right = await app.inject({ method: "GET", url: `/api/v1/jobs/${job.id}`, headers: as(alice) });
    expect(right.statusCode).toBe(200);
  });

  it("GET /v1/jobs/:id/match", async () => {
    const job = await aliceJob("PRO_ASSIGNED");
    const wrong = await app.inject({ method: "GET", url: `/api/v1/jobs/${job.id}/match`, headers: as(bob) });
    expect(wrong.statusCode).toBe(404);
    const right = await app.inject({ method: "GET", url: `/api/v1/jobs/${job.id}/match`, headers: as(alice) });
    expect(right.statusCode).toBe(200);
  });

  it("POST /v1/jobs/:id/cancel", async () => {
    const job = await aliceJob("PRO_ASSIGNED");
    const wrong = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/cancel`, headers: as(bob), payload: {} });
    expect(wrong.statusCode).toBe(404);
    expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("PRO_ASSIGNED");
    const right = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/cancel`, headers: as(alice), payload: {} });
    expect(right.statusCode).toBe(200);
  });

  it("POST /v1/jobs/:id/confirm-completion", async () => {
    const job = await aliceJob("COMPLETION_PENDING");
    const wrong = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${job.id}/confirm-completion`,
      headers: as(bob),
      payload: {},
    });
    expect(wrong.statusCode).toBe(404);
    expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("COMPLETION_PENDING");
  });

  it("POST /v1/jobs/:id/reviews, without revealing the job's status", async () => {
    const early = await aliceJob("PRO_ASSIGNED");
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/jobs/${early.id}/reviews`,
      headers: as(bob),
      payload: { overallRating: 1 },
    });
    // Not 409 "not reviewable yet": that would confirm the job exists and say where it is.
    expect(res.statusCode).toBe(404);
  });

  it("POST /v1/quotes/:id/approve", async () => {
    const job = await aliceJob("WAITING_QUOTE_APPROVAL");
    const quote = await db.quote.create({
      data: { jobId: job.id, version: 1, versionHash: "h1", totalMinorUnits: 10000, status: "SENT" },
    });
    const body = { quoteVersionHash: "h1" };
    const wrong = await app.inject({
      method: "POST",
      url: `/api/v1/quotes/${quote.id}/approve`,
      headers: { ...as(bob), "idempotency-key": `k-${quote.id}-bob` },
      payload: body,
    });
    expect(wrong.statusCode).toBe(404);
    expect((await db.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("SENT");
    const right = await app.inject({
      method: "POST",
      url: `/api/v1/quotes/${quote.id}/approve`,
      headers: { ...as(alice), "idempotency-key": `k-${quote.id}-alice` },
      payload: body,
    });
    expect(right.statusCode, right.body).toBe(200);
  });

  it("POST /v1/jobs does not replay another customer's job for their idempotency key", async () => {
    const job = await aliceJob("PRO_ASSIGNED");
    await db.job.update({ where: { id: job.id }, data: { idempotencyKey: `alice-key-${job.id}` } });
    const bobAddress = await db.address.create({
      data: {
        customerId: (await db.customerProfile.findUniqueOrThrow({ where: { userId: bob.userId } })).id,
        formatted: "Bob's home",
        lat: 32.07,
        lng: 34.78,
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/jobs",
      headers: { ...as(bob), "idempotency-key": `alice-key-${job.id}` },
      payload: { serviceId, addressId: bobAddress.id, description: "x" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.body).not.toContain(job.id);
  });
});

describe("only the assigned professional moves a job", () => {
  for (const step of ["en-route"] as const) {
    it(`POST /v1/jobs/:id/${step}: another professional, or the customer, cannot`, async () => {
      const job = await aliceJob("PRO_ASSIGNED");
      const byQuinn = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/${step}`, headers: as(quinn), payload: {} });
      expect(byQuinn.statusCode).toBe(404);
      const byAlice = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/${step}`, headers: as(alice), payload: {} });
      expect(byAlice.statusCode).toBe(403);
      expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("PRO_ASSIGNED");
      const byPat = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/${step}`, headers: as(pat), payload: {} });
      expect(byPat.statusCode, byPat.body).toBe(200);
    });
  }

  for (const [step, from] of [
    ["arrive", "PRO_EN_ROUTE"],
    ["start", "PRO_ARRIVED"],
    ["complete", "IN_PROGRESS"],
  ] as const) {
    it(`POST /v1/jobs/:id/${step}: another professional cannot`, async () => {
      const job = await aliceJob(from);
      const res = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/${step}`, headers: as(quinn), payload: {} });
      expect(res.statusCode).toBe(404);
      expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe(from);
    });
  }

  it("POST /v1/jobs/:id/quotes", async () => {
    const job = await aliceJob("DIAGNOSIS");
    const payload = { lineItems: [{ description: "fix", quantity: 1, unitPriceMinorUnits: 5000, kind: "LABOR" }] };
    const wrong = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/quotes`, headers: as(quinn), payload });
    expect(wrong.statusCode).toBe(404);
    expect(await db.quote.count({ where: { jobId: job.id } })).toBe(0);
    const right = await app.inject({ method: "POST", url: `/api/v1/jobs/${job.id}/quotes`, headers: as(pat), payload });
    expect(right.statusCode, right.body).toBe(200);
  });

  it("GET /v1/pro/jobs/:id", async () => {
    const job = await aliceJob("PRO_ASSIGNED");
    const wrong = await app.inject({ method: "GET", url: `/api/v1/pro/jobs/${job.id}`, headers: as(quinn) });
    expect(wrong.statusCode).toBe(404);
    const right = await app.inject({ method: "GET", url: `/api/v1/pro/jobs/${job.id}`, headers: as(pat) });
    expect(right.statusCode).toBe(200);
  });
});

describe("offers and shifts belong to one professional", () => {
  async function offerToPat(status: "SENT" | "ACCEPTED" = "SENT") {
    const job = await aliceJob("OFFERING");
    return db.dispatchOffer.create({
      data: { jobId: job.id, professionalId: pat.proId, status, expiresAt: new Date(Date.now() + 60_000) },
    });
  }

  it("POST /v1/offers/:id/accept", async () => {
    const offer = await offerToPat();
    const res = await app.inject({ method: "POST", url: `/api/v1/offers/${offer.id}/accept`, headers: as(quinn), payload: {} });
    expect(res.statusCode).toBe(404);
  });

  it("POST /v1/offers/:id/skip", async () => {
    const offer = await offerToPat();
    const wrong = await app.inject({ method: "POST", url: `/api/v1/offers/${offer.id}/skip`, headers: as(quinn), payload: {} });
    expect(wrong.statusCode).toBe(404);
    expect((await db.dispatchOffer.findUniqueOrThrow({ where: { id: offer.id } })).status).toBe("SENT");
    const right = await app.inject({ method: "POST", url: `/api/v1/offers/${offer.id}/skip`, headers: as(pat), payload: {} });
    expect(right.statusCode, right.body).toBe(200);
  });

  it("an offer already accepted cannot be skipped", async () => {
    const offer = await offerToPat("ACCEPTED");
    const res = await app.inject({ method: "POST", url: `/api/v1/offers/${offer.id}/skip`, headers: as(pat), payload: {} });
    expect(res.statusCode).toBe(409);
    expect((await db.dispatchOffer.findUniqueOrThrow({ where: { id: offer.id } })).status).toBe("ACCEPTED");
  });

  it("POST /v1/pro/shifts/:id/end", async () => {
    const shift = await db.availabilitySession.create({ data: { professionalId: pat.proId } });
    const wrong = await app.inject({ method: "POST", url: `/api/v1/pro/shifts/${shift.id}/end`, headers: as(quinn), payload: {} });
    expect(wrong.statusCode).toBe(404);
    expect((await db.availabilitySession.findUniqueOrThrow({ where: { id: shift.id } })).endedAt).toBeNull();
    const right = await app.inject({ method: "POST", url: `/api/v1/pro/shifts/${shift.id}/end`, headers: as(pat), payload: {} });
    expect(right.statusCode, right.body).toBe(200);
  });
});

describe("roles", () => {
  it("a customer cannot use the professional's API", async () => {
    for (const url of ["/api/v1/pro/earnings", "/api/v1/pro/verification", "/api/v1/pro/offers/current", "/api/v1/pro/services"]) {
      const res = await app.inject({ method: "GET", url, headers: as(alice) });
      expect(res.statusCode, url).toBe(403);
    }
  });

  it("nobody signed out reaches any of it", async () => {
    for (const [method, url] of [
      ["GET", "/api/v1/jobs/x"],
      ["POST", "/api/v1/jobs/x/cancel"],
      ["POST", "/api/v1/offers/x/skip"],
      ["GET", "/api/v1/pro/earnings"],
    ] as const) {
      const res = await app.inject({ method, url, payload: method === "POST" ? {} : undefined });
      expect(res.statusCode, url).toBe(401);
    }
  });
});

describe("the live job channel", () => {
  function closeCodeOf(ws: { on: (e: string, f: (...a: unknown[]) => void) => void }): Promise<number | "open"> {
    return new Promise((resolve) => {
      ws.on("close", (code) => resolve(code as number));
      setTimeout(() => resolve("open"), 1500);
    });
  }

  it("refuses anyone but the job's customer and its assigned professional", async () => {
    const job = await aliceJob("PRO_EN_ROUTE");
    const byBob = await app.injectWS(`/api/v1/ws/jobs/${job.id}`, { headers: as(bob) });
    expect(await closeCodeOf(byBob)).toBe(4404);
    const byQuinn = await app.injectWS(`/api/v1/ws/jobs/${job.id}`, { headers: as(quinn) });
    expect(await closeCodeOf(byQuinn)).toBe(4404);

    for (const person of [alice, pat]) {
      const ws = await app.injectWS(`/api/v1/ws/jobs/${job.id}`, { headers: as(person) });
      expect(await closeCodeOf(ws)).toBe("open");
      ws.terminate();
    }
  });
});
