-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "doorCode" TEXT,
ADD COLUMN     "onSiteName" TEXT,
ADD COLUMN     "onSitePhone" TEXT,
ADD COLUMN     "onSiteTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "onSiteTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "jobs_onSiteTokenHash_key" ON "jobs"("onSiteTokenHash");

