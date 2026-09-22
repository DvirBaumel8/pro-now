import type { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";

/**
 * Atomic offer acceptance — see /docs/05-DATABASE.md §Atomic accept and
 * /docs/08-DISPATCH-ENGINE.md §Atomic assignment. This is the single most
 * important correctness guarantee in the system: two professionals must
 * never both win the same job, even if they tap ACCEPT at the same
 * instant. Definition of Done per /docs/19-CLAUDE-RULES.md: "not done
 * until two simultaneous accepts cannot create two assignments" — verified
 * in test/dispatch.atomic-accept.test.ts via a concurrency test, not by
 * inspection.
 *
 * Strategy: a short-lived Redis lock keyed by jobId guards the
 * check-then-act race at the application level (fast path, avoids two
 * requests both starting a DB transaction that would serialize anyway),
 * and the DB transaction's row lock (`SELECT ... FOR UPDATE` via
 * `$queryRaw` inside `$transaction`) is the actual source of correctness
 * — the Redis lock is a latency optimization, not the safety mechanism.
 */

export class OfferNoLongerAvailableError extends Error {
  constructor(offerId: string) {
    super(`OFFER_NO_LONGER_AVAILABLE: ${offerId}`);
  }
}

const JOB_LOCK_TTL_MS = 5000;

/**
 * The lock is an optimization, so its absence is not a failure.
 *
 * The paragraph above says it plainly — the row lock is the source of
 * correctness and Redis only saves two requests from both opening a
 * transaction that would serialize anyway. The implementation did not
 * agree: with Redis unreachable, `redis.set` exhausted ioredis's twenty
 * retries and threw, and a professional tapping ACCEPT got "Internal
 * Server Error". An optimization had become a hard dependency, and the
 * one irreplaceable moment in this product — the accept — was the thing
 * it took down.
 *
 * So a Redis that will not answer is stepped over, loudly. What is NOT
 * stepped over is a Redis that answers "somebody else holds this": that
 * is a real race and still refuses the accept.
 */
async function withJobLock<T>(
  redis: Redis,
  jobId: string,
  log: ((message: string, err: unknown) => void) | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = `pronow:lock:job:${jobId}`;
  const token = Math.random().toString(36).slice(2);

  let held = false;
  try {
    const acquired = await redis.set(lockKey, token, "PX", JOB_LOCK_TTL_MS, "NX");
    if (!acquired) {
      // Redis answered, and the answer was no. Another accept is in flight.
      throw new OfferNoLongerAvailableError(jobId);
    }
    held = true;
  } catch (err) {
    if (err instanceof OfferNoLongerAvailableError) throw err;
    log?.("job lock unavailable — proceeding on the database row lock alone", err);
  }

  try {
    return await fn();
  } finally {
    if (held) {
      try {
        // Only release if we still own it (best-effort; TTL is the real backstop).
        const current = await redis.get(lockKey);
        if (current === token) await redis.del(lockKey);
      } catch (err) {
        log?.("job lock release failed — the TTL will clear it", err);
      }
    }
  }
}

export interface AcceptOfferDeps {
  prisma: PrismaClient;
  redis: Redis;
  /**
   * Optional, so the domain does not depend on a logger — but a lock that
   * was skipped must not be skipped silently. Losing the fast path costs
   * latency under contention, and an operator should be able to see that
   * it happened.
   */
  log?: (message: string, err: unknown) => void;
}

export async function acceptOffer(deps: AcceptOfferDeps, offerId: string, professionalId: string, requestId: string) {
  const { prisma, redis, log } = deps;

  const offer = await prisma.dispatchOffer.findUnique({ where: { id: offerId } });
  if (!offer) throw new OfferNoLongerAvailableError(offerId);
  if (offer.professionalId !== professionalId) throw new OfferNoLongerAvailableError(offerId);

  return withJobLock(redis, offer.jobId, log, async () => {
    return prisma.$transaction(async (tx) => {
      // Row-lock the job so a concurrent transaction (should the Redis lock
      // ever be bypassed, e.g. in a Redis outage) still cannot double-assign.
      const [job] = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        `SELECT id, status FROM jobs WHERE id = $1 FOR UPDATE`,
        offer.jobId
      );
      if (!job) throw new OfferNoLongerAvailableError(offerId);

      const freshOffer = await tx.dispatchOffer.findUnique({ where: { id: offerId } });
      if (!freshOffer || freshOffer.status !== "SENT" && freshOffer.status !== "CREATED" && freshOffer.status !== "VIEWED") {
        throw new OfferNoLongerAvailableError(offerId);
      }
      if (freshOffer.expiresAt.getTime() < Date.now()) {
        await tx.dispatchOffer.update({ where: { id: offerId }, data: { status: "EXPIRED" } });
        throw new OfferNoLongerAvailableError(offerId);
      }
      if (job.status !== "OFFERING" && job.status !== "SEARCHING") {
        throw new OfferNoLongerAvailableError(offerId);
      }

      await tx.dispatchOffer.update({
        where: { id: offerId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      // Revoke every other live offer for this job.
      await tx.dispatchOffer.updateMany({
        where: {
          jobId: offer.jobId,
          id: { not: offerId },
          status: { in: ["CREATED", "SENT", "VIEWED"] },
        },
        data: { status: "REVOKED" },
      });

      await tx.job.update({
        where: { id: offer.jobId },
        data: { status: "PRO_ASSIGNED", assignedProfessionalId: professionalId },
      });

      await tx.professionalProfile.update({
        where: { id: professionalId },
        data: { presenceState: "ASSIGNED" },
      });

      await tx.jobEvent.create({
        data: {
          jobId: offer.jobId,
          type: "OFFER_ACCEPTED",
          actor: "PROFESSIONAL",
          actorId: professionalId,
          metadata: { offerId },
          requestId,
        },
      });

      return { jobId: offer.jobId, professionalId };
    });
  });
}
