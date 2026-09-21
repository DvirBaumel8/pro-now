import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  type WorldGeo,
  geoAspect,
  geoHeightMetres,
  frontageIsHonest,
  frontageNear,
  geoViolations,
  geoWidthMetres,
  MAX_FRONTAGE_SHIFT_METRES,
  groundDepth,
  groundProject,
  groundScale,
  groundViolations,
  pitchForMetres,
  pitchForShot,
  PLAN_METRES,
  SHOT_METRES,
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

describe("the ground plane, tilted", () => {
  it("is the identity when there is no tilt", () => {
    for (const v of [0, 0.3, 0.7, 1]) {
      for (const u of [0, 0.5, 1]) {
        expect(groundProject({ u, v }, 0)).toEqual({ u, v });
      }
    }
    expect(groundViolations(0)).toEqual([]);
  });

  it("holds together at every tilt", () => {
    for (const pitch of [0, 0.25, 0.5, 0.75, 1]) {
      expect(groundViolations(pitch)).toEqual([]);
    }
  });

  /*
   * THE PROPERTY THAT MAKES IT A TILTED PLANE RATHER THAN A SQUASHED ONE.
   *
   * "Just scale the map vertically" always looks wrong and this is why:
   * on a real ground plane, equal steps up the street cover less and less
   * of the picture. Squashing keeps them equal, and the eye reads the
   * result as a map that has been sat on.
   */
  it("compresses distance with depth", () => {
    const near = groundDepth(1, 1) - groundDepth(0.9, 1);
    const far = groundDepth(0.1, 1) - groundDepth(0, 1);
    expect(near).toBeGreaterThan(far * 1.2);
  });

  it("converges parallel kerbs towards a vanishing point", () => {
    const nearGap = groundProject({ u: 0.8, v: 1 }, 1).u - groundProject({ u: 0.2, v: 1 }, 1).u;
    const farGap = groundProject({ u: 0.8, v: 0 }, 1).u - groundProject({ u: 0.2, v: 0 }, 1).u;
    expect(farGap).toBeLessThan(nearGap);
    expect(farGap).toBeGreaterThan(0);
  });

  it("agrees with the sizes the world has always drawn", () => {
    // `depthScale` is 0.74 at the far edge and 1.18 at the near one, and
    // has been since the plaza. The tilt is the projection those numbers
    // always implied, so the ratio has to be the same one.
    expect(groundScale(0, 1) / groundScale(1, 1)).toBeCloseTo(0.74 / 1.18, 9);
  });
});

describe("how high the camera stands", () => {
  it("is in the street up close and overhead far away", () => {
    expect(pitchForMetres(100)).toBe(1);
    expect(pitchForMetres(SHOT_METRES.EXPLORE)).toBe(1);
    expect(pitchForMetres(900)).toBe(0);
  });

  it("rises without a step in it", () => {
    let last = 1;
    for (let m = 150; m <= 700; m += 10) {
      const p = pitchForMetres(m);
      expect(p).toBeLessThanOrEqual(last + 1e-9);
      expect(Math.abs(p - last)).toBeLessThan(0.06);
      last = p;
    }
  });

  it("walks the street and plans from above", () => {
    expect(pitchForShot("EXPLORE")).toBe(1);
    expect(pitchForShot("VENUE")).toBe(1);
    // The wide shot is mostly a plan, and the route shot is mostly a
    // street — both are on the ramp rather than at an end, which is the
    // point of a continuous camera. Only a view of the whole district
    // goes fully overhead.
    expect(pitchForShot("WIDE")).toBeLessThan(0.4);
    expect(pitchForShot("ROUTE")).toBeGreaterThan(pitchForShot("WIDE"));
    expect(pitchForShot("ROUTE")).toBeLessThan(1);
    expect(pitchForMetres(PLAN_METRES)).toBe(0);
  });
});

describe("where a real business stands", () => {
  /*
   * Amit's decision, which is also what makes the honesty rule easy:
   * *"בזמן אמת כל איש מקצוע יקבל את העסק שלו לפי המיקום שלו. ובעתיד
   * עסקים שירצו לפרסם יהיה להם עסק קבוע לפי הכתובת האמיתית שלהם."* A
   * shopfront is a professional who is online or a business at its own
   * address — never decoration standing on a stranger's building.
   */
  const spine = plan.ways.find((w) => w.id === "w_spine")!;

  it("stands a shopfront on the pavement beside the road", () => {
    const mid = spine.points[Math.floor(spine.points.length / 2)]!;
    // Somebody standing twelve metres off the centreline.
    const off = metresToWorld(fixture.bounds, 12);
    const f = frontageNear(plan, { u: mid.u + off, v: mid.v });
    expect(f).not.toBeNull();
    expect(f!.wayId).toBe("w_spine");
    expect(inCarriageway(plan, f!.at)).toBe(false);
    const clear = worldToMetres(
      fixture.bounds,
      nearestWay(plan, f!.at)!.on.distance - nearestWay(plan, f!.at)!.way.halfWidth
    );
    expect(clear).toBeCloseTo(2.5, 1);
  });

  it("faces it at the traffic", () => {
    const mid = spine.points[4]!;
    for (const side of [1, -1]) {
      const off = metresToWorld(fixture.bounds, 14 * side);
      const f = frontageNear(plan, { u: mid.u + off, v: mid.v })!;
      const road = nearestWay(plan, f.at)!;
      const toRoad = { u: road.on.at.u - f.at.u, v: road.on.at.v - f.at.v };
      const len = Math.hypot(toRoad.u, toRoad.v) || 1;
      expect((toRoad.u / len) * f.facing.u + (toRoad.v / len) * f.facing.v).toBeGreaterThan(0.95);
    }
  });

  it("keeps the two sides of the street apart", () => {
    const mid = spine.points[4]!;
    const off = metresToWorld(fixture.bounds, 14);
    const left = frontageNear(plan, { u: mid.u - off, v: mid.v })!;
    const right = frontageNear(plan, { u: mid.u + off, v: mid.v })!;
    expect(Math.sign(left.at.u - mid.u)).not.toBe(Math.sign(right.at.u - mid.u));
  });

  /*
   * A PROFESSIONAL STOPPED AT A LIGHT MUST NOT PIROUETTE.
   *
   * Inside the carriageway the offset from the centreline is near zero,
   * and normalising noise gives a shop that faces a new direction on
   * every position update. The side then comes from the road's own
   * normal, which is deterministic.
   */
  it("gives a stable answer for somebody standing in the road", () => {
    const mid = spine.points[spine.points.length - 2]!;
    const a = frontageNear(plan, mid)!;
    const b = frontageNear(plan, { u: mid.u + 1e-9, v: mid.v })!;
    expect(a.at.u).toBeCloseTo(b.at.u, 6);
    expect(a.at.v).toBeCloseTo(b.at.v, 6);
    expect(inCarriageway(plan, a.at)).toBe(false);
  });

  it("takes a real coordinate as readily as a world one", () => {
    const geoPoint = {
      lat: (fixture.bounds.north + fixture.bounds.south) / 2,
      lng: (fixture.bounds.east + fixture.bounds.west) / 2,
    };
    const f = frontageNear(plan, geoPoint);
    expect(f).not.toBeNull();
    expect(Number.isNaN(f!.at.u)).toBe(false);
  });

  /*
   * THE HONESTY LIMIT, WITH ITS CONTROL.
   *
   * `movedMetres` is how far we shifted somebody from where the server
   * said they were. Inside a street's width that is still "on this
   * street"; well beyond it the shopfront would be on a different street
   * from the person, and the right answer is an area rather than a
   * prettier marker.
   */
  it("reports how far it moved somebody, and refuses when that is too far", () => {
    const mid = spine.points[4]!;
    const close = frontageNear(plan, { u: mid.u + metresToWorld(fixture.bounds, 9), v: mid.v })!;
    expect(close.movedMetres).toBeLessThan(MAX_FRONTAGE_SHIFT_METRES);
    expect(frontageIsHonest(close)).toBe(true);

    // Somebody in the middle of a block, far from any kerb this road has.
    const far = frontageNear(plan, { u: mid.u + metresToWorld(fixture.bounds, 300), v: mid.v });
    expect(far).not.toBeNull();
    if (far!.movedMetres > MAX_FRONTAGE_SHIFT_METRES) {
      expect(frontageIsHonest(far)).toBe(false);
    }
    expect(frontageIsHonest(null)).toBe(false);
  });

  /*
   * AND WHAT IT DELIBERATELY DOES NOT RETURN.
   *
   * ChatGPT: *"אל תנסו לגרום לחזית המצוירת להתאים ל-footprint של הבניין
   * האמיתי שמתחתיה. ה-footprint נותן לכם anchor/orientation, לא טענה
   * ש'המספרה הזאת נמצאת בתוך הבניין הזה'."* A shopfront that resized
   * itself to the building behind it would be asserting that the
   * business occupies that building.
   */
  it("says nothing about the building behind it", () => {
    const f = frontageNear(plan, spine.points[2]!)!;
    expect(Object.keys(f).sort()).toEqual(["at", "facing", "movedMetres", "wayId"]);
  });
});
