import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

import { startApp } from "./harness.js";
import { uniqueEmail } from "./auth-helpers.js";
import { acceptOffer, OfferNoLongerAvailableError } from "../../src/domain/dispatch/atomic-accept.js";
import { NoopJobLock } from "../../src/domain/dispatch/job-lock.js";

/**
 * Two professionals must never both win one job — through the path that
 * ships (docs/21 W10: "add a Prisma-path race"). This races `acceptOffer` itself,
 * through the app's own client (the pg driver adapter and the job event
 * bus extension), with no job lock in front, as the MVP runs.
 */
const ROUNDS = 8;
const RIVALS = 5;

let app: FastifyInstance;
let db: PrismaClient;
let customerId: string;
let addressId: string;
let serviceId: string;
const pros: string[] = [];

beforeAll(async () => {
  app = await startApp();
  db = app.prisma as unknown as PrismaClient;
  const user = await db.user.create({ data: { email: uniqueEmail("race-customer"), emailVerified: true, name: "Race" } });
  customerId = (await db.customerProfile.create({ data: { userId: user.id } })).id;
  addressId = (await db.address.create({ data: { customerId, formatted: "Race St 1", lat: 32.07, lng: 34.78 } })).id;
  serviceId = (await db.service.findFirstOrThrow()).id;
  for (let i = 0; i < RIVALS; i++) {
    const pro = await db.user.create({ data: { email: uniqueEmail(`race-pro-${i}`), emailVerified: true, name: `Pro ${i}` } });
    const profile = await db.professionalProfile.create({
      data: { userId: pro.id, legalName: `Pro ${i}`, displayName: `Pro ${i}`, verificationStatus: "APPROVED", presenceState: "AVAILABLE" },
    });
    pros.push(profile.id);
  }
});

afterAll(async () => {
  await app.close();
});

async function jobOfferedTo(professionalIds: string[]) {
  const job = await db.job.create({ data: { customerId, serviceId, addressId, status: "OFFERING" } });
  const offers = [];
  for (const professionalId of professionalIds) {
    offers.push(
      await db.dispatchOffer.create({
        data: { jobId: job.id, professionalId, status: "SENT", expiresAt: new Date(Date.now() + 60_000) },
      })
    );
  }
  return { job, offers };
}

const deps = () => ({ prisma: db, lock: new NoopJobLock() });

describe("simultaneous accepts, through the Prisma path", () => {
  it(`${RIVALS} professionals tap accept at once, ${ROUNDS} times: exactly one wins each job`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const { job, offers } = await jobOfferedTo(pros);
      const results = await Promise.allSettled(offers.map((o) => acceptOffer(deps(), o.id, o.professionalId, `race-${round}`)));

      const won = results.filter((r) => r.status === "fulfilled");
      const lost = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(RIVALS - 1);
      for (const l of lost) expect(l.reason).toBeInstanceOf(OfferNoLongerAvailableError);

      const winner = (won[0] as PromiseFulfilledResult<{ professionalId: string }>).value.professionalId;
      const after = await db.job.findUniqueOrThrow({ where: { id: job.id }, include: { offers: true, events: true } });
      expect(after.status).toBe("PRO_ASSIGNED");
      expect(after.assignedProfessionalId).toBe(winner);
      expect(after.offers.filter((o) => o.status === "ACCEPTED").map((o) => o.professionalId)).toEqual([winner]);
      expect(after.offers.filter((o) => o.status === "REVOKED")).toHaveLength(RIVALS - 1);
      expect(after.events.filter((e) => e.type === "OFFER_ACCEPTED")).toHaveLength(1);

      // Free the winner for the next round.
      await db.professionalProfile.update({ where: { id: winner }, data: { presenceState: "AVAILABLE" } });
    }
  });

  it("one professional double-taps: one acceptance, one event", async () => {
    const { job, offers } = await jobOfferedTo([pros[0]!]);
    const offer = offers[0]!;
    const results = await Promise.allSettled([1, 2, 3].map(() => acceptOffer(deps(), offer.id, offer.professionalId, "double-tap")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const events = await db.jobEvent.findMany({ where: { jobId: job.id, type: "OFFER_ACCEPTED" } });
    expect(events).toHaveLength(1);
  });
});
