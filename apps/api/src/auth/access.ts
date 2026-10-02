import type { FastifyReply, FastifyRequest } from "fastify";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Role } from "./roles.js";

/**
 * Authorization (docs/21 W1, the table in docs/06-API-SPEC.md §Access).
 *
 * Two layers, both on the server:
 * 1. Role — `requireRole(...)` as a route's onRequest: 401 without a
 *    session, 403 without one of the roles.
 * 2. Ownership — the loaders below put the caller INTO the query
 *    (`where: { id, customer: { userId } }`), so a record that belongs to
 *    somebody else is indistinguishable from one that does not exist: the
 *    route answers 404 and never confirms that another person's job,
 *    offer or quote exists.
 */
export function requireRole(...roles: Role[]) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.user) {
      reply.status(401).send({ code: "UNAUTHENTICATED", message: "Missing or invalid session" });
      return;
    }
    if (!roles.some((r) => req.user!.roles.includes(r))) {
      reply.status(403).send({ code: "FORBIDDEN", message: "This account cannot do that" });
    }
  };
}

export const notFound = (reply: FastifyReply, what: "JOB" | "OFFER" | "QUOTE" | "SHIFT") =>
  reply.status(404).send({ code: `${what}_NOT_FOUND`, message: `${what.toLowerCase()} not found` });

/** A job the caller ordered. */
export function customerJob<I extends Prisma.JobInclude>(db: PrismaClient, userId: string, jobId: string, include?: I) {
  return db.job.findFirst({ where: { id: jobId, customer: { userId } }, include: include as I });
}

/** A job assigned to the caller as its professional. */
export function assignedJob<I extends Prisma.JobInclude>(db: PrismaClient, userId: string, jobId: string, include?: I) {
  return db.job.findFirst({ where: { id: jobId, assignedProfessional: { userId } }, include: include as I });
}

/** A dispatch offer made to the caller. */
export function ownOffer(db: PrismaClient, userId: string, offerId: string) {
  return db.dispatchOffer.findFirst({ where: { id: offerId, professional: { userId } } });
}

/** A quote on a job the caller ordered (only the orderer approves). */
export function quoteForCustomer(db: PrismaClient, userId: string, quoteId: string) {
  return db.quote.findFirst({ where: { id: quoteId, job: { customer: { userId } } }, include: { job: true } });
}

/** One of the caller's own availability sessions. */
export function ownShift(db: PrismaClient, userId: string, shiftId: string) {
  return db.availabilitySession.findFirst({ where: { id: shiftId, professional: { userId } } });
}

/** The customer or the assigned professional of a job: who may watch it live. */
export function jobParticipant(db: PrismaClient, userId: string, jobId: string) {
  return db.job.findFirst({
    where: { id: jobId, OR: [{ customer: { userId } }, { assignedProfessional: { userId } }] },
    select: { id: true },
  });
}
