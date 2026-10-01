import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";

/** What a geocoder said, kept 30 days: the public geocoder allows one request a second. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function readCache(app: FastifyInstance, cacheKey: string): Promise<unknown | undefined> {
  const cached = await app.prisma.geocodeCache.findUnique({ where: { cacheKey } });
  if (!cached) return undefined;
  if (cached.expiresAt <= new Date()) {
    await app.prisma.geocodeCache.delete({ where: { cacheKey } }).catch(() => undefined);
    return undefined;
  }
  return cached.value;
}

export async function writeCache(app: FastifyInstance, cacheKey: string, kind: string, value: unknown): Promise<void> {
  const jsonValue = value === null ? Prisma.JsonNull : (value as object);
  await app.prisma.geocodeCache.upsert({
    where: { cacheKey },
    update: { kind, value: jsonValue, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
    create: { cacheKey, kind, value: jsonValue, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
  });
}
