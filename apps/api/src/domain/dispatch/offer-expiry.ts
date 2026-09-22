/**
 * THE OFFER NOBODY ANSWERED.
 *
 * ---------------------------------------------------------------------
 * WHAT WAS MISSING
 * ---------------------------------------------------------------------
 * `dispatch-service.ts` describes its own pipeline as "sequential offer ->
 * atomic accept -> fallback". The fallback existed for one of the two ways
 * an offer ends: a professional who taps skip is returned to AVAILABLE and
 * the job is re-dispatched (`routes/offers.ts`). The other way — the
 * professional who taps nothing, which is the common one, because phones
 * are in pockets — had nothing at all.
 *
 * So an unanswered offer left three things stranded, permanently:
 *
 *   - the OFFER, still `SENT`, past its own `expiresAt` forever;
 *   - the PROFESSIONAL, still `OFFER_RECEIVED`, which is not `AVAILABLE`
 *     and therefore invisible to every future dispatch. One missed offer
 *     removed them from the market until something else happened to move
 *     them;
 *   - the JOB, still `OFFERING`, with a customer watching a screen that
 *     says somebody is coming.
 *
 * That last one is the complaint this product exists to answer, arriving
 * by the front door: *"I waited half an hour and nobody came."*
 *
 * ---------------------------------------------------------------------
 * WHAT THIS DOES, AND WHAT IT REFUSES TO DO
 * ---------------------------------------------------------------------
 * Expiring an offer releases the professional and asks the next candidate.
 * It does NOT move the job: `/docs/07-JOB-STATE-MACHINE.md` has no
 * `OFFERING -> SEARCHING` edge, and it is right not to. OFFERING means
 * "we are making offers", not "this particular offer is live", so a second
 * offer needs no state change and the customer's screen keeps its meaning.
 *
 * When the ranked list runs out, the job is NOT quietly cancelled on the
 * spot. A market that is empty at 14:03 is not empty at 14:04, and giving
 * up on the first pass would be the product lying in the opposite
 * direction. It keeps looking until the search deadline, and only then
 * tells the customer the truth: nobody is available.
 */
import type { PrismaClient } from "@prisma/client";
import type { MapsRoutingProvider } from "@pro-now/types";

import { triggerDispatch, type DispatchOutcome } from "./dispatch-service";
import { isPresenceTransitionAllowed } from "../job/pro-presence-transitions";

/** Offer states that are still waiting on an answer. */
const LIVE_OFFER_STATUSES = ["CREATED", "SENT", "VIEWED"] as const;

/** Job states in which the search is still the thing that is happening. */
const SEARCHING_JOB_STATUSES = ["SEARCHING", "OFFERING"] as const;

export interface SweepConfig {
  offerTimeoutSeconds: number;
  /**
   * How long a customer is left waiting before the server admits nobody is
   * coming. This is a product/ops judgement rather than a fact about the
   * code — see `/docs/18-ROADMAP.md §Open decisions`, where it is recorded
   * as unconfirmed. The default is a starting point, not an answer.
   */
  searchDeadlineSeconds: number;
  locationFreshnessThresholdSeconds: number;
}

/**
 * What should happen to a job that is searching with nothing live in front
 * of it. Pure, because it is the judgement in this file and the rest is
 * plumbing — the same split `eligibility.ts` has from `dispatch-service.ts`.
 *
 *   REOFFER  — keep looking; the market may have changed since the last try.
 *   GIVE_UP  — the customer has waited long enough to be told the truth.
 *   LEAVE    — not ours: assigned, or no longer searching.
 */
export type StalledJobDecision = "REOFFER" | "GIVE_UP" | "LEAVE";

export interface StalledJob {
  status: string;
  assignedProfessionalId: string | null;
  createdAt: Date;
}

export function decideStalledJob(
  job: StalledJob,
  now: Date,
  searchDeadlineSeconds: number
): StalledJobDecision {
  if (job.assignedProfessionalId) return "LEAVE";
  if (!SEARCHING_JOB_STATUSES.includes(job.status as (typeof SEARCHING_JOB_STATUSES)[number])) {
    return "LEAVE";
  }
  const searchingForSeconds = (now.getTime() - job.createdAt.getTime()) / 1000;
  return searchingForSeconds > searchDeadlineSeconds ? "GIVE_UP" : "REOFFER";
}

export interface SweepResult {
  offersExpired: number;
  professionalsReleased: number;
  jobsReoffered: number;
  jobsGivenUp: number;
}

/**
 * Release one professional from an offer that ended without them.
 *
 * Guarded by the presence machine rather than written blind: by the time a
 * sweep runs, the professional may have started a shift-end, or accepted a
 * different job in the same second. `OFFER_RECEIVED -> AVAILABLE` is the
 * edge `/docs/07-JOB-STATE-MACHINE.md` labels "skip/expire"; anything else
 * is somebody else's transition and is left alone.
 */
async function releaseProfessional(
  prisma: PrismaClient,
  professionalId: string
): Promise<boolean> {
  const pro = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { presenceState: true },
  });
  if (!pro) return false;
  if (!isPresenceTransitionAllowed(pro.presenceState, "AVAILABLE")) return false;
  if (pro.presenceState !== "OFFER_RECEIVED") return false;

  await prisma.professionalProfile.update({
    where: { id: professionalId },
    data: { presenceState: "AVAILABLE" },
  });
  return true;
}

/**
 * Expire every offer whose time has run out, release the professionals,
 * and hand each affected job to the next candidate.
 */
export async function sweepExpiredOffers(
  prisma: PrismaClient,
  maps: MapsRoutingProvider,
  config: SweepConfig,
  now: Date = new Date()
): Promise<SweepResult> {
  const result: SweepResult = {
    offersExpired: 0,
    professionalsReleased: 0,
    jobsReoffered: 0,
    jobsGivenUp: 0,
  };

  const due = await prisma.dispatchOffer.findMany({
    where: { status: { in: [...LIVE_OFFER_STATUSES] }, expiresAt: { lte: now } },
    select: { id: true, jobId: true, professionalId: true },
  });

  const touchedJobIds = new Set<string>();

  for (const offer of due) {
    await prisma.dispatchOffer.update({
      where: { id: offer.id },
      data: { status: "EXPIRED" },
    });
    result.offersExpired += 1;

    if (await releaseProfessional(prisma, offer.professionalId)) {
      result.professionalsReleased += 1;
    }

    await prisma.jobEvent.create({
      data: {
        jobId: offer.jobId,
        type: "OFFER_EXPIRED",
        actor: "SYSTEM",
        metadata: { offerId: offer.id, professionalId: offer.professionalId },
      },
    });

    touchedJobIds.add(offer.jobId);
  }

  /*
   * Jobs that are searching with nothing live in front of them. This
   * catches more than the offers just expired: a job that found nobody at
   * the instant it was created was left in SEARCHING with a MATCH_FAILED
   * event and no retry, which made it permanently dead the moment the
   * market was momentarily empty. It is picked up here on the next sweep.
   */
  const stalled = await prisma.job.findMany({
    where: {
      status: { in: [...SEARCHING_JOB_STATUSES] },
      assignedProfessionalId: null,
      offers: { none: { status: { in: [...LIVE_OFFER_STATUSES] }, expiresAt: { gt: now } } },
    },
    select: { id: true, createdAt: true },
  });

  for (const job of stalled) {
    touchedJobIds.add(job.id);
  }

  for (const jobId of touchedJobIds) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, assignedProfessionalId: true, createdAt: true },
    });
    if (!job) continue;

    const decision = decideStalledJob(job, now, config.searchDeadlineSeconds);
    if (decision === "LEAVE") continue;
    if (decision === "GIVE_UP") {
      await giveUp(prisma, jobId, (now.getTime() - job.createdAt.getTime()) / 1000);
      result.jobsGivenUp += 1;
      continue;
    }

    const outcome: DispatchOutcome = await triggerDispatch(
      prisma,
      maps,
      jobId,
      config.offerTimeoutSeconds,
      undefined,
      config.locationFreshnessThresholdSeconds
    );
    if (outcome.status === "OFFER_SENT") result.jobsReoffered += 1;
  }

  return result;
}

/**
 * Tell the customer the truth. `OFFERING -> CANCELLED` and
 * `SEARCHING -> CANCELLED` are both legal for a SYSTEM actor, and the
 * reason code is recorded so the job inspector can answer "why did nobody
 * come" with something better than a guess (/docs/13-ADMIN-OPS.md).
 */
async function giveUp(
  prisma: PrismaClient,
  jobId: string,
  searchingForSeconds: number
): Promise<void> {
  await prisma.job.update({ where: { id: jobId }, data: { status: "CANCELLED" } });
  await prisma.jobEvent.create({
    data: {
      jobId,
      type: "JOB_CANCELLED",
      actor: "SYSTEM",
      metadata: {
        reason: "NO_PROFESSIONAL_AVAILABLE",
        searchedForSeconds: Math.round(searchingForSeconds),
      },
    },
  });
}
