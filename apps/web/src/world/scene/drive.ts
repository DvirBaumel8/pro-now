import * as THREE from "three";
import type { DepartmentCode } from "@pro-now/types";

import { FRONT_X, WORLD_SHOPS } from "./street";
import type { FleetTrade } from "./vans";

/**
 * THE PROFESSIONAL'S OWN VAN, DRIVING TO YOU (the demo's `heroVan` in
 * tools/design-preview/src/city/street.ts and "the professional's drive" in
 * City.tsx, fed by `RouteCity` in App.tsx).
 *
 * While the customer waits for an assigned professional, the demo's street
 * shows his trade's van leaving his trade's shop down the left lane for a
 * light standing where the customer lives, a glowing ribbon of chevrons from
 * the van's nose to that light, and a camera like a drone behind and above
 * the van. Nobody else drives through him: the lane is kept clear 34 m either
 * side of his van. The product drew a side-view card on the old painted
 * route's coordinates instead, while the camera followed a walker nobody was
 * walking.
 *
 * WHAT DRIVES IT. Only the server's job: the van stands at the shop when the
 * professional is assigned, moves on the share of the server's ETA that has
 * passed while he is en route (`routeProgress`, clamped, never past the door),
 * and is at the light once he has arrived. Without an ETA it holds still at
 * the shop. The street is an illustration of the trip, not GPS (docs/21 W11):
 * the van's place in it says how far through the ETA he is, not where he is.
 */

/** Which van drives to you: the trade's own livery (the demo's FLEET_BY_DEPT). */
export const FLEET_BY_DEPARTMENT: Readonly<Record<DepartmentCode, FleetTrade>> = {
  HOME_URGENT: "plumber",
  APPLIANCES: "appliance",
  HOME_CARE: "clean",
  BEAUTY: "beauty",
  WELLNESS: "well",
  PETS: "vet",
  VEHICLE: "tow",
  LOGISTICS: "courier",
  TECH: "tech",
  ODD_JOBS: "pod",
  IMPROVEMENT: "pod",
};

/** Services whose van is not their department's (the demo's FLEET_BY_SERVICE). */
export const FLEET_BY_SERVICE: Readonly<Record<string, FleetTrade>> = {
  "svc-electric": "electric",
  "svc-socket": "electric",
  "svc-alarm": "electric",
  "svc-solar": "plumber",
  "svc-sealing": "plumber",
  "svc-lock": "pod",
  "svc-cylinder": "pod",
  "svc-gas": "plumber",
  "svc-dog-walk": "pod",
  "svc-pet-sit": "pod",
  "svc-pet-groom": "beauty",
};

/** The demo's `fleetTradeFor`: by service, then by department, else the brand's pod. */
export function heroTrade(serviceId: string | null | undefined, department: DepartmentCode | null | undefined): FleetTrade {
  return (serviceId ? FLEET_BY_SERVICE[serviceId] : undefined) ?? (department ? FLEET_BY_DEPARTMENT[department] : undefined) ?? "pod";
}

/** The shop he drives out from: his department's (the demo's DEPT_SHOP). */
export const DRIVE_FROM_SHOP: Readonly<Record<DepartmentCode, string>> = {
  HOME_URGENT: "home",
  APPLIANCES: "appliance",
  HOME_CARE: "care",
  BEAUTY: "hair",
  WELLNESS: "well",
  PETS: "pets",
  VEHICLE: "auto",
  LOGISTICS: "move",
  TECH: "tech",
  ODD_JOBS: "help",
  IMPROVEMENT: "build",
};

export interface DriveSpan {
  /** Where the van starts, by the shop (never further down than -30). */
  startZ: number;
  /** Where you live: 112 m on, never past -142. */
  endZ: number;
  /** The light over your home stands on the left pavement. */
  homeX: number;
}

/** The demo's span: from beside his shop, 112 m down the street to your door. */
export function driveSpan(department: DepartmentCode | null | undefined): DriveSpan {
  const shopId = department ? DRIVE_FROM_SHOP[department] : "home";
  const shop = WORLD_SHOPS.find((s) => s.shopId === shopId);
  const startZ = Math.max(shop ? shop.z : 0, -30);
  return { startZ, endZ: Math.max(-142, startZ - 112), homeX: -(FRONT_X - 2.2) };
}

/** Where the van belongs `progress` of the way (clamped; none known is the start). */
export function driveTarget(span: DriveSpan, progress: number | null): number {
  const p = Math.min(1, Math.max(0, progress ?? 0));
  return span.startZ + (span.endZ - span.startZ) * p;
}

/** The van eases to where it belongs, by time (the demo's 1 − 0.25^dt). */
export function easeDrive(z: number, target: number, dt: number): number {
  return z + (target - z) * (1 - Math.pow(0.25, Math.max(0, dt)));
}

/** Its wheels' speed: what it covered, at least a crawl while en route; none when stopped. */
export function driveSpeed(fromZ: number, toZ: number, dt: number, moving: boolean): number {
  return moving ? Math.max(1.5, Math.abs(toZ - fromZ) / Math.max(dt, 1e-3)) : 0;
}

/** The lane kept clear: another car within a metre across and 34 m along is hidden. */
export const LANE_CLEAR = { across: 1, along: 34 } as const;

export function blocksHero(hero: { x: number; z: number }, car: { x: number; z: number }): boolean {
  return Math.abs(car.x - hero.x) < LANE_CLEAR.across && Math.abs(car.z - hero.z) <= LANE_CLEAR.along;
}

export interface DroneShot {
  position: THREE.Vector3;
  look: THREE.Vector3;
}

/**
 * The demo's drone: behind and above the van, swaying a little so it is never
 * still (2.4 m over a 18 s cycle), a little lower and closer while it drives.
 */
export function droneShot(vx: number, vz: number, t: number, moving: boolean): DroneShot {
  const sway = Math.sin(t * 0.35) * 2.4;
  return {
    position: new THREE.Vector3(vx + 2.6 + sway, moving ? 8.6 : 10, vz + (moving ? 15 : 16)),
    look: new THREE.Vector3(vx - sway * 0.3, 0.6, vz - (moving ? 4 : 2)),
  };
}

/** The camera's ease to the drone (the demo's 1 − 0.05^dt). */
export function droneFactor(dt: number): number {
  return 1 - Math.pow(0.05, Math.max(0, dt));
}

/** Heights of the two labels over the street: your home's and his face over his van. */
export const LABEL_HEIGHT = { home: 5.5, van: 3.6 } as const;

/** The ribbon's chevrons: a coral band with a bright chevron, repeating every 3 m. */
function ribbonTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    g.clearRect(0, 0, 64, 128);
    const grad = g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, "rgba(255,107,74,0)");
    grad.addColorStop(0.5, "rgba(255,140,100,.55)");
    grad.addColorStop(1, "rgba(255,107,74,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = "rgba(255,120,80,.35)";
    g.fillRect(26, 0, 12, 128);
    g.strokeStyle = "rgba(255,236,220,1)";
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(14, 78);
    g.lineTo(32, 50);
    g.lineTo(50, 78);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface DriveMarks {
  group: THREE.Group;
  ribbon: THREE.Mesh;
  beacon: THREE.Group;
  /** Lay the ribbon from the van's nose to your door, and breathe the ring. */
  update(vx: number, vz: number, span: DriveSpan, t: number): void;
}

/**
 * The way home, as the demo's: a ribbon on the road (2.2 m wide, chevrons
 * flowing towards you at 0.9 a second) and a shaft of light 26 m tall over a
 * pulsing ring where you live.
 */
export function createDriveMarks(): DriveMarks {
  const group = new THREE.Group();
  group.name = "drive-marks";
  const texture = ribbonTexture();
  const ribbon = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ribbon.rotation.x = -Math.PI / 2;
  group.add(ribbon);

  const beacon = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.1, 26, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff7a55,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shaft.position.y = 13;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.25, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffb08a,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  beacon.add(shaft, ring);
  group.add(beacon);

  return {
    group,
    ribbon,
    beacon,
    update(vx, vz, span, t) {
      const len = Math.max(0.5, vz - span.endZ);
      ribbon.scale.set(1, len, 1);
      ribbon.position.set(vx, 0.04, vz - len / 2);
      texture.offset.y = -t * 0.9;
      texture.repeat.set(1, len / 3);
      beacon.position.set(span.homeX, 0, span.endZ);
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      ring.scale.setScalar(1 + pulse * 0.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.75 - pulse * 0.5;
    },
  };
}

/** Where a point in the street falls on the canvas, as CSS percentages; null when behind the camera. */
export function onScreen(point: THREE.Vector3, camera: THREE.Camera): { left: number; top: number; inView: boolean } | null {
  const p = point.clone().project(camera);
  if (!(p.z < 1)) return null;
  return {
    left: ((p.x + 1) / 2) * 100,
    top: ((1 - p.y) / 2) * 100,
    inView: Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1,
  };
}
