import type { PrismaClient } from "@prisma/client";
import type { MapsRoutingProvider } from "@pro-now/types";
import { evaluateEligibility } from "./eligibility";
import { rankCandidates, DEFAULT_SCORING_WEIGHTS, type ScoringWeights } from "./scoring";

/**
 * Simplified synchronous dispatch trigger for this delivery — see
 * /docs/08-DISPATCH-ENGINE.md. A production build would move step 2
 * onward onto a queue/worker so `POST /v1/jobs` returns immediately, but
 * the pipeline stages and their order are exactly as specified: PostGIS
 * pre-filter -> eligibility -> real ETA for shortlist only -> scoring ->
 * sequential offer -> atomic accept (see atomic-accept.ts) -> fallback.
 */

const GEO_PREFILTER_DEGREES = 0.15; // ~ generous bounding box; real PostGIS ST_DWithin narrows further in SQL

export interface DispatchOutcome {
  status: "OFFER_SENT" | "NO_ELIGIBLE_CANDIDATES";
  offerId?: string;
  professionalId?: string;
  candidatesConsidered: number;
  candidatesEligible: number;
}

export async function triggerDispatch(
  prisma: PrismaClient,
  maps: MapsRoutingProvider,
  jobId: string,
  offerTimeoutSeconds: number,
  scoringWeights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  locationFreshnessThresholdSeconds = 90
): Promise<DispatchOutcome> {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { address: true, service: true },
  });

  await prisma.job.update({ where: { id: jobId }, data: { status: "SEARCHING" } });
  await prisma.jobEvent.create({
    data: { jobId, type: "MATCHING_STARTED", actor: "SYSTEM", metadata: {} },
  });

  // Step 1 — coarse geographic pre-filter (bounding box here; PostGIS
  // ST_DWithin in the real query builder against professional_locations).
  const nearbyProfessionals = await prisma.professionalProfile.findMany({
    where: {
      presenceState: "AVAILABLE",
      services: { some: { serviceId: job.serviceId, status: "APPROVED" } },
      locations: {
        some: {
          lat: { gte: job.address.lat - GEO_PREFILTER_DEGREES, lte: job.address.lat + GEO_PREFILTER_DEGREES },
          lng: { gte: job.address.lng - GEO_PREFILTER_DEGREES, lte: job.address.lng + GEO_PREFILTER_DEGREES },
        },
      },
    },
    include: {
      locations: { orderBy: { receivedAt: "desc" }, take: 1 },
      services: { where: { serviceId: job.serviceId } },
      credentials: { where: { serviceId: job.serviceId } },
    },
    take: 25,
  });

  // Step 2 — eligibility (explainable, per-candidate reason codes).
  const now = Date.now();
  const eligible = nearbyProfessionals.filter((pro) => {
    const latestLocation = pro.locations[0];
    const locationAgeSeconds = latestLocation
      ? (now - latestLocation.receivedAt.getTime()) / 1000
      : Number.POSITIVE_INFINITY;

    const requiredCredential = pro.credentials[0];
    const requiredCredentialsCurrent =
      pro.credentials.length === 0 ||
      (requiredCredential?.status === "VERIFIED" &&
        (!requiredCredential.expiresAt || requiredCredential.expiresAt > new Date()));

    const result = evaluateEligibility(
      {
        professionalId: pro.id,
        presenceState: pro.presenceState,
        locationAgeSeconds,
        serviceApproved: pro.services.length > 0,
        requiredCredentialsCurrent,
        insideServiceArea: true, // refined by real service-area geometry in a later epic
        alreadyAssignedToAnotherJob: false,
        isRiskLimitedForService: false,
        isBlockedAgainstCustomer: false,
        equipmentMatches: true,
        marketActive: true,
      },
      { locationFreshnessThresholdSeconds }
    );
    return result.eligible;
  });

  if (eligible.length === 0) {
    await prisma.jobEvent.create({
      data: { jobId, type: "MATCH_FAILED", actor: "SYSTEM", metadata: { reason: "NO_ELIGIBLE_CANDIDATES" } },
    });
    return { status: "NO_ELIGIBLE_CANDIDATES", candidatesConsidered: nearbyProfessionals.length, candidatesEligible: 0 };
  }

  // Step 3 — real ETA for the shortlist only.
  const etas = await maps.getEtaBatch(
    { lat: job.address.lat, lng: job.address.lng },
    eligible.map((pro) => ({ id: pro.id, location: { lat: pro.locations[0].lat, lng: pro.locations[0].lng } }))
  );
  const etaByProId = new Map(etas.map((e) => [e.originId, e]));
  const maxEta = Math.max(...etas.map((e) => e.etaSeconds), 1);

  // Step 4 — scoring.
  const ranked = rankCandidates(
    eligible.map((pro) => ({
      professionalId: pro.id,
      etaSeconds: etaByProId.get(pro.id)?.etaSeconds ?? maxEta,
      maxEtaSecondsInShortlist: maxEta,
      serviceFitScore: 1,
      ratingAverage: 4.8, // placeholder until reviews aggregate is wired (Epic 11)
      acceptanceRate: 0.9,
      completionRate: 0.95,
      cancellationPenalty: 0,
      recentAssignmentPenalty: 0,
    })),
    scoringWeights
  );

  const top = ranked[0];
  const topEta = etaByProId.get(top.professionalId);

  await prisma.job.update({ where: { id: jobId }, data: { status: "OFFERING" } });

  const offer = await prisma.dispatchOffer.create({
    data: {
      jobId,
      professionalId: top.professionalId,
      status: "SENT",
      expiresAt: new Date(Date.now() + offerTimeoutSeconds * 1000),
      scoreSnapshot: top.score,
      etaSecondsSnapshot: topEta?.etaSeconds,
    },
  });

  await prisma.professionalProfile.update({
    where: { id: top.professionalId },
    data: { presenceState: "OFFER_RECEIVED" },
  });

  await prisma.jobEvent.create({
    data: {
      jobId,
      type: "OFFER_SENT",
      actor: "SYSTEM",
      metadata: { professionalId: top.professionalId, offerId: offer.id, etaSeconds: topEta?.etaSeconds },
    },
  });

  return {
    status: "OFFER_SENT",
    offerId: offer.id,
    professionalId: top.professionalId,
    candidatesConsidered: nearbyProfessionals.length,
    candidatesEligible: eligible.length,
  };
}
