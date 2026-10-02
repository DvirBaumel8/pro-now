import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/access.js";

/**
 * Proves the alert path end to end on a deployed server
 * (docs/16-DEPLOYMENT.md §Observability): an admin calls one of these and a
 * message arrives on the phone. Admin-only; neither touches data.
 */
export default async function adminDebugRoutes(app: FastifyInstance) {
  const admin = { onRequest: requireRole("ADMIN") };

  /** A route that throws: the error handler's 5xx path. */
  app.post("/v1/admin/debug/boom", admin, async () => {
    throw new Error("Deliberate test error from /admin/debug/boom");
  });

  /** A promise nobody awaits: the process-level path. */
  app.post("/v1/admin/debug/rejection", admin, async (_req, reply) => {
    void Promise.reject(new Error("Deliberate unhandled rejection from /admin/debug/rejection"));
    return reply.status(202).send({ ok: true });
  });
}
