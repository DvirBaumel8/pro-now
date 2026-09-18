import type { FastifyInstance } from "fastify";
import { startShiftSchema, locationPingSchema } from "@pro-now/validation";
import { assertPresenceTransition, canEndShift } from "../domain/job/pro-presence-transitions";

/**
 * See /docs/06-API-SPEC.md, /docs/07-JOB-STATE-MACHINE.md §Professional
 * presence, /docs/05-DATABASE.md §Availability session.
 */
export default async function proRoutes(app: FastifyInstance) {
  app.post("/v1/pro/shifts", { onRequest: app.requireAuth }, async (req, reply) => {
    const body = startShiftSchema.parse(req.body);
    const professional = await app.prisma.professionalProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!professional) return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });

    if (professional.verificationStatus !== "APPROVED") {
      return reply.status(403).send({
        code: "VERIFICATION_INCOMPLETE",
        message: "Professional must be APPROVED before going online — see /docs/10-TRUST-VERIFICATION.md",
      });
    }

    assertPresenceTransition(professional.presenceState as any, "STARTING_SHIFT");

    const session = await app.prisma.availabilitySession.create({
      data: { professionalId: professional.id, enabledServiceIds: body.enabledServiceIds },
    });

    await app.prisma.professionalLocation.create({
      data: { professionalId: professional.id, lat: body.lat, lng: body.lng, capturedAt: new Date() },
    });

    await app.prisma.professionalProfile.update({
      where: { id: professional.id },
      data: { presenceState: "AVAILABLE" },
    });

    return reply.send({ sessionId: session.id, presenceState: "AVAILABLE" });
  });

  app.post("/v1/pro/shifts/:id/end", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const professional = await app.prisma.professionalProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!professional) return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });

    if (!canEndShift(professional.presenceState as any)) {
      return reply.status(409).send({
        code: "SHIFT_END_BLOCKED",
        message: "Cannot end shift while committed to an active job — see /docs/07-JOB-STATE-MACHINE.md",
      });
    }

    await app.prisma.availabilitySession.update({ where: { id }, data: { endedAt: new Date(), status: "ENDED" } });
    await app.prisma.professionalProfile.update({ where: { id: professional.id }, data: { presenceState: "OFFLINE" } });
    return reply.send({ ok: true, presenceState: "OFFLINE" });
  });

  app.post("/v1/pro/location", { onRequest: app.requireAuth }, async (req, reply) => {
    const body = locationPingSchema.parse(req.body);
    const professional = await app.prisma.professionalProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!professional) return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });

    // OFFLINE professionals are never tracked — see /docs/12-PRIVACY.md.
    if (professional.presenceState === "OFFLINE") {
      return reply.status(409).send({ code: "NOT_TRACKED_WHILE_OFFLINE", message: "Location is not accepted while OFFLINE" });
    }

    await app.prisma.professionalLocation.create({
      data: {
        professionalId: professional.id,
        lat: body.lat,
        lng: body.lng,
        accuracyMeters: body.accuracyMeters,
        headingDegrees: body.headingDegrees,
        speedMps: body.speedMetersPerSecond,
        capturedAt: new Date(body.capturedAt),
      },
    });
    return reply.send({ ok: true });
  });

  app.get("/v1/pro/earnings", { onRequest: app.requireAuth }, async (req, reply) => {
    const professional = await app.prisma.professionalProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!professional) return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });

    // Earnings are derived from ledger_entries, never summed ad-hoc from
    // jobs — see /docs/05-DATABASE.md §Payments.
    const entries = await app.prisma.ledgerEntry.findMany({
      where: { payment: { job: { assignedProfessionalId: professional.id } }, entryType: "PROFESSIONAL_PAYABLE" },
    });
    const netMinorUnits = entries.reduce((sum, e) => sum + e.amountMinorUnits, 0);
    return reply.send({ netMinorUnits, currency: "ILS", jobCount: entries.length });
  });

  app.get("/v1/pro/verification", { onRequest: app.requireAuth }, async (req, reply) => {
    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
      include: { identityVerification: true, businessProfile: true, credentials: true, externalProfiles: true },
    });
    if (!professional) return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    return reply.send({ professional });
  });
}
