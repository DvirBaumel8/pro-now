import { describe, it, expect } from "vitest";
import {
  decideStalledJob,
  sweepExpiredOffers,
  type StalledJob,
} from "../src/domain/dispatch/offer-expiry.js";

const DEADLINE = 300;
const NOW = new Date("2026-09-22T10:00:00Z");
const secondsAgo = (n: number) => new Date(NOW.getTime() - n * 1000);

const searching = (over: Partial<StalledJob> = {}): StalledJob => ({
  status: "OFFERING",
  assignedProfessionalId: null,
  createdAt: secondsAgo(10),
  ...over,
});

describe("decideStalledJob — /docs/08-DISPATCH-ENGINE.md §Fallback", () => {
  it("keeps looking while the customer is still inside the search deadline", () => {
    expect(decideStalledJob(searching(), NOW, DEADLINE)).toBe("REOFFER");
  });

  it("keeps looking for a job that never found anybody on its first pass", () => {
    // The market being empty at the instant of the request is not an answer.
    expect(decideStalledJob(searching({ status: "SEARCHING" }), NOW, DEADLINE)).toBe("REOFFER");
  });

  it("gives up once the customer has waited past the deadline", () => {
    expect(decideStalledJob(searching({ createdAt: secondsAgo(301) }), NOW, DEADLINE)).toBe(
      "GIVE_UP"
    );
  });

  it("does not give up one second early", () => {
    expect(decideStalledJob(searching({ createdAt: secondsAgo(300) }), NOW, DEADLINE)).toBe(
      "REOFFER"
    );
  });

  it("leaves an assigned job alone, however long the search took", () => {
    expect(
      decideStalledJob(
        searching({ assignedProfessionalId: "pro_1", createdAt: secondsAgo(9999) }),
        NOW,
        DEADLINE
      )
    ).toBe("LEAVE");
  });

  it("leaves a job that is no longer searching alone", () => {
    for (const status of ["PRO_EN_ROUTE", "IN_PROGRESS", "CANCELLED", "COMPLETED"]) {
      expect(decideStalledJob(searching({ status }), NOW, DEADLINE)).toBe("LEAVE");
    }
  });
});

/**
 * A recording double, not a database. What matters about the sweep is the
 * sequence of decisions it makes — which offer it expires, whether the
 * professional is released, whether it asks again — and those are visible
 * from the calls it issues.
 */
function fakePrisma(state: {
  offers: Array<{
    id: string;
    jobId: string;
    professionalId: string;
    status: string;
    expiresAt: Date;
  }>;
  professionals: Record<string, { presenceState: string }>;
  jobs: Record<string, { status: string; assignedProfessionalId: string | null; createdAt: Date }>;
}) {
  const events: Array<{ jobId: string; type: string; metadata: unknown }> = [];

  return {
    events,
    client: {
      dispatchOffer: {
        findMany: async ({ where }: any) => {
          const live: string[] = where.status.in;
          return state.offers
            .filter((o) => live.includes(o.status) && o.expiresAt <= where.expiresAt.lte)
            .map((o) => ({ id: o.id, jobId: o.jobId, professionalId: o.professionalId }));
        },
        update: async ({ where, data }: any) => {
          const offer = state.offers.find((o) => o.id === where.id);
          if (offer) offer.status = data.status;
          return offer;
        },
      },
      professionalProfile: {
        findUnique: async ({ where }: any) => state.professionals[where.id] ?? null,
        update: async ({ where, data }: any) => {
          const pro = state.professionals[where.id];
          if (pro) pro.presenceState = data.presenceState;
          return pro;
        },
      },
      jobEvent: {
        create: async ({ data }: any) => {
          events.push({ jobId: data.jobId, type: data.type, metadata: data.metadata });
          return data;
        },
      },
      job: {
        findMany: async () => [],
        findUnique: async ({ where }: any) => {
          const job = state.jobs[where.id];
          return job ? { id: where.id, ...job } : null;
        },
        update: async ({ where, data }: any) => {
          const job = state.jobs[where.id];
          if (job) job.status = data.status;
          return job;
        },
      },
    } as never,
  };
}

const noMaps = {} as never;
const config = {
  offerTimeoutSeconds: 30,
  searchDeadlineSeconds: DEADLINE,
  locationFreshnessThresholdSeconds: 90,
};

describe("sweepExpiredOffers — the offer nobody answered", () => {
  it("expires a due offer and returns the professional to the market", async () => {
    const state = {
      offers: [
        {
          id: "off_1",
          jobId: "job_1",
          professionalId: "pro_1",
          status: "SENT",
          expiresAt: secondsAgo(1),
        },
      ],
      professionals: { pro_1: { presenceState: "OFFER_RECEIVED" } },
      // Already cancelled, so the sweep stops before re-dispatching and the
      // test stays about the release rather than about the engine.
      jobs: { job_1: { status: "CANCELLED", assignedProfessionalId: null, createdAt: secondsAgo(5) } },
    };
    const fake = fakePrisma(state);

    const result = await sweepExpiredOffers(fake.client, noMaps, config, NOW);

    expect(result.offersExpired).toBe(1);
    expect(result.professionalsReleased).toBe(1);
    expect(state.offers[0]!.status).toBe("EXPIRED");
    expect(state.professionals.pro_1!.presenceState).toBe("AVAILABLE");
    expect(fake.events).toContainEqual(
      expect.objectContaining({ jobId: "job_1", type: "OFFER_EXPIRED" })
    );
  });

  it("leaves an offer that still has time on it", async () => {
    const state = {
      offers: [
        {
          id: "off_1",
          jobId: "job_1",
          professionalId: "pro_1",
          status: "SENT",
          expiresAt: new Date(NOW.getTime() + 5_000),
        },
      ],
      professionals: { pro_1: { presenceState: "OFFER_RECEIVED" } },
      jobs: { job_1: { status: "OFFERING", assignedProfessionalId: null, createdAt: secondsAgo(5) } },
    };
    const fake = fakePrisma(state);

    const result = await sweepExpiredOffers(fake.client, noMaps, config, NOW);

    expect(result.offersExpired).toBe(0);
    expect(state.professionals.pro_1!.presenceState).toBe("OFFER_RECEIVED");
  });

  it("does not drag a professional out of a state that is not theirs to leave", async () => {
    // They accepted a different job in the same second the sweep ran. The
    // expiring offer must not pull them back to AVAILABLE mid-assignment.
    const state = {
      offers: [
        {
          id: "off_1",
          jobId: "job_1",
          professionalId: "pro_1",
          status: "SENT",
          expiresAt: secondsAgo(1),
        },
      ],
      professionals: { pro_1: { presenceState: "ASSIGNED" } },
      jobs: { job_1: { status: "CANCELLED", assignedProfessionalId: null, createdAt: secondsAgo(5) } },
    };
    const fake = fakePrisma(state);

    const result = await sweepExpiredOffers(fake.client, noMaps, config, NOW);

    expect(result.offersExpired).toBe(1);
    expect(result.professionalsReleased).toBe(0);
    expect(state.professionals.pro_1!.presenceState).toBe("ASSIGNED");
  });

  it("tells the customer the truth once the search deadline has passed", async () => {
    const state = {
      offers: [
        {
          id: "off_1",
          jobId: "job_1",
          professionalId: "pro_1",
          status: "SENT",
          expiresAt: secondsAgo(1),
        },
      ],
      professionals: { pro_1: { presenceState: "OFFER_RECEIVED" } },
      jobs: {
        job_1: { status: "OFFERING", assignedProfessionalId: null, createdAt: secondsAgo(400) },
      },
    };
    const fake = fakePrisma(state);

    const result = await sweepExpiredOffers(fake.client, noMaps, config, NOW);

    expect(result.jobsGivenUp).toBe(1);
    expect(state.jobs.job_1!.status).toBe("CANCELLED");
    expect(fake.events).toContainEqual(
      expect.objectContaining({
        type: "JOB_CANCELLED",
        metadata: expect.objectContaining({ reason: "NO_PROFESSIONAL_AVAILABLE" }),
      })
    );
  });
});
