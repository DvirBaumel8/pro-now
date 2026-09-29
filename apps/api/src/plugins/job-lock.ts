import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { Env } from "@pro-now/config";
import { NoopJobLock, RedisJobLock, type JobLock } from "../domain/dispatch/job-lock";

declare module "fastify" {
  interface FastifyInstance {
    jobLock: JobLock;
  }
}

/**
 * Redis only when `REDIS_URL` is set. Without it the accept runs on the
 * database row lock alone, which is the guarantee either way
 * (see domain/dispatch/job-lock.ts).
 */
export default fp(async (app: FastifyInstance & { config: Env }) => {
  const url = app.config.REDIS_URL;
  if (!url) {
    app.decorate("jobLock", new NoopJobLock());
    return;
  }

  const { Redis } = await import("ioredis");
  const redis = new Redis(url, { lazyConnect: true });
  await redis.connect().catch((err) => {
    app.log.warn({ err }, "Redis not reachable at startup — will retry lazily");
  });
  app.decorate(
    "jobLock",
    new RedisJobLock(redis, (message, err) => app.log.warn({ err }, message))
  );
  app.addHook("onClose", async () => {
    redis.disconnect();
  });
});
