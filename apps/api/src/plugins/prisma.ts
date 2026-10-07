import { AsyncLocalStorage } from "node:async_hooks";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { createPrisma } from "../db/prisma-client.js";
import { JobEventBus, type JobEventNotice } from "../realtime/job-event-bus.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    jobEvents: JobEventBus;
  }
}

export default fp(async (app: FastifyInstance) => {
  const base = createPrisma(app.config.DATABASE_URL);
  const bus = new JobEventBus();

  /*
   * EVERY JOB EVENT IS ANNOUNCED, WHOEVER WROTE IT. Routes, the dispatch
   * engine, the offer-expiry sweep and the payment code all write
   * `job_events` through this client, so hooking the write here is the one
   * place that cannot be forgotten by the next writer.
   *
   * The extended client has the same API as PrismaClient; the cast only
   * hides the extension's own type from the rest of the app.
   */
  /*
   * ANNOUNCED ONCE IT IS TRUE. Clients answer an announcement by re-reading
   * the job (docs/06 §WebSocket), so an event written inside a transaction
   * must not be announced before the transaction commits: the customer's
   * re-read then found the job still searching, and waited for the 20 s
   * poll to learn a professional had accepted (atomic-accept, CI #127's
   * trace). Inside an interactive transaction the events wait here and go
   * out after the commit; a rollback drops them, since nothing happened.
   */
  const pending = new AsyncLocalStorage<JobEventNotice[]>();
  const extended = base.$extends({
    query: {
      jobEvent: {
        async create({ args, query }) {
          const event = await query(args);
          const row = event as { jobId?: string; type?: string; createdAt?: Date; actor?: string; actorId?: string | null; metadata?: unknown };
          if (row.jobId && row.type) {
            const notice: JobEventNotice = {
              jobId: row.jobId,
              type: row.type,
              at: (row.createdAt ?? new Date()).toISOString(),
              actor: row.actor,
              actorId: row.actorId ?? null,
              metadata: row.metadata,
            };
            const held = pending.getStore();
            if (held) held.push(notice);
            else bus.publish(notice);
          }
          return event;
        },
      },
    },
  });
  const transaction = extended.$transaction.bind(extended) as (...a: unknown[]) => Promise<unknown>;
  const prisma = new Proxy(extended, {
    get(target, key, receiver) {
      if (key !== "$transaction") return Reflect.get(target, key, receiver);
      return async (arg: unknown, options?: unknown) => {
        // A batch of queries resolves after its commit, so its events are true when written.
        if (typeof arg !== "function") return transaction(arg, options);
        const held: JobEventNotice[] = [];
        const result = await pending.run(held, () => transaction(arg, options));
        held.forEach((n) => bus.publish(n));
        return result;
      };
    },
  }) as unknown as PrismaClient;

  app.decorate("prisma", prisma);
  app.decorate("jobEvents", bus);
  app.addHook("onClose", async () => {
    await base.$disconnect();
  });
});
