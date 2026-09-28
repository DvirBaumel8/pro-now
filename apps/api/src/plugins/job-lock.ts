import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import Redis from "ioredis";
import type { Env } from "@pro-now/config";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (app: FastifyInstance & { config: Env }) => {
  const redis = new Redis(app.config.REDIS_URL, { lazyConnect: true });
  await redis.connect().catch((err) => {
    app.log.warn({ err }, "Redis not reachable at startup — will retry lazily");
  });
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    redis.disconnect();
  });
});
