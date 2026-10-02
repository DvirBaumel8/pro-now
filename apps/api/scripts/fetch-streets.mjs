#!/usr/bin/env node
/**
 * Refreshes apps/api/data/il-streets.json.gz from Israel's official street
 * list ("רשימת רחובות בישראל", data.gov.il, published by the Population and
 * Immigration Authority). The server loads the snapshot into `street_names`
 * on boot when its row count differs (src/domain/streets/load.ts).
 *
 *   node apps/api/scripts/fetch-streets.mjs
 */
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const RESOURCE = "9ad3862c-8391-4b2f-84a4-2d4c68625f4b";
const API = "https://data.gov.il/api/3/action/datastore_search";
const out = fileURLToPath(new URL("../data/il-streets.json.gz", import.meta.url));

const records = [];
for (let offset = 0; ; ) {
  const res = await fetch(`${API}?resource_id=${RESOURCE}&limit=32000&offset=${offset}`);
  if (!res.ok) throw new Error(`data.gov.il responded ${res.status}`);
  const { result } = await res.json();
  records.push(...result.records);
  offset += result.records.length;
  if (result.records.length === 0 || offset >= result.total) break;
}

const tidy = (s) => String(s).trim().replace(/\s+/g, " ");
const cities = {};
const streets = [];
for (const r of records) {
  cities[r["סמל_ישוב"]] = tidy(r["שם_ישוב"]);
  streets.push([r["סמל_ישוב"], r["סמל_רחוב"], tidy(r["שם_רחוב"])]);
}
streets.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const snapshot = { source: `data.gov.il resource ${RESOURCE}`, fetchedAt: new Date().toISOString().slice(0, 10), cities, streets };
writeFileSync(out, gzipSync(JSON.stringify(snapshot), { level: 9 }));
console.log(`${streets.length} streets in ${Object.keys(cities).length} localities → ${out}`);
