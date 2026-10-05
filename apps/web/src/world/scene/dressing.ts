import { FRONT_X, KERB_X, STREET_LENGTH, inSpawnView } from "./street";

/**
 * THE STREET'S SMALL THINGS, AS THE DEMO'S (tools/design-preview/src/city/
 * street.ts: "TREES, AT THE KERB", "THE THINGS THAT MAKE A STREET SOMEWHERE
 * YOU WANT TO BE", "PLACES AND PARKED VEHICLES", "STEAM", and the shop's
 * pavement light and its sign on the wet road).
 *
 * The product had them as hand-placed billboards that turned to face the
 * camera, at made-up spots and sizes. These are the demo's layouts and values,
 * as pure functions; WorldScene stands the drawings up from them.
 *
 * One rule is the product's own: nothing that stands still may stand in the
 * first view (`inSpawnView`, street.ts). The product's walker starts at z 56,
 * the demo's at z 100, so the demo's 13 m clear zone round its spawn does not
 * carry over; the product's own check drops what would stand there.
 */

const HALF = STREET_LENGTH / 2;

/** Where the street furniture stands on the near side of the pavement: on the kerb (the demo's FURNITURE_X). */
export const FURNITURE_X = KERB_X + 0.7;

/** The two drawn trees, taken in turn. */
export const TREE_IDS = ["prop_palm", "prop_jacaranda"] as const;

export interface TreeSpot {
  x: number;
  z: number;
  /** Metres tall: five, give or take, times the tree's own scale. */
  height: number;
  yaw: number;
  tree: (typeof TREE_IDS)[number];
}

/**
 * Trees at the kerb, every 46 m on each side, staggered (the demo's): crossed
 * cut-outs 4.9–5.8 m tall at 0.94–1.06 of that, turned at random.
 */
export function treeLayout(random: () => number = Math.random): TreeSpot[] {
  const out: TreeSpot[] = [];
  let turn = 0;
  const tree = (x: number, z: number) => {
    const scale = 0.94 + random() * 0.12;
    const height = (4.9 + random() * 0.9) * scale;
    const yaw = random() * Math.PI;
    if (inSpawnView(x, z, 1.5)) return;
    out.push({ x, z, height, yaw, tree: TREE_IDS[turn++ % TREE_IDS.length]! });
  };
  for (let z = HALF - 8; z > -HALF; z -= 46) {
    tree(FURNITURE_X - 0.3, z - 7);
    tree(-FURNITURE_X + 0.3, z - 18.5);
  }
  return out;
}

/** The café's candle colours, and the flowers' (the demo's flowerHues). */
export const FLOWER_HUES = [0xff6b9d, 0xffd166, 0xff8b4a, 0xc08bff, 0xfff1f1] as const;
export const CAFE_WARM = 0xffc07a;

export type FurnitureKind = "cafe" | "planter" | "bench" | "bin";

export interface FurnitureSpot {
  kind: FurnitureKind;
  x: number;
  z: number;
  /** Metres tall (the drawing's height in the street). */
  height: number;
  yaw: number;
  /** A café's candle colour. */
  hue?: number;
  /** Which planter drawing: they alternate. */
  planter?: "prop_planter_box" | "prop_planter_round";
}

export const FURNITURE_HEIGHT: Readonly<Record<FurnitureKind, number>> = { cafe: 1.35, planter: 1.15, bench: 1.0, bin: 1.05 };

/** The dog park's footprint (the demo's), kept clear of tables and benches. */
export const DOG_PARK = { x: FRONT_X - 2.2, z: 58.4, width: 4.0, length: 8.0 } as const;

export function inDogPark(x: number, z: number): boolean {
  return x > 0 && Math.abs(z - DOG_PARK.z) < 5.4 && x > FRONT_X - 4.6;
}

/**
 * Tables out, flowers, benches and bins against the shopfronts, every 31 m
 * (the demo's): a café on each side, 15 m apart; a planter on each; a bench
 * on each; a bin on the right. Benches face across the pavement, give or take.
 * `clear` says whether a spot is clear of a window you can see into (the
 * demo's `clearOfWindow`); `reach` is how far each kind keeps from one.
 */
export function furnitureLayout(
  random: () => number = Math.random,
  clear: (x: number, z: number, reach: number) => boolean = () => true,
): FurnitureSpot[] {
  const out: FurnitureSpot[] = [];
  let planterTurn = 0;
  const add = (spot: FurnitureSpot) => {
    if (!inSpawnView(spot.x, spot.z, 1)) out.push(spot);
  };
  const across = (x: number) => (random() - 0.5) * 0.7 + (x > 0 ? -Math.PI / 2 : Math.PI / 2);
  for (let z = HALF - 24; z > -HALF; z -= 31) {
    if (!inDogPark(FRONT_X - 2.0, z) && clear(FRONT_X, z, 7)) {
      const hue = FLOWER_HUES[Math.floor(random() * 3)]!;
      add({ kind: "cafe", x: FRONT_X - 2.0, z, height: FURNITURE_HEIGHT.cafe, yaw: random() * Math.PI, hue });
    }
    if (clear(-FRONT_X, z - 15, 7)) {
      add({ kind: "cafe", x: -FRONT_X + 2.0, z: z - 15, height: FURNITURE_HEIGHT.cafe, yaw: random() * Math.PI, hue: CAFE_WARM });
    }
    const planter = () => (planterTurn++ % 2 === 0 ? "prop_planter_box" : "prop_planter_round") as FurnitureSpot["planter"];
    if (!inDogPark(FRONT_X - 1.3, z - 7)) {
      add({ kind: "planter", x: FRONT_X - 1.3, z: z - 7, height: FURNITURE_HEIGHT.planter, yaw: random() * Math.PI, planter: planter() });
    }
    add({ kind: "planter", x: -FRONT_X + 1.3, z: z - 22, height: FURNITURE_HEIGHT.planter, yaw: random() * Math.PI, planter: planter() });
    if (!inDogPark(FRONT_X - 1.6, z - 18)) {
      add({ kind: "bench", x: FRONT_X - 1.6, z: z - 18, height: FURNITURE_HEIGHT.bench, yaw: across(FRONT_X) });
    }
    add({ kind: "bench", x: -FRONT_X + 1.6, z: z - 3, height: FURNITURE_HEIGHT.bench, yaw: across(-FRONT_X) });
    if (!inDogPark(FRONT_X - 1.2, z - 26)) {
      add({ kind: "bin", x: FRONT_X - 1.2, z: z - 26, height: FURNITURE_HEIGHT.bin, yaw: across(FRONT_X) });
    }
  }
  return out;
}

/** A café's candle: the flame breathes (the demo's 0.62 ± 0.16 at 6.1 rad/s). */
export function candleOpacity(t: number, x: number): number {
  return 0.62 + Math.sin(t * 6.1 + x) * 0.16;
}

/** A cut-out within 2.4 m of the camera (across the ground) is hidden: the camera is under it. */
export const CANOPY_CLEARANCE = 2.4;

export function cameraInside(camera: { x: number; z: number }, at: { x: number; z: number }): boolean {
  return Math.hypot(camera.x - at.x, camera.z - at.z) <= CANOPY_CLEARANCE;
}

/** Two grates in the road, breathing steam (the demo's `vent`). */
export const VENTS = [
  { x: -1.6, z: 36 },
  { x: 2.1, z: -58 },
] as const;
export const VENT_PUFFS = 4;
export const STEAM_COLOUR = 0xbfc6e0;

/**
 * A puff `phase` (0..1) of the way round: rising 6.5 m in about 5 s,
 * drifting up to 0.9 m either side, swelling from 1.6 to 7.1 m and fading
 * in and out (at most 0.17).
 */
export function steamPuff(t: number, phase: number, x: number): { x: number; y: number; scale: number; opacity: number } {
  const ph = (t * 0.19 + phase) % 1;
  return {
    x: x + Math.sin(ph * 3 + phase * 9) * 0.9,
    y: ph * 6.5,
    scale: 1.6 + ph * 5.5,
    opacity: Math.sin(ph * Math.PI) * 0.17,
  };
}

/** The four places a professional meets you at (the demo's PLACED), and the drawn sheet each stands up. */
export interface PlaceArt {
  id: string;
  asset: "place_roadside" | "place_pickup" | "place_garden" | "place_bench_stop";
  side: -1 | 1;
  z: number;
  height: number;
  /** In the parking lane (a layby is road), rather than against the wall. */
  kerb: boolean;
}

export const PLACE_ART: readonly PlaceArt[] = [
  { id: "roadside", asset: "place_roadside", side: 1, z: 8.8, height: 3.6, kerb: true },
  { id: "pickup", asset: "place_pickup", side: 1, z: -79.2, height: 3.8, kerb: false },
  { id: "garden", asset: "place_garden", side: -1, z: -26.4, height: 3.4, kerb: false },
  { id: "bench", asset: "place_bench_stop", side: 1, z: -114.4, height: 3.4, kerb: false },
];

/** Where a place's drawing stands: in the lane for the layby, half a metre off the wall otherwise. */
export function placeX(place: Pick<PlaceArt, "side" | "kerb">): number {
  return place.kerb ? place.side * (KERB_X - 1.2) : FRONT_X * place.side - place.side * 0.5;
}

/**
 * The biggest band of rows with something in them (the demo's `mainBand`): a
 * place's sheet holds the place and a row of spare props under it. A row
 * belongs to a drawing if more than three of its pixels are opaque; a gap of
 * more than 0.6% of the height (at least 4 rows) ends a band. Null when the
 * drawing already fills the sheet or no band is worth cropping to.
 */
export function mainBand(alpha: (x: number, y: number) => number, width: number, height: number): { y0: number; y1: number } | null {
  let y0 = -1;
  let y1 = -1;
  let runStart = -1;
  let gap = 0;
  const gapRows = Math.max(4, Math.round(height * 0.006));
  for (let y = 0; y < height; y += 1) {
    let n = 0;
    for (let x = 0; x < width && n <= 3; x += 1) if (alpha(x, y) > 40) n += 1;
    if (n > 3) {
      if (runStart < 0) runStart = y;
      gap = 0;
      if (y - runStart > y1 - y0) {
        y0 = runStart;
        y1 = y;
      }
    } else if (runStart >= 0 && ++gap > gapRows) {
      runStart = -1;
    }
  }
  if (y0 < 0 || y1 - y0 < 20) return null;
  if (y0 <= 2 && y1 >= height - 3) return null;
  return { y0, y1 };
}

/**
 * THE DOG PARK, BUILT (the demo's): grass 4 × 8 m against the right-hand
 * buildings with a rail on three sides, open to the pavement; two trees; the
 * drawn park at the back; a bench; three dogs running their loops (one
 * leaping), one wagging, one lying and breathing; three people at the rail,
 * one throwing a ball to the running golden every 2.2 s.
 */
export const PARK_RUNNERS = [
  { id: "park_dog1", height: 1.45, rx: DOG_PARK.width / 2 - 0.5, rz: DOG_PARK.length / 2 - 0.8, w: 0.55, phase: 0, leap: false },
  { id: "park_dog2", height: 1.55, rx: DOG_PARK.width / 2 - 0.9, rz: DOG_PARK.length / 2 - 2.0, w: 0.42, phase: 2.1, leap: true },
  { id: "park_dog3", height: 1.45, rx: DOG_PARK.width / 2 - 0.7, rz: DOG_PARK.length / 2 - 1.3, w: 0.7, phase: 4.2, leap: false },
] as const;

export type ParkPose = "wag" | "breathe" | "stand";

export const PARK_STILL: ReadonlyArray<{ id: string; height: number; dx: number; dz: number; pose: ParkPose }> = [
  { id: "park_dog4", height: 1.5, dx: 0.9, dz: DOG_PARK.length / 2 - 1.2, pose: "wag" },
  { id: "park_dog5", height: 1.05, dx: 1.1, dz: -DOG_PARK.length / 2 + 1.4, pose: "breathe" },
  { id: "park_person1", height: 1.76, dx: -DOG_PARK.width / 2 + 0.35, dz: 1.6, pose: "stand" },
  { id: "park_person2", height: 1.7, dx: 1.5, dz: DOG_PARK.length / 2 - 0.6, pose: "stand" },
  { id: "park_person3", height: 1.3, dx: -DOG_PARK.width / 2 + 0.45, dz: -2.2, pose: "stand" },
];

/** A running dog's place on its loop, the way it is heading, and its hop (a leap now and then for one). */
export function runnerAt(
  runner: Pick<(typeof PARK_RUNNERS)[number], "rx" | "rz" | "w" | "phase" | "leap">,
  t: number,
): { x: number; z: number; vx: number; vz: number; hop: number } {
  const a = t * runner.w + runner.phase;
  const hop = runner.leap ? Math.max(0, Math.sin(t * 1.6 + runner.phase)) ** 6 * 1.1 : Math.abs(Math.sin(t * 9 + runner.phase)) * 0.08;
  return {
    x: DOG_PARK.x + Math.cos(a) * runner.rx,
    z: DOG_PARK.z + Math.sin(a) * runner.rz,
    vx: -Math.sin(a) * runner.rx,
    vz: Math.cos(a) * runner.rz,
    hop,
  };
}

/** The ball, `t` seconds in: thrown from `from` to `to` in an arc every 2.2 s. */
export function ballAt(t: number, from: { x: number; z: number }, to: { x: number; z: number }): { x: number; y: number; z: number } {
  const k = (t % 2.2) / 2.2;
  return { x: from.x + (to.x - from.x) * k, y: 1.3 + Math.sin(k * Math.PI) * 2.2 - k * 0.9, z: from.z + (to.z - from.z) * k };
}

/**
 * The light a shop throws on the ground (the demo's, per shop): a warm pool
 * on its pavement, its sign's colour smeared on the wet road in front of it,
 * and a softer streak running out from its door.
 */
export const SHOP_GROUND = {
  /** 13 m square, 3.6 m out from the wall. */
  pool: { size: 13, out: 3.6, colour: 0xffc07a, opacity: 0.07 },
  /** 3.4 × 15 m, 7.5 m out. */
  wet: { width: 3.4, length: 15, out: 7.5, opacity: 0.05 },
  /** 4.6 × 26 m along the road, 7.4 m from the building line. */
  signWet: { width: 4.6, length: 26, out: 7.4, opacity: 0.19 },
} as const;

/**
 * The flat sign over a shop's front (the demo's, for a shop not redrawn): its
 * name in neon, 6.6 × 1.65 m, 1.1 m above the facade and 1.1 m proud of it,
 * with a 9 × 5 m halo and its own light, 85 cd over 16 m, 2 m out.
 */
export const ROOF_SIGN = {
  width: 6.6,
  height: 1.65,
  above: 1.1,
  out: 1.1,
  halo: { width: 9, height: 5, opacity: 0.3 },
  light: { intensity: 85, distance: 16, below: 0.2, out: 2 },
} as const;
