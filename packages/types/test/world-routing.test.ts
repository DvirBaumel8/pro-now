import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  type WorldGeo,
  metresToWorld,
  planWorld,
  plotSpotsFromGeo,
  worldToMetres,
} from "../src/world-geo";
import {
  alongRoute,
  buildRoadGraph,
  drivableWays,
  lengthMetres,
  nearestNode,
  routeAlongRoads,
  routeViolations,
} from "../src/world-routing";

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, "fixtures/fixture_grid.json"), "utf8")
) as WorldGeo;
const plan = planWorld(fixture);
const graph = buildRoadGraph(plan);

describe("the street network as a graph", () => {
  it("has a node for every corner and then some", () => {
    expect(graph.nodes.length).toBeGreaterThan(20);
  });

  /*
   * THE FAILURE THIS FIXTURE WAS BUILT TO PRODUCE.
   *
   * The grid's streets cross each other without sharing a vertex —
   * exactly what a hand-made, simplified or reprojected extract looks
   * like. Built on shared coordinates alone, every street would be its
   * own island: no route would be found anywhere, and the symptom would
   * be nothing rendering rather than something looking wrong.
   */
  it("joins streets that cross without sharing a point", () => {
    const seen = new Set<number>();
    const queue = [0];
    seen.add(0);
    while (queue.length > 0) {
      const at = queue.pop()!;
      for (const e of graph.nodes[at]!.edges) {
        if (!seen.has(e.to)) {
          seen.add(e.to);
          queue.push(e.to);
        }
      }
    }
    // The whole drivable network is one connected place.
    expect(seen.size).toBe(graph.nodes.length);
  });

  it("leaves footways out, because a van is not a pedestrian", () => {
    const withPath = planWorld({
      ...fixture,
      ways: [
        ...fixture.ways,
        {
          id: "w_alley",
          kind: "PATH",
          widthMetres: 2.5,
          points: [
            { lat: fixture.bounds.south + 0.0001, lng: fixture.bounds.west + 0.0001 },
            { lat: fixture.bounds.south + 0.0002, lng: fixture.bounds.west + 0.0004 },
          ],
        },
      ],
    });
    expect(drivableWays(withPath).some((w) => w.id === "w_alley")).toBe(false);
    const g = buildRoadGraph(withPath);
    expect(g.nodes.length).toBe(graph.nodes.length);
  });
});

describe("getting there", () => {
  const spots = plotSpotsFromGeo(plan);

  it("finds a route between two shopfronts", () => {
    const route = routeAlongRoads(graph, spots[0]!, spots[5]!);
    expect(route).not.toBeNull();
    expect(route!.drive.length).toBeGreaterThan(1);
    expect(routeViolations(graph, route)).toEqual([]);
  });

  it("stays on the carriageway the whole way", () => {
    for (let i = 0; i < 6; i++) {
      const route = routeAlongRoads(graph, spots[i]!, spots[(i + 4) % spots.length]!);
      expect(routeViolations(graph, route)).toEqual([]);
    }
  });

  it("starts at the doorstep and ends at the doorstep", () => {
    const route = routeAlongRoads(graph, spots[1]!, spots[7]!)!;
    expect(route.path[0]).toEqual(spots[1]);
    expect(route.path.at(-1)).toEqual(spots[7]);
  });

  it("reports a drawn length, in metres, that is longer than the crow flies", () => {
    const a = spots[0]!;
    const b = spots[6]!;
    const route = routeAlongRoads(graph, a, b)!;
    const straight = worldToMetres(fixture.bounds, Math.hypot(b.u - a.u, b.v - a.v));
    expect(route.metres).toBeGreaterThan(straight);
    expect(route.metres).toBeLessThan(straight * 3);
  });

  it("says so when there is nowhere to drive", () => {
    const empty = buildRoadGraph(planWorld({ ...fixture, ways: [] }));
    expect(nearestNode(empty, { u: 0.5, v: 0.5 })).toBeNull();
    expect(routeAlongRoads(empty, { u: 0.2, v: 0.2 }, { u: 0.8, v: 0.8 })).toBeNull();
    expect(routeViolations(empty, null)).toEqual(["there is no route"]);
  });

  /*
   * THE CONTROL. Every assertion above passes on a route that happens to
   * be short and straight, so the checker is shown REFUSING one: a path
   * driven across the middle of a block, which is what the old
   * interpolated curves did for a living.
   */
  it("refuses a route drawn straight across the blocks", () => {
    const a = { u: 0.1, v: 0.15 };
    const b = { u: 0.9, v: 0.85 };
    const asTheCrowFlies = { path: [a, b], drive: [a, b], metres: lengthMetres(plan, [a, b]) };
    expect(routeViolations(graph, asTheCrowFlies)).toContain("the route leaves the carriageway");
  });
});

describe("where the vehicle is, moment to moment", () => {
  const spots = plotSpotsFromGeo(plan);
  const route = routeAlongRoads(graph, spots[0]!, spots[5]!)!;

  it("starts at the start and ends at the end", () => {
    // Compared by coordinate: the route's endpoints are `PlotSpot`s and
    // carry a plot id and a facing, which `alongRoute` correctly does not.
    expect(alongRoute(route, 0).at.u).toBeCloseTo(route.path[0]!.u, 9);
    expect(alongRoute(route, 0).at.v).toBeCloseTo(route.path[0]!.v, 9);
    const end = alongRoute(route, 1).at;
    expect(end.u).toBeCloseTo(route.path.at(-1)!.u, 9);
    expect(end.v).toBeCloseTo(route.path.at(-1)!.v, 9);
  });

  /*
   * ADVANCING BY LENGTH, NOT BY POINT.
   *
   * A route's points are junctions and they are nowhere near evenly
   * spaced. Stepping by index makes a van crawl down a long straight and
   * then leap across four turns in a row — which is exactly the *"נוסעות
   * לא טוב ומציאותי"* this file was written to fix, and it looks like an
   * animation bug rather than like a routing one.
   */
  it("moves at a steady speed rather than by junctions", () => {
    let previous = alongRoute(route, 0).at;
    const steps: number[] = [];
    for (let i = 1; i <= 40; i++) {
      const at = alongRoute(route, i / 40).at;
      steps.push(Math.hypot(at.u - previous.u, at.v - previous.v));
      previous = at;
    }
    const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
    for (const s of steps) expect(Math.abs(s - mean)).toBeLessThan(mean * 0.6);
  });

  it("points where it is going", () => {
    for (const t of [0.1, 0.4, 0.9]) {
      const a = alongRoute(route, t);
      const b = alongRoute(route, t + 0.01);
      const moved = { u: b.at.u - a.at.u, v: b.at.v - a.at.v };
      const len = Math.hypot(moved.u, moved.v) || 1;
      expect((moved.u / len) * a.heading.u + (moved.v / len) * a.heading.v).toBeGreaterThan(0.85);
    }
  });

  it("clamps rather than running off the end", () => {
    expect(alongRoute(route, -5).at.u).toBeCloseTo(alongRoute(route, 0).at.u, 9);
    expect(alongRoute(route, 5).at.u).toBeCloseTo(alongRoute(route, 1).at.u, 9);
  });

  it("does not crash on a route of one point", () => {
    const one = { path: [{ u: 0.4, v: 0.4 }], drive: [], metres: 0 };
    expect(alongRoute(one, 0.5).at).toEqual({ u: 0.4, v: 0.4 });
  });
});

describe("what a route is not", () => {
  /*
   * `/CLAUDE.md §3`. The distance here is along drawn geometry with no
   * traffic, no turn restrictions and no one-way streets. A caller that
   * turns it into minutes has invented an ETA, which is the one thing
   * this codebase is most careful about — so the type says `metres` and
   * there is nothing on it that could be mistaken for a time.
   */
  it("carries no time on it at all", () => {
    const spots = plotSpotsFromGeo(plan);
    const route = routeAlongRoads(graph, spots[0]!, spots[3]!)!;
    expect(Object.keys(route).sort()).toEqual(["drive", "metres", "path"]);
    expect(metresToWorld(fixture.bounds, route.metres)).toBeGreaterThan(0);
  });
});
