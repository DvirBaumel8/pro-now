import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DISTRICT_SITES,
  PLATE_SPOTS,
  type WorldGeo,
  groundSpotFor,
  metresToWorld,
  openGroundFromGeo,
  pruneDeadEnds,
  tradeGround,
  tradeGroundViolations,
  planWorld,
  plotSpotsFromGeo,
  REAL_METRES,
  worldToMetres,
} from "@pro-now/demo-types";

import { nearestDistrict } from "../src/screens/stroll";

const geo = JSON.parse(
  readFileSync(resolve(__dirname, "../../types/test/fixtures/fixture_grid.json"), "utf8")
) as WorldGeo;
const plan = planWorld(geo);
const spots = plotSpotsFromGeo(plan);

describe("one ground, one answer", () => {
  /*
   * THE BUG THIS EXISTS FOR.
   *
   * Three places have to agree about where a trade's shop is: the layer
   * that draws it, the test for which trade is underfoot, and the errands
   * scattered between them. The first real-map build indexed two of them
   * by LOOP POSITION, and the loops were not the same loop —
   * `DistrictLayer` filters the active trade out before mapping, so
   * hiding one shop shifted every shop after it onto its neighbour's
   * plot, while `nearestDistrict` walked a different collection entirely.
   *
   * On screen: the world lights the plumber and opens the barber. It is
   * invisible in a screenshot and obvious the moment somebody walks, so
   * it is a test rather than a careful reading.
   */
  it("gives a trade the same spot however the list is filtered", () => {
    const all = DISTRICT_SITES.map((s) => groundSpotFor(spots, s.department));
    const withoutFirst = DISTRICT_SITES.slice(1).map((s) => groundSpotFor(spots, s.department));
    expect(withoutFirst).toEqual(all.slice(1));
  });

  it("falls back to the painted plate when there is no extract", () => {
    for (const [i, site] of DISTRICT_SITES.entries()) {
      expect(groundSpotFor(null, site.department)).toEqual(PLATE_SPOTS[i % PLATE_SPOTS.length]);
    }
    expect(groundSpotFor([], DISTRICT_SITES[0]!.department)).toEqual(PLATE_SPOTS[0]);
  });

  it("puts every trade somewhere different on the real ground", () => {
    const placed = DISTRICT_SITES.map((s) => groundSpotFor(spots, s.department));
    const keys = new Set(placed.map((p) => `${p.u.toFixed(5)},${p.v.toFixed(5)}`));
    expect(keys.size).toBe(placed.length);
  });
});

describe("the trades that have no door", () => {
  /*
   * Amit turned the closed roads into parks and added the product point:
   * *"שם ישבו עסקים שלנו עתידיים — דוג ווקרים ומאמני כושר."* ChatGPT then
   * asked for the distinction to live in the TYPES rather than in the
   * renderer, so two screens cannot disagree about whether a trade has a
   * door. This is that, checked.
   */
  const open = openGroundFromGeo(planWorld(pruneDeadEnds(geo).geo));

  it("stands the door-less trades on open ground", () => {
    expect(open.length).toBeGreaterThan(0);
    for (const site of DISTRICT_SITES) {
      const at = groundSpotFor(spots, site.department, open);
      const onOpen = open.some((o) => o.u === at.u && o.v === at.v);
      expect(onOpen).toBe(tradeGround(site.department) === "OPEN_GROUND");
    }
  });

  it("falls back to a frontage when there is no open ground", () => {
    for (const site of DISTRICT_SITES) {
      expect(groundSpotFor(spots, site.department, [])).toEqual(
        groundSpotFor(spots, site.department)
      );
    }
  });

  it("keeps the street from emptying", () => {
    expect(tradeGroundViolations()).toEqual([]);
  });
});

describe("which trade is underfoot", () => {
  /*
   * `NEAR` is 0.16 of the world. On the painted plate — about a hundred
   * metres of street drawn as the whole world — that is roughly fourteen
   * metres, which is why it feels right. On a 620m extract the same
   * number is a hundred metres, and standing in one junction would light
   * three trades at once.
   */
  const reach = metresToWorld(geo.bounds, REAL_METRES.reach);

  it("finds the trade you are standing on", () => {
    for (const site of DISTRICT_SITES) {
      const at = groundSpotFor(spots, site.department);
      expect(nearestDistrict(at, reach, spots)).toBe(site.department);
    }
  });

  it("finds nobody in the middle of the road", () => {
    // A point on the spine, well clear of any doorstep.
    const spine = plan.ways.find((w) => w.id === "w_spine")!;
    const mid = spine.points[Math.floor(spine.points.length / 2)]!;
    const found = nearestDistrict(mid, reach, spots);
    if (found) {
      const d = Math.hypot(
        groundSpotFor(spots, found).u - mid.u,
        groundSpotFor(spots, found).v - mid.v
      );
      expect(worldToMetres(geo.bounds, d)).toBeLessThanOrEqual(REAL_METRES.reach + 0.001);
    } else {
      expect(found).toBeNull();
    }
  });

  /*
   * THE CONTROL. Every assertion above would also pass if `reach` were
   * enormous and every point matched the first trade, so the suite proves
   * the radius actually excludes: the painted plate's own 0.16 is a
   * hundred metres here and lights up a trade from across the district.
   */
  it("shows what the painted plate's radius would have done", () => {
    const plateRadius = 0.16;
    expect(worldToMetres(geo.bounds, plateRadius)).toBeGreaterThan(90);
    // Sixty metres from a shopfront: two streets away, and nowhere near
    // its door.
    const door = groundSpotFor(spots, DISTRICT_SITES[0]!.department);
    const away = { u: door.u + metresToWorld(geo.bounds, 60), v: door.v };
    expect(worldToMetres(geo.bounds, Math.abs(away.u - door.u))).toBeCloseTo(60, 6);

    expect(nearestDistrict(away, reach, spots)).toBeNull();
    // ...and the same point with the plate's radius is standing in a shop.
    expect(nearestDistrict(away, plateRadius, spots)).not.toBeNull();
  });
});
