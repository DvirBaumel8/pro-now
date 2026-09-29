/**
 * The clock behind the fallback.
 *
 * An offer expires because time passed, and time passing is not a request.
 * Nothing in an HTTP server notices it on its own, which is why an
 * unanswered offer sat there forever: every other transition in this
 * product is somebody tapping something, and this one is nobody tapping
 * anything.
 *
 * So it is a timer. Like the inline `triggerDispatch` call in
 * `routes/jobs.ts`, this is the shape for THIS delivery and it is written
 * down as such: a production build moves the sweep onto a queue/worker
 * with a lease, so that two API instances cannot sweep the same offer at
 * the same moment. Here there is one instance, and the sweep is
 * idempotent anyway — it only ever acts on offers that are already past
 * their own `expiresAt`, and it re-reads each job's state before touching
 * it.
 *
 * The interval is deliberately shorter than the offer timeout. A sweep
 * that ran every 30 seconds against a 30-second offer would, on average,
 * add half an offer's lifetime to every fallback — the professional next
 * in line would be asked a quarter-minute after the first one stopped
 * being asked, for no reason a customer would accept.
 */
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import { sweepExpiredOffers } from "../domain/dispatch/offer-expiry.js";

/** Floor and ceiling keep a misconfigured timeout from becoming a busy loop. */
const MIN_INTERVAL_MS = 1_000;
const MAX_INTERVAL_MS = 15_000;

function intervalFor(offerTimeoutSeconds: number): number {
  const third = Math.round((offerTimeoutSeconds * 1000) / 3);
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, third));
}

export default fp(async function dispatchSweeper(app: FastifyInstance) {
  const intervalMs = intervalFor(app.config.DISPATCH_OFFER_TIMEOUT_SECONDS);

  let running = false;
  const tick = async () => {
    // A sweep that overruns its interval must not be started twice; the
    // second run would race the first over the same offers.
    if (running) return;
    running = true;
    try {
      const result = await sweepExpiredOffers(app.prisma, app.providers.maps, {
        offerTimeoutSeconds: app.config.DISPATCH_OFFER_TIMEOUT_SECONDS,
        searchDeadlineSeconds: app.config.DISPATCH_SEARCH_DEADLINE_SECONDS,
        locationFreshnessThresholdSeconds: app.config.LOCATION_FRESHNESS_THRESHOLD_SECONDS,
      });
      if (
        result.offersExpired > 0 ||
        result.jobsReoffered > 0 ||
        result.jobsGivenUp > 0
      ) {
        app.log.info({ ...result }, "dispatch sweep");
      }
    } catch (err) {
      // A failed sweep is not a failed server. It logs and waits for the
      // next tick, because the alternative — an unhandled rejection taking
      // the process down — strands every live job rather than one.
      app.log.error({ err }, "dispatch sweep failed");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  // Do not hold the process open for the sake of the sweep.
  timer.unref?.();

  app.addHook("onClose", async () => clearInterval(timer));
  app.decorate("sweepDispatchNow", tick);

  app.log.info(
    { intervalMs, offerTimeoutSeconds: app.config.DISPATCH_OFFER_TIMEOUT_SECONDS },
    "dispatch sweeper started"
  );
});

declare module "fastify" {
  interface FastifyInstance {
    /** Runs one sweep immediately — used by tests and by ops tooling. */
    sweepDispatchNow: () => Promise<void>;
  }
}
