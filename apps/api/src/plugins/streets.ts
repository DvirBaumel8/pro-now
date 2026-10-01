import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import { loadStreetNames } from "../domain/streets/load.js";

declare module "fastify" {
  interface FastifyInstance {
    /** Settles once `street_names` matches the checked-in list; rejects if loading failed. */
    streetsReady: Promise<void>;
  }
}

/**
 * Loads Israel's street list on boot, without holding the boot up: the
 * first load after a refresh is a few seconds of inserts, and every route
 * but the address box works meanwhile. The address box waits for it.
 */
export default fp(async (app: FastifyInstance) => {
  const ready = loadStreetNames(app.prisma).then((result) => {
    if (result) app.log.info(result, "Loaded the street list");
  });
  ready.catch((err) => app.log.error({ err }, "Could not load the street list; address suggestions are unavailable"));
  app.decorate("streetsReady", ready);
  // Never close the database under a load in progress.
  app.addHook("onClose", async () => {
    await ready.catch(() => undefined);
  });
});
