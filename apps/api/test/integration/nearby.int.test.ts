import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { startApp } from "./harness.js";
import { signInByEmail, uniqueEmail, whoAmI, type CookieJar } from "./auth-helpers.js";
import { createPrisma } from "../../src/db/prisma-client.js";
import { dispatchablePro, takeOffline } from "./pro-helpers.js";

/**
 * "He's near", once (domain/notifications/nearby.ts): the demo's on-the-way
 * screen promises "נקרא לכם כשהוא מתקרב". While the professional is on the
 * way, a location ping within three minutes of the job (by the maps
 * provider's ETA) writes one PRO_NEARBY event and the customer is told; a
 * ping further away tells nobody; the event exists once per job, even when
 * two pings arrive together.
 */
let app: FastifyInstance;
let db: PrismaClient;
let customer: CookieJar;
let pro: CookieJar;
let proId: string;
let jobId: string;
let customerUserId: string;
const LAT = 32.31;
const LNG = 34.87;
const as = (j: CookieJar, idem?: string) => ({
  cookie: j.header(),
  origin: "http://localhost:4000",
  ...(idem ? { "idempotency-key": idem } : {}),
});
const ping = (lat: number, lng: number) =>
  app.inject({ method: "POST", url: "/api/v1/pro/location", headers: as(pro), payload: { lat, lng, capturedAt: new Date().toISOString() } });
const settle = () => new Promise((r) => setTimeout(r, 150));
const nearbyEvents = () => db.jobEvent.count({ where: { jobId, type: "PRO_NEARBY" } });
const nearbyNotices = () => db.notification.count({ where: { userId: customerUserId, jobId, type: "PRO_NEARBY" } });

beforeAll(async () => {
  app = await startApp();
  db = createPrisma();
  const serviceId = (await db.service.findFirstOrThrow({ where: { priceModel: "VISIT_QUOTE" } })).id;
  customer = await signInByEmail(app, uniqueEmail("near-customer"));
  const me = (await whoAmI(app, customer))!;
  customerUserId = me.user.id;
  const profile = await db.customerProfile.upsert({ where: { userId: me.user.id }, update: {}, create: { userId: me.user.id } });
  const addressId = (await db.address.create({ data: { customerId: profile.id, formatted: "נתניה", lat: LAT, lng: LNG } })).id;
  const proEmail = uniqueEmail("near-pro");
  proId = (await dispatchablePro(db, proEmail, serviceId, LAT + 0.03, LNG)).id;
  pro = await signInByEmail(app, proEmail);
  const res = await app.inject({ method: "POST", url: "/api/v1/jobs", headers: as(customer, `near-${Date.now()}`), payload: { serviceId, addressId, structuredAnswers: {}, mediaRefs: [] } });
  jobId = res.json().job.id;
  await settle();
  const offer = (await app.inject({ method: "GET", url: "/api/v1/pro/offers/current", headers: as(pro) })).json();
  expect(offer.jobId).toBe(jobId);
  await app.inject({ method: "POST", url: `/api/v1/offers/${offer.offerId}/accept`, headers: as(pro, `na-${Date.now()}`), payload: {} });
});

afterAll(async () => {
  await takeOffline(db, proId);
  await app.close();
  await db.$disconnect();
});

describe("he's near", () => {
  it("is not said before they are on the way, however close", async () => {
    expect((await ping(LAT + 0.001, LNG)).statusCode).toBe(200);
    await settle();
    expect(await nearbyEvents()).toBe(0);
  });

  it("is not said while they are further than three minutes away", async () => {
    await app.inject({ method: "POST", url: `/api/v1/jobs/${jobId}/en-route`, headers: as(pro), payload: {} });
    // About 3.3 km: some 400 s at the sandbox's urban speed.
    expect((await ping(LAT + 0.03, LNG)).statusCode).toBe(200);
    await settle();
    expect(await nearbyEvents()).toBe(0);
    expect(await nearbyNotices()).toBe(0);
  });

  it("is said once they are within three minutes, to the customer, in-app", async () => {
    // About 1.1 km: some 135 s.
    expect((await ping(LAT + 0.01, LNG)).statusCode).toBe(200);
    await settle();
    expect(await nearbyEvents()).toBe(1);
    const notice = await db.notification.findFirstOrThrow({ where: { userId: customerUserId, jobId, type: "PRO_NEARBY" } });
    expect(notice.title).toMatch(/מתקרב(ת)?$/);
  });

  it("is said once per job, even when pings arrive together", async () => {
    await Promise.all([ping(LAT + 0.002, LNG), ping(LAT + 0.001, LNG), ping(LAT, LNG)]);
    await settle();
    expect(await nearbyEvents()).toBe(1);
    expect(await nearbyNotices()).toBe(1);
  });
});
