import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";

export default async function demoAuthRoutes(app: FastifyInstance) {
  app.post("/api/v1/demo-auth", async (req, reply) => {
    if (app.config.DEMO_AUTH_ENABLED !== "1") {
      return reply.status(404).send({ code: "NOT_FOUND", message: "Not found" });
    }

    const response = await app.auth.createDemoSession(fromNodeHeaders(req.headers));
    response.headers.forEach((value, key) => {
      if (key !== "set-cookie" && key !== "content-length") reply.header(key, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) reply.header("set-cookie", cookies);
    reply.status(response.status);
    const text = await response.text();
    return reply.send(text.length > 0 ? text : null);
  });
}
