import type { FastifyInstance } from "fastify";
import { acceptOffer, OfferNoLongerAvailableError } from "../domain/dispatch/atomic-accept";
import { triggerDispatch } from "../domain/dispatch/dispatch-service";

/**
 * See /docs/06-API-SPEC.md and /docs/08-DISPATCH-ENGINE.md §Fallback.
 */
export default async function offersRoutes(app: FastifyInstance) {
  app.post("/v1/offers/:id/accept", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const requestId = (req.headers["x-request-id"] as string) ?? req.id;

    const offer = await app.prisma.dispatchOffer.findUnique({ where: { id } });
    if (!offer) return reply.status(404).send({ code: "OFFER_NOT_FOUND", message: "Offer not found" });

    const professional = await app.prisma.professionalProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!professional || professional.id !== offer.professionalId) {
      return reply.status(403).send({ code: "FORBIDDEN", message: "This offer does not belong to you" });
    }

    try {
      const result = await acceptOffer(
        {
          prisma: app.prisma,
          redis: app.redis,
          log: (message, err) => app.log.warn({ err, offerId: id }, message),
        },
        id,
        professional.id,
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

  app.post("/v1/offers/:id/skip", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const offer = await app.prisma.dispatchOffer.findUnique({ where: { id } });
    if (!offer) return reply.status(404).send({ code: "OFFER_NOT_FOUND", message: "Offer not found" });

    await app.prisma.dispatchOffer.update({ where: { id }, data: { status: "SKIPPED", respondedAt: new Date() } });
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
