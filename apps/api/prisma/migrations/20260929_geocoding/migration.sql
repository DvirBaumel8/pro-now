CREATE TABLE "geocode_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "geocode_cache_cacheKey_key" ON "geocode_cache"("cacheKey");
CREATE INDEX "geocode_cache_expiresAt_idx" ON "geocode_cache"("expiresAt");
