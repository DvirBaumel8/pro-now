import type { FastifyInstance } from "fastify";
import { buildServer } from "../../src/server";

/** A fully wired server (every plugin and route), silent, for app.inject. */
export async function startApp(): Promise<FastifyInstance> {
  const app = await buildServer({ logger: false });
  await app.ready();
  return app;
}
