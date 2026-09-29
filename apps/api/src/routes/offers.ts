import type { FastifyInstance } from "fastify";
import { acceptOffer, OfferNoLongerAvailableError } from "../domain/dispatch/atomic-accept";
import { triggerDispatch } from "../domain/dispatch/dispatch-service";
import { notFound, ownOffer, requireRole } from "../auth/access";

const LIVE_OFFER = ["CREATED", "SENT", "VIEWED"] as const;

/**
 * See /docs/06-API-SPEC.md and /docs/08-DISPATCH-ENGINE.md §Fallback.
 */
export default async function offersRoutes(app: FastifyInstance) {
  app.post("/v1/offers/:id/accept", { onRequest: requireRole("PROFESSIONAL") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const requestId = (req.headers["x-request-id"] as string) ?? req.id;

    const offer = await ownOffer(app.prisma, req.user!.userId, id);
    if (!offer) return notFound(reply, "OFFER");

    try {
      const result = await acceptOffer(
        { prisma: app.prisma, lock: app.jobLock },
        id,
        offer.professionalId,
        requestId
      );
      return reply.send({ ok: true, ...result });
    } catch (err) {
      if (err instanceof OfferNoLongerAvailableError) {
        return reply.status(409).send({ code: "OFFER_NO_LONGER_AVAILABLE", message: err.message });
      }
      throw err;
    }
  });

  app.post("/v1/offers/:id/skip", { onRequest: requireRole("PROFESSIONAL") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const offer = await ownOffer(app.prisma, req.user!.userId, id);
    if (!offer) return notFound(reply, "OFFER");

    // Only a live offer can be skipped: skipping one already accepted or
    // expired would free the professional and re-dispatch a taken job.
    const skipped = await app.prisma.dispatchOffer.updateMany({
      where: { id, status: { in: [...LIVE_OFFER] } },
      data: { status: "SKIPPED", respondedAt: new Date() },
    });
    if (skipped.count === 0) {
      return reply.status(409).send({ code: "OFFER_NO_LONGER_AVAILABLE", message: `Offer status is ${offer.status}` });
    }
    await app.prisma.professionalProfile.update({
      where: { id: offer.professionalId },
      data: { presenceState: "AVAILABLE" },
    });
    await app.prisma.jobEvent.create({
      data: { jobId: offer.jobId, type: "OFFER_SKIPPED", actor: "PROFESSIONAL", actorId: offer.professionalId, metadata: { offerId: id } },
    });

    // Fallback — see /docs/08-DISPATCH-ENGINE.md §Fallback: try the next
    // eligible candidate rather than leaving the job stuck.
    const outcome = await triggerDispatch(app.prisma, app.providers.maps, offer.jobId, app.config.DISPATCH_OFFER_TIMEOUT_SECONDS);
    return reply.send({ ok: true, nextDispatch: outcome });
  });
}
