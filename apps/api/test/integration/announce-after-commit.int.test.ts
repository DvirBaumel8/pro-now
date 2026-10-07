import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { startApp } from "./harness.js";
import { signInByEmail, uniqueEmail, whoAmI, type CookieJar } from "./auth-helpers.js";
import { createPrisma } from "../../src/db/prisma-client.js";
import { dispatchablePro, takeOffline } from "./pro-helpers.js";

/**
 * A job event is announced once it is true (plugins/prisma.ts). Clients
 * answer an announcement by re-reading the job, so the accept's
 * OFFER_ACCEPTED, written inside its transaction, used to reach the
 * customer before the commit: their re-read still said searching, and the
 * screen waited for the 20 s poll (CI #127's trace of w7-journey).
 */
let app: FastifyInstance;
let db: PrismaClient;
let customer: CookieJar;
let pro: CookieJar;
let proId: string;
let jobId: string;
const LAT = 32.79;
const LNG = 35.0;
const as = (j: CookieJar, idem?: string) => ({
  cookie: j.header(),
  origin: "http://localhost:4000",
  ...(idem ? { "idempotency-key": idem } : {}),
});

beforeAll(async () => {
  app = await startApp();
  db = createPrisma();
  const serviceId = (await db.service.findFirstOrThrow({ where: { priceModel: "VISIT_QUOTE" } })).id;
  customer = await signInByEmail(app, uniqueEmail("commit-customer"));
  const me = (await whoAmI(app, customer))!;
  const profile = await db.customerProfile.upsert({ where: { userId: me.user.id }, update: {}, create: { userId: me.user.id } });
  const addressId = (await db.address.create({ data: { customerId: profile.id, formatted: "חיפה", lat: LAT, lng: LNG } })).id;
  const proEmail = uniqueEmail("commit-pro");
  proId = (await dispatchablePro(db, proEmail, serviceId, LAT + 0.01, LNG)).id;
  pro = await signInByEmail(app, proEmail);
  const res = await app.inject({ method: "POST", url: "/api/v1/jobs", headers: as(customer, `commit-${Date.now()}`), payload: { serviceId, addressId, structuredAnswers: {}, mediaRefs: [] } });
  expect(res.statusCode, res.body).toBe(200);
  jobId = res.json().job.id;
  await new Promise((r) => setTimeout(r, 150));
});

afterAll(async () => {
  await takeOffline(db, proId);
  await app.close();
  await db.$disconnect();
});

describe("a job event is announced once it is true", () => {
  it("whoever hears that the offer was accepted reads the job as assigned", async () => {
    const offer = (await app.inject({ method: "GET", url: "/api/v1/pro/offers/current", headers: as(pro) })).json();
    expect(offer.jobId).toBe(jobId);
    // What a client does on the socket's message: read the job, at once, from another connection.
    const heard = new Promise<string>((resolve) => {
      const off = app.jobEvents.subscribe(jobId, (n) => {
        if (n.type !== "OFFER_ACCEPTED") return;
        off();
        void db.job.findUniqueOrThrow({ where: { id: jobId }, select: { status: true } }).then((j) => resolve(j.status));
      });
    });
    const accept = await app.inject({ method: "POST", url: `/api/v1/offers/${offer.offerId}/accept`, headers: as(pro, `commit-a-${Date.now()}`), payload: {} });
    expect(accept.statusCode, accept.body).toBe(200);
    expect(await heard).toBe("PRO_ASSIGNED");
  });

  it("a transaction that rolls back announces nothing", async () => {
    const heard: string[] = [];
    const off = app.jobEvents.subscribe(jobId, (n) => heard.push(n.type));
    await expect(
      app.prisma.$transaction(async (tx) => {
        await tx.jobEvent.create({ data: { jobId, type: "ROLLBACK_PROBE", actor: "SYSTEM" } });
        throw new Error("rolled back");
      }),
    ).rejects.toThrow("rolled back");
    // Outside a transaction it is true when written, and announced at once.
    await app.prisma.jobEvent.create({ data: { jobId, type: "WRITTEN_PROBE", actor: "SYSTEM" } });
    off();
    expect(heard).toEqual(["WRITTEN_PROBE"]);
    expect(await db.jobEvent.count({ where: { jobId, type: "ROLLBACK_PROBE" } })).toBe(0);
  });
});
