import {
  type NormalizedPoint,
  type WorldPlan,
  type WorldWay,
  groundProject,
  metresToWorld,
  pointInRing,
  ringArea,
} from "@pro-now/types";

/** World units to metres, using the plan's own width. */
function worldToMetresApprox(plan: WorldPlan, world: number): number {
  return world * plan.widthMetres;
}

/**
 * WHAT TURNS A STREET PLAN INTO OUR CITY.
 *
 * ---------------------------------------------------------------------
 * THE NOTE THAT PRODUCED THIS FILE
 * ---------------------------------------------------------------------
 * Amit, on the first real-map build:
 *
 *     "הרבה יותר אהבתי את סגנון העיר שאנחנו בנינו, היה כל כך יפה בעין.
 *      חייב להטמיע את העיצוב שלנו במפה האמיתית, שלא תהיה אפלה ככה.
 *      זה כל מה שבניתי עליו."
 *
 * He is right and the diagnosis is worth being precise about, because
 * "make it prettier" is not actionable and this is.
 *
 * The painted plate is beautiful because it is a picture of a city AT
 * NIGHT WITH THE LIGHTS ON: warm sodium pavements, trees breaking up
 * every kerb, lamps with a halo, hundreds of lit windows. The first
 * GeoPlate drew the same city's STREET PLAN — correct centrelines,
 * correct widths, correct plots — with none of that, and a plan with no
 * light in it is a diagram. The geometry was never the problem; the
 * geometry is the only part a real map gives us.
 *
 * So everything the painting has, and that a street plan does not, is
 * COMPUTED FROM THE PLAN HERE: trees at intervals along the pavement,
 * lamps at intervals down the carriageway, lit windows on the façades
 * that face a street, crossings where a street meets an avenue. None of
 * it is placed by hand and none of it is random per frame — it is derived
 * from the geometry and seeded by the way's own id, so the same extract
 * always produces the same city and the file can be checked.
 *
 * ---------------------------------------------------------------------
 * AND WHAT IT IS NOT ALLOWED TO BE
 * ---------------------------------------------------------------------
 * This is street furniture, not supply and not people. A lit window is
 * not a business, a lamp is not a service, and nothing in here ever
 * carries a name — see `geo-truth.ts`, and see the disclosure line, which
 * says on real streets that everything standing on them is illustration.
 * The moment a figure appears it has to come from the server.
 */

/** A deterministic 0..1 from a string and an index. Same city every time. */
function hash01(seed: string, i: number): number {
  let h = 2166136261 ^ i;
  for (let k = 0; k < seed.length; k++) {
    h ^= seed.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export interface Tree {
  at: NormalizedPoint;
  /** Canopy radius, in world units. */
  r: number;
  /** Which of the three greens. */
  tone: 0 | 1 | 2;
  /**
   * The lobes of the canopy, as offsets and radii in units of `r`.
   *
   * A tree drawn as one circle is a green coin, and eleven of them down a
   * street read as markers somebody dropped on the map rather than as
   * planting. A canopy is several masses at slightly different heights
   * catching light differently — five blobs is enough for the eye at any
   * zoom this world reaches, and it is still five nodes.
   *
   * Generated once, from the tree's own seed, so a tree does not change
   * shape when the camera moves.
   */
  lobes: ReadonlyArray<{ du: number; dv: number; r: number; lit: number }>;
  /** Planting inside a green area rather than along a kerb. */
  inPark?: boolean;
}

export interface Lamp {
  at: NormalizedPoint;
  /** Glow radius, in world units. */
  r: number;
}

export interface RoofThing {
  at: NormalizedPoint;
  r: number;
  kind: "TANK" | "AC" | "PANEL";
}

export interface Block {
  id: string;
  /** The footprint, on the ground. */
  foot: readonly NormalizedPoint[];
  /** The same ring lifted by the building's height. */
  roof: readonly NormalizedPoint[];
  /** How far the roof sits above the footprint, in world units. */
  rise: number;
  /** Storeys, so the windows can be stacked rather than scattered. */
  storeys: number;
  /**
   * WHAT SAYS ISRAEL BEFORE ANY STREET DOES.
   *
   * `livingPalette` has had `solarTank`, `solarPanel` and `acUnit` in it
   * since the world was a plaza, with a comment saying they are "the two
   * details that say Israel before any street does" — and the real map
   * shipped without them, which is a large part of why it read as
   * anywhere. A white dolev on a roof is worth more than another degree
   * of colour grading.
   */
  roofThings: RoofThing[];
}

export interface Window_ {
  /** Where the wall meets the ground, under this window. */
  at: NormalizedPoint;
  /** How far up the wall it sits, in world units of screen height. */
  up: number;
  w: number;
  h: number;
  lit: boolean;
}

export interface Crossing {
  at: NormalizedPoint;
  /** Along the road, in world units. */
  along: NormalizedPoint;
  halfWidth: number;
}

export interface GeoDressing {
  blocks: Block[];
  trees: Tree[];
  lamps: Lamp[];
  windows: Window_[];
  crossings: Crossing[];
}

/** Walk a polyline, calling back every `step` world units. */
function alongWay(
  way: WorldWay,
  step: number,
  cb: (at: NormalizedPoint, dir: NormalizedPoint, distance: number) => void
): void {
  if (step <= 0) return;
  let carried = 0;
  let travelled = 0;
  for (let i = 1; i < way.points.length; i++) {
    const a = way.points[i - 1]!;
    const b = way.points[i]!;
    const du = b.u - a.u;
    const dv = b.v - a.v;
    const len = Math.hypot(du, dv);
    if (len === 0) continue;
    const dir = { u: du / len, v: dv / len };
    let d = step - carried;
    while (d <= len) {
      cb({ u: a.u + dir.u * d, v: a.v + dir.v * d }, dir, travelled + d);
      d += step;
    }
    carried = (carried + len) % step;
    travelled += len;
  }
}

export interface DressingOptions {
  /** Metres between street trees. */
  treeSpacing?: number;
  /** Metres between lamps. */
  lampSpacing?: number;
  /** Cap, so a dense extract cannot take the frame rate with it. */
  maxTrees?: number;
  maxLamps?: number;
  maxWindows?: number;
}

/**
 * The city's furniture, derived from its streets.
 *
 * The caps are not tuning, they are a promise. A real central-district
 * extract has hundreds of ways and thousands of plots; twelve trees per
 * street with no ceiling is forty thousand SVG nodes and a dead phone.
 * When the cap bites, the spacing widens rather than the far half of the
 * city going bare — a street that is planted for two blocks and then
 * stops looks like a bug, where a street planted sparsely all the way
 * looks like a street.
 */
export function dressGeo(plan: WorldPlan, opts: DressingOptions = {}): GeoDressing {
  const bounds = plan.geo.bounds;
  const m = (metres: number) => metresToWorld(bounds, metres);

  const drivable = plan.ways.filter((w) => w.kind !== "PATH");
  const avenues = plan.ways.filter((w) => w.kind === "ARTERIAL");

  const maxTrees = opts.maxTrees ?? 220;
  const maxLamps = opts.maxLamps ?? 160;
  const maxWindows = opts.maxWindows ?? 420;

  /* Spacing widens if the extract is big enough to blow the cap. */
  const totalLength = drivable.reduce((t, w) => {
    let len = 0;
    for (let i = 1; i < w.points.length; i++) {
      len += Math.hypot(w.points[i]!.u - w.points[i - 1]!.u, w.points[i]!.v - w.points[i - 1]!.v);
    }
    return t + len;
  }, 0);
  const totalMetres = totalLength * plan.widthMetres;
  const treeStep = Math.max(opts.treeSpacing ?? 18, (totalMetres * 2) / maxTrees);
  const lampStep = Math.max(opts.lampSpacing ?? 32, (totalMetres * 2) / maxLamps);

  const trees: Tree[] = [];
  const lamps: Lamp[] = [];

  for (const way of drivable) {
    /*
     * Trees stand on the pavement, both sides, offset off the kerb — and
     * not down service lanes, which are the back of a building rather
     * than a street anybody planted.
     */
    if (way.kind === "SERVICE") continue;
    const offset = way.halfWidth + m(1.7);
    alongWay(way, m(treeStep), (at, dir, d) => {
      if (trees.length >= maxTrees) return;
      const n = { u: -dir.v, v: dir.u };
      for (const side of [1, -1] as const) {
        if (trees.length >= maxTrees) return;
        const j = hash01(way.id, Math.round(d * 1e4) + side);
        /*
         * A THIRD OF THE PLACES ARE EMPTY.
         *
         * A perfectly planted street reads as a texture rather than as
         * trees, and the painted plate has exactly this: clumps, gaps,
         * and two together on one corner. The gap rate was 18% and the
         * result was a green dotted line down both kerbs.
         */
        if (j < 0.34) continue;
        const lobes = [];
        for (let k = 0; k < 5; k++) {
          const a = hash01(way.id, Math.round(d * 1e4) + side * 97 + k * 13);
          const b = hash01(way.id, Math.round(d * 1e4) + side * 131 + k * 29);
          const ang = (k / 5) * Math.PI * 2 + a * 0.8;
          const reach = k === 0 ? 0 : 0.42 + b * 0.24;
          lobes.push({
            du: Math.cos(ang) * reach,
            dv: Math.sin(ang) * reach * 0.8,
            r: k === 0 ? 0.78 : 0.44 + a * 0.22,
            // Lobes on the upper-left catch the lamplight.
            lit: Math.max(0, -Math.cos(ang - 0.9)),
          });
        }
        trees.push({
          lobes,
          at: { u: at.u + n.u * offset * side, v: at.v + n.v * offset * side },
          /*
           * 1.5 to 2.6 metres of canopy, not 2.1 to 3.7. The larger
           * number is closer to a real street tree and drew flat green
           * coins the size of a car — at this scale a canopy has to be
           * small enough to read as foliage beside a building rather
           * than as a marker on top of one.
           */
          r: m(1.5 + j * 1.1),
          tone: (Math.floor(j * 3) % 3) as 0 | 1 | 2,
        });
      }
    });

    /* Lamps alternate sides, the way they do on a real street. */
    let k = 0;
    alongWay(way, m(lampStep), (at, dir) => {
      if (lamps.length >= maxLamps) return;
      const n = { u: -dir.v, v: dir.u };
      const side = k++ % 2 === 0 ? 1 : -1;
      const off = way.halfWidth + m(0.8);
      lamps.push({
        at: { u: at.u + n.u * off * side, v: at.v + n.v * off * side },
        /*
         * The pool a lamp actually throws, not the one it looks like it
         * throws. 11m read as fog: a dozen overlapping grey discs with
         * the street underneath them. A sodium lamp lights about six
         * metres of pavement well and fades fast.
         */
        r: m(way.kind === "ARTERIAL" ? 7 : 5.5),
      });
    });
  }

  /*
   * ---------------------------------------------------------------------
   * AND PLANTING ON THE GROUND THAT USED TO BE A ROAD
   * ---------------------------------------------------------------------
   * `pruneDeadEnds` turns a road that stopped in the middle of the city
   * into a lawn — Amit's own answer to it. Drawn as a bare polygon that
   * lawn is a flat green slab, which reads as a placeholder rather than
   * as a park, and a placeholder on a real street is worse than the road
   * it replaced.
   *
   * So every green area gets planting, scattered inside its own ring from
   * its own id. The trees are the same trees the streets have, which is
   * what makes a park look like part of this city rather than like a
   * shape somebody filled in.
   */
  for (const area of plan.areas) {
    if (area.kind !== "GREEN") continue;
    if (trees.length >= maxTrees) break;
    const us = area.ring.map((p) => p.u);
    const vs = area.ring.map((p) => p.v);
    const u0 = Math.min(...us);
    const u1 = Math.max(...us);
    const v0 = Math.min(...vs);
    const v1 = Math.max(...vs);
    const spanMetres = worldToMetresApprox(plan, Math.max(u1 - u0, v1 - v0));
    const want = Math.max(2, Math.min(14, Math.round(spanMetres / 16)));
    let placed = 0;
    for (let k = 0; k < want * 6 && placed < want; k++) {
      if (trees.length >= maxTrees) break;
      const a = hash01(area.id, k * 3);
      const b = hash01(area.id, k * 3 + 1);
      const c = hash01(area.id, k * 3 + 2);
      const at = { u: u0 + (u1 - u0) * a, v: v0 + (v1 - v0) * b };
      if (!pointInRing(area.ring, at)) continue;
      const lobes = [];
      for (let j = 0; j < 5; j++) {
        const la = hash01(area.id, k * 31 + j * 7);
        const lb = hash01(area.id, k * 37 + j * 11);
        const ang = (j / 5) * Math.PI * 2 + la * 0.8;
        const reach = j === 0 ? 0 : 0.42 + lb * 0.24;
        lobes.push({
          du: Math.cos(ang) * reach,
          dv: Math.sin(ang) * reach * 0.8,
          r: j === 0 ? 0.78 : 0.44 + la * 0.22,
          lit: Math.max(0, -Math.cos(ang - 0.9)),
        });
      }
      trees.push({
        at,
        r: m(1.7 + c * 1.4),
        tone: (Math.floor(c * 3) % 3) as 0 | 1 | 2,
        lobes,
        inPark: true,
      });
      placed++;
    }
  }

  /*
   * LIT WINDOWS ARE THE SINGLE BIGGEST THING THE PAINTING HAS.
   *
   * A plot drawn as a flat rectangle is a footprint. The same rectangle
   * with four amber squares on the side that faces the street is a
   * building with people in it, and it costs four nodes. Most are lit,
   * because the painted plate's are — a city with a third of its lights
   * on reads as abandoned.
   */
  /*
   * ---------------------------------------------------------------------
   * BUILDINGS ARE MASSES, NOT FOOTPRINTS
   * ---------------------------------------------------------------------
   * The version before this drew each plot as a flat polygon barely
   * lighter than the ground, with lit windows around its edge. Amit's
   * verdict was the right one — *"אפלה ככה"* — and the reason is that a
   * footprint is a plan symbol. The painted city has BLOCKS: you see a
   * wall and a roof, they cast shadows, and the windows are in the wall.
   *
   * So every plot is extruded. The roof is the same ring lifted up the
   * screen by the building's height, the wall is what shows between the
   * two, and the windows are stacked in the wall by storey. A rectangle
   * treated this way reads as a box from a 3/4 camera, which is the
   * projection the rest of our world is already drawn in — so the
   * buildings stop being stickers on a map and start being the same city.
   *
   * The height is invented and must stay unnamed: OSM rarely carries one,
   * and a guessed height is a fact about massing, not about a place. It
   * is seeded from the plot id so the city is the same every time.
   */
  const blocks: Block[] = [];
  const windows: Window_[] = [];
  const plots = plan.areas.filter((a) => a.kind === "PLOT");
  for (const plot of plots) {
    if (plot.ring.length < 3) continue;
    const j = hash01(plot.id, 7);
    const storeys = 2 + Math.floor(j * 3);
    /*
     * Rise is in WORLD units on the v axis, and the 0.55 is the cosine of
     * the world's own camera angle rather than a number that looked
     * right: the same 3/4 that makes `depthScale` 0.74 at the horizon.
     */
    const rise = m(storeys * 3.2) * 0.55 * plan.aspect;
    const lift = (p: NormalizedPoint) => ({ u: p.u, v: p.v - rise });
    const roofRing = plot.ring.map(lift);
    const roofThings: RoofThing[] = [];
    {
      // Scatter two or three inside the roof's bounding box, keeping well
      // clear of its edges so nothing hangs off a parapet.
      const us = roofRing.map((q) => q.u);
      const vs = roofRing.map((q) => q.v);
      const u0 = Math.min(...us);
      const u1 = Math.max(...us);
      const v0 = Math.min(...vs);
      const v1 = Math.max(...vs);
      const n = 1 + Math.floor(hash01(plot.id, 31) * 3);
      for (let i = 0; i < n; i++) {
        const a = hash01(plot.id, 40 + i * 3);
        const b = hash01(plot.id, 41 + i * 3);
        const c = hash01(plot.id, 42 + i * 3);
        roofThings.push({
          at: { u: u0 + (u1 - u0) * (0.22 + a * 0.56), v: v0 + (v1 - v0) * (0.22 + b * 0.56) },
          r: m(0.9 + c * 0.7),
          kind: c > 0.62 ? "TANK" : c > 0.3 ? "PANEL" : "AC",
        });
      }
    }
    blocks.push({ id: plot.id, foot: plot.ring, roof: roofRing, rise, storeys, roofThings });

    if (windows.length >= maxWindows) continue;
    /*
     * The wall you can see is the one at the BOTTOM of the roof — the
     * façade facing the camera. Windows go in it, stacked by storey.
     *
     * The previous version put them around the plot's perimeter, which
     * with OSM's inconsistent winding meant half of them landed on the
     * pavement outside the building: an amber dotted outline around every
     * block rather than lit façades.
     */
    let southest: { a: NormalizedPoint; b: NormalizedPoint; len: number; mid: number } | null = null;
    for (let i = 0; i < plot.ring.length; i++) {
      const a = plot.ring[i]!;
      const b = plot.ring[(i + 1) % plot.ring.length]!;
      const len = Math.hypot(b.u - a.u, b.v - a.v);
      if (len === 0) continue;
      const mid = (a.v + b.v) / 2;
      // Nearest the viewer, and long enough to be a frontage.
      if (!southest || mid > southest.mid + 1e-9 || (Math.abs(mid - southest.mid) < 1e-9 && len > southest.len)) {
        southest = { a, b, len, mid };
      }
    }
    if (!southest) continue;
    const dir = {
      u: (southest.b.u - southest.a.u) / southest.len,
      v: (southest.b.v - southest.a.v) / southest.len,
    };
    const across = Math.max(2, Math.min(5, Math.round((southest.len * plan.widthMetres) / 7)));
    for (let row = 0; row < storeys; row++) {
      for (let i = 0; i < across; i++) {
        if (windows.length >= maxWindows) break;
        const t = (i + 0.5) / across;
        /*
         * MOST OF THEM ARE ON.
         *
         * A third lit reads as a city being evacuated. The painted plate
         * has nearly every window burning, and that warmth is most of
         * what Amit means by *"היה כל כך יפה בעין"* — the light is the
         * subject, the buildings are what is holding it.
         */
        const lit = hash01(plot.id, row * 17 + i) > 0.18;
        // Up the wall: storey 0 just above the ground, top storey just
        // under the roof line.
        const up = rise * ((row + 0.6) / (storeys + 0.4));
        windows.push({
          at: {
            u: southest.a.u + dir.u * southest.len * t,
            v: southest.a.v + dir.v * southest.len * t,
          },
          up,
          w: m(1.5),
          h: (rise / (storeys + 1)) * 0.5,
          lit,
        });
      }
    }
  }
  void ringArea;

  /*
   * CROSSINGS WHERE A STREET MEETS AN AVENUE.
   *
   * The painted plate has zebra crossings and they do a surprising amount
   * of work — they are the thing that says a person could cross here. A
   * junction is any point where a lesser way's end lands on an avenue.
   */
  const crossings: Crossing[] = [];
  for (const way of plan.ways) {
    if (way.kind === "ARTERIAL") continue;
    for (const end of [way.points[0]!, way.points.at(-1)!]) {
      for (const av of avenues) {
        let nearest = Infinity;
        let at: NormalizedPoint | null = null;
        let dir: NormalizedPoint | null = null;
        for (let i = 1; i < av.points.length; i++) {
          const a = av.points[i - 1]!;
          const b = av.points[i]!;
          const du = b.u - a.u;
          const dv = b.v - a.v;
          const len2 = du * du + dv * dv;
          if (len2 === 0) continue;
          const t = Math.max(0, Math.min(1, ((end.u - a.u) * du + (end.v - a.v) * dv) / len2));
          const q = { u: a.u + du * t, v: a.v + dv * t };
          const d = Math.hypot(end.u - q.u, end.v - q.v);
          if (d < nearest) {
            nearest = d;
            at = q;
            const l = Math.sqrt(len2);
            dir = { u: du / l, v: dv / l };
          }
        }
        if (at && dir && nearest < av.halfWidth + m(6)) {
          crossings.push({ at, along: dir, halfWidth: av.halfWidth });
        }
      }
    }
  }

  return { blocks, trees, lamps, windows, crossings };
}

/** Put the whole dressing on the tilted ground in one pass. */
export function projectDressing(d: GeoDressing, pitch: number): GeoDressing {
  if (pitch <= 0) return d;
  const p = (n: NormalizedPoint) => groundProject(n, pitch);
  return {
    blocks: d.blocks.map((b) => ({
      ...b,
      foot: b.foot.map(p),
      roofThings: b.roofThings.map((t) => {
        const g = p({ u: t.at.u, v: t.at.v + b.rise });
        return { ...t, at: { u: g.u, v: g.v - b.rise } };
      }),
      // The roof is lifted in SCREEN space, not on the ground, so it is
      // projected from the footprint and then raised. Projecting a
      // lifted point would tilt the building over with the street.
      roof: b.foot.map((q) => {
        const g = p(q);
        return { u: g.u, v: g.v - b.rise };
      }),
    })),
    trees: d.trees.map((t) => ({ ...t, at: p(t.at) })),
    lamps: d.lamps.map((l) => ({ ...l, at: p(l.at) })),
    /*
     * The window's ANCHOR is on the ground and its height is in screen
     * space, so only the anchor is projected. Projecting the raised point
     * would lay the window down flat with the street — the same mistake
     * that would tip every building over, and the reason `up` is carried
     * separately rather than baked into `at`.
     */
    windows: d.windows.map((w) => ({ ...w, at: p(w.at) })),
    crossings: d.crossings.map((c) => ({ ...c, at: p(c.at) })),
  };
}
