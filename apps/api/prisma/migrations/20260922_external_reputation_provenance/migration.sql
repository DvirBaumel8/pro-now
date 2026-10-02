-- External reputation: the fields /docs/10 §External reputation specifies
-- and the tables did not have.
--
-- Written by hand rather than taken from `prisma migrate diff`, for two
-- reasons. The generated script also carried unrelated drift — DROP
-- DEFAULT on three array columns where the hand-authored 0_init gave a
-- default the Prisma schema does not declare — and a migration should
-- contain the change it is named after and nothing else. And it emitted
-- `updatedAt TIMESTAMP(3) NOT NULL` with no default, which fails on any
-- table that already has rows.

-- Where a rating came from, whether we may show it, and whether it is
-- still true. A rating without these is the "mock data shown as if it
-- were live" the document forbids.
ALTER TABLE "professional_external_profiles"
  ADD COLUMN "dataProvenance" TEXT NOT NULL DEFAULT 'PROFESSIONAL_DECLARED',
  ADD COLUMN "allowedDisplayFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'NEVER_SYNCED',
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncError" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- One link per professional per source. Two rows for the same person and
-- the same platform would leave "which is their Google profile" with two
-- answers and the card showing whichever came back first.
CREATE UNIQUE INDEX "professional_external_profiles_professionalId_sourceId_key"
  ON "professional_external_profiles"("professionalId", "sourceId");

-- The label the customer sees beside the number, and the switch that
-- decides whether there is a number at all. `integrationEnabled` is false
-- for every source until somebody has an integration its terms allow:
-- that is "hide the external reputation block entirely" as a column.
ALTER TABLE "external_reputation_sources"
  ADD COLUMN "displayNameHe" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "integrationEnabled" BOOLEAN NOT NULL DEFAULT false;
