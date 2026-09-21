#!/usr/bin/env node
/**
 * IS THIS EXTRACT A PLACE OUR WORLD CAN STAND ON?
 *
 *   node tools/design-preview/verify-geo.mjs tools/design-preview/geo/tlv.json
 *
 * `fetch-geo.mjs` runs on a machine with the internet; this runs anywhere
 * and is the gate between the two. An extract arriving from elsewhere is
 * exactly the kind of input that turns up broken months later with nobody
 * around who remembers the shape, so it is checked out loud: the bounding
 * box, the licence, the spine a vehicle drives, and — the part nobody
 * would think to check — whether there are enough real building plots
 * fronting real streets to give every trade an address.
 *
 * It prints a contact sheet of numbers rather than a pass/fail, because
 * the useful question is not "is it valid" but "will the city fit in it".
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
require_("tsx/cjs");
const {
  geoViolations,
  geoWidthMetres,
  geoHeightMetres,
  geoZoomFor,
  planWorld,
  plotSpotsFromGeo,
  roadSamplesFromGeo,
  spineOf,
  inCarriageway,
  worldToMetres,
  DISTRICT_SITES,
} = require_("../../packages/types/src/index.ts");

const path = process.argv[2];
if (!path) {
  console.error("usage: verify-geo.mjs <extract.json>");
  process.exit(1);
}

const geo = JSON.parse(readFileSync(path, "utf8"));
const violations = geoViolations(geo);

console.log(`\n${geo.nameHe} (${geo.id}) — ${geo.real ? "מקום אמיתי" : "FIXTURE, not a place"}`);
console.log(`  ${Math.round(geoWidthMetres(geo.bounds))}m × ${Math.round(geoHeightMetres(geo.bounds))}m`);
console.log(`  ${geo.ways.length} roads · ${geo.areas.length} areas`);
if (geo.real) console.log(`  ${geo.attribution}  ·  fetched ${geo.fetchedAt}`);

if (violations.length > 0) {
  console.log("\nREFUSED:");
  for (const v of violations) console.log(`  ✗ ${v}`);
  process.exit(1);
}

const plan = planWorld(geo);
const spine = spineOf(plan);
const samples = roadSamplesFromGeo(plan);
const spots = plotSpotsFromGeo(plan);
const trades = DISTRICT_SITES.length;

console.log(`\n  spine        ${spine?.nameHe ?? spine?.id ?? "—"} · ${samples.length} depth rows`);
console.log(`  shopfronts   ${spots.length} addresses for ${trades} trades`);

const inRoad = spots.filter((s) => inCarriageway(plan, s));
const setbacks = spots.map((s) => s.setbackMetres).sort((a, b) => a - b);
if (spots.length > 0) {
  console.log(
    `  setback      ${setbacks[0].toFixed(1)}m – ${setbacks.at(-1).toFixed(1)}m from the kerb`
  );
  const areas = spots.map((s) => s.areaMetres).sort((a, b) => a - b);
  console.log(`  plot size    ${Math.round(areas[0])}m² – ${Math.round(areas.at(-1))}m²`);
}
console.log(`  in the road  ${inRoad.length}`);

/* How near two shopfronts get, because overlap is the visible failure. */
let closest = Infinity;
for (let i = 0; i < spots.length; i++) {
  for (let j = i + 1; j < spots.length; j++) {
    const d = Math.hypot(spots[i].u - spots[j].u, spots[i].v - spots[j].v);
    if (d < closest) closest = d;
  }
}
if (Number.isFinite(closest)) {
  console.log(`  closest pair ${worldToMetres(geo.bounds, closest).toFixed(1)}m apart`);
}

console.log(`\n  walking zoom ${geoZoomFor("EXPLORE", geo.bounds).toFixed(2)}×`);

const problems = [];
if (spots.length < trades) {
  problems.push(`only ${spots.length} addresses for ${trades} trades — the city will double up`);
}
if (inRoad.length > 0) problems.push(`${inRoad.length} shopfronts are standing in the carriageway`);
if (samples.length < 8) problems.push(`the spine gives only ${samples.length} depth rows to drive`);

if (problems.length > 0) {
  console.log("\nUSABLE, WITH PROBLEMS:");
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(2);
}
console.log("\n  ✓ the city fits\n");
