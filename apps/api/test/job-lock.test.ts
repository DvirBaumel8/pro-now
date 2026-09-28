import { describe, it, expect } from "vitest";
import { NoopJobLock, RedisJobLock, type RedisLike } from "../src/domain/dispatch/job-lock";

/**
 * The job lock is an optimisation in front of the row lock. What must hold:
 * a "taken" answer refuses, an unreachable Redis is stepped over, and a
 * release never deletes somebody else's lock.
 */

function fakeRedis(store = new Map<string, string>()): RedisLike & { store: Map<string, string> } {
  return {
    store,
    async set(key, value) {
      if (store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async del(key: string) {
      store.delete(key);
      return 1;
    },
  } as RedisLike & { store: Map<string, string> };
}

const busy = (): never => {
  throw new Error("BUSY");
};

describe("NoopJobLock", () => {
  it("just runs the work", async () => {
    expect(await new NoopJobLock().run("job-1", async () => 42, busy)).toBe(42);
  });
});

describe("RedisJobLock", () => {
  it("runs the work and releases its own lock", async () => {
    const redis = fakeRedis();
    const out = await new RedisJobLock(redis).run("job-1", async () => {
      expect(redis.store.has("pronow:lock:job:job-1")).toBe(true);
      return "done";
    }, busy);
    expect(out).toBe("done");
    expect(redis.store.size).toBe(0);
  });

  it("refuses when another holder has the job", async () => {
    const redis = fakeRedis(new Map([["pronow:lock:job:job-1", "someone-else"]]));
    await expect(new RedisJobLock(redis).run("job-1", async () => "never", busy)).rejects.toThrow("BUSY");
    expect(redis.store.get("pronow:lock:job:job-1")).toBe("someone-else");
  });

  it("does not delete a lock that expired and was taken by someone else", async () => {
    const redis = fakeRedis();
    await new RedisJobLock(redis).run("job-1", async () => {
      redis.store.set("pronow:lock:job:job-1", "next-holder");
    }, busy);
    expect(redis.store.get("pronow:lock:job:job-1")).toBe("next-holder");
  });

  it("steps over an unreachable Redis and still runs the work", async () => {
    const logged: string[] = [];
    const down = {
      set: () => Promise.reject(new Error("ECONNREFUSED")),
      get: () => Promise.reject(new Error("ECONNREFUSED")),
      del: () => Promise.reject(new Error("ECONNREFUSED")),
    } as unknown as RedisLike;
    const out = await new RedisJobLock(down, (m) => logged.push(m)).run("job-1", async () => "ran", busy);
    expect(out).toBe("ran");
    expect(logged[0]).toMatch(/row lock alone/);
  });

  it("steps over a Redis that hangs, within the time box", async () => {
    const hung = {
      set: () => new Promise(() => {}),
      get: () => new Promise(() => {}),
      del: () => new Promise(() => {}),
    } as unknown as RedisLike;
    const started = Date.now();
    expect(await new RedisJobLock(hung).run("job-1", async () => "ran", busy)).toBe("ran");
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
