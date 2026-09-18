import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { createQuoteSchema, approveQuoteSchema } from "@pro-now/validation";
import { assertTransition } from "../domain/job/transitions";

/**
 * See /docs/05-DATABASE.md §Quote versioning and /docs/02-UX-FLOWS.md C12/P19.
 * A quote is immutable once sent; edits create a new version. The
 * customer approves an exact version/hash — the server re-validates line
 * items and never trusts a client-submitted total.
 */
export default async function quotesRoutes(app: FastifyInstance) {
  app.post("/v1/jobs/:id/quotes", { onRequest: app.requireAuth }, async (req, reply) => {
    const { id: jobId } = req.params as { id: string };
    const body = createQuoteSchema.parse(req.body);

    const job = await app.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return reply.status(404).send({ code: "JOB_NOT_FOUND", message: "Job not found" });

    assertTransition(job.status, "WAITING_QUOTE_APPROVAL", "PROFESSIONAL");

    const totalMinorUnits = body.lineItems.reduce((sum, li) => sum + li.unitPriceMinorUnits * li.quantity, 0);
    const latestVersion = await app.prisma.quote.count({ where: { jobId } });
    const versionHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ jobId, version: latestVersion + 1, lineItems: body.lineItems, totalMinorUnits }))
      .digest("hex");

    // Supersede any prior quote for this job.
    await app.prisma.quote.updateMany({ where: { jobId, status: "SENT" }, data: { status: "SUPERSEDED" } });

    const quote = await app.prisma.quote.create({
      data: {
        jobId,
        version: latestVersion + 1,
        versionHash,
        totalMinorUnits: Math.round(totalMinorUnits),
        notes: body.notes,
        lineItems: {
          create: body.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPriceMinorUnits: li.unitPriceMinorUnits,
            kind: li.kind,
          })),
        },
      },
      include: { lineItems: true },
    });

    await app.prisma.job.update({ where: { id: jobId }, data: { status: "WAITING_QUOTE_APPROVAL" } });
    await app.prisma.jobEvent.create({
      data: { jobId, type: "QUOTE_SENT", actor: "PROFESSIONAL", metadata: { quoteId: quote.id, versionHash } },
    });

    return reply.send({ quote });
  });

  app.post("/v1/quotes/:id/approve", { onRequest: app.requireAuth }, async (req, reply) => {
    const idempotencyKey = req.headers["idempotency-key"] as string | undefined;
    if (!idempotencyKey) {
      return reply.status(400).send({ code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required" });
    }

    const { id: quoteId } = req.params as { id: string };
    const body = approveQuoteSchema.parse({ ...(req.body as object), quoteId });

    const quote = await app.prisma.quote.findUnique({ where: { id: quoteId }, include: { job: true } });
    if (!quote) return reply.status(404).send({ code: "QUOTE_NOT_FOUND", message: "Quote not found" });

    if (quote.versionHash !== body.quoteVersionHash) {
      return reply.status(409).send({
        code: "QUOTE_VERSION_MISMATCH",
        message: "The quote has changed since you last viewed it — please review the latest version",
      });
    }
    if (quote.status !== "SENT") {
      return reply.status(409).send({ code: "QUOTE_NOT_PENDING", message: `Quote status is ${quote.status}` });
    }

    assertTransition(quote.job.status, "IN_PROGRESS", "CUSTOMER");

    await app.prisma.quote.update({ where: { id: quoteId }, data: { status: "APPROVED" } });
    await app.prisma.job.update({
      where: { id: quote.jobId },
      data: { status: "IN_PROGRESS", approvedQuoteId: quoteId },
    });
    await app.prisma.jobEvent.create({
      data: { jobId: quote.jobId, type: "QUOTE_APPROVED", actor: "CUSTOMER", metadata: { quoteId, idempotencyKey } },
    });

    return reply.send({ ok: true });
  });
}
