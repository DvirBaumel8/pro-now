import type { FastifyInstance } from "fastify";
import {
  MIN_REVIEWS_FOR_RATING,
  type JobMatchView,
  type PriceQuoteView,
  type ProfessionalSummaryView,
  type VerificationBadgeKind,
} from "@pro-now/types";

/**
 * GET /v1/jobs/:id/match — the payload behind the customer's match card.
 *
 * This endpoint exists because the card previously had nowhere to get its
 * facts from: `GET /v1/jobs/:id` does not expand the assigned professional,
 * the accepted offer's ETA snapshot, or the price, so the screen rendered
 * hard-coded values instead (see /docs/EPIC-0-REPORT.md §9.8). Every field
 * the card shows is assembled here, from real rows, or returned as null.
 *
 * The server is authoritative (/CLAUDE.md §3): the client renders this, it
 * does not compute any of it.
 */
export default async function matchRoutes(app: FastifyInstance) {
  app.get("/v1/jobs/:id/match", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id: jobId } = req.params as { id: string };

    const job = await app.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        service: true,
        assignedProfessional: {
          include: {
            identityVerification: true,
            businessProfile: true,
            credentials: true,
            services: true,
            externalProfiles: { include: { source: true, snapshots: { orderBy: { createdAt: "desc" }, take: 1 } } },
          },
        },
        offers: { where: { status: "ACCEPTED" }, orderBy: { offeredAt: "desc" }, take: 1 },
      },
    });

    if (!job) return reply.status(404).send({ code: "JOB_NOT_FOUND", message: "Job not found" });

    const pro = job.assignedProfessional;
    if (!pro) {
      return reply.status(409).send({
        code: "NO_PROFESSIONAL_ASSIGNED",
        message: "This job has no assigned professional yet",
      });
    }

    // --- Reputation: PRO NOW's own numbers only, never merged with external.
    const [ratingAggregate, completedJobs] = await Promise.all([
      app.prisma.review.aggregate({
        where: { professionalId: pro.id, moderationStatus: "PUBLISHED" },
        _avg: { overallRating: true },
        _count: { _all: true },
      }),
      app.prisma.job.count({
        where: { assignedProfessionalId: pro.id, status: { in: ["COMPLETED", "PAYMENT_CAPTURED", "CLOSED"] } },
      }),
    ]);

    const ratingCount: number = ratingAggregate._count._all ?? 0;
    const ratingAverage: number | null =
      ratingCount >= MIN_REVIEWS_FOR_RATING ? ratingAggregate._avg.overallRating ?? null : null;

    // --- Badges: enumerated facts, each derived from a row that exists.
    const verifications: VerificationBadgeKind[] = [];

    /*
     * A SANDBOX identity check is not a verification. `isSandbox` marks a
     * result produced by the stub adapter, and showing "זהות אומתה" for one
     * would be presenting mocked data as production — explicitly banned by
     * /CLAUDE.md §3 ("No fake integrations, no mocked data presented as
     * production, ever."). So the badge requires a real vendor result.
     */
    if (pro.identityVerification?.status === "VERIFIED" && pro.identityVerification.isSandbox === false) {
      verifications.push("IDENTITY_VERIFIED");
    }

    /*
     * The badge follows the explicit `verificationStatus`, never the mere
     * existence of a BusinessProfile row — that row only means the
     * professional entered details, not that anyone checked them
     * (/docs/10-TRUST-VERIFICATION.md §Onboarding step 3).
     */
    if (pro.businessProfile?.verificationStatus === "VERIFIED") {
      verifications.push("BUSINESS_VERIFIED");
    }

    const serviceCredentials = pro.credentials.filter(
      (c: { serviceId: string }) => c.serviceId === job.serviceId
    );
    const verifiedCredentials = serviceCredentials.filter(
      (c: { status: string }) => c.status === "VERIFIED"
    );
    if (verifiedCredentials.some((c: { type: string }) => c.type.toUpperCase() === "LICENSE")) {
      verifications.push("LICENSE_VERIFIED");
    }
    if (verifiedCredentials.length > 0) verifications.push("CREDENTIALS_CHECKED");

    const linkedExternal = pro.externalProfiles.find(
      (p: { linkStatus: string }) => p.linkStatus === "LINKED"
    );
    if (linkedExternal) verifications.push("EXTERNAL_REPUTATION_LINKED");

    const externalSnapshot = linkedExternal?.snapshots?.[0];

    const professional: ProfessionalSummaryView = {
      id: pro.id,
      displayName: pro.displayName,
      profilePhotoUrl: pro.profilePhotoRef ?? null,
      verifications,
      proNowCompletedJobs: completedJobs,
      proNowRatingAverage: ratingAverage,
      proNowRatingCount: ratingCount,
      externalReputation: linkedExternal
        ? {
            source: linkedExternal.source?.code ?? "EXTERNAL",
            ratingAverage: externalSnapshot?.rating ?? null,
            ratingCount: externalSnapshot?.reviewCount ?? null,
            profileUrl: linkedExternal.profileUrl ?? null,
          }
        : null,
    };

    // --- Price.
    const professionalService = pro.services.find(
      (s: { serviceId: string }) => s.serviceId === job.serviceId
    );
    const basePrice: number | null = professionalService?.basePriceMinorUnits ?? null;

    /*
     * Which fields are meaningful is decided by the service's priceModel —
     * see the pricing-configuration block on ProfessionalService in
     * schema.prisma and /docs/09-PAYMENTS.md §Pricing archetypes. A null
     * here means "the professional has not configured it", and the card
     * omits the line rather than showing a zero.
     */
    const price: PriceQuoteView = {
      priceModel: job.service.priceModel,
      currency: "ILS",
      ...(job.service.priceModel === "FIXED" ? { fixedTotalMinorUnits: basePrice } : {}),
      ...(job.service.priceModel === "VISIT_QUOTE" ? { visitFeeMinorUnits: basePrice } : {}),
      ...(job.service.priceModel === "HOURLY"
        ? {
            hourlyRateMinorUnits: basePrice,
            minimumBillableMinutes: professionalService?.minimumBillableMinutes ?? null,
          }
        : {}),
      ...(job.service.priceModel === "DISTANCE_TIME"
        ? {
            baseMinorUnits: basePrice,
            perKmMinorUnits: professionalService?.perKmMinorUnits ?? null,
            minimumFareMinorUnits: professionalService?.minimumFareMinorUnits ?? null,
          }
        : {}),
    };

    // --- ETA: the snapshot taken when the offer was made. Never recomputed
    //     here and never substituted with a guess when absent.
    const acceptedOffer = job.offers[0];
    const etaSeconds: number | null = acceptedOffer?.etaSecondsSnapshot ?? null;

    const result: JobMatchView = {
      jobId: job.id,
      status: job.status,
      serviceNameHe: job.service.nameHe,
      professional,
      eta:
        etaSeconds === null
          ? null
          : {
              etaSeconds,
              distanceMeters: null,
              // The snapshot does not record whether it came from a real
              // route, so it is reported as not route-based: the card then
              // marks it approximate. Under-claiming is the safe direction.
              isRouteBased: false,
              computedAt: (acceptedOffer?.offeredAt ?? job.updatedAt).toISOString(),
            },
      price,
    };

    return reply.send(result);
  });
}
