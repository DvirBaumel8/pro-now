import * as THREE from "three";

import { advanceAlongStreet } from "./ambient";
import { SPAWN, STREET_LENGTH } from "./street";

/**
 * THE PASSERS-BY, AS THE DEMO'S (tools/design-preview/src/city/street.ts,
 * "PEOPLE WHO ARE NOT YOU", and sheet.ts `measureCycle`).
 *
 * The product stood each walk SHEET (seven poses side by side) on one sprite
 * squashed to 1.1 × 1.7 m, so every passer-by was a strip of tiny figures,
 * half of them sliding towards the camera in a back view. The demo's:
 *
 * - the sheet is SLICED into its poses, found rather than assumed: a column
 *   with anything opaque in it belongs to a figure, a run of such columns is
 *   a figure, and a run much wider than the median is figures touching, split
 *   at the waist between them. Each pose is centred on its feet, so the
 *   figure does not wobble from frame to frame;
 * - the pose follows the GROUND COVERED (a 1.9 m stride), never a clock, so
 *   the feet do not slide;
 * - everyone walks AWAY from the camera, the only view the sheets hold, in a
 *   lane down the middle of the pavement, clear of the kerb's trees and the
 *   tables by the shops;
 * - lit by the street (a whisper of their own painted light) and casting a
 *   sun shadow in the pose they are in, with the player's contact shadow
 *   under their feet.
 *
 * They are ambience: not professionals, never named, no claim about supply.
 */

export const WALKER_COUNT = 14;
/** The demo's walk: the ground one cycle of poses covers. */
export const STRIDE = 1.9;
/** The lane: off the centre line, between the kerb furniture and the shop tables. */
export const WALKER_LANE = { from: 5.4, width: 1.7 } as const;
export const WALKER_HEIGHT = { from: 1.62, spread: 0.14 } as const;
export const WALKER_SPEED = { from: 0.9, spread: 0.7 } as const;
/** Nobody stands on top of you the moment you arrive. */
export const CLEAR_OF_SPAWN = 13;
/** The sheets, in the demo's order; the dog walker's six figures are evenly spaced. */
export const WALKER_SHEETS = [
  { id: "walk_man", forceEven: 0 },
  { id: "walk_woman", forceEven: 0 },
  { id: "walk_dogwalker", forceEven: 6 },
] as const;

export interface SheetLayout {
  /** Each pose's columns, inclusive. */
  rects: Array<[number, number]>;
  /** The rows the figures stand in (the band with the most in it), inclusive. */
  band: [number, number];
  /** The widest pose: every frame samples a window this wide. */
  unit: number;
  /** Where each pose's feet are, as a column: the frame is centred there. */
  centres: number[];
}

/**
 * Find the poses on a walk sheet (the demo's `measureCycle`, without the
 * texture work). `opaque(x, y)` says whether a pixel has anything in it.
 */
export function measureSheet(
  opaque: (x: number, y: number) => boolean,
  width: number,
  height: number,
  forceEven = 0,
): SheetLayout | null {
  // The figures' band: the run of rows with the most in it, so a caption or a
  // stray mark above or below does not stretch every frame.
  const rowN = new Int32Array(height);
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = 0; x < width; x++) if (opaque(x, y)) n++;
    rowN[y] = n;
  }
  const gapRows = Math.max(2, Math.round(height * 0.01));
  let by0 = 0;
  let by1 = height - 1;
  {
    let best = -1;
    let s0 = -1;
    let mass = 0;
    let gap = 0;
    const close = (end: number) => {
      if (s0 >= 0 && mass > best) {
        best = mass;
        by0 = s0;
        by1 = end;
      }
    };
    for (let y = 0; y < height; y++) {
      if (rowN[y]! > 2) {
        if (s0 < 0) {
          s0 = y;
          mass = 0;
        }
        mass += rowN[y]!;
        gap = 0;
      } else if (s0 >= 0 && ++gap >= gapRows) {
        close(y - gap);
        s0 = -1;
      }
    }
    close(height - 1);
  }
  const bandH = by1 - by0 + 1;

  const rects: Array<[number, number]> = [];
  if (forceEven > 0) {
    const w = width / forceEven;
    for (let i = 0; i < forceEven; i++) rects.push([Math.round(i * w), Math.round((i + 1) * w) - 1]);
  } else {
    const col = new Int32Array(width);
    for (let x = 0; x < width; x++) {
      let n = 0;
      for (let y = by0; y <= by1; y++) if (opaque(x, y)) n++;
      col[x] = n;
    }
    const runs: Array<[number, number]> = [];
    let start = -1;
    for (let x = 0; x < width; x++) {
      if (col[x]! > 2 && start < 0) start = x;
      else if (col[x]! <= 2 && start >= 0) {
        runs.push([start, x - 1]);
        start = -1;
      }
    }
    if (start >= 0) runs.push([start, width - 1]);

    // Two figures touching: split a run at a clear waist between two shoulders.
    const k = Math.max(2, Math.round(bandH * 0.015));
    const sm = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      let t = 0;
      let n = 0;
      for (let j = Math.max(0, x - k); j <= Math.min(width - 1, x + k); j++) {
        t += col[j]!;
        n++;
      }
      sm[x] = t / n;
    }
    const reach = Math.round(bandH * 0.22);
    const minPart = Math.round(bandH * 0.2);
    const split: Array<[number, number]> = [];
    for (const [a, z] of runs) {
      let from = a;
      for (let x = a + minPart; x <= z - minPart; x++) {
        if (x - from < minPart) continue;
        if (!(sm[x]! <= sm[x - 1]! && sm[x]! < sm[x + 1]!)) continue;
        let left = 0;
        let right = 0;
        for (let j = Math.max(a, x - reach); j < x; j++) left = Math.max(left, sm[j]!);
        for (let j = x + 1; j <= Math.min(z, x + reach); j++) right = Math.max(right, sm[j]!);
        if (sm[x]! < 0.5 * Math.min(left, right)) {
          split.push([from, x - 1]);
          from = x;
        }
      }
      split.push([from, z]);
    }

    const keep = split.filter(([a, z]) => z - a > Math.max(12, bandH * 0.08));
    if (keep.length === 0) return null;
    const widths = keep.map(([a, z]) => z - a + 1).sort((a, b) => a - b);
    const median = widths[Math.floor(widths.length / 2)]!;
    for (const [a, z] of keep) {
      const w = z - a + 1;
      const parts = Math.max(1, Math.round(w / median));
      for (let i = 0; i < parts; i++) rects.push([Math.round(a + (w * i) / parts), Math.round(a + (w * (i + 1)) / parts) - 1]);
    }
  }
  if (rects.length === 0) return null;

  const unit = Math.max(...rects.map(([a, z]) => z - a + 1));
  // Centred on the feet (the bottom eighth), not the outline: an arm swung
  // forward would otherwise shift the whole figure.
  const footTop = Math.floor(by1 - bandH * 0.12);
  const centres = rects.map(([a, z]) => {
    let lo = z;
    let hi = a;
    for (let y = footTop; y <= by1; y++) {
      for (let x = a; x <= z; x++) {
        if (!opaque(x, y)) continue;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    return hi >= lo ? (lo + hi + 1) / 2 : (a + z + 1) / 2;
  });
  return { rects, band: [by0, by1], unit, centres };
}

export interface Cycle {
  frames: THREE.Texture[];
  /** One frame's window, width over height. */
  aspect: number;
}

/** A loaded walk sheet, sliced into one texture per pose. */
export function cycleFromSheet(sheet: THREE.Texture, forceEven = 0): Cycle | null {
  const image = sheet.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!image?.width || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const { width, height } = canvas;
  const layout = measureSheet((x, y) => (data[(y * width + x) * 4 + 3] ?? 0) > 40, width, height, forceEven);
  if (!layout) return null;
  const [, by1] = layout.band;
  const bandH = layout.band[1] - layout.band[0] + 1;
  const frames = layout.centres.map((centre) => {
    const frame = sheet.clone();
    frame.needsUpdate = true;
    frame.colorSpace = THREE.SRGBColorSpace;
    frame.wrapS = frame.wrapT = THREE.ClampToEdgeWrapping;
    // Only the band; a texture's v runs bottom-up.
    frame.repeat.set(layout.unit / width, bandH / height);
    frame.offset.set((centre - layout.unit / 2) / width, (height - 1 - by1) / height);
    return frame;
  });
  return { frames, aspect: layout.unit / bandH };
}

/** Which pose a walker is in, from the ground covered (never a clock). */
export function frameIndex(walked: number, stride: number, frames: number): number {
  return Math.min(frames - 1, Math.floor(((((walked / stride) % 1) + 1) % 1) * frames));
}

export interface WalkerPlan {
  x: number;
  z: number;
  /** Index into WALKER_SHEETS. */
  sheet: number;
  height: number;
  speed: number;
}

/** Where the crowd starts, as the demo's: either pavement, in its lane, anywhere but on top of you. */
export function planWalkers(random: () => number = Math.random, count = WALKER_COUNT): WalkerPlan[] {
  return Array.from({ length: count }, () => {
    const side = random() > 0.5 ? 1 : -1;
    const x = side * (WALKER_LANE.from + random() * WALKER_LANE.width);
    let z = 0;
    let tries = 0;
    do {
      z = -STREET_LENGTH / 2 + random() * STREET_LENGTH;
    } while (Math.abs(z - SPAWN.z) < CLEAR_OF_SPAWN && ++tries < 50);
    if (Math.abs(z - SPAWN.z) < CLEAR_OF_SPAWN) z = SPAWN.z - CLEAR_OF_SPAWN - 1;
    return {
      x,
      z,
      sheet: Math.floor(random() * WALKER_SHEETS.length) % WALKER_SHEETS.length,
      height: WALKER_HEIGHT.from + random() * WALKER_HEIGHT.spread,
      speed: WALKER_SPEED.from + random() * WALKER_SPEED.spread,
    };
  });
}

export interface Walker {
  group: THREE.Group;
  /** Walk on for `dt` seconds: down the street, into the pose for the ground covered. */
  step(dt: number): void;
  /** The pose they are in (the figure's and its shadow's map). */
  frame(): THREE.Texture;
}

export function createWalker(plan: WalkerPlan, cycle: Cycle, contactShadow: THREE.Texture): Walker {
  const group = new THREE.Group();
  group.name = "walker";
  const first = cycle.frames[0]!;
  const material = new THREE.MeshStandardMaterial({
    map: first,
    emissiveMap: first,
    emissive: 0xffffff,
    emissiveIntensity: 0.14,
    transparent: true,
    alphaTest: 0.42,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  // A plane square to the street, facing back up it: the figure is seen from
  // behind, as drawn.
  const figure = new THREE.Mesh(new THREE.PlaneGeometry(plan.height * cycle.aspect, plan.height), material);
  figure.name = "walker-figure";
  figure.position.y = plan.height / 2;
  // The shadow pass does not read the map unless given one, and it must take
  // each pose too: a shadow stuck on one pose is worse than none.
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: first, alphaTest: 0.42 });
  figure.castShadow = true;
  figure.customDepthMaterial = depth;
  group.add(figure);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(plan.height * cycle.aspect * 0.8, plan.height * 0.34),
    new THREE.MeshBasicMaterial({ map: contactShadow, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  shadow.name = "walker-contact-shadow";
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  group.position.set(plan.x, 0, plan.z);
  let walked = 0;
  return {
    group,
    step(dt) {
      group.position.z = advanceAlongStreet(group.position.z, -plan.speed, dt, STREET_LENGTH / 2, 0);
      walked += plan.speed * dt;
      const frame = cycle.frames[frameIndex(walked, STRIDE, cycle.frames.length)]!;
      if (material.map === frame) return;
      material.map = frame;
      material.emissiveMap = frame;
      material.needsUpdate = true;
      depth.map = frame;
      depth.needsUpdate = true;
    },
    frame: () => material.map!,
  };
}
