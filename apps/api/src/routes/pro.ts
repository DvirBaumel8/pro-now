import type { FastifyInstance } from "fastify";
import { startShiftSchema, locationPingSchema } from "@pro-now/validation";
import { assertPresenceTransition, canEndShift } from "../domain/job/pro-presence-transitions";
import type { OfferCardView, ProPresenceState } from "@pro-now/types";
import { coarseAreaLabel } from "../domain/privacy/area-label";

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

    assertPresenceTransition(professional.presenceState as ProPresenceState, "STARTING_SHIFT");

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

    if (!canEndShift(professional.presenceState as ProPresenceState)) {
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
    /*
     * GROSS AND NET, BOTH FROM THE LEDGER.
     *
     * The professional's screen showed "ברוטו ₪2,100" and "עמלת פלטפורמה
     * −₪420" written into the component — a 20% commission, to everybody,
     * when the commission percentage is an open business decision
     * (/CLAUDE.md §4). The app was announcing a rate nobody had set.
     *
     * Both numbers come from ledger rows now, or neither does. What was
     * actually charged is CUSTOMER_CHARGE; what the professional is owed
     * is PROFESSIONAL_PAYABLE; the difference is what was taken, and it is
     * a SUBTRACTION of two recorded facts rather than a percentage
     * applied. When there are no charge rows, gross is null and the
     * screen omits the breakdown instead of implying a deduction of zero.
     */
    const entries = await app.prisma.ledgerEntry.findMany({
      where: { payment: { job: { assignedProfessionalId: professional.id } } },
    });

    const payable = entries.filter((e) => e.entryType === "PROFESSIONAL_PAYABLE");
    const charges = entries.filter((e) => e.entryType === "CUSTOMER_CHARGE");

    const netMinorUnits = payable.reduce((sum, e) => sum + e.amountMinorUnits, 0);
    const grossMinorUnits =
      charges.length === 0 ? null : charges.reduce((sum, e) => sum + e.amountMinorUnits, 0);

    return reply.send({
      netMinorUnits,
      grossMinorUnits,
      currency: "ILS",
      jobCount: payable.length,
    });
  });

  app.get("/v1/pro/verification", { onRequest: app.requireAuth }, async (req, reply) => {
    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
      include: { identityVerification: true, businessProfile: true, credentials: true, externalProfiles: true },
    });
    if (!professional) return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    return reply.send({ professional });
  });

  /**
   * GET /v1/pro/offers/current — the payload behind the professional's
   * offer card.
   *
   * Two rules are enforced here rather than in the client, because a client
   * cannot be trusted to withhold data it has been given:
   *
   *  - The customer's precise address is NEVER included before the job is
   *    assigned. Only a coarse area label derived by
   *    `domain/privacy/area-label.ts` crosses the wire
   *    (/docs/12-PRIVACY.md).
   *  - The expected payout is included whenever it is knowable, and is
   *    `null` — not a plausible placeholder — when it is not
   *    (/CLAUDE.md §3, transparent provider payout).
   */
  app.get("/v1/pro/offers/current", { onRequest: app.requireAuth }, async (req, reply) => {
    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!professional) {
      return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    }

    const offer = await app.prisma.dispatchOffer.findFirst({
      where: {
        professionalId: professional.id,
        status: { in: ["CREATED", "SENT", "VIEWED"] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { offeredAt: "desc" },
      include: { job: { include: { service: true, address: true } } },
    });

    if (!offer) return reply.status(204).send();

    const priceModel: string = offer.job.service.priceModel;

    /*
     * A VISIT_QUOTE job's payout is genuinely not knowable before the
     * on-site diagnosis produces a quote, so it is reported as unknown.
     * HOURLY depends on hours actually worked, so it is knowable only as an
     * estimate. FIXED and DISTANCE_TIME resolve to the snapshot taken at
     * dispatch time.
     */
    const payoutSnapshot: number | null = offer.payoutMinorUnitsSnapshot ?? null;
    const payoutIsEstimate = priceModel === "HOURLY" || priceModel === "DISTANCE_TIME";
    const expectedPayoutMinorUnits = priceModel === "VISIT_QUOTE" && payoutSnapshot === null ? null : payoutSnapshot;

    const result: OfferCardView = {
      offerId: offer.id,
      jobId: offer.jobId,
      serviceNameHe: offer.job.service.nameHe,
      serviceCode: offer.job.service.code,
      priceModel: offer.job.service.priceModel,
      currency: "ILS",
      offeredAt: offer.offeredAt.toISOString(),
      expiresAt: offer.expiresAt.toISOString(),
      eta:
        offer.etaSecondsSnapshot === null || offer.etaSecondsSnapshot === undefined
          ? null
          : {
              etaSeconds: offer.etaSecondsSnapshot,
              distanceMeters: null,
              // The snapshot does not record its provenance; under-claim.
              isRouteBased: false,
              computedAt: offer.offeredAt.toISOString(),
            },
      expectedPayoutMinorUnits,
      payoutIsEstimate,
      // Coarse area only — see the note above and area-label.ts.
      customerAreaLabel: coarseAreaLabel(offer.job.address?.formatted ?? null),
      jobDescription: offer.job.description ?? null,
    };

    return reply.send(result);
  });
}
