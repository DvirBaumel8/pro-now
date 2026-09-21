import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  type WorldGeo,
  geoAspect,
  geoHeightMetres,
  geoViolations,
  geoWidthMetres,
  inCarriageway,
  metresToWorld,
  nearestWay,
  planWorld,
  plotSpotsFromGeo,
  projectToWorld,
  ringArea,
  ringCentroid,
  roadSamplesFromGeo,
  spineOf,
  unprojectFromWorld,
  worldToMetres,
} from "../src/world-geo";
import { roadAt } from "../src/world-neighbourhood";

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, "fixtures/fixture_grid.json"), "utf8")
) as WorldGeo;

const plan = planWorld(fixture);

describe("the projection", () => {
  it("puts the box's corners at the corners", () => {
    const { bounds } = fixture;
    const nw = projectToWorld(bounds, { lat: bounds.north, lng: bounds.west });
    const se = projectToWorld(bounds, { lat: bounds.south, lng: bounds.east });
    expect(nw.u).toBeCloseTo(0, 9);
    expect(nw.v).toBeCloseTo(0, 9);
    expect(se.u).toBeCloseTo(1, 9);
    expect(se.v).toBeCloseTo(1, 9);
  });

  it("round-trips a coordinate", () => {
    const p = { lat: fixture.bounds.south + 0.0031, lng: fixture.bounds.west + 0.0042 };
    const back = unprojectFromWorld(fixture.bounds, projectToWorld(fixture.bounds, p));
    expect(back.lat).toBeCloseTo(p.lat, 9);
    expect(back.lng).toBeCloseTo(p.lng, 9);
  });

  /*
   * THE ONE THAT WOULD HAVE BEEN MISSED.
   *
   * A degree of longitude in Tel Aviv is 0.85 of a degree of latitude, so
   * treating the box as square in degrees stretches the city sideways by
   * 18% and every junction is drawn at the wrong angle. The aspect has to
   * come from the projected plane, and the proof is that it disagrees with
   * the naive one by exactly that much.
   */
  it("takes its shape from the projection, not from degrees", () => {
    const naive =
      (fixture.bounds.east - fixture.bounds.west) / (fixture.bounds.north - fixture.bounds.south);
    expect(geoAspect(fixture.bounds)).toBeLessThan(naive * 0.9);
  });

  it("agrees with itself about how big the place is", () => {
    // The fixture is a 620m square, built in metres.
    expect(geoWidthMetres(fixture.bounds)).toBeCloseTo(620, 0);
    expect(geoHeightMetres(fixture.bounds)).toBeCloseTo(620, 0);
    // And the drawn aspect matches the measured one, which is the invariant
    // that makes `metresToWorld` correct on both axes.
    expect(geoAspect(fixture.bounds)).toBeCloseTo(
      geoWidthMetres(fixture.bounds) / geoHeightMetres(fixture.bounds),
      6
    );
  });

  it("turns metres into world units and back", () => {
    const u = metresToWorld(fixture.bounds, 31);
    expect(u).toBeCloseTo(0.05, 3);
    expect(worldToMetres(fixture.bounds, u)).toBeCloseTo(31, 6);
  });
});

describe("rings", () => {
  it("measures a square", () => {
    const sq = [
      { u: 0.2, v: 0.2 },
      { u: 0.4, v: 0.2 },
      { u: 0.4, v: 0.5 },
      { u: 0.2, v: 0.5 },
    ];
    expect(Math.abs(ringArea(sq))).toBeCloseTo(0.06, 9);
    const c = ringCentroid(sq);
    expect(c.u).toBeCloseTo(0.3, 9);
    expect(c.v).toBeCloseTo(0.35, 9);
  });

  it("still answers for a degenerate ring instead of returning NaN", () => {
    const line = [
      { u: 0.1, v: 0.1 },
      { u: 0.3, v: 0.1 },
    ];
    const c = ringCentroid(line);
    expect(Number.isNaN(c.u)).toBe(false);
    expect(Number.isNaN(c.v)).toBe(false);
  });
});

describe("the road a vehicle drives", () => {
  it("picks the longest arterial as the spine", () => {
    expect(spineOf(plan)?.id).toBe("w_spine");
  });

  it("produces samples `roadAt` can read", () => {
    const samples = roadSamplesFromGeo(plan);
    expect(samples.length).toBeGreaterThanOrEqual(10);
    // Sorted front to back and never two rows at one depth — `roadAt`
    // interpolates between consecutive rows and cannot express a hairpin.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!.v).toBeGreaterThan(samples[i - 1]!.v);
    }
    for (const s of samples) {
      expect(s.width).toBeGreaterThan(0);
      expect(s.u).toBeGreaterThan(0);
      expect(s.u).toBeLessThan(1);
    }
  });

  it("puts the carriageway where the real street is", () => {
    const samples = roadSamplesFromGeo(plan);
    const spine = spineOf(plan)!;
    for (const s of samples) {
      const on = nearestWay(plan, { u: s.u, v: s.v });
      expect(on).not.toBeNull();
      // Every derived sample sits on the spine itself, to within a
      // millimetre of world. A sample that drifts is a vehicle in a garden.
      expect(on!.way.id).toBe(spine.id);
      expect(on!.on.distance).toBeLessThan(0.001);
    }
  });

  it("is a drop-in for the painted plate's own road lookup", () => {
    const samples = roadSamplesFromGeo(plan);
    // `roadAt` is written against `ROAD_SAMPLES`; the point of matching its
    // shape is that a real street can be handed to it unchanged.
    const mid = samples[Math.floor(samples.length / 2)]!;
    const painted = roadAt(mid.v);
    expect(painted.halfWidth).toBeGreaterThan(0);
  });
});

describe("where a shop stands", () => {
  const spots = plotSpotsFromGeo(plan);

  it("finds more addresses than there are trades", () => {
    expect(spots.length).toBeGreaterThanOrEqual(11);
  });

  it("never stands one in the road", () => {
    for (const s of spots) expect(inCarriageway(plan, s)).toBe(false);
  });

  it("keeps them apart", () => {
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        const d = Math.hypot(spots[i]!.u - spots[j]!.u, spots[i]!.v - spots[j]!.v);
        expect(d).toBeGreaterThanOrEqual(0.06 - 1e-9);
      }
    }
  });

  it("keeps them all behind the customer", () => {
    for (const s of spots) expect(s.v).toBeLessThanOrEqual(0.86);
  });

  it("faces every shopfront at the street it fronts", () => {
    for (const s of spots) {
      const road = nearestWay(plan, s);
      expect(road).not.toBeNull();
      // The facing vector points from the doorstep towards the kerb.
      const toRoad = { u: road!.on.at.u - s.u, v: road!.on.at.v - s.v };
      const len = Math.hypot(toRoad.u, toRoad.v) || 1;
      const dot = (toRoad.u / len) * s.facing.u + (toRoad.v / len) * s.facing.v;
      expect(dot).toBeGreaterThan(0.9);
    }
  });

  it("stands them a pavement's width off the kerb, not on it and not in a field", () => {
    for (const s of spots) {
      const road = nearestWay(plan, s);
      const clearMetres = worldToMetres(fixture.bounds, road!.on.distance - road!.way.halfWidth);
      expect(clearMetres).toBeGreaterThan(1);
      expect(clearMetres).toBeLessThan(6);
    }
  });

  it("throws out the shed", () => {
    expect(spots.some((s) => s.plotId === "a_shed")).toBe(false);
  });

  /*
   * THE CONTROL.
   *
   * Every assertion above passes on an empty list, and an extract with no
   * plots produces exactly that. So the suite proves the finder can also
   * say no — otherwise "no shop is in the road" is a sentence about
   * nothing, which is the failure mode this repository keeps finding.
   */
  it("finds nothing in an extract with no plots", () => {
    const stripped = planWorld({ ...fixture, areas: fixture.areas.filter((a) => a.kind !== "PLOT") });
    expect(plotSpotsFromGeo(stripped)).toHaveLength(0);
  });

  it("refuses a plot that is too far from any road to be a shopfront", () => {
    const far = planWorld({
      ...fixture,
      areas: [
        {
          id: "a_remote",
          kind: "PLOT",
          ring: [
            { lat: 32.0785, lng: 34.7792 },
            { lat: 32.0785, lng: 34.7796 },
            { lat: 32.0788, lng: 34.7796 },
            { lat: 32.0788, lng: 34.7792 },
          ],
        },
      ],
      ways: [
        {
          id: "w_far",
          kind: "ARTERIAL",
          widthMetres: 10,
          points: [
            { lat: 32.0762, lng: 34.7762 },
            { lat: 32.0763, lng: 34.7838 },
          ],
        },
      ],
    });
    expect(plotSpotsFromGeo(far, { maxSetbackMetres: 45 })).toHaveLength(0);
  });
});

describe("what makes an extract usable", () => {
  it("accepts the fixture", () => {
    expect(geoViolations(fixture)).toEqual([]);
  });

  it("refuses a box with no height", () => {
    const flat = { ...fixture, bounds: { ...fixture.bounds, north: fixture.bounds.south } };
    expect(geoViolations(flat)).toContain("the bounding box has no height");
  });

  it("refuses an extract with no roads", () => {
    const v = geoViolations({ ...fixture, ways: [] });
    expect(v).toContain("there are no roads in the extract");
    expect(v).toContain("the extract has no street a vehicle could drive");
  });

  it("refuses a whole city", () => {
    const huge = {
      ...fixture,
      bounds: { ...fixture.bounds, north: fixture.bounds.south + 0.09, east: fixture.bounds.west + 0.09 },
    };
    expect(geoViolations(huge).some((s) => s.includes("a city and not a neighbourhood"))).toBe(true);
  });

  /*
   * A REAL EXTRACT WITHOUT ATTRIBUTION IS A LICENCE BREACH, NOT A STYLE
   * PROBLEM. OSM is ODbL. The check only fires for `real: true`, so the
   * fixture — which has no attribution because it is nowhere — must not
   * be the thing that proves it.
   */
  it("refuses to draw a real extract with nobody credited", () => {
    const claimed = { ...fixture, real: true, attribution: "", source: "", fetchedAt: "nope" };
    const v = geoViolations(claimed);
    expect(v).toContain("a real extract with no attribution may not be drawn");
    expect(v).toContain("a real extract must say where it came from");
    expect(v).toContain("a real extract must be dated");
  });

  it("and lets the same extract through once it is credited", () => {
    const credited = {
      ...fixture,
      real: true,
      attribution: "© מפתחי OpenStreetMap — ODbL",
      source: "https://overpass-api.de/api/interpreter",
      fetchedAt: new Date().toISOString(),
    };
    expect(geoViolations(credited)).toEqual([]);
  });
});
