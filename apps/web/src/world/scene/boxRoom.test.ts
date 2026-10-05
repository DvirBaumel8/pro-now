import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  BOX_ROOM,
  DOWNLIGHTS,
  ROOM_MOVE,
  buildBoxRoom,
  freshStand,
  furnitureSlots,
  neonBreath,
  pieceHeight,
  propFade,
  roomFov,
  roomHeight,
  roomView,
  stepInRoom,
} from "./boxRoom";

describe("the room's size, as the demo's", () => {
  it("is 4.6 m wall to wall and 5 m deep, with the eye at 1.6 m", () => {
    expect(BOX_ROOM).toEqual({ width: 4.6, depth: 5.0, eye: 1.6 });
  });

  it("is as tall as the back wall's drawing makes it", () => {
    // The demo's walls are drawn 1536 × 1024: a 3.07 m ceiling.
    expect(roomHeight(1536 / 1024)).toBeCloseTo(4.6 / 1.5);
    expect(roomHeight(1)).toBeCloseTo(4.6);
    // An image that has not arrived is square, not infinite.
    expect(roomHeight(0)).toBeCloseTo(4.6);
  });

  it("has six downlights in its ceiling", () => {
    expect(DOWNLIGHTS).toHaveLength(6);
  });
});

describe("where the furniture stands", () => {
  const K = 4.6 / 8;
  it("puts the two widest pieces in front either side, the rest in a row at the back", () => {
    const slots = furnitureSlots(5);
    expect(slots[0]![0]).toBeCloseTo(2.35 * K);
    expect(slots[0]![1]).toBeCloseTo(1.3 * K);
    expect(slots[0]![2]).toBe(0.95);
    expect(slots[1]![0]).toBeCloseTo(-2.4 * K);
    expect(slots[1]![1]).toBeCloseTo(1.1 * K);
    expect(slots[1]![2]).toBe(0.85);
    const row = slots.slice(2);
    expect(row.map(([x]) => x)).toEqual([-2.4 * K, 0, 2.4 * K].map((x) => expect.closeTo(x, 9)));
    for (const [, z, h] of row) {
      expect(z).toBeCloseTo(-2.5 + 0.95);
      expect(h).toBe(1.0);
    }
  });

  it("stands a lone piece at the back off to one side, not behind the walker", () => {
    const slots = furnitureSlots(3);
    expect(slots[2]![0]).toBeCloseTo(4.6 * 0.28);
  });

  it("has a slot for every piece and none for missing ones", () => {
    expect(furnitureSlots(0)).toEqual([]);
    expect(furnitureSlots(2)).toHaveLength(2);
    expect(furnitureSlots(5)).toHaveLength(5);
  });

  it("stands a tall narrow piece taller than a chair", () => {
    expect(pieceHeight(0.4, 1.0)).toBe(1.55);
    expect(pieceHeight(0.6, 0.95)).toBe(0.95);
  });

  it("lets you see through a piece you nearly stand in, and steps it aside closer still", () => {
    expect(propFade(2)).toEqual({ visible: true, opacity: 1 });
    expect(propFade(1.5)).toEqual({ visible: true, opacity: 1 });
    expect(propFade(1.15).opacity).toBeCloseTo(0.45 + 0.55 * 0.5);
    expect(propFade(0.8).visible).toBe(false);
  });
});

describe("the neon on the walls", () => {
  it("breathes between 0.25 and 0.65, and stutters to 35% now and then", () => {
    const seen: number[] = [];
    for (let t = 0; t < 20; t += 0.01) seen.push(neonBreath(t));
    expect(Math.max(...seen)).toBeLessThanOrEqual(0.65 + 1e-9);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0.25 * 0.35 - 1e-9);
    expect(seen.some((v) => v < 0.25)).toBe(true);
  });
});

describe("moving in the room", () => {
  it("steps you forward at 1.1 m/s when you push up, facing the back wall", () => {
    const { stand } = stepInRoom(freshStand(), { x: 0, z: -1 }, 0.5);
    expect(stand.x).toBeCloseTo(0);
    expect(stand.z).toBeCloseTo(-0.55);
    expect(stand.walked).toBeCloseTo(0.55 * ROOM_MOVE.stride);
  });

  it("turns you with a sideways push, no further than 125° either way", () => {
    const right = stepInRoom(freshStand(), { x: 1, z: 0 }, 0.5).stand;
    expect(right.yaw).toBeCloseTo(-ROOM_MOVE.turnRate * 0.5);
    expect(right.z).toBe(0);
    let stand = freshStand();
    for (let i = 0; i < 100; i++) stand = stepInRoom(stand, { x: -1, z: 0 }, 0.1).stand;
    expect(stand.yaw).toBeCloseTo((125 / 180) * Math.PI);
  });

  it("keeps you within 1.2 m of where you came in", () => {
    let stand = freshStand();
    for (let i = 0; i < 100; i++) stand = stepInRoom(stand, { x: 0, z: -1 }, 0.1).stand;
    expect(Math.hypot(stand.x, stand.z)).toBeCloseTo(1.2);
  });

  it("walks you out when you keep pulling back at the edge for 0.4 s", () => {
    let stand = freshStand();
    let left = false;
    let seconds = 0;
    while (!left && seconds < 5) {
      const step = stepInRoom(stand, { x: 0, z: 1 }, 0.05);
      stand = step.stand;
      left = step.leave;
      seconds += 0.05;
    }
    expect(left).toBe(true);
    // 1.2 m at 1.1 m/s to the rim (95% of it), then 0.4 s of pulling.
    expect(seconds).toBeGreaterThan(1.0);
    expect(seconds).toBeLessThan(1.6);
  });

  it("does not walk you out for pulling back in the middle of the room, or briefly at the edge", () => {
    let stand = freshStand();
    for (let i = 0; i < 6; i++) expect(stepInRoom(stand, { x: 0, z: 0.4 }, 0.1).leave).toBe(false);
    stand = { ...freshStand(), z: 1.2 };
    const once = stepInRoom(stand, { x: 0, z: 1 }, 0.2);
    expect(once.leave).toBe(false);
    // Letting go resets the count.
    expect(stepInRoom(once.stand, { x: 0, z: 0 }, 0.3).stand.pushOut).toBe(0);
  });
});

describe("you, seen in the room", () => {
  it("stands the walker 0.2 m in from the middle and the camera 2.4 m behind and 2.2 m up, inside the walls", () => {
    const view = roomView(freshStand());
    expect(view.avatar).toEqual({ x: 0, z: 0.2 });
    expect(view.camera.x).toBeCloseTo(0);
    expect(view.camera.y).toBeCloseTo(2.2);
    // 0.2 + 2.4 is past the front wall: held 0.15 m inside it.
    expect(view.camera.z).toBeCloseTo(2.5 - 0.15);
    expect(view.pitch).toBeCloseTo(-0.2);
  });

  it("keeps the walker clear of the walls and the camera inside them", () => {
    const view = roomView({ x: 5, z: -5, yaw: Math.PI / 2 });
    expect(view.avatar.x).toBeCloseTo(2.3 - 0.6);
    expect(view.avatar.z).toBeCloseTo(-2.5 + 1.3);
    expect(Math.abs(view.camera.x)).toBeLessThanOrEqual(2.3 - 0.25 + 1e-9);
  });

  it("widens the lens on a phone held upright", () => {
    expect(roomFov(402 / 681)).toBe(78);
    expect(roomFov(16 / 9)).toBe(62);
  });
});

describe("building the room", () => {
  const picture = (width: number, height: number) => {
    const texture = new THREE.Texture();
    texture.image = { width, height };
    return texture;
  };

  it("stands three walls, a floor, a ceiling and every piece of furniture, and its reflection", () => {
    const room = buildBoxRoom({
      back: picture(1536, 1024),
      left: picture(1536, 1024),
      right: null,
      floor: picture(1254, 1254),
      props: [picture(800, 400), picture(300, 700), picture(500, 500)],
    });
    const named = (name: string) => room.scene.children.filter((o) => o.name === name);
    expect(named("shop-room-wall")).toHaveLength(3);
    expect(named("shop-room-floor")).toHaveLength(1);
    expect(named("shop-room-ceiling")).toHaveLength(1);
    expect(named("shop-room-piece")).toHaveLength(3);
    expect(named("shop-room-cove")).toHaveLength(3);
    expect(named("shop-room-shaft")).toHaveLength(2);
    expect(named("shop-room-reflection")[0]!.children).toHaveLength(3);
    const ceiling = named("shop-room-ceiling")[0]!;
    expect(ceiling.position.y).toBeCloseTo(4.6 / 1.5);

    // The tall narrow piece stands 1.55 m.
    const pieces = named("shop-room-piece") as THREE.Mesh<THREE.PlaneGeometry>[];
    expect(pieces.map((p) => p.geometry.parameters.height).sort()).toEqual([0.85, 0.95, 1.55]);

    const walker = new THREE.Object3D();
    walker.position.y = 1.5;
    room.follow(walker);
    room.update(0.016, 1, freshStand());
    expect(walker.parent).toBe(room.scene);
    expect(walker.position.toArray()).toEqual([0, 1.5, 0.2]);
    room.setAspect(0.6);
    expect(room.camera.fov).toBe(78);
    room.follow(null);
    expect(walker.parent).toBeNull();
    room.dispose();
  });
});
