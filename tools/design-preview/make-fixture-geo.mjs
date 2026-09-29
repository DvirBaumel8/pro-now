#!/usr/bin/env node
/**
 * A NEIGHBOURHOOD THAT IS NOT ANYWHERE.
 *
 * `fetch-geo.mjs` needs the internet and the build container does not have
 * it, so everything downstream of the extract — the projection, the
 * plot-finding, the spine, the renderer, the honesty rules — would be
 * unproven until somebody with a network ran a script. That is exactly the
 * kind of "works on my machine" seam this repository keeps refusing to
 * build, so the fixture exists instead.
 *
 * It carries `real: false`, which is load-bearing in three places:
 * `geoViolations` stops demanding attribution, `plotViolations` refuses to
 * let it be drawn as a real place, and `RealMapSurface` watermarks it. A
 * fixture that could pass for a place would be worse than no fixture.
 *
 * The geometry is a grid because a grid is the hardest case for the two
 * things being tested: every plot fronts two roads, so `plotSpotsFromGeo`
 * has to choose, and every street crosses every other, so the spine finder
 * has to survive a graph rather than a line.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const SOUTH = 32.076;
const WEST = 34.776;
const SIZE = 620;

/*
 * THE SAME EARTH `world-geo.ts` USES.
 *
 * The first version of this file laid the fixture out with the ellipsoid's
 * 110574 m per degree of latitude, which is the correct number and the
 * wrong one here: the projection is spherical, so the fixture measured
 * 615.8m tall in the code that reads it and 620m in the code that wrote
 * it. A fixture whose own dimensions are a fraction of a percent off is
 * a fixture that will one day be blamed for a real bug.
 */
const EARTH_R = 6378137;
const M_PER_DEG = (EARTH_R * Math.PI) / 180;
const MID_LAT = SOUTH + SIZE / 2 / M_PER_DEG;
const M_PER_DEG_LNG = M_PER_DEG * Math.cos((MID_LAT * Math.PI) / 180);

const p = (x, y) => ({ lat: SOUTH + y / M_PER_DEG, lng: WEST + x / M_PER_DEG_LNG });

const ways = [];
const areas = [];

/* The spine: one avenue that bends, so the camera has a corner to turn. */
ways.push({
  id: "w_spine",
  kind: "ARTERIAL",
  widthMetres: 11,
  nameHe: "שדרות פרו נאו",
  points: [p(250, 0), p(255, 140), p(285, 300), p(300, 460), p(296, 620)],
});
/* A cross avenue. */
ways.push({
  id: "w_cross",
  kind: "ARTERIAL",
  widthMetres: 9.5,
  nameHe: "הרחוב הרוחבי",
  points: [p(0, 360), p(180, 352), p(288, 348), p(430, 356), p(620, 350)],
});

/* Residential streets, east and west of the spine. */
const rows = [90, 200, 470, 560];
rows.forEach((y, i) => {
  ways.push({
    id: `w_row_${i}`,
    kind: "STREET",
    widthMetres: 7,
    points: [p(20, y), p(240, y - 2), p(320, y + 2), p(600, y)],
  });
});
const cols = [90, 430, 540];
cols.forEach((x, i) => {
  ways.push({
    id: `w_col_${i}`,
    kind: "STREET",
    widthMetres: 6.5,
    points: [p(x, 20), p(x + 4, 200), p(x - 3, 420), p(x, 600)],
  });
});
/* One service lane, to prove kinds are not all treated alike. */
ways.push({
  id: "w_lane",
  kind: "SERVICE",
  widthMetres: 4,
  points: [p(330, 120), p(400, 118), p(410, 250)],
});

/* A park in the north-west quarter and a water strip along the east edge. */
areas.push({
  id: "a_park",
  kind: "GREEN",
  ring: [p(120, 240), p(225, 238), p(228, 330), p(118, 334)].map((q) => q),
});
areas.push({
  id: "a_square",
  kind: "SQUARE",
  ring: [p(300, 370), p(372, 372), p(370, 430), p(298, 428)],
});
areas.push({
  id: "a_water",
  kind: "WATER",
  ring: [p(575, 0), p(620, 0), p(620, 620), p(578, 620), p(590, 300)],
});

/* Plots lining the streets, both sides, in blocks of four. */
let n = 0;
function plotRow(x0, y0, dx, dy, count, w, d, side) {
  for (let i = 0; i < count; i++) {
    const x = x0 + dx * i;
    const y = y0 + dy * i;
    const nx = side * (dy === 0 ? 0 : 1);
    void nx;
    areas.push({
      id: `a_plot_${n++}`,
      kind: "PLOT",
      ring: [p(x, y), p(x + w, y), p(x + w, y + d), p(x, y + d)],
    });
  }
}
/* West of the spine, facing it. */
plotRow(196, 30, 0, 52, 5, 34, 36, 1);
/* East of the spine. */
plotRow(316, 30, 0, 52, 5, 34, 36, -1);
/* Along the cross avenue, north side. */
plotRow(30, 372, 56, 0, 4, 40, 34, 1);
plotRow(440, 374, 56, 0, 2, 40, 34, 1);
/* Along the cross avenue, south side. */
plotRow(30, 300, 56, 0, 4, 40, 34, -1);
plotRow(440, 300, 56, 0, 2, 40, 34, -1);
/* Along the northern residential rows. */
plotRow(110, 100, 52, 0, 3, 36, 30, 1);
plotRow(360, 100, 52, 0, 3, 36, 30, 1);
plotRow(110, 210, 52, 0, 3, 36, 30, 1);
plotRow(360, 210, 52, 0, 3, 36, 30, 1);
plotRow(110, 480, 52, 0, 3, 36, 30, 1);
plotRow(360, 480, 52, 0, 3, 36, 30, 1);
/* A shed, to prove the area floor rejects something. */
areas.push({ id: "a_shed", kind: "PLOT", ring: [p(70, 60), p(74, 60), p(74, 64), p(70, 64)] });

const geo = {
  id: "fixture_grid",
  nameHe: "שכונת בדיקה",
  real: false,
  attribution: "",
  source: "tools/design-preview/make-fixture-geo.mjs",
  fetchedAt: new Date(0).toISOString(),
  bounds: {
    south: SOUTH,
    west: WEST,
    north: SOUTH + SIZE / M_PER_DEG,
    east: WEST + SIZE / M_PER_DEG_LNG,
  },
  ways,
  areas,
};

mkdirSync("tools/design-preview/geo", { recursive: true });
writeFileSync("tools/design-preview/lib/types/test/fixtures/fixture_grid.json", JSON.stringify(geo));
writeFileSync("tools/design-preview/geo/fixture_grid.json", JSON.stringify(geo));
console.log(`fixture: ${ways.length} roads · ${areas.filter((a) => a.kind === "PLOT").length} plots · ${SIZE}m square`);
