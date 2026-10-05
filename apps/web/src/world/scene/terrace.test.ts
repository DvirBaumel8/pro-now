import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { FRONT_X, STREET_LENGTH, WORLD_SHOPS } from "./street";
import { SHOP_BAY } from "./shopFront";
import {
  BUILDING_BAND,
  BUILDING_LAYERS,
  CARCASS_DEPTH,
  DRAWN_ASPECT,
  ROOF_HEIGHTS,
  buildingKind,
  centreBox,
  createBuilding,
  createLayerMaterial,
  createShopCarcass,
  heightsFromPixels,
  normalsFromHeights,
  roofPieces,
  terraceBays,
  type TerraceArt,
} from "./terrace";

function art(): TerraceArt {
  return {
    layers: Array.from({ length: 6 }, () => BUILDING_LAYERS.map(({ lit }) => createLayerMaterial(new THREE.Texture(), lit))),
    roof: Array.from({ length: 6 }, () => new THREE.Texture()),
    carcass: [new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial(), new THREE.MeshStandardMaterial()],
  };
}

const named = (group: THREE.Object3D, name: string) => group.getObjectByName(name) as THREE.Mesh;

describe("the terrace's bays", () => {
  const bays = terraceBays(WORLD_SHOPS);

  it("lie on the shops' own 8.8 m grid, inside the street", () => {
    for (const { z } of bays) {
      expect(Math.abs(z / SHOP_BAY - Math.round(z / SHOP_BAY))).toBeLessThan(1e-9);
      expect(Math.abs(z) + SHOP_BAY / 2).toBeLessThanOrEqual(STREET_LENGTH / 2);
    }
    for (const shop of WORLD_SHOPS) expect(Math.abs(shop.z / SHOP_BAY - Math.round(shop.z / SHOP_BAY))).toBeLessThan(1e-9);
  });

  it("leave every shop its bay, on its own side only", () => {
    for (const shop of WORLD_SHOPS) {
      expect(bays.some((bay) => bay.side === shop.side && Math.abs(bay.z - shop.z) < SHOP_BAY / 2)).toBe(false);
      expect(bays.some((bay) => bay.side === -shop.side && Math.abs(bay.z - shop.z) < 1e-9)).toBe(true);
    }
    // 33 bays a side, less the 13 shops.
    expect(bays).toHaveLength(33 * 2 - WORLD_SHOPS.length);
  });

  it("are seeded as the demo's: from the top, 1 on the left and 6 on the right, shop bays counted", () => {
    const left = bays.filter((bay) => bay.side === -1);
    const right = bays.filter((bay) => bay.side === 1);
    expect(left[0]).toEqual({ side: -1, z: 16 * SHOP_BAY, seed: 1 });
    expect(right[0]).toEqual({ side: 1, z: 16 * SHOP_BAY, seed: 6 });
    // The left's shop at 88 (10 bays down) takes seed 7, so the next bay is 8.
    expect(left.find((bay) => Math.abs(bay.z - 9 * SHOP_BAY) < 1e-9)?.seed).toBe(8);
  });

  it("cycle through the six drawn buildings", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(buildingKind)).toEqual([2, 3, 4, 5, 6, 1, 2]);
  });
});

describe("a roof", () => {
  it("carries two pieces, picked and placed by the demo's rule", () => {
    const [a, b] = roofPieces(4);
    expect(a).toEqual({ pick: 0, height: ROOF_HEIGHTS[0], x: -(SHOP_BAY * 0.22 + 1 * 0.4), z: -0.6 - 1 * 0.5 });
    expect(b).toEqual({ pick: 5, height: ROOF_HEIGHTS[5], x: SHOP_BAY * 0.22 + 2 * 0.4, z: -0.6 - 0 * 0.5 });
  });
});

describe("relief", () => {
  it("leaves a flat field facing straight out", () => {
    const n = normalsFromHeights(new Float32Array(9).fill(0.5), 3, 3);
    expect([n[16], n[17], n[18], n[19]]).toEqual([128, 128, 255, 255]);
  });

  it("tilts towards the lower side of a slope", () => {
    // Brighter to the right: the surface faces left (x < 0.5).
    const ramp = Float32Array.from({ length: 9 }, (_, i) => (i % 3) / 2);
    const n = normalsFromHeights(ramp, 3, 3);
    expect(n[16]!).toBeLessThan(128);
    expect(n[17]).toBe(128);
  });

  it("reads brightness as height and a transparent pixel as flat", () => {
    expect(Array.from(heightsFromPixels([255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 255], 3))).toEqual([1, 0, 0]);
  });
});

describe("a roof sheet's middle piece", () => {
  it("is the run of filled columns nearest the centre, and the rows it fills", () => {
    // Two objects: x 2–14 and x 30–45 (nearer the centre, 32); rows 5–20.
    const box = centreBox((x, y) => ((x >= 2 && x <= 14) || (x >= 30 && x <= 45)) && y >= 5 && y <= 20, 64, 32);
    expect(box).toEqual({ x0: 30, x1: 45, y0: 5, y1: 20 });
  });

  it("is nothing on an empty or tiny sheet", () => {
    expect(centreBox(() => false, 64, 32)).toBeNull();
    expect(centreBox((x, y) => x >= 30 && x <= 33 && y >= 5 && y <= 20, 64, 32)).toBeNull();
  });
});

describe("a building", () => {
  const building = createBuilding({ side: -1, z: 17.6 + SHOP_BAY, seed: 3 }, art());
  const { group } = building;

  it("stands on the frontage, facing across the street", () => {
    expect(group.position.toArray()).toEqual([-FRONT_X, 0, 17.6 + SHOP_BAY]);
    const out = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
    expect(out.x).toBeCloseTo(1);
    expect(building.kind).toBe(4);
  });

  it("hangs its three drawings 0.36, 0.58 and 0.76 m out, the front two casting", () => {
    const layers = BUILDING_LAYERS.map(({ layer }) => named(group, `building-${layer}`));
    expect(layers.map((m) => m.position.z)).toEqual([0.36, 0.58, 0.76]);
    expect(layers.map((m) => m.castShadow)).toEqual([false, true, true]);
    expect(layers[1]!.customDepthMaterial).toBeInstanceOf(THREE.MeshDepthMaterial);
    // Only the wall is subdivided, for its relief, and only within 30 m.
    const wall = layers[0] as unknown as THREE.LOD;
    const segments = (level: number) =>
      ((wall.levels[level]!.object as THREE.Mesh).geometry as THREE.PlaneGeometry).parameters.widthSegments;
    expect(wall.levels.map((level) => level.distance)).toEqual([0, 30]);
    expect([segments(0), segments(1)]).toEqual([128, 1]);
    expect((layers[2]!.geometry as THREE.PlaneGeometry).parameters.widthSegments).toBe(1);
  });

  it("is four storeys at the drawing's proportions, a bay wide at most", () => {
    const wall = named(group, "building-wall");
    // The delivered drawings: a bay wide, 9.88 m tall, inside the band.
    expect(wall.scale.x).toBeCloseTo(SHOP_BAY);
    expect(wall.scale.y).toBeCloseTo(SHOP_BAY / DRAWN_ASPECT);
    // Too tall: capped at the band and narrowed, never stretched.
    building.fit(0.5);
    expect(wall.scale.y).toBeCloseTo(BUILDING_BAND.max);
    expect(wall.scale.x).toBeCloseTo(BUILDING_BAND.max * 0.5);
    // Too squat: lifted to the band, still a bay wide.
    building.fit(1.2);
    expect(wall.scale.x).toBeCloseTo(SHOP_BAY);
    expect(wall.scale.y).toBeCloseTo(BUILDING_BAND.min);
    expect(wall.position.y).toBeCloseTo(BUILDING_BAND.min / 2);
  });

  it("has a carcass a bay wide and 11 m deep behind, and its roof on top", () => {
    building.fit(DRAWN_ASPECT);
    const h = SHOP_BAY / DRAWN_ASPECT;
    const carcass = named(group, "building-carcass");
    expect(carcass.scale.toArray().map((v) => +v.toFixed(3))).toEqual([SHOP_BAY, +(h - 0.6).toFixed(3), CARCASS_DEPTH]);
    expect(carcass.position.z).toBeCloseTo(-CARCASS_DEPTH / 2 - 0.05);
    // Cornice, then the two roof pieces' holders at the roofline.
    const holders = group.children.filter((child) => child.type === "Group");
    expect(holders).toHaveLength(2);
    for (const holder of holders) expect(holder.position.y).toBeCloseTo(h - 0.1);
  });
});

describe("the block behind a shop", () => {
  it("is a bay wide, 11 m deep, half a metre under the facade and at least 3.4 m", () => {
    const { mesh, fit } = createShopCarcass(new THREE.MeshStandardMaterial());
    fit(8.8);
    expect(mesh.scale.toArray().map((v) => +v.toFixed(3))).toEqual([SHOP_BAY, 8.3, CARCASS_DEPTH]);
    expect(mesh.position.y).toBeCloseTo(4.15);
    fit(2);
    expect(mesh.scale.y).toBeCloseTo(3.4);
  });
});
