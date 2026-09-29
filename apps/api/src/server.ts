import "./load-env";

import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import { loadEnv } from "@pro-now/config";

import corsPlugin from "./plugins/cors";
import prismaPlugin from "./plugins/prisma";
import jobLockPlugin from "./plugins/job-lock";
import providersPlugin from "./plugins/providers";
import dispatchSweeperPlugin from "./plugins/dispatch-sweeper";
import authPlugin from "./plugins/auth";

import catalogRoutes from "./routes/catalog";
import addressesRoutes from "./routes/addresses";
import jobsRoutes from "./routes/jobs";
import matchRoutes from "./routes/match";
import offersRoutes from "./routes/offers";
import proRoutes from "./routes/pro";
import proJobsRoutes from "./routes/pro-jobs";
import proReputationRoutes from "./routes/pro-reputation";
import proServicesRoutes from "./routes/pro-services";
import quotesRoutes from "./routes/quotes";
import reviewsRoutes from "./routes/reviews";
import meRoutes from "./routes/me";
import { registerJobSocket } from "./realtime/job-socket";

declare module "fastify" {
  interface FastifyInstance {
    config: ReturnType<typeof loadEnv>;
  }
}

/**
 * A zod error, recognised by SHAPE rather than by `instanceof`.
 *
 * zod ships a CJS build and an ESM build of the same file. The schemas in
 * `@pro-now/validation` throw the class from one of them and this module
 * imports the class from the other, so `err instanceof ZodError` is false
 * for an error that is unmistakably a ZodError — the dual-package hazard,
 * arriving as a 500 for every malformed request. `name` and `issues` are
 * stable across both builds, and across a future duplicate install.
 */
interface ZodIssueLike {
  path: Array<string | number>;
  message: string;
}

function zodIssuesOf(err: unknown): ZodIssueLike[] | null {
  if (typeof err !== "object" || err === null) return null;
  const candidate = err as { name?: unknown; issues?: unknown };
  if (candidate.name !== "ZodError" || !Array.isArray(candidate.issues)) return null;
  return candidate.issues as ZodIssueLike[];
}

export async function buildServer(opts: { logger?: boolean } = {}) {
  const config = loadEnv();
  const app = Fastify({ logger: opts.logger ?? true });
  app.decorate("config", config);

  await app.register(corsPlugin);
  await app.register(websocketPlugin);
  await app.register(prismaPlugin);
  await app.register(jobLockPlugin);
  await app.register(providersPlugin);
  // After providers and prisma: the sweep needs both.
  await app.register(dispatchSweeperPlugin);
  await app.register(authPlugin);

  app.get("/health", async () => ({ ok: true, sandbox: config.NODE_ENV !== "production" }));

  /*
   * BEFORE THE ROUTES, AND THAT IS THE WHOLE POINT.
   *
   * Every route below is registered as a plugin, so each one gets its own
   * encapsulation context. Fastify resolves the error handler from the
   * context a route was registered INTO — so a handler set on the root
   * after the routes are already in place is never reached by anything
   * they throw. This one sat at the bottom of the file and had never run:
   * every error response the API has ever sent came from Fastify's
   * default serializer, which is why no response carried a `requestId`
   * and why a zod failure returned 500 with the validator's internals
   * pasted into the message.
   */
  app.setErrorHandler((err, req, reply) => {
    /*
     * A MALFORMED REQUEST IS THE CLIENT'S NEWS, NOT OURS.
     *
     * Every route parses its body with a zod schema, and a ZodError
     * carries no `statusCode` — so a missing field came back as 500
     * "Internal Server Error" with zod's own `issues` array serialized
     * into the message. Wrong twice: it told an app that had made a
     * fixable mistake that the server had broken, and it leaked the
     * shape of the validator to anyone who sent a bad body.
     *
     * 400, with the field paths and nothing else.
     */
    const zodIssues = zodIssuesOf(err);
    if (zodIssues) {
      req.log.info({ issues: zodIssues, url: req.url }, "Request failed validation");
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Request body failed validation",
        fields: zodIssues.map((i) => ({ path: i.path.join("."), message: i.message })),
        requestId: req.id,
      });
    }

    req.log.error({ err }, "Unhandled error");
    // Fastify errors carry `statusCode`/`code`, and so now do the domain
    // errors thrown by the state machines — this comment asserted that
    // before it was true, and a refused transition reached the client as
    // "Internal Server Error" with the reason swallowed. A plain `Error`
    // still carries neither, so both are read defensively.
    const { statusCode, code } = err as { statusCode?: number; code?: string };
    const status = statusCode ?? 500;
    reply.status(status).send({
      code: code ?? "INTERNAL_ERROR",
      message: status >= 500 ? "Internal server error" : err.message,
      requestId: req.id,
    });
  });

  await app.register(catalogRoutes);
  await app.register(addressesRoutes);
  await app.register(jobsRoutes);
  await app.register(matchRoutes);
  await app.register(offersRoutes);
  await app.register(proRoutes);
  await app.register(proJobsRoutes);
  await app.register(proReputationRoutes);
  await app.register(proServicesRoutes);
  await app.register(quotesRoutes);
  await app.register(reviewsRoutes);
  await app.register(meRoutes);

  registerJobSocket(app);


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
