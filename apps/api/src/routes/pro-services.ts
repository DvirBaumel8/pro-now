import type { FastifyInstance } from "fastify";
import {
  evaluateServiceCredentials,
  isAccountDispatchable,
} from "../domain/dispatch/credential-eligibility";

/**
 * WHICH SERVICES THIS PROFESSIONAL MAY GO ONLINE FOR.
 *
 * ---------------------------------------------------------------------
 * WHY THE SERVER ANSWERS THIS AND NOT THE APP
 * ---------------------------------------------------------------------
 * /CLAUDE.md §3: "Server is authoritative for eligibility." The
 * professional's app had no way to ask, so it did the next worst thing —
 * it listed two services written into the screen, `HOME_PLUMB_BLOCK` and
 * `HOME_ELECT_FAULT`, with switches beside them, for every professional in
 * the marketplace. A cleaner with an electrical switch. A tow driver
 * offered plumbing.
 *
 * Computing it in the client instead would be worse than not showing it:
 * the app would have to hold the credential rules, and the moment those
 * two copies disagree, the one the professional can see is the wrong one.
 *
 * ---------------------------------------------------------------------
 * WHY IT SAYS WHY
 * ---------------------------------------------------------------------
 * A greyed-out row with no reason is how a professional loses a day of
 * work without knowing they could have fixed it in ten minutes. Each
 * service comes back with the exact requirement that is missing, expired
 * or still unverified — the same evaluation dispatch itself runs, so what
 * the professional reads is what the dispatcher will decide.
 */
export default async function proServicesRoutes(app: FastifyInstance) {
  app.get("/v1/pro/services", { onRequest: app.requireAuth }, async (req, reply) => {
    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
      include: { services: true, credentials: true },
    });
    if (!professional) {
      return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    }

    /*
     * Only services this professional has actually applied for. The
     * catalogue is the market's list; this is theirs, and offering a
     * plumber a switch for pet grooming is not a feature.
     */
    const serviceIds = professional.services.map((s) => s.serviceId);
    if (serviceIds.length === 0) return reply.send({ services: [] });

    const services = await app.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      include: { requirements: true },
    });

    /*
     * The account gate first. A professional who is not APPROVED receives
     * no dispatch at all, whatever their per-service credentials say, and
     * showing them eligible rows would be a promise the dispatcher breaks.
     */
    const accountOk = isAccountDispatchable(professional.verificationStatus);
    const now = new Date();

    return reply.send({
      services: services.map((service) => {
        const evaluation = evaluateServiceCredentials(
          service.requirements,
          professional.credentials.filter((c) => c.serviceId === service.id),
          now
        );
        const approval = professional.services.find((s) => s.serviceId === service.id);
        const serviceApproved = approval?.status?.trim().toUpperCase() === "APPROVED";

        return {
          serviceId: service.id,
          nameHe: service.nameHe,
          /** Dispatch-eligible for THIS service, right now. */
          eligible: accountOk && serviceApproved && evaluation.satisfied,
          accountApproved: accountOk,
          serviceApproved,
          /*
           * Named requirements rather than a boolean, because "you are not
           * eligible" is not actionable and "your insurance expired" is.
           */
          missing: evaluation.missing,
          expired: evaluation.expired,
          unverified: evaluation.unverified,
        };
      }),
    });
  });
}
