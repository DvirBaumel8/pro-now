import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { existsSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

import { expandStreetName, searchForm } from "./normalize.js";

/**
 * apps/api/data/il-streets.json.gz, refreshed by scripts/fetch-streets.mjs:
 * two levels up from the bundle (dist/server.js), four from this file.
 */
const SNAPSHOT = ["..", "../../.."]
  .map((up) => path.resolve(import.meta.dirname, up, "data/il-streets.json.gz"))
  .find((file) => existsSync(file));
const BATCH = 5_000;
/** Any constant, so two servers booting together load the list once. */
const LOCK_KEY = 2026_10_01;

interface Snapshot {
  source: string;
  fetchedAt: string;
  cities: Record<string, string>;
  streets: Array<[localityCode: number, streetCode: number, name: string]>;
}

export interface StreetRow {
  localityCode: number;
  streetCode: number;
  localityName: string;
  streetName: string;
  searchText: string;
  localityStreets: number;
}

export function rowsFromSnapshot(snapshot: Pick<Snapshot, "cities" | "streets">): StreetRow[] {
  const perLocality = new Map<number, number>();
  for (const [locality] of snapshot.streets) perLocality.set(locality, (perLocality.get(locality) ?? 0) + 1);
  return snapshot.streets.map(([localityCode, streetCode, name]) => {
    const localityName = snapshot.cities[String(localityCode)] ?? "";
    const streetName = expandStreetName(name);
    return {
      localityCode,
      streetCode,
      localityName,
      streetName,
      // "|" divides the street's words from the locality's; search.ts ranks on it.
      searchText: ` ${searchForm(streetName)} | ${searchForm(localityName)} `,
      localityStreets: perLocality.get(localityCode) ?? 0,
    };
  });
}

/**
 * Makes `street_names` match the checked-in snapshot as this code derives
 * it. The rows' fingerprint is kept as the table's comment, so a refreshed
 * snapshot and a change to how names are expanded both reload it, and any
 * other boot is one query.
 */
export async function loadStreetNames(prisma: PrismaClient): Promise<{ loaded: number } | null> {
  if (!SNAPSHOT) throw new Error("apps/api/data/il-streets.json.gz is missing");
  const snapshot = JSON.parse(gunzipSync(await readFile(SNAPSHOT)).toString("utf8")) as Snapshot;
  const rows = rowsFromSnapshot(snapshot);
  const fingerprint = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  const current = async (db: Pick<PrismaClient, "$queryRaw">) =>
    (await db.$queryRaw<Array<{ c: string | null }>>`SELECT obj_description('street_names'::regclass, 'pg_class') AS c`)[0]?.c;
  if ((await current(prisma)) === fingerprint) return null;
  const loaded = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      if ((await current(tx)) === fingerprint) return false;
      await tx.streetName.deleteMany();
      for (let i = 0; i < rows.length; i += BATCH) {
        await tx.streetName.createMany({ data: rows.slice(i, i + BATCH), skipDuplicates: true });
      }
      // COMMENT takes no bind parameters; the fingerprint is hex.
      await tx.$executeRawUnsafe(`COMMENT ON TABLE street_names IS '${fingerprint}'`);
      return true;
    },
    { timeout: 120_000, maxWait: 120_000 }
  );
  return loaded ? { loaded: rows.length } : null;
}
