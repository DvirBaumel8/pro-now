import { describe, expect, it } from "vitest";

import {
  CAFE_WARM,
  CANOPY_CLEARANCE,
  DOG_PARK,
  FLOWER_HUES,
  FURNITURE_X,
  PARK_RUNNERS,
  PLACE_ART,
  ROOF_SIGN,
  SHOP_GROUND,
  VENTS,
  ballAt,
  cameraInside,
  candleOpacity,
  furnitureLayout,
  inDogPark,
  mainBand,
  placeX,
  runnerAt,
  steamPuff,
  treeLayout,
} from "./dressing";
import { FRONT_X, KERB_X, inSpawnView } from "./street";

const half = () => 0.5;

describe("the trees", () => {
  it("stand at the kerb, every 46 m a side, staggered, as the demo's", () => {
    const trees = treeLayout(half);
    const right = trees.filter((t) => t.x > 0).map((t) => t.z);
    const left = trees.filter((t) => t.x < 0).map((t) => t.z);
    expect(FURNITURE_X).toBeCloseTo(KERB_X + 0.7);
    for (const t of trees) expect(Math.abs(t.x)).toBeCloseTo(FURNITURE_X - 0.3);
    expect(right.slice(0, 3)).toEqual([135, 89, 43]);
    expect(left.slice(0, 3)).toEqual([123.5, 77.5, 31.5]);
  });

  it("are five metres or so, palm and jacaranda in turn", () => {
    const trees = treeLayout(half);
    // (4.9 + 0.45) × (0.94 + 0.06)
    for (const t of trees) expect(t.height).toBeCloseTo(5.35);
    expect(trees.slice(0, 2).map((t) => t.tree)).toEqual(["prop_palm", "prop_jacaranda"]);
    for (const t of treeLayout(() => 0)) expect(t.height).toBeCloseTo(4.9 * 0.94);
    for (const t of treeLayout(() => 0.999)) expect(t.height).toBeLessThan(5.8 * 1.06 + 1e-9);
  });

  it("keep out of the first view", () => {
    for (const t of treeLayout()) expect(inSpawnView(t.x, t.z, 1.5)).toBe(false);
  });
});

describe("the furniture", () => {
  const layout = furnitureLayout(half);
  const of = (kind: string, side: 1 | -1) => layout.filter((f) => f.kind === kind && Math.sign(f.x) === side);

  it("puts a café on each side every 31 m, 15 m apart, its candle warm on the left", () => {
    expect(of("cafe", 1)[0]).toMatchObject({ x: FRONT_X - 2, z: 126, height: 1.35 });
    expect(of("cafe", -1)[0]).toMatchObject({ x: -FRONT_X + 2, z: 111, hue: CAFE_WARM });
    expect(of("cafe", 1)[0]!.hue).toBe(FLOWER_HUES[1]);
    expect(of("cafe", -1)[1]!.z - of("cafe", -1)[0]!.z).toBe(-31);
  });

  it("puts planters, benches and a bin where the demo does, planters alternating", () => {
    expect(of("planter", 1)[0]).toMatchObject({ x: FRONT_X - 1.3, z: 119, height: 1.15, planter: "prop_planter_box" });
    expect(of("planter", -1)[0]).toMatchObject({ x: -FRONT_X + 1.3, z: 104, planter: "prop_planter_round" });
    expect(of("bench", 1)[0]).toMatchObject({ x: FRONT_X - 1.6, z: 108, height: 1 });
    expect(of("bench", -1)[0]).toMatchObject({ x: -FRONT_X + 1.6, z: 123 });
    expect(of("bin", 1)[0]).toMatchObject({ x: FRONT_X - 1.2, z: 100, height: 1.05 });
    expect(of("bin", -1)).toHaveLength(0);
    // A bench faces across the pavement.
    expect(of("bench", 1)[0]!.yaw).toBeCloseTo(-Math.PI / 2);
    expect(of("bench", -1)[0]!.yaw).toBeCloseTo(Math.PI / 2);
  });

  it("keeps out of the dog park and the first view", () => {
    for (const f of furnitureLayout()) {
      expect(inDogPark(f.x, f.z), `${f.kind} at ${f.z}`).toBe(false);
      expect(inSpawnView(f.x, f.z, 1), `${f.kind} at ${f.z}`).toBe(false);
    }
    // The left bench at z 61 would stand in the walker's first view.
    expect(of("bench", -1).map((f) => f.z)).not.toContain(61);
  });

  it("keeps clear of a window you can see into", () => {
    const none = furnitureLayout(half, () => false);
    expect(none.filter((f) => f.kind === "cafe")).toHaveLength(0);
    expect(none.filter((f) => f.kind === "planter").length).toBeGreaterThan(0);
  });

  it("lights each café's candle, breathing", () => {
    expect(candleOpacity(0, 0)).toBeCloseTo(0.62);
    expect(candleOpacity(Math.PI / 2 / 6.1, 0)).toBeCloseTo(0.78);
  });
});

describe("a cut-out the camera is in", () => {
  it("is hidden within 2.4 m across the ground", () => {
    expect(CANOPY_CLEARANCE).toBe(2.4);
    expect(cameraInside({ x: 0, z: 0 }, { x: 2, z: 1 })).toBe(true);
    expect(cameraInside({ x: 0, z: 0 }, { x: 2, z: 2 })).toBe(false);
  });
});

describe("the steam", () => {
  it("rises from two grates in the road", () => {
    expect(VENTS).toEqual([
      { x: -1.6, z: 36 },
      { x: 2.1, z: -58 },
    ]);
    for (const v of VENTS) expect(Math.abs(v.x)).toBeLessThan(KERB_X);
  });

  it("rises 6.5 m, swells, and fades in and out", () => {
    expect(steamPuff(0, 0, 1)).toMatchObject({ y: 0, scale: 1.6, opacity: 0 });
    const mid = steamPuff(0, 0.5, 1);
    expect(mid.y).toBeCloseTo(3.25);
    expect(mid.scale).toBeCloseTo(4.35);
    expect(mid.opacity).toBeCloseTo(0.17);
    expect(Math.abs(steamPuff(3, 0.25, 1).x - 1)).toBeLessThanOrEqual(0.9);
  });
});

describe("the places", () => {
  it("stand where the demo's do: the layby in the lane, the rest against the wall", () => {
    const roadside = PLACE_ART.find((p) => p.id === "roadside")!;
    expect(placeX(roadside)).toBeCloseTo(KERB_X - 1.2);
    const garden = PLACE_ART.find((p) => p.id === "garden")!;
    expect(placeX(garden)).toBeCloseTo(-FRONT_X + 0.5);
    expect(PLACE_ART.map((p) => p.height)).toEqual([3.6, 3.8, 3.4, 3.4]);
  });

  it("are cropped to the biggest band of their sheet, leaving the spare props", () => {
    // Rows 10–109 a place, rows 130–159 a row of props, on a 200-row sheet.
    const alpha = (_x: number, y: number) => ((y >= 10 && y < 110) || (y >= 130 && y < 160) ? 255 : 0);
    expect(mainBand(alpha, 50, 200)).toEqual({ y0: 10, y1: 109 });
    // A drawing that fills its sheet needs no crop.
    expect(mainBand(() => 255, 50, 200)).toBeNull();
    expect(mainBand(() => 0, 50, 200)).toBeNull();
  });
});

describe("the dog park", () => {
  it("stands against the right-hand buildings, short of the pet shop", () => {
    expect(DOG_PARK).toEqual({ x: FRONT_X - 2.2, z: 58.4, width: 4, length: 8 });
    expect(inSpawnView(DOG_PARK.x, DOG_PARK.z, DOG_PARK.width / 2)).toBe(false);
  });

  it("has its dogs running their loops inside the rail, one leaping", () => {
    for (const r of PARK_RUNNERS) {
      for (let t = 0; t < 20; t += 0.37) {
        const at = runnerAt(r, t);
        expect(Math.abs(at.x - DOG_PARK.x)).toBeLessThanOrEqual(DOG_PARK.width / 2);
        expect(Math.abs(at.z - DOG_PARK.z)).toBeLessThanOrEqual(DOG_PARK.length / 2);
        expect(at.hop).toBeLessThanOrEqual(r.leap ? 1.1 : 0.08);
      }
    }
    expect(PARK_RUNNERS.filter((r) => r.leap)).toHaveLength(1);
  });

  it("throws the ball in an arc every 2.2 s", () => {
    const from = { x: 0, z: 0 };
    const to = { x: 2, z: 4 };
    expect(ballAt(0, from, to)).toEqual({ x: 0, y: 1.3, z: 0 });
    expect(ballAt(1.1, from, to).y).toBeCloseTo(1.3 + 2.2 - 0.45);
    expect(ballAt(2.2, from, to).x).toBeCloseTo(0);
  });
});

describe("the shop's light on the ground, and its sign over the front", () => {
  it("is the demo's", () => {
    expect(SHOP_GROUND.pool).toMatchObject({ size: 13, out: 3.6, opacity: 0.07 });
    expect(SHOP_GROUND.wet).toMatchObject({ width: 3.4, length: 15, out: 7.5, opacity: 0.05 });
    expect(SHOP_GROUND.signWet).toMatchObject({ width: 4.6, length: 26, out: 7.4, opacity: 0.19 });
    expect(ROOF_SIGN).toMatchObject({ width: 6.6, height: 1.65, above: 1.1, out: 1.1 });
    expect(ROOF_SIGN.light).toMatchObject({ intensity: 85, distance: 16 });
  });
});
