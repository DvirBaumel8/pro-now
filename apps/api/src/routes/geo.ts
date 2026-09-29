import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import type { GeocodingResult } from "@pro-now/types";
import { reverseGeocodeQuerySchema, searchGeocodeQuerySchema } from "@pro-now/validation";

import { cacheKeyForReverse, cacheKeyForSearch, normalizeSearchQuery } from "../domain/geocoding/cache.js";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export default async function geoRoutes(app: FastifyInstance) {
  app.get("/v1/geo/reverse", async (req, reply) => {
    const { lat, lng } = reverseGeocodeQuerySchema.parse(req.query);
    const cacheKey = cacheKeyForReverse({ lat, lng });
    const cached = await readCache(app, cacheKey);
    if (cached !== undefined) return reply.send({ result: cached as GeocodingResult | null, cached: true });

    try {
      const result = await app.providers.geocoding.reverseGeocode({ lat, lng });
      await writeCache(app, cacheKey, "reverse", result);
      return reply.send({ result, cached: false });
    } catch (error) {
      req.log.warn({ err: error }, "Reverse geocoding failed");
      return reply.status(502).send({ code: "GEOCODING_UNAVAILABLE", message: "Address lookup is temporarily unavailable" });
    }
  });

  app.get("/v1/geo/search", async (req, reply) => {
    const { q } = searchGeocodeQuerySchema.parse(req.query);
    const normalized = normalizeSearchQuery(q);
    const cacheKey = cacheKeyForSearch(normalized)!;
    const cached = await readCache(app, cacheKey);
    if (cached !== undefined) return reply.send({ results: cached as GeocodingResult[], cached: true });

    try {
      const results = await app.providers.geocoding.searchAddress(normalized);
      await writeCache(app, cacheKey, "search", results);
      return reply.send({ results, cached: false });
    } catch (error) {
      req.log.warn({ err: error }, "Address search failed");
      return reply.status(502).send({ code: "GEOCODING_UNAVAILABLE", message: "Address lookup is temporarily unavailable" });
    }
  });
}

async function readCache(app: FastifyInstance, cacheKey: string): Promise<unknown | undefined> {
  const cached = await app.prisma.geocodeCache.findUnique({ where: { cacheKey } });
  if (!cached) return undefined;
  if (cached.expiresAt <= new Date()) {
    await app.prisma.geocodeCache.delete({ where: { cacheKey } }).catch(() => undefined);
    return undefined;
  }
  return cached.value;
}

async function writeCache(app: FastifyInstance, cacheKey: string, kind: string, value: unknown): Promise<void> {
  const jsonValue = value === null ? Prisma.JsonNull : (value as object);
  await app.prisma.geocodeCache.upsert({
    where: { cacheKey },
    update: { kind, value: jsonValue, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
    create: { cacheKey, kind, value: jsonValue, expiresAt: new Date(Date.now() + CACHE_TTL_MS) },
  });
}
