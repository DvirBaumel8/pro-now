import "./load-env";

import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import { loadEnv } from "@pro-now/config";

import prismaPlugin from "./plugins/prisma";
import redisPlugin from "./plugins/redis";
import providersPlugin from "./plugins/providers";
import authContextPlugin from "./plugins/auth-context";

import authRoutes from "./routes/auth";
import catalogRoutes from "./routes/catalog";
import addressesRoutes from "./routes/addresses";
import jobsRoutes from "./routes/jobs";
import matchRoutes from "./routes/match";
import offersRoutes from "./routes/offers";
import proRoutes from "./routes/pro";
import proJobsRoutes from "./routes/pro-jobs";
import proServicesRoutes from "./routes/pro-services";
import quotesRoutes from "./routes/quotes";
import reviewsRoutes from "./routes/reviews";
import { registerJobSocket } from "./realtime/job-socket";

declare module "fastify" {
  interface FastifyInstance {
    config: ReturnType<typeof loadEnv>;
  }
}

export async function buildServer() {
  const config = loadEnv();
  const app = Fastify({ logger: true });
  app.decorate("config", config);

  await app.register(websocketPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(providersPlugin);
  await app.register(authContextPlugin);

  app.get("/health", async () => ({ ok: true, sandbox: config.NODE_ENV !== "production" }));

  await app.register(authRoutes);
  await app.register(catalogRoutes);
  await app.register(addressesRoutes);
  await app.register(jobsRoutes);
  await app.register(matchRoutes);
  await app.register(offersRoutes);
  await app.register(proRoutes);
  await app.register(proJobsRoutes);
  await app.register(proServicesRoutes);
  await app.register(quotesRoutes);
  await app.register(reviewsRoutes);

  registerJobSocket(app);

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, "Unhandled error");
    // Fastify errors carry `statusCode`/`code`, and so do the domain errors
    // thrown by the state machines — but a plain `Error` carries neither, so
    // both are read defensively rather than asserted.
    const { statusCode, code } = err as { statusCode?: number; code?: string };
    const status = statusCode ?? 500;
    reply.status(status).send({
      code: code ?? "INTERNAL_ERROR",
      message: status >= 500 ? "Internal server error" : err.message,
      requestId: req.id,
    });
  });

  return app;
}

if (require.main === module) {
  buildServer()
    .then((app) => app.listen({ port: app.config.PORT, host: "0.0.0.0" }))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
