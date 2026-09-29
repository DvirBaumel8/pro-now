import type { FastifyInstance } from "fastify";
import type { JobStatus } from "@prisma/client";

/** A job someone is still inside: deleting now would strand the other side. */
const ACTIVE: JobStatus[] = [
  "SEARCHING",
  "OFFERING",
  "PRO_ASSIGNED",
  "PRO_EN_ROUTE",
  "PRO_ARRIVED",
  "DIAGNOSIS",
  "WAITING_QUOTE_APPROVAL",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
  "PAYMENT_PENDING",
  "DISPUTED",
];

const ERASED = "[נמחק]";

export default async function meRoutes(app: FastifyInstance) {
  /**
   * "Delete my account" (docs/21 W1): soft delete plus anonymisation.
   *
   * Direct identifiers are erased now: email, name, phone, photo, the
   * customer's name and addresses, and the professional's names. Every
   * way in (sessions, sign-in accounts, roles) is removed. Transactional
   * records (jobs, payments, reviews) stay, pointing at the anonymised
   * user, because other people's records depend on them. How long they
   * are kept is an open decision (18-ROADMAP §Open decisions, data
   * retention), not something this code decides.
   */
  app.delete("/v1/me", async (req, reply) => {
    if (!req.user) return reply.status(401).send({ code: "UNAUTHENTICATED", message: "Missing or invalid session" });
    const { userId } = req.user;

    const active = await app.prisma.job.count({
      where: {
        status: { in: ACTIVE },
        OR: [{ customer: { userId } }, { assignedProfessional: { userId } }],
      },
    });
    if (active > 0) {
      return reply.status(409).send({
        code: "ACTIVE_JOB",
        message: "An account with a job in progress cannot be deleted until the job ends",
      });
    }

    await app.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted-${userId}@users.invalid`,
          emailVerified: false,
          name: "",
          phone: null,
          image: null,
        },
      });
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.verification.deleteMany({ where: { identifier: before.email } });
      await tx.userRole.deleteMany({ where: { userId } });

      const customer = await tx.customerProfile.findUnique({ where: { userId } });
      if (customer) {
        await tx.customerProfile.update({ where: { id: customer.id }, data: { fullName: null } });
        await tx.address.updateMany({
          where: { customerId: customer.id },
          data: { formatted: ERASED, label: null, lat: 0, lng: 0 },
        });
      }
      await tx.professionalProfile.updateMany({
        where: { userId },
        data: { legalName: ERASED, displayName: ERASED, profilePhotoRef: null, presenceState: "OFFLINE" },
      });

      await tx.auditLog.create({
        data: { actorId: userId, action: "ACCOUNT_DELETED", targetType: "user", targetId: userId, requestId: req.id },
      });
    });

    return reply.send({ ok: true });
  });
}
