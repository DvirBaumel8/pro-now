import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  DESCENT_SECONDS,
  ENTRY_WIDE,
  FOLLOW_DISTANCE,
  FRAME,
  LOOK,
  easeBy,
  easeTowards,
  entryPose,
  followCharacter,
  followFactor,
  followPose,
  frameWant,
  lookWant,
  shopBeside,
  smoothstep01,
  streetPose,
} from "./camera";
import { KERB_X, PAVEMENT, SPAWN, WORLD_SHOPS } from "./street";

const lookDirection = (camera: THREE.Camera) => camera.getWorldDirection(new THREE.Vector3());

describe("world camera", () => {
  const player = new THREE.Vector3(SPAWN.x, 0.9, SPAWN.z);

  it("follows off the kerb, clear of the lamp and tree lines, aimed at the walker", () => {
    const lampX = KERB_X + PAVEMENT * 0.35;
    const treeEdgeX = KERB_X + PAVEMENT * 0.7 - 1.8;
    for (const x of [SPAWN.x, -SPAWN.x, -7.5, 7.5]) {
      const pose = followPose(new THREE.Vector3(x, 0.9, 40));
      expect(Math.abs(pose.position.x)).toBeLessThan(lampX - 1);
      expect(Math.abs(pose.position.x)).toBeLessThan(treeEdgeX - 1);
      expect(Math.sign(pose.position.x)).toBe(Math.sign(x));
      expect(pose.look.x).toBe(x);
    }
    // On the road it is straight behind.
    expect(followPose(new THREE.Vector3(1, 0.9, 40)).position.x).toBe(1);
  });

  it("jumps straight to the pose with reduced motion", () => {
    const camera = new THREE.PerspectiveCamera();
    const pose = streetPose(player, LOOK.capSeeInto, 1, true);
    easeTowards(camera, pose, 0.05, true);
    expect(camera.position.distanceTo(pose.position)).toBeCloseTo(0);
    const expected = pose.look.clone().sub(pose.position).normalize();
    expect(lookDirection(camera).distanceTo(expected)).toBeCloseTo(0);
  });

  it("turns towards a shop over several frames instead of snapping", () => {
    const camera = new THREE.PerspectiveCamera();
    followCharacter(camera, player, true);
    const before = lookDirection(camera);
    const target = streetPose(player, LOOK.cap, 1, false);
    const finalDirection = target.look.clone().sub(target.position).normalize();

    easeTowards(camera, target, 0.05, false);
    const firstStep = lookDirection(camera);
    const turned = before.angleTo(firstStep);
    const total = before.angleTo(finalDirection);
    expect(turned).toBeGreaterThan(0);
    expect(turned).toBeLessThan(total * 0.25);

    for (let i = 0; i < 200; i++) easeTowards(camera, target, 0.05, false);
    expect(lookDirection(camera).angleTo(finalDirection)).toBeLessThan(0.01);
  });
});

describe("the demo's camera around a shop", () => {
  const home = WORLD_SHOPS.find((shop) => shop.shopId === "home")!;
  // On the pavement, level with home's doorway (3 m out from its facade).
  const doorX = home.x - home.side * 3;
  const level = new THREE.Vector3(doorX, 0.9, home.z);
  /** Horizontal distance from the walker to the camera. */
  const back = (pose: { position: THREE.Vector3 }) => Math.hypot(pose.position.x - level.x, pose.position.z - level.z);

  it("finds the nearest doorway within 9 m, never one behind you", () => {
    const at = shopBeside(doorX, home.z + 2, WORLD_SHOPS);
    expect(at?.shop.shopId).toBe("home");
    expect(at?.distance).toBeCloseTo(2);
    // Over nine metres up the street is too far.
    expect(shopBeside(doorX, home.z + 9.2, WORLD_SHOPS)).toBeNull();
    // Walked past it (you face -z): more than 1.5 m behind you does not count.
    expect(shopBeside(doorX, home.z - 1.4, WORLD_SHOPS)?.shop.shopId).toBe("home");
    expect(shopBeside(doorX, home.z - 1.6, WORLD_SHOPS)?.shop.shopId).not.toBe("home");
  });

  it("turns the head to the facade: capped 0.85, 1.4 at a see-into shop once still, 0.42 of it while walking", () => {
    expect(LOOK).toMatchObject({ ramp: 4.5, cap: 0.85, capSeeInto: 1.4, walking: 0.42, ease: 0.02 });
    // Level with the door the facade is a right angle to the left.
    const beside = shopBeside(doorX, home.z, WORLD_SHOPS);
    expect(lookWant(doorX, home.z, beside, 0, false)).toBeCloseTo(0.85);
    expect(lookWant(doorX, home.z, beside, 0, true)).toBeCloseTo(1.4);
    expect(lookWant(doorX, home.z, beside, 1, true)).toBeCloseTo(0.85 * 0.42);
    // A shop on the right turns it the other way.
    const pets = WORLD_SHOPS.find((shop) => shop.shopId === "pets")!;
    const petsDoor = pets.x - pets.side * 3;
    expect(lookWant(petsDoor, pets.z, shopBeside(petsDoor, pets.z, WORLD_SHOPS), 0, false)).toBeCloseTo(-0.85);
    // It comes on over the last 4.5 m: 6.75 m short of the door, half of the angle.
    const z = home.z + 6.75;
    const angle = Math.atan2(home.x - doorX, home.z - z) + Math.PI; // wrapped
    expect(lookWant(doorX, z, shopBeside(doorX, z, WORLD_SHOPS), 0, false)).toBeCloseTo(angle * 0.5);
    expect(lookWant(doorX, home.z, null, 0, false)).toBe(0);
  });

  it("stands back only while still, coming on over the last 4 m", () => {
    expect(frameWant(shopBeside(doorX, home.z, WORLD_SHOPS), 0)).toBe(1);
    expect(frameWant(shopBeside(doorX, home.z, WORLD_SHOPS), 0.5)).toBe(0);
    expect(frameWant(shopBeside(doorX, home.z + 7, WORLD_SHOPS), 0)).toBeCloseTo(0.5);
    expect(frameWant(null, 0)).toBe(0);
  });

  it("eases by time, the head slowly (0.02^dt) and the stand-back at 0.08^dt", () => {
    expect(easeBy(0, 1, LOOK.ease, 1)).toBeCloseTo(0.98);
    expect(easeBy(0, 1, FRAME.ease, 1)).toBeCloseTo(0.92);
    const once = easeBy(0, 1, FRAME.ease, 0.1);
    const twice = easeBy(easeBy(0, 1, FRAME.ease, 0.05), 1, FRAME.ease, 0.05);
    expect(twice).toBeCloseTo(once);
  });

  it("stopping beside a shop walks the camera back out over the road: 5.2 m further, 1.1 m up", () => {
    const walking = streetPose(level, 0, 0, false);
    const framed = streetPose(level, LOOK.cap, 1, false);
    const dist = FOLLOW_DISTANCE + 5.2;
    expect(back(framed)).toBeCloseTo(dist);
    expect(framed.position.y).toBeCloseTo(1.2 + dist * 0.33 + 1.1);
    expect(framed.position.y).toBeGreaterThan(walking.position.y);
    // Out over the road, away from the shop's side, looking back at it.
    expect(framed.position.x).toBeGreaterThan(-KERB_X);
    expect(framed.look.x).toBeLessThan(level.x);
    expect(framed.look.y).toBeCloseTo(1.1 + dist * 0.16);
  });

  it("frames a shop you can see into close, at about head height, the aim raised to the window", () => {
    const wide = streetPose(level, LOOK.cap, 1, false);
    const close = streetPose(level, LOOK.capSeeInto, 1, true);
    const dist = FOLLOW_DISTANCE + 1.6;
    expect(back(close)).toBeCloseTo(dist);
    expect(close.position.y).toBeCloseTo(1.2 + dist * 0.33 - 0.6);
    expect(close.look.y).toBeCloseTo(1.1 + dist * 0.16 + 1.3);
    expect(close.position.y).toBeLessThan(wide.position.y);
    expect(back(close)).toBeLessThan(back(wide));
    // Nearly square to the window: the view runs mostly across the street.
    const dir = close.look.clone().sub(close.position);
    expect(Math.abs(dir.x)).toBeGreaterThan(Math.abs(dir.z) * 5);
  });

  it("lands where the demo's camera does, measured in the demo standing at its plumber's window", () => {
    // Read from the demo's own frame loop (City.tsx) at 60 fps, the walker
    // still at (-7.6, 50.4) by its home shop, whose doorway is at z 48.8:
    // look 0.9197, frame 1, closeUp, camera at (-0.775, 3.431, 55.600).
    const demoHome = { ...home, z: 48.8 };
    const beside = shopBeside(-7.6, 50.4, [demoHome]);
    expect(beside?.distance).toBeCloseTo(1.836, 3);
    const look = lookWant(-7.6, 50.4, beside, 0, true);
    expect(look).toBeCloseTo(0.9197, 3);
    expect(frameWant(beside, 0)).toBe(1);
    const pose = streetPose(new THREE.Vector3(-7.6, 0.9, 50.4), look, 1, true);
    expect(pose.position.x).toBeCloseTo(-0.775, 2);
    expect(pose.position.y).toBeCloseTo(3.431, 2);
    expect(pose.position.z).toBeCloseTo(55.6, 2);
  });

  it("with nothing to look at it is exactly the walking camera", () => {
    for (const closeUp of [false, true]) {
      const pose = streetPose(level, 0, 0, closeUp);
      expect(pose.position.distanceTo(followPose(level).position)).toBe(0);
      expect(pose.look.distanceTo(followPose(level).look)).toBe(0);
    }
  });
});


describe("the demo's camera", () => {
  const player = new THREE.Vector3(SPAWN.x, 0.9, SPAWN.z);

  it("walks 6.98 m behind, 3.5 m up, looking 10.8 m down the street", () => {
    const pose = followPose(player);
    expect(pose.position.x).toBeCloseTo(-(KERB_X + 0.6)); // off the kerb, see cameraLineX
    expect(pose.position.z - player.z).toBeCloseTo(6.98);
    expect(pose.position.y).toBeCloseTo(3.503);
    expect(player.z - pose.look.z).toBeCloseTo(10.819);
    expect(pose.look.y).toBeCloseTo(2.217);
    // Looking down the street, slightly downwards: about 4° below level.
    const dir = pose.look.clone().sub(pose.position);
    const pitch = Math.atan2(-dir.y, Math.hypot(dir.x, dir.z));
    expect(pitch * (180 / Math.PI)).toBeCloseTo(4.0, 0);
  });

  it("opens high over the street and lands exactly on the walking view", () => {
    const ground = followPose(player);
    const top = entryPose(player, 0, ground);
    expect(top.position.y).toBe(ENTRY_WIDE.hgt);
    expect(top.position.z - player.z).toBe(ENTRY_WIDE.dist);
    const landed = entryPose(player, 1, ground);
    expect(landed.position.distanceTo(ground.position)).toBe(0);
    expect(landed.look.distanceTo(ground.look)).toBe(0);
    const half = entryPose(player, 0.5, ground);
    expect(half.position.y).toBeCloseTo((ENTRY_WIDE.hgt + ground.position.y) / 2);
  });

  it("eases the drop in and out over 1.9 s", () => {
    expect(DESCENT_SECONDS).toBe(1.9);
    expect(smoothstep01(0)).toBe(0);
    expect(smoothstep01(1)).toBe(1);
    expect(smoothstep01(0.5)).toBe(0.5);
    expect(smoothstep01(0.1)).toBeLessThan(0.1); // slow start
    expect(smoothstep01(0.9)).toBeGreaterThan(0.9); // slow finish
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(2)).toBe(1);
  });

  it("follows at the same pace whatever the frame rate", () => {
    const oneStep = followFactor(0.1);
    const twoSteps = 1 - (1 - followFactor(0.05)) ** 2;
    expect(twoSteps).toBeCloseTo(oneStep);
    expect(followFactor(0)).toBe(0);
    expect(followFactor(1 / 60)).toBeCloseTo(0.098, 2);
  });
});
