import { describe, it, expect } from "vitest";
import { recordsFor } from "../src/domain/dispatch/professional-record";

/**
 * A stand-in for the four aggregate queries. What is being tested is the
 * arithmetic and, more importantly, WHICH ROWS COUNT — a live offer is
 * not a miss, a revoked one is not a fact about the professional at all.
 */
function fakePrisma(data: {
  reviews?: Array<{ professionalId: string; avg: number; count: number }>;
  offers?: Array<{ professionalId: string; status: string; count: number }>;
  assigned?: Array<{ id: string; count: number }>;
  completed?: Array<{ id: string; count: number }>;
}) {
  return {
    review: {
      groupBy: async () =>
        (data.reviews ?? []).map((r) => ({
          professionalId: r.professionalId,
          _avg: { overallRating: r.avg },
          _count: { _all: r.count },
        })),
    },
    dispatchOffer: {
      groupBy: async ({ where }: any) => {
        const allowed: string[] = where.status.in;
        return (data.offers ?? [])
          .filter((o) => allowed.includes(o.status))
          .map((o) => ({
            professionalId: o.professionalId,
            status: o.status,
            _count: { _all: o.count },
          }));
      },
    },
    job: {
      groupBy: async ({ where }: any) => {
        const rows = where.status ? (data.completed ?? []) : (data.assigned ?? []);
        return rows.map((r) => ({
          assignedProfessionalId: r.id,
          _count: { _all: r.count },
        }));
      },
    },
  } as never;
}

describe("professional record — counted, never assumed", () => {
  it("knows nothing about somebody on their first shift", () => {
    // Not zero, not average: none. dispatch-service used to hand the
    // scoring engine 4.8 / 0.9 / 0.95 for this professional.
    return recordsFor(fakePrisma({}), ["new_pro"]).then((records) => {
      expect(records.get("new_pro")).toEqual({
        ratingAverage: null,
        acceptanceRate: null,
        completionRate: null,
        reviewCount: 0,
      });
    });
  });

  it("returns nothing at all for an empty shortlist", async () => {
    expect((await recordsFor(fakePrisma({}), [])).size).toBe(0);
  });

  it("averages published reviews and keeps the count beside it", async () => {
    const records = await recordsFor(
      fakePrisma({ reviews: [{ professionalId: "p1", avg: 4.5, count: 8 }] }),
      ["p1"]
    );
    expect(records.get("p1")!.ratingAverage).toBe(4.5);
    expect(records.get("p1")!.reviewCount).toBe(8);
  });

  it("counts acceptance over offers that were actually answered", async () => {
    const records = await recordsFor(
      fakePrisma({
        offers: [
          { professionalId: "p1", status: "ACCEPTED", count: 6 },
          { professionalId: "p1", status: "SKIPPED", count: 2 },
          { professionalId: "p1", status: "EXPIRED", count: 2 },
        ],
      }),
      ["p1"]
    );
    expect(records.get("p1")!.acceptanceRate).toBe(0.6);
  });

  it("does not count an offer that is still open against them", async () => {
    /*
     * A SENT offer is a question nobody has answered yet. Counting it as
     * a miss would penalise a professional for the thirty seconds they
     * are given to decide — and would do it hardest to whoever is
     * currently holding one, which is to say whoever is working.
     */
    const records = await recordsFor(
      fakePrisma({
        offers: [
          { professionalId: "p1", status: "ACCEPTED", count: 1 },
          { professionalId: "p1", status: "SENT", count: 5 },
        ],
      }),
      ["p1"]
    );
    expect(records.get("p1")!.acceptanceRate).toBe(1);
  });

  it("does not count an offer the platform withdrew", async () => {
    // REVOKED means somebody else accepted first. That is a fact about
    // the race, not about this professional.
    const records = await recordsFor(
      fakePrisma({
        offers: [
          { professionalId: "p1", status: "ACCEPTED", count: 1 },
          { professionalId: "p1", status: "REVOKED", count: 9 },
        ],
      }),
      ["p1"]
    );
    expect(records.get("p1")!.acceptanceRate).toBe(1);
  });

  it("counts completion over jobs actually assigned", async () => {
    const records = await recordsFor(
      fakePrisma({ assigned: [{ id: "p1", count: 10 }], completed: [{ id: "p1", count: 9 }] }),
      ["p1"]
    );
    expect(records.get("p1")!.completionRate).toBe(0.9);
  });

  it("reports a professional who has never finished one", async () => {
    // Zero is a real answer here, and a very different one from null:
    // they were assigned four jobs and completed none.
    const records = await recordsFor(fakePrisma({ assigned: [{ id: "p1", count: 4 }] }), ["p1"]);
    expect(records.get("p1")!.completionRate).toBe(0);
  });

  it("keeps two professionals' records apart", async () => {
    const records = await recordsFor(
      fakePrisma({
        reviews: [
          { professionalId: "p1", avg: 5, count: 3 },
          { professionalId: "p2", avg: 2, count: 7 },
        ],
      }),
      ["p1", "p2"]
    );
    expect(records.get("p1")!.ratingAverage).toBe(5);
    expect(records.get("p2")!.ratingAverage).toBe(2);
  });
});
