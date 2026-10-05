import * as THREE from "three";

import { FRONT_X, STREET_LENGTH, frontageYaw, type WorldShopPosition } from "./street";
import { LEDGE, SHOP_BAY, facadeSize, ledge } from "./shopFront";
import { cutout, type Cutout } from "./vans";

/**
 * THE TERRACE, AS THE DEMO'S (tools/design-preview/src/city/street.ts,
 * `ordinary`, the terrace loop and `shopBay`'s carcass).
 *
 * The product stood one flat plane per bay between the shops, stretched to
 * 8.8 × 8.5 m whatever the drawing's shape, with random lit rectangles and
 * grey boxes on top. The demo's building is:
 *
 * - THREE DRAWINGS on one registration (wall, balconies, plants) hung 0.36,
 *   0.58 and 0.76 m out from the frontage, so they slide against each other as
 *   you walk past (parallax is what stops a drawing reading as cardboard);
 * - the wall DISPLACED by its drawn height map (mid grey is the building line,
 *   ±22 cm), and every layer given a normal map read from its own brightness,
 *   so the street's lights sculpt it;
 * - a CORNICE along the top, the one projection whose place is known;
 * - two things ON THE ROOF, cut from the roof sheets, picked by the bay's seed
 *   so the street looks the same on every visit;
 * - an 11 m deep plaster CARCASS behind, a bay wide, so a facade narrower than
 *   its bay shows a party wall either side, not the sky.
 *
 * Four storeys of a narrow street, not a tower: the facade is kept 9.6–11.6 m
 * tall at the drawing's own proportions. The shops get the same carcass behind
 * their drawing (`createShopCarcass`).
 */

export const BUILDING_KINDS = 6;
/** The demo's band for an ordinary building's height. */
export const BUILDING_BAND = { min: 9.6, max: 11.6 } as const;
export const CARCASS_DEPTH = 11;
/** How far each drawing hangs in front of the frontage line, and its painted light. */
export const BUILDING_LAYERS = [
  { layer: "wall", out: 0.36, lit: 0.16 },
  { layer: "mid", out: 0.58, lit: 0.14 },
  { layer: "front", out: 0.76, lit: 0.12 },
] as const;
export type BuildingLayer = (typeof BUILDING_LAYERS)[number]["layer"];
/** The wall's relief: 0.5 lands on the building line, white +22 cm, black −22 cm; drawn within `near` metres. */
export const WALL_RELIEF = { scale: 0.44, bias: -0.22, segments: 128, near: 30 } as const;
/** The demo's CITY_ROOF_IDS, in its order (the seed picks by index). */
export const ROOF_IDS = ["roof_tank", "roof_chimney", "roof_ac", "roof_aerial", "roof_laundry", "roof_rail"] as const;
/** How tall each roof piece stands, by the same index. */
export const ROOF_HEIGHTS = [2.4, 1.6, 1.3, 2.1, 1.5, 0.9] as const;
/** The demo's normal-map strength: a window frame reads as a frame, a brick stays a brick. */
const RELIEF_STRENGTH = 2.6;

export interface Bay {
  side: -1 | 1;
  z: number;
  /** Picks the building, its carcass and its roof; stable per bay. */
  seed: number;
}

/**
 * The ordinary bays: one every 8.8 m along both sides, on the shops' own grid,
 * down the street from its top, leaving out the bays a shop stands in. Seeds
 * run as the demo's: from 0 on the left and 5 on the right, one more a bay
 * (shop bays count too).
 */
export function terraceBays(
  shops: readonly Pick<WorldShopPosition, "side" | "z">[],
  length = STREET_LENGTH,
  bay = SHOP_BAY,
): Bay[] {
  const top = Math.floor((length / 2 - bay / 2) / bay);
  const bays: Bay[] = [];
  for (const side of [-1, 1] as const) {
    let seed = side < 0 ? 0 : 5;
    for (let k = top; k >= -top; k--) {
      seed += 1;
      const z = k * bay;
      if (shops.some((shop) => shop.side === side && Math.abs(shop.z - z) < bay / 2)) continue;
      bays.push({ side, z, seed });
    }
  }
  return bays;
}

/** Which of the six drawn buildings a bay is (1-based, as the files). */
export function buildingKind(seed: number): number {
  return (seed % BUILDING_KINDS) + 1;
}

export interface RoofPiece {
  /** Index into ROOF_IDS / ROOF_HEIGHTS. */
  pick: number;
  height: number;
  /** Along the frontage, and back from it (negative is behind the facade). */
  x: number;
  z: number;
}

/** The two things on a building's roof, as the demo places them. */
export function roofPieces(seed: number, bay = SHOP_BAY): RoofPiece[] {
  return [0, 1].map((i) => {
    const pick = (seed * 3 + i * 5) % ROOF_IDS.length;
    return {
      pick,
      height: ROOF_HEIGHTS[pick]!,
      x: (i === 0 ? -1 : 1) * (bay * 0.22 + ((seed + i) % 3) * 0.4),
      z: -0.6 - ((seed + i * 2) % 3) * 0.5,
    };
  });
}

/**
 * Normals from a height field with a Sobel filter (the demo's `computeRelief`):
 * the edges are clamped, and the result is packed as RGBA bytes, z up.
 */
export function normalsFromHeights(heights: Float32Array, width: number, height: number): Uint8ClampedArray {
  const at = (x: number, y: number) =>
    heights[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))]!;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) - (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const gy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) - (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      const nx = gx * RELIEF_STRENGTH;
      const ny = gy * RELIEF_STRENGTH;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * width + x) * 4;
      out[i] = Math.round((nx / len) * 127.5 + 127.5);
      out[i + 1] = Math.round((ny / len) * 127.5 + 127.5);
      out[i + 2] = Math.round((1 / len) * 127.5 + 127.5);
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Brightness as height; a transparent pixel is flat, so a cut-out's margin grows no cliff. */
export function heightsFromPixels(rgba: ArrayLike<number>, count: number): Float32Array {
  const heights = new Float32Array(count);
  for (let i = 0, p = 0; i < count; i++, p += 4) {
    heights[i] =
      (rgba[p + 3] ?? 0) < 128 ? 0 : (0.2126 * (rgba[p] ?? 0) + 0.7152 * (rgba[p + 1] ?? 0) + 0.0722 * (rgba[p + 2] ?? 0)) / 255;
  }
  return heights;
}

/**
 * The box round the drawing nearest the middle of a sheet (the demo's
 * `centrePiece`): the run of columns with something in them that is closest
 * to the centre, then the rows that run has something in. Null when the sheet
 * holds nothing worth cropping to.
 */
export function centreBox(
  filled: (x: number, y: number) => boolean,
  width: number,
  height: number,
): { x0: number; x1: number; y0: number; y1: number } | null {
  const columns = new Int32Array(width);
  for (let x = 0; x < width; x++) {
    let n = 0;
    for (let y = 0; y < height; y++) if (filled(x, y)) n++;
    columns[x] = n;
  }
  const mid = Math.floor(width / 2);
  let seed = -1;
  for (let k = 0; k < width && seed < 0; k++) {
    if (mid - k >= 0 && columns[mid - k]! > 2) seed = mid - k;
    else if (mid + k < width && columns[mid + k]! > 2) seed = mid + k;
  }
  if (seed < 0) return null;
  let x0 = seed;
  let x1 = seed;
  while (x0 > 0 && columns[x0 - 1]! > 2) x0--;
  while (x1 < width - 1 && columns[x1 + 1]! > 2) x1++;
  let y0 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = x0; x <= x1 && n <= 2; x++) if (filled(x, y)) n++;
    if (n > 2) {
      if (y0 < 0) y0 = y;
      y1 = y;
    }
  }
  if (y0 < 0 || x1 - x0 < 10 || y1 - y0 < 10) return null;
  return { x0, x1, y0, y1 };
}

type Picture = CanvasImageSource & { width: number; height: number };

function pixels(image: Picture, maxSide: number): { width: number; height: number; data: Uint8ClampedArray } | null {
  if (!image.width || !image.height || typeof document === "undefined") return null;
  const k = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * k));
  const height = Math.max(1, Math.round(image.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

/** A drawing's normal map, read from its own brightness at up to 512 across. */
export function reliefNormalMap(drawing: THREE.Texture): THREE.Texture | null {
  const read = pixels(drawing.image as Picture, 512);
  if (!read) return null;
  const { width, height, data } = read;
  const normals = normalsFromHeights(heightsFromPixels(data, width * height), width, height);
  // Through a canvas, as the demo's, so the rows land the way the drawing's do.
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const image = context.createImageData(width, height);
  image.data.set(normals);
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = drawing.wrapS;
  texture.wrapT = drawing.wrapT;
  texture.anisotropy = 4;
  return texture;
}

/** A drawn height map laid over mid grey, so whatever it leaves out is the building line. */
export function flatHeightMap(drawn: THREE.Texture): THREE.Texture | null {
  const image = drawn.image as Picture | undefined;
  if (!image?.width || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#808080";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Crop a roof sheet to its middle piece; returns the piece's aspect, or null. */
export function cropToCentrePiece(sheet: THREE.Texture): number | null {
  const read = pixels(sheet.image as Picture, 512);
  if (!read) return null;
  const { width, height, data } = read;
  const box = centreBox((x, y) => (data[(y * width + x) * 4 + 3] ?? 0) > 40, width, height);
  if (!box) return null;
  sheet.wrapS = sheet.wrapT = THREE.ClampToEdgeWrapping;
  sheet.repeat.set((box.x1 - box.x0 + 1) / width, (box.y1 - box.y0 + 1) / height);
  sheet.offset.set(box.x0 / width, (height - box.y1 - 1) / height);
  sheet.needsUpdate = true;
  return (box.x1 - box.x0 + 1) / (box.y1 - box.y0 + 1);
}

/**
 * Everything the terrace's buildings share: per kind, one material per layer
 * (and one displaced wall plane), the roof sheets and the carcass plaster. A
 * hundred bays draw from six sets.
 */
export interface TerraceArt {
  /** layers[kind - 1][layer index] */
  layers: THREE.MeshStandardMaterial[][];
  roof: readonly (THREE.Texture | null)[];
  carcass: readonly THREE.Material[];
}

export function createLayerMaterial(drawing: THREE.Texture, lit: number): THREE.MeshStandardMaterial {
  drawing.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: drawing,
    emissiveMap: drawing,
    emissive: 0xffffff,
    emissiveIntensity: lit,
    normalScale: new THREE.Vector2(1.2, 1.2),
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.88,
  });
}

/** Once a layer's drawing is in: its normal map, and for the wall its drawn relief. */
export function dressLayer(material: THREE.MeshStandardMaterial, height?: THREE.Texture | null): void {
  if (material.map && !material.normalMap) material.normalMap = reliefNormalMap(material.map);
  if (height) {
    material.displacementMap = height;
    material.displacementScale = WALL_RELIEF.scale;
    material.displacementBias = WALL_RELIEF.bias;
  }
  material.needsUpdate = true;
}

export interface Building {
  group: THREE.Group;
  kind: number;
  /** Size the drawings, cornice, roof and carcass to the drawing's aspect. */
  fit(aspect: number): void;
  /** Size a roof piece to its cropped sheet, once that is in. */
  fitRoof(pick: number, aspect: number): void;
}

const unitPlane = new THREE.PlaneGeometry(1, 1);
const unitWall = new THREE.PlaneGeometry(1, 1, WALL_RELIEF.segments, WALL_RELIEF.segments);
const unitBox = new THREE.BoxGeometry(1, 1, 1);

/** The delivered buildings are 2048 × 2300; laid out at that until the drawing says otherwise. */
export const DRAWN_ASPECT = 2048 / 2300;

export function createBuilding(bay: Bay, art: TerraceArt): Building {
  const group = new THREE.Group();
  group.name = "building";
  group.position.set(bay.side * FRONT_X, 0, bay.z);
  // Built facing +z (out of the wall); turned to face across the street.
  group.rotation.y = frontageYaw(bay.side);

  const kind = buildingKind(bay.seed);
  const layers = BUILDING_LAYERS.map(({ out }, i) => {
    const material = art.layers[kind - 1]![i]!;
    let mesh: THREE.Object3D;
    if (i === 0) {
      // The wall's relief only reads within a few bays; further off it is a
      // flat plane, so the street does not draw 33 thousand triangles a
      // building to show nobody a 22 cm recess.
      const relief = new THREE.Mesh(unitWall, material);
      const flat = new THREE.Mesh(unitPlane, material);
      relief.receiveShadow = flat.receiveShadow = true;
      const lod = new THREE.LOD();
      lod.addLevel(relief, 0);
      lod.addLevel(flat, WALL_RELIEF.near);
      mesh = lod;
    } else {
      mesh = new THREE.Mesh(unitPlane, material);
      mesh.receiveShadow = true;
    }
    mesh.name = `building-${BUILDING_LAYERS[i]!.layer}`;
    mesh.position.z = out;
    // The front two cast onto the wall behind them, in their drawing's shape.
    if (out > 0.4) {
      mesh.castShadow = true;
      mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        map: material.map,
        alphaTest: 0.42,
      });
    }
    group.add(mesh);
    return mesh;
  });

  const cornice = ledge(0, 1, 0.3, 0.24, LEDGE);
  group.add(cornice);

  const roof = roofPieces(bay.seed).map((piece) => {
    const sheet = art.roof[piece.pick];
    const prop: Cutout | null = sheet ? cutout(sheet, piece.height) : null;
    const holder = new THREE.Group();
    holder.position.set(piece.x, 0, piece.z);
    if (prop) holder.add(prop);
    group.add(holder);
    return { piece, prop, holder };
  });

  const carcass = new THREE.Mesh(unitBox, art.carcass[bay.seed % art.carcass.length]!);
  carcass.name = "building-carcass";
  group.add(carcass);

  const fit = (aspect: number) => {
    const { w, h } = facadeSize(aspect > 0 && Number.isFinite(aspect) ? aspect : DRAWN_ASPECT, SHOP_BAY, BUILDING_BAND);
    for (const layer of layers) {
      layer.scale.set(w, h, 1);
      layer.position.y = h / 2;
    }
    cornice.scale.x = w + 0.22;
    cornice.position.y = h - 0.22;
    for (const { holder } of roof) holder.position.y = h - 0.1;
    carcass.scale.set(SHOP_BAY, h - 0.6, CARCASS_DEPTH);
    carcass.position.set(0, (h - 0.6) / 2, -CARCASS_DEPTH / 2 - 0.05);
  };
  fit(DRAWN_ASPECT);

  return {
    group,
    kind,
    fit,
    fitRoof(pick, aspect) {
      for (const { piece, prop } of roof) if (piece.pick === pick) prop?.fit(aspect);
    },
  };
}

/**
 * The block behind a shop's drawing (the demo's `shopBay` carcass): a bay
 * wide, 11 m deep, half a metre under the facade, at least 3.4 m tall. The
 * drawings carry their own roofs and silhouettes, so it stays inside them.
 */
export function createShopCarcass(material: THREE.Material): {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.Material | THREE.Material[]>;
  fit(faceHeight: number): void;
  /**
   * Open the front where a shop's window is (shop frame: x along the
   * frontage, y up), so its room shows and nothing else: the box loses its
   * front face and a wall with the window's hole in it stands there instead.
   */
  openWindow(hole: { x0: number; x1: number; y0: number; y1: number }): THREE.Mesh;
} {
  const mesh = new THREE.Mesh<THREE.BoxGeometry, THREE.Material | THREE.Material[]>(unitBox, material);
  mesh.name = "shop-carcass";
  mesh.castShadow = mesh.receiveShadow = true;
  let height = 0;
  const fit = (faceHeight: number) => {
    height = Math.max(3.4, faceHeight - 0.5);
    mesh.scale.set(SHOP_BAY, height, CARCASS_DEPTH);
    mesh.position.set(0, height / 2, -CARCASS_DEPTH / 2 - 0.05);
  };
  fit(8.8);
  return {
    mesh,
    fit,
    openWindow(hole) {
      // BoxGeometry's groups run +x, −x, +y, −y, +z, −z: the front is 4.
      const hidden = new THREE.MeshBasicMaterial({ visible: false });
      mesh.material = [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? hidden : material));
      const front = new THREE.Shape();
      front.moveTo(-SHOP_BAY / 2, 0);
      front.lineTo(SHOP_BAY / 2, 0);
      front.lineTo(SHOP_BAY / 2, height);
      front.lineTo(-SHOP_BAY / 2, height);
      front.closePath();
      const opening = new THREE.Path();
      opening.moveTo(hole.x0, hole.y0);
      opening.lineTo(hole.x0, hole.y1);
      opening.lineTo(hole.x1, hole.y1);
      opening.lineTo(hole.x1, hole.y0);
      opening.closePath();
      front.holes.push(opening);
      const panel = new THREE.Mesh(new THREE.ShapeGeometry(front), material);
      panel.name = "shop-carcass-front";
      panel.position.z = -0.05;
      panel.receiveShadow = true;
      return panel;
    },
  };
}

/** The carcass plaster: the delivered stone and plaster, tiled 3 × 3 (the demo's `wallMats`). */
export function carcassMaterial(texture: THREE.Texture): THREE.MeshStandardMaterial {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
}
