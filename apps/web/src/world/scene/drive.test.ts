import * as THREE from "three";
import { CITY_FLEET_TRADES, type DepartmentCode } from "@pro-now/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DRIVE_FROM_SHOP,
  FLEET_BY_DEPARTMENT,
  LANE_CLEAR,
  blocksHero,
  createDriveMarks,
  driveSpan,
  driveSpeed,
  driveTarget,
  droneFactor,
  droneShot,
  easeDrive,
  heroTrade,
  onScreen,
} from "./drive";
import { FRONT_X, WORLD_SHOPS } from "./street";

const DEPARTMENTS = Object.keys(FLEET_BY_DEPARTMENT) as DepartmentCode[];

describe("which van drives to you", () => {
  it("is the trade's own livery, as the demo's fleetTradeFor", () => {
    expect(heroTrade("svc-leak", "HOME_URGENT")).toBe("plumber");
    expect(heroTrade("svc-electric", "HOME_URGENT")).toBe("electric");
    expect(heroTrade("svc-pet-groom", "PETS")).toBe("beauty");
    expect(heroTrade(null, "VEHICLE")).toBe("tow");
    expect(heroTrade(null, "LOGISTICS")).toBe("courier");
    expect(heroTrade(null, null)).toBe("pod");
  });

  it("is always one of the fleet's drawn trades, from a shop that stands in the street", () => {
    for (const department of DEPARTMENTS) {
      expect(CITY_FLEET_TRADES).toContain(FLEET_BY_DEPARTMENT[department]);
      expect(WORLD_SHOPS.map((s) => s.shopId)).toContain(DRIVE_FROM_SHOP[department]);
    }
  });
});

describe("the drive's span", () => {
  it("starts by his shop and ends 112 m on at your door, on the left pavement", () => {
    // home stands at z 52.8.
    expect(driveSpan("HOME_URGENT")).toEqual({ startZ: 52.8, endZ: 52.8 - 112, homeX: -(FRONT_X - 2.2) });
  });

  it("never starts further down than -30 nor ends past -142 (the demo's clamps)", () => {
    // build stands at z -123.2.
    expect(driveSpan("IMPROVEMENT")).toMatchObject({ startZ: -30, endZ: -142 });
    for (const department of DEPARTMENTS) {
      const span = driveSpan(department);
      expect(span.startZ).toBeGreaterThanOrEqual(-30);
      expect(span.endZ).toBeGreaterThanOrEqual(-142);
      expect(span.endZ).toBeLessThan(span.startZ);
    }
  });
});

describe("where the van is", () => {
  const span = driveSpan("HOME_URGENT");

  it("follows the server's progress, clamped, and holds at the shop with none", () => {
    expect(driveTarget(span, 0)).toBe(span.startZ);
    expect(driveTarget(span, 1)).toBe(span.endZ);
    expect(driveTarget(span, 0.5)).toBeCloseTo((span.startZ + span.endZ) / 2);
    expect(driveTarget(span, 1.4)).toBe(span.endZ);
    expect(driveTarget(span, -1)).toBe(span.startZ);
    expect(driveTarget(span, null)).toBe(span.startZ);
  });

  it("eases there by time, three quarters of the way in a second", () => {
    expect(easeDrive(0, -100, 1)).toBeCloseTo(-75);
    expect(easeDrive(0, -100, 0)).toBe(0);
    // Two half seconds are one second.
    expect(easeDrive(easeDrive(0, -100, 0.5), -100, 0.5)).toBeCloseTo(-75);
  });

  it("turns its wheels at what it covers, at least a crawl en route, and not at all when stopped", () => {
    expect(driveSpeed(0, -0.2, 0.05, true)).toBeCloseTo(4);
    expect(driveSpeed(0, 0, 0.05, true)).toBe(1.5);
    expect(driveSpeed(0, -0.2, 0.05, false)).toBe(0);
  });
});

describe("his lane, kept clear", () => {
  it("hides a car in his lane within 34 m either way, and nobody in the other lane", () => {
    const hero = { x: -1.65, z: 0 };
    expect(blocksHero(hero, { x: -1.65, z: 20 })).toBe(true);
    expect(blocksHero(hero, { x: -1.65, z: -LANE_CLEAR.along })).toBe(true);
    expect(blocksHero(hero, { x: -1.65, z: 35 })).toBe(false);
    // Easing out round a parked car (to -0.35) is still his lane.
    expect(blocksHero(hero, { x: -0.8, z: 5 })).toBe(true);
    expect(blocksHero(hero, { x: 1.65, z: 5 })).toBe(false);
  });
});

describe("the drone", () => {
  it("rides behind and above the van, lower and closer while it drives (the demo's values)", () => {
    const moving = droneShot(-1.65, 0, 0, true);
    expect(moving.position.toArray()).toEqual([-1.65 + 2.6, 8.6, 15]);
    expect(moving.look.toArray()).toEqual([-1.65, 0.6, -4]);
    const still = droneShot(-1.65, 0, 0, false);
    expect(still.position.toArray()).toEqual([-1.65 + 2.6, 10, 16]);
    expect(still.look.z).toBe(-2);
  });

  it("sways up to 2.4 m across, and eases in by time", () => {
    const t = Math.PI / 2 / 0.35;
    expect(droneShot(0, 0, t, true).position.x).toBeCloseTo(2.6 + 2.4);
    expect(droneFactor(1)).toBeCloseTo(0.95);
    expect(droneFactor(0)).toBe(0);
  });
});

describe("the way home", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lays the ribbon from the van's nose to your door, and stands the light at your door", () => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
    const span = driveSpan("HOME_URGENT");
    const marks = createDriveMarks();
    marks.update(-1.65, 10, span, 0);
    const len = 10 - span.endZ;
    expect(marks.ribbon.scale.y).toBeCloseTo(len);
    expect(marks.ribbon.position.z).toBeCloseTo(10 - len / 2);
    expect(marks.ribbon.position.x).toBe(-1.65);
    expect(marks.beacon.position.toArray()).toEqual([span.homeX, 0, span.endZ]);
    // At the door the ribbon is gone but for a stub.
    marks.update(-1.65, span.endZ, span, 0);
    expect(marks.ribbon.scale.y).toBe(0.5);
  });
});

describe("a label over the street", () => {
  it("is placed where its point falls on the canvas, and not at all behind the camera", () => {
    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const ahead = onScreen(new THREE.Vector3(0, 0, 0), camera);
    expect(ahead).toMatchObject({ inView: true });
    expect(ahead!.left).toBeCloseTo(50);
    expect(ahead!.top).toBeCloseTo(50);
    expect(onScreen(new THREE.Vector3(0, 0, 20), camera)).toBeNull();
  });
});
