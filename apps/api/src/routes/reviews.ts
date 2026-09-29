import type { FastifyInstance } from "fastify";
import { reviewSchema } from "@pro-now/validation";
import { customerJob, notFound, requireRole } from "../auth/access.js";

/**
 * See /docs/05-DATABASE.md §Reviews: "Only the customer of an eligible
 * completed/paid job may review" — enforced here by checking job status
 * and by the DB's unique (reviewerId, jobId) constraint.
 */
export default async function reviewsRoutes(app: FastifyInstance) {
  app.post("/v1/jobs/:id/reviews", { onRequest: requireRole("CUSTOMER") }, async (req, reply) => {
    const { id: jobId } = req.params as { id: string };
    const body = reviewSchema.parse(req.body);

    // Ownership first: the status checks below must not tell a stranger
    // that the job exists or where it stands.
    const job = await customerJob(app.prisma, req.user!.userId, jobId);
    if (!job || !job.assignedProfessionalId) return notFound(reply, "JOB");
    if (job.status !== "REVIEW_PENDING" && job.status !== "PAYMENT_CAPTURED") {
      return reply.status(409).send({
        code: "JOB_NOT_REVIEWABLE",
        message: "Only an eligible completed/paid job can be reviewed — see /docs/05-DATABASE.md §Reviews",
      });
    }

    const reviewerId = job.customerId;

    const review = await app.prisma.review.create({
      data: {
        jobId,
        reviewerId,
        professionalId: job.assignedProfessionalId,
        overallRating: body.overallRating,
        text: body.text,
        dimensions: {
          create: [
            ...(body.professionalism ? [{ name: "professionalism", score: body.professionalism }] : []),
            ...(body.punctuality ? [{ name: "punctuality", score: body.punctuality }] : []),
            ...(body.quality ? [{ name: "quality", score: body.quality }] : []),
          ],
        },
      },
    });

    await app.prisma.job.update({ where: { id: jobId }, data: { status: "CLOSED" } });
    await app.prisma.jobEvent.create({
      data: { jobId, type: "REVIEW_SUBMITTED", actor: "CUSTOMER", metadata: { reviewId: review.id } },
    });

    return reply.send({ review });
  });
}
