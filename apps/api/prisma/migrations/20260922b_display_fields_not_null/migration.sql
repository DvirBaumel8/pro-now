-- `allowedDisplayFields` was created nullable and the schema declares it
-- required. Caught by `npm run db:verify`, which compares the two in both
-- directions — 1436/1437, and the one was this.
--
-- A separate migration rather than an edit to the previous one: that
-- migration has been applied and its checksum recorded, and rewriting
-- applied history to hide a mistake is how a migration that ran
-- somewhere stops matching the file that claims to describe it.
--
-- The distinction matters here beyond tidiness. NULL and [] are different
-- answers: "nobody has said what this source permits displaying" versus
-- "this source permits displaying nothing". The second is a real, safe
-- state and the default; the first is a row nobody finished writing, and
-- the rules in /docs/10 turn on knowing which fields may be shown.
UPDATE "professional_external_profiles"
  SET "allowedDisplayFields" = ARRAY[]::TEXT[]
  WHERE "allowedDisplayFields" IS NULL;

ALTER TABLE "professional_external_profiles"
  ALTER COLUMN "allowedDisplayFields" SET NOT NULL;
