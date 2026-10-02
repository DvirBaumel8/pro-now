#!/usr/bin/env node
/**
 * REAL STREET GEOMETRY, FROM OPENSTREETMAP, AS A `WorldGeo`.
 *
 *   node tools/design-preview/fetch-geo.mjs \
 *     --bbox 32.0730,34.7720,32.0830,34.7840 \
 *     --name "לב תל אביב" --id tlv_center \
 *     --out tools/design-preview/geo/tlv_center.json
 *
 * ---------------------------------------------------------------------
 * WHY A SCRIPT AND NOT A FETCH AT RUNTIME
 * ---------------------------------------------------------------------
 * A street plan changes about as fast as a street does. Fetching it on
 * every app start would spend a user's data on a file that was identical
 * last week, put an outage between them and the map, and hand a third
 * party a request every time somebody opens the app. So the extract is a
 * build input: fetched deliberately, read, checked, committed, dated.
 *
 * ---------------------------------------------------------------------
 * AND WHY IT WILL NOT RUN IN THE BUILD CONTAINER
 * ---------------------------------------------------------------------
 * Every OSM host this needs — `overpass-api.de`, `overpass.kumi.systems`,
 * `api.openstreetmap.org`, and the tile hosts besides — is refused by the
 * organization egress proxy in the container this was written in. That is
 * policy, not a fault, and it is not to be routed around. The script is
 * therefore written to be run on a machine that has the internet, which is
 * Amit's; everything downstream of it is proven offline against a fixture,
 * so the only thing that waits on a network is the file itself.
 *
 * LICENCE. OSM data is ODbL. The attribution string this writes into the
 * document is not decoration — `geoViolations` refuses to draw a real
 * extract without it.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, [])
);

const bbox = String(args.bbox ?? "").split(",").map(Number);
if (bbox.length !== 4 || bbox.some(Number.isNaN)) {
  console.error("--bbox south,west,north,east is required");
  process.exit(1);
}
const [south, west, north, east] = bbox;
const id = args.id ?? "neighbourhood";
const nameHe = args.name ?? "השכונה";
const out = args.out ?? `tools/design-preview/geo/${id}.json`;
const endpoint = args.endpoint ?? "https://overpass-api.de/api/interpreter";

/*
 * HOW WIDE A ROAD IS WHEN NOBODY WROTE IT DOWN.
 *
 * OSM tags `width` on a minority of ways. The rest get a width from their
 * class, which is a guess — but a guess about a road's WIDTH is a
 * centimetre-scale lie on a drawing, where a guess about a road's PLACE
 * would be a metre-scale one. The place is always real here.
 */
const ROAD_CLASS = {
  motorway: { kind: "ARTERIAL", width: 14 },
  trunk: { kind: "ARTERIAL", width: 12 },
  primary: { kind: "ARTERIAL", width: 11 },
  secondary: { kind: "ARTERIAL", width: 9.5 },
  tertiary: { kind: "STREET", width: 8 },
  residential: { kind: "STREET", width: 7 },
  unclassified: { kind: "STREET", width: 6.5 },
  living_street: { kind: "STREET", width: 6 },
  service: { kind: "SERVICE", width: 4 },
  pedestrian: { kind: "PATH", width: 5 },
  footway: { kind: "PATH", width: 2.5 },
};

const bb = `${south},${west},${north},${east}`;
const query = `[out:json][timeout:90];
(
  way["highway"~"^(${Object.keys(ROAD_CLASS).join("|")})$"](${bb});
  way["building"](${bb});
  way["natural"="water"](${bb});
  way["waterway"="riverbank"](${bb});
  way["leisure"~"^(park|garden|playground|pitch|common)$"](${bb});
  way["landuse"~"^(grass|forest|recreation_ground|village_green)$"](${bb});
  way["place"="square"](${bb});
);
out body geom;`;

console.log(`fetching ${bb} from ${endpoint}`);
const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ data: query }),
});
if (!res.ok) {
  console.error(`overpass said ${res.status} ${res.statusText}`);
  console.error("if this is 403/407 it is the egress proxy, not overpass — run this on a machine with the internet");
  process.exit(1);
}
const body = await res.json();

const ways = [];
const areas = [];

for (const el of body.elements ?? []) {
  if (el.type !== "way" || !Array.isArray(el.geometry)) continue;
  const tags = el.tags ?? {};
  const ring = el.geometry.map((g) => ({ lat: g.lat, lng: g.lon }));
  if (ring.length < 2) continue;

  if (tags.highway && ROAD_CLASS[tags.highway]) {
    const cls = ROAD_CLASS[tags.highway];
    const tagged = Number.parseFloat(tags.width ?? tags["est_width"] ?? "");
    ways.push({
      id: `w${el.id}`,
      kind: cls.kind,
      widthMetres: Number.isFinite(tagged) && tagged > 0 ? tagged : cls.width,
      ...(tags["name:he"] ?? tags.name ? { nameHe: tags["name:he"] ?? tags.name } : {}),
      points: ring,
    });
    continue;
  }

  // Closed ways only, for areas. An open "building" way is a data error.
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first.lat === last.lat && first.lng === last.lng;
  if (!closed || ring.length < 4) continue;
  const body_ = ring.slice(0, -1);

  let kind = null;
  if (tags.building) kind = "PLOT";
  else if (tags.natural === "water" || tags.waterway === "riverbank") kind = "WATER";
  else if (tags.leisure || tags.landuse) kind = "GREEN";
  else if (tags.place === "square") kind = "SQUARE";
  if (!kind) continue;
  areas.push({ id: `a${el.id}`, kind, ring: body_ });
}

const geo = {
  id,
  nameHe,
  real: true,
  attribution: "© מפתחי OpenStreetMap — ODbL",
  source: `${endpoint}?bbox=${bb}`,
  fetchedAt: new Date().toISOString(),
  bounds: { south, west, north, east },
  ways,
  areas,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(geo));
const counts = areas.reduce((m, a) => ((m[a.kind] = (m[a.kind] ?? 0) + 1), m), {});
console.log(`wrote ${out}`);
console.log(`  ${ways.length} roads · ${counts.PLOT ?? 0} plots · ${counts.GREEN ?? 0} green · ${counts.WATER ?? 0} water`);
console.log(`  now run: npm run verify:geo -- ${out}`);
