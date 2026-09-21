import type { FastifyInstance } from "fastify";
import { createJobSchema } from "@pro-now/validation";
import { triggerDispatch } from "../domain/dispatch/dispatch-service";
import { assertTransition, nextAfterArrival } from "../domain/job/transitions";

/**
 * See /docs/06-API-SPEC.md and /docs/05-DATABASE.md §Job creation
 * transaction. POST /v1/jobs requires an Idempotency-Key header.
 */
export default async function jobsRoutes(app: FastifyInstance) {
  app.post("/v1/jobs", { onRequest: app.requireAuth }, async (req, reply) => {
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
    if (!idempotencyKey) {
      return reply.status(400).send({ code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required" });
    }
    const body = createJobSchema.parse(req.body);

    const existing = await app.prisma.job.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return reply.send({ job: existing, replayed: true });
    }

    const customer = await app.prisma.customerProfile.upsert({
      where: { userId: req.user!.userId },
      update: {},
      create: { userId: req.user!.userId },
    });

    const address = await app.prisma.address.findUnique({ where: { id: body.addressId } });
    if (!address || address.customerId !== customer.id) {
      return reply.status(404).send({ code: "ADDRESS_NOT_FOUND", message: "Address not found for this customer" });
    }

    const service = await app.prisma.service.findUnique({ where: { id: body.serviceId } });
    if (!service) {
      return reply.status(404).send({ code: "SERVICE_NOT_FOUND", message: "Service not found" });
    }

    const job = await app.prisma.job.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        addressId: address.id,
        description: body.description,
        structuredAnswers: body.structuredAnswers,
        idempotencyKey,
        status: "DRAFT",
      },
    });

    await app.prisma.jobEvent.create({
      data: { jobId: job.id, type: "JOB_CREATED", actor: "CUSTOMER", actorId: req.user!.userId, metadata: {} },
    });

    // Dispatch is triggered inline for this delivery; a production build
    // moves this onto a queue so the HTTP response doesn't wait on it.
    const outcome = await triggerDispatch(
      app.prisma,
      app.providers.maps,
      job.id,
      app.config.DISPATCH_OFFER_TIMEOUT_SECONDS
    );

    const refreshedJob = await app.prisma.job.findUnique({ where: { id: job.id } });
    return reply.send({ job: refreshedJob, dispatch: outcome });
  });

  app.get("/v1/jobs/:id", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await app.prisma.job.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } }, offers: true, quotes: { include: { lineItems: true } } },
    });
    if (!job) return reply.status(404).send({ code: "JOB_NOT_FOUND", message: "Job not found" });
    return reply.send({ job });
  });

  app.post("/v1/jobs/:id/cancel", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await app.prisma.job.findUnique({ where: { id } });
    if (!job) return reply.status(404).send({ code: "JOB_NOT_FOUND", message: "Job not found" });

    assertTransition(job.status, "CANCELLED", "CUSTOMER");

    await app.prisma.job.update({ where: { id }, data: { status: "CANCELLED" } });
    await app.prisma.jobEvent.create({
      data: { jobId: id, type: "JOB_CANCELLED", actor: "CUSTOMER", actorId: req.user!.userId, metadata: {} },
    });
    return reply.send({ ok: true });
  });

  for (const [path, type, nextState] of [
    ["/v1/jobs/:id/en-route", "PRO_EN_ROUTE_REQUESTED", "PRO_EN_ROUTE"],
    ["/v1/jobs/:id/arrive", "PRO_ARRIVED_REQUESTED", "PRO_ARRIVED"],
    ["/v1/jobs/:id/start", "SERVICE_STARTED", "IN_PROGRESS"],
    ["/v1/jobs/:id/complete", "SERVICE_COMPLETION_REQUESTED", "COMPLETION_PENDING"],
  ] as const) {
    app.post(path, { onRequest: app.requireAuth }, async (req, reply) => {
      const { id } = req.params as { id: string };
      const job = await app.prisma.job.findUnique({ where: { id }, include: { service: true } });
      if (!job) return reply.status(404).send({ code: "JOB_NOT_FOUND", message: "Job not found" });

      /*
       * STARTING IS TWO DIFFERENT MOVES, AND THIS ROW DECIDED ONLY ONE.
       *
       * `/start` sent every job straight to IN_PROGRESS. For a VISIT_QUOTE
       * service that skips DIAGNOSIS entirely — the state where the
       * professional looks at the problem and writes a quote — so the job
       * jumped past the step where the price is agreed and landed in
       * "working" before the customer had approved anything.
       *
       * `nextAfterArrival` has encoded the right answer since the state
       * machine was written (/docs/07-JOB-STATE-MACHINE.md); this route
       * simply never asked it.
       */
      const target =
        nextState === "IN_PROGRESS"
          ? nextAfterArrival(job.service.priceModel === "VISIT_QUOTE")
          : nextState;

      assertTransition(job.status, target, "PROFESSIONAL");
      await app.prisma.job.update({ where: { id }, data: { status: target } });
      await app.prisma.jobEvent.create({
        data: { jobId: id, type, actor: "PROFESSIONAL", actorId: req.user!.userId, metadata: {} },
      });
      return reply.send({ ok: true, status: target });
    });
  }
}
