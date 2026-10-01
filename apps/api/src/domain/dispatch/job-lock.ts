import type { Redis } from "ioredis";

/**
 * A lock around one job's accept, used by `atomic-accept.ts`.
 *
 * It is a LATENCY OPTIMISATION, never the guarantee. Correctness comes from
 * the `SELECT ... FOR UPDATE` row lock inside the accept transaction
 * (proven against real Postgres by `npm run verify:rowlock`). The lock only
 * saves two racing requests from both opening a transaction that would
 * serialise anyway.
 *
 * That is why the MVP runs with `NoopJobLock` and no Redis at all
 * (/docs/21-PRODUCTION-PLAN.md §2): one fewer free-tier service to run,
 * and nothing about who wins a job changes.
 */
export interface JobLock {
  /**
   * Runs `fn` while holding the lock for `jobId`. Calls `onBusy` instead
   * when another holder answered "taken". A lock that cannot be reached is
   * stepped over (loudly), not treated as busy.
   */
  run<T>(jobId: string, fn: () => Promise<T>, onBusy: () => never): Promise<T>;
}

export class NoopJobLock implements JobLock {
  run<T>(_jobId: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}

const JOB_LOCK_TTL_MS = 5000;

/**
 * ioredis retries a request twenty times before it gives up. With Redis
 * down, every accept waited out that whole backoff while a thirty-second
 * offer window ran, and offers expired while the optimisation was still
 * trying to help. 250 ms is far more than a healthy Redis needs and far
 * less than a person notices. Past it, the row lock alone decides.
 */
const LOCK_ATTEMPT_TIMEOUT_MS = 250;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LOCK_ATTEMPT_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** The subset of ioredis the lock uses, so tests can pass a fake. */
export type RedisLike = Pick<Redis, "get" | "del"> & {
  set(key: string, value: string, px: "PX", ttl: number, nx: "NX"): Promise<"OK" | null>;
};

export class RedisJobLock implements JobLock {
  constructor(
    private readonly redis: RedisLike,
    private readonly log?: (message: string, err: unknown) => void
  ) {}

  async run<T>(jobId: string, fn: () => Promise<T>, onBusy: () => never): Promise<T> {
    const lockKey = `pronow:lock:job:${jobId}`;
    const token = Math.random().toString(36).slice(2);

    let acquired: "OK" | null | undefined;
    try {
      acquired = await withTimeout(this.redis.set(lockKey, token, "PX", JOB_LOCK_TTL_MS, "NX"), LOCK_ATTEMPT_TIMEOUT_MS);
    } catch (err) {
      this.log?.("job lock unavailable — proceeding on the database row lock alone", err);
      return fn();
    }
    // Redis answered, and the answer was no: another accept is in flight.
    if (!acquired) onBusy();

    try {
      return await fn();
    } finally {
      try {
        // Release only if we still own it. The TTL is the real backstop.
        const current = await withTimeout(this.redis.get(lockKey), LOCK_ATTEMPT_TIMEOUT_MS);
        if (current === token) await withTimeout(this.redis.del(lockKey), LOCK_ATTEMPT_TIMEOUT_MS);
      } catch (err) {
        this.log?.("job lock release failed — the TTL will clear it", err);
      }
    }
  }
}
