import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { WORLD_ASSETS } from "../assets";
import { WORLD_SHOPS } from "./street";
import { FACADE_OUT } from "./shopFront";
import { createShopCarcass } from "./terrace";
import { furnitureLayout, treeLayout } from "./dressing";
import { parkedLayout } from "./vans";
import {
  LAMP_CLEARANCE,
  ROOM_DEPTH,
  clearOfWindow,
  ROOM_PROPS,
  SHOP_WINDOWS,
  createShopWindow,
  faceToward,
  isNeon,
  roomArtIds,
  roomBox,
  sheenOffset,
  windowRect,
} from "./shopWindow";

/** A texture whose picture is in, at a given size. */
function art(width: number, height: number): THREE.Texture {
  const texture = new THREE.Texture();
  texture.image = { width, height };
  return texture;
}

describe("the shops you can see into", () => {
  it("are every shop in the street, each with its room's art delivered", () => {
    expect(Object.keys(SHOP_WINDOWS).sort()).toEqual(WORLD_SHOPS.map((shop) => shop.shopId).sort());
    for (const id of Object.keys(SHOP_WINDOWS)) {
      for (const art of roomArtIds(id, ROOM_PROPS[id] ?? 0)) expect(art in WORLD_ASSETS, art).toBe(true);
      // No more furniture than was drawn.
      expect(`room_${id}_prop${(ROOM_PROPS[id] ?? 0) + 1}` in WORLD_ASSETS).toBe(false);
    }
  });

  it("have glass inside the drawing, under the awning it replaces, mullions within the glass", () => {
    for (const [id, spec] of Object.entries(SHOP_WINDOWS)) {
      const [x0, x1, y0, y1] = spec.glass;
      expect(0 < x0 && x0 < x1 && x1 < 1 && 0 < y0 && y0 < y1 && y1 < 1, id).toBe(true);
      if (spec.awning) expect(spec.awning[2], id).toBeLessThan(y0);
      for (const u of spec.mullions) expect(u > x0 && u < x1, id).toBe(true);
    }
  });
});

describe("the window's place on the facade", () => {
  const spec = SHOP_WINDOWS.home!;

  it("maps the drawing's fractions onto a w × h facade standing on the ground", () => {
    const { x0, x1, yTop, yFloor } = windowRect(spec, 8.8, 8.8);
    expect(x0).toBeCloseTo((203 / 1254 - 0.5) * 8.8);
    expect(x1).toBeCloseTo((1035 / 1254 - 0.5) * 8.8);
    expect(yTop).toBeCloseTo((1 - 757 / 1254) * 8.8);
    expect(yFloor).toBeCloseTo((1 - 1170 / 1254) * 8.8);
  });

  it("puts the room behind it: 0.7 m wider than the glass, 3.4 m deep, as tall as its drawing", () => {
    const box = roomBox({ x0: -3, x1: 3 }, 1.5);
    expect(box).toEqual({ width: 6.7, depth: ROOM_DEPTH, height: 6.7 / 1.5, cx: 0, back: -0.05 - ROOM_DEPTH });
  });

  it("turns the furniture to the viewer within a radian, and slides the sheen as they move", () => {
    expect(faceToward({ x: 0, z: 10 }, { x: 0, z: -2 })).toBe(0);
    expect(faceToward({ x: 50, z: -2 }, { x: 0, z: -2 })).toBe(1);
    expect(faceToward({ x: -50, z: -2 }, { x: 0, z: -2 })).toBe(-1);
    expect(sheenOffset({ x: 2, z: 5 })).toBeCloseTo(-0.07 + 0.05);
  });

  it("finds neon tubes, not lamplight or a pale wall", () => {
    expect(isNeon(255, 60, 200)).toBe(true);
    expect(isNeon(60, 240, 255)).toBe(true);
    expect(isNeon(255, 200, 40)).toBe(false);
    expect(isNeon(250, 160, 180)).toBe(false);
    expect(isNeon(150, 30, 120)).toBe(false);
  });
});

describe("a window, built", () => {
  const spec = SHOP_WINDOWS.hair!;
  const props = [art(300, 100), art(200, 100), art(80, 120), art(90, 120), art(70, 120)];
  const built = createShopWindow(
    spec,
    8.8,
    8.8,
    { back: art(1536, 1024), left: art(1536, 1024), right: art(1536, 1024), floor: art(1254, 1254), props },
    new THREE.Texture(),
  );
  const { x0, x1, yTop, yFloor } = windowRect(spec, 8.8, 8.8);

  it("opens the carcass exactly where the glass is", () => {
    expect(built.hole).toEqual({ x0, x1, y0: yFloor, y1: yTop });
    const carcass = createShopCarcass(new THREE.MeshStandardMaterial());
    carcass.fit(8.8);
    const panel = carcass.openWindow(built.hole);
    expect(Array.isArray(carcass.mesh.material)).toBe(true);
    expect((carcass.mesh.material as THREE.Material[])[4]!.visible).toBe(false);
    const holes = (panel.geometry as THREE.ShapeGeometry).parameters.shapes as THREE.Shape;
    expect(holes.holes).toHaveLength(1);
  });

  it("stands the room behind the glass, lit and out of the haze, with four pieces of furniture", () => {
    const room = built.group.getObjectByName("shop-room")!;
    const meshes = room.children.filter((child): child is THREE.Mesh => (child as THREE.Mesh).isMesh);
    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshBasicMaterial;
      expect(mesh.position.z).toBeLessThan(0);
      // The walls, floor, ceiling and furniture; the soft shadows under the
      // furniture take the haze like the demo's.
      if (material.depthWrite) expect(material.fog).toBe(false);
    }
    // Three chairs and the widest table.
    expect(room.children.filter((child) => child.name === "shop-room-prop")).toHaveLength(4);
  });

  it("has glass just behind the face, an awning out over the pavement and, at the barber's, a pole", () => {
    const glass = built.group.getObjectByName("shop-glass")!;
    expect(glass.position.z).toBeCloseTo(FACADE_OUT - 0.15);
    const awning = built.group.getObjectByName("shop-awning")!;
    expect(awning.position.z).toBeGreaterThan(FACADE_OUT);
    expect(built.group.getObjectByName("barber-pole")).toBeDefined();
  });

  it("keeps the furniture facing whoever looks in", () => {
    const prop = built.group.getObjectByName("shop-room-prop")!;
    built.update(new THREE.Vector3(prop.position.x + 100, 0, prop.position.z), 0);
    expect(prop.rotation.y).toBe(1);
  });
});

describe("nothing stands in front of a see-into window", () => {
  const near = (x: number, z: number, reach: number) =>
    WORLD_SHOPS.some((shop) => Math.sign(x) === Math.sign(shop.x) && Math.abs(z - shop.z) < reach);

  it("is clear only past the reach, on that side of the street", () => {
    const home = WORLD_SHOPS.find((shop) => shop.shopId === "home")!;
    expect(clearOfWindow(home.x, home.z + LAMP_CLEARANCE - 0.1, LAMP_CLEARANCE)).toBe(false);
    expect(clearOfWindow(home.x, home.z + LAMP_CLEARANCE + 0.1, LAMP_CLEARANCE)).toBe(!near(home.x, home.z + LAMP_CLEARANCE + 0.1, LAMP_CLEARANCE));
    expect(clearOfWindow(home.x, 150, LAMP_CLEARANCE)).toBe(true);
  });

  it("keeps trees 16 m, café sets 7 m and parked vehicles 8 m from one, as the demo's", () => {
    for (const tree of treeLayout(Math.random, clearOfWindow)) expect(near(tree.x, tree.z, 16)).toBe(false);
    for (const spot of furnitureLayout(Math.random, clearOfWindow).filter((s) => s.kind === "cafe")) {
      expect(near(spot.x, spot.z, 7)).toBe(false);
    }
    for (const parked of parkedLayout(clearOfWindow)) expect(near(parked.x, parked.z, 8)).toBe(false);
    // Without windows the kerb holds more: the rule is what took them away.
    expect(parkedLayout().length).toBeGreaterThan(parkedLayout(clearOfWindow).length);
  });
});
