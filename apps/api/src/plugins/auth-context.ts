import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifySession, type SessionClaims } from "../lib/auth";

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionClaims;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.addHook("onRequest", async (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        req.user = verifySession(header.slice("Bearer ".length), app.config.JWT_SECRET);
      } catch {
        // invalid/expired token — leave req.user undefined; routes that
        // require auth will reject via requireAuth.
      }
    }
  });

  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.status(401).send({ code: "UNAUTHENTICATED", message: "Missing or invalid session" });
    }
  });
});
