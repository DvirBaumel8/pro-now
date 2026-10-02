import type { FastifyInstance } from "fastify";
import { clientErrorReportSchema } from "@pro-now/validation";

/**
 * The web app reports its own crashes here (docs/16-DEPLOYMENT.md §Observability), so
 * an error on a friend's phone reaches our phone even when the browser
 * could not reach Sentry, and before they have signed in.
 *
 * It is open to anyone, so it is bounded three ways: a small body, a
 * strict schema, and a rate limit. The limit is keyed by `req.ip`, the
 * client's address as TRUST_PROXY_HOPS resolves it; left at 0 behind a
 * proxy it is the proxy, which makes it a limit on the endpoint as a
 * whole — the safe direction for an alert path.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

export default async function clientErrorsRoutes(app: FastifyInstance) {
  const seen = new Map<string, { count: number; resetAt: number }>();

  app.post("/v1/client-errors", { bodyLimit: 16 * 1024 }, async (req, reply) => {
    const now = Date.now();
    const slot = seen.get(req.ip);
    if (!slot || slot.resetAt <= now) {
      if (seen.size > 5000) seen.clear();
      seen.set(req.ip, { count: 1, resetAt: now + WINDOW_MS });
    } else if (++slot.count > MAX_PER_WINDOW) {
      return reply.status(429).send({ code: "RATE_LIMITED", message: "Too many reports" });
    }

    const report = clientErrorReportSchema.parse(req.body);
    req.log.warn({ clientError: { kind: report.kind, name: report.name, path: report.path, eventId: report.eventId } }, "Web app reported an error");
    app.monitor.report({
      source: "web",
      kind: report.kind,
      error: { name: report.name, message: report.message, stack: report.stack },
      path: report.path?.split("?")[0],
      eventId: report.eventId,
      requestId: report.requestId,
      release: report.release,
      userId: req.user?.userId,
      userAgent: req.headers["user-agent"],
    });
    return reply.status(204).send();
  });
}
