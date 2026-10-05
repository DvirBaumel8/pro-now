import * as THREE from "three";

import { FACADE_OUT } from "./shopFront";

/**
 * A SHOP YOU CAN SEE INTO, AS THE DEMO'S (tools/design-preview/src/city/street.ts,
 * `SHOP_WINDOWS`, `punchWindow`, `shopWindow`, `awningTex`; boxRoom.ts
 * `neonMask`, `contactShadow`).
 *
 * Each shop's drawing has its glass CUT OUT and its painted awning painted
 * over, and behind the hole stands the shop's room: its drawn back wall, side
 * walls and floor, a ceiling, warm pendants just inside the glass, and its
 * furniture standing on the floor at its own depth, turning to keep its face
 * to you. The opening has the wall's thickness (four reveals), bronze frames,
 * door handles where the leaves meet, and glass that is almost nothing: a
 * sheen that slides as you move. Out over the pavement, a striped awning with
 * a scalloped valance and two cheeks; at the barber's, a turning pole.
 *
 * The window fractions are measured on each `shop_<id>` drawing (the same
 * images the product draws); the rooms are the demo's phone edition.
 */

export interface WindowSpec {
  /** x0, x1, y0 (top), y1 (bottom), as fractions of the drawing. */
  glass: readonly [number, number, number, number];
  /** The painted awning to paint over and replace: x0, x1, y0, y1. */
  awning?: readonly [number, number, number, number];
  mullions: readonly number[];
  door?: number;
  /** The barber's pole: x, y. */
  pole?: readonly [number, number];
  /** A neon glow laid over a sign painted on the drawing: x, y. */
  halo?: readonly [number, number];
  stripe: string;
}

const f = (v: number, of = 1254) => v / of;

/** Measured on each `shop_<id>` drawing (the demo's table; Lust is a sponsor and not in the product). */
export const SHOP_WINDOWS: Readonly<Record<string, WindowSpec>> = {
  hair: {
    glass: [f(243), f(1023), f(745), f(1172)],
    awning: [f(205), f(1062), f(634), f(742)],
    mullions: [f(332), f(627), f(920)],
    pole: [f(226), f(850)],
    // Over the salon's painted scissors (the demo's w·0.13, h·0.55).
    halo: [0.63, 0.45],
    stripe: "#f25c86",
  },
  home: {
    glass: [f(203), f(1035), f(757), f(1170)],
    awning: [f(150), f(1098), f(636), f(752)],
    mullions: [f(343), f(626), f(908)],
    stripe: "#2b4a8a",
  },
  nails: {
    glass: [f(257), f(997), f(725), f(1166)],
    awning: [f(94), f(1154), f(583), f(712)],
    mullions: [f(508), f(744)],
    door: f(627),
    stripe: "#9b4fb0",
  },
  // Measured on shop_tech at 3400 × 3509.
  tech: {
    glass: [f(700, 3400), f(2940, 3400), f(1950, 3509), f(3330, 3509)],
    awning: [f(560, 3400), f(3020, 3400), f(1720, 3509), f(1900, 3509)],
    mullions: [f(1670, 3400)],
    door: f(2710, 3400),
    stripe: "#2c3e66",
  },
  pets: {
    glass: [f(230), f(1028), f(770), f(1182)],
    awning: [f(188), f(1066), f(675), f(772)],
    mullions: [f(505), f(752)],
    door: f(627),
    stripe: "#2f6b4a",
  },
  auto: {
    glass: [f(190), f(1070), f(722), f(1150)],
    awning: [f(160), f(1092), f(620), f(725)],
    mullions: [f(458), f(792)],
    door: f(627),
    stripe: "#e8741e",
  },
  appliance: {
    glass: [f(142), f(1108), f(714), f(1140)],
    awning: [f(48), f(1200), f(626), f(714)],
    mullions: [f(496), f(764)],
    door: f(627),
    stripe: "#f2c230",
  },
  care: {
    glass: [f(180), f(1080), f(714), f(1126)],
    awning: [f(36), f(1220), f(624), f(714)],
    mullions: [f(474), f(780)],
    door: f(627),
    stripe: "#1a9aa6",
  },
  move: {
    glass: [f(206), f(1054), f(706), f(1136)],
    awning: [f(150), f(1104), f(604), f(706)],
    mullions: [f(442), f(814)],
    door: f(627),
    stripe: "#6a3fb0",
  },
  well: {
    glass: [f(186), f(1066), f(718), f(1140)],
    awning: [f(64), f(1188), f(618), f(712)],
    mullions: [f(466), f(786)],
    door: f(627),
    stripe: "#1a9a8a",
  },
  build: {
    glass: [f(198), f(1062), f(754), f(1120)],
    awning: [f(100), f(1158), f(662), f(752)],
    mullions: [f(494), f(762)],
    door: f(627),
    stripe: "#e8741e",
  },
  help: {
    glass: [f(200), f(1060), f(720), f(1150)],
    awning: [f(126), f(1128), f(628), f(716)],
    mullions: [f(470), f(780)],
    door: f(622),
    stripe: "#9ccf1a",
  },
  vet: {
    glass: [f(200), f(1056), f(702), f(1104)],
    awning: [f(96), f(1152), f(608), f(700)],
    mullions: [f(462), f(790)],
    door: f(624),
    stripe: "#3fa8d8",
  },
};

/** The room's art, per shop, in the demo's phone edition. */
export function roomArtIds(shopId: string, props: number): string[] {
  return [
    `room_${shopId}_back`,
    `room_${shopId}_left`,
    `room_${shopId}_right`,
    `room_${shopId}_floor`,
    ...Array.from({ length: props }, (_, i) => `room_${shopId}_prop${i + 1}`),
  ];
}

/** How many pieces of furniture each delivered room has. */
export const ROOM_PROPS: Readonly<Record<string, number>> = {
  hair: 5,
  home: 3,
  nails: 3,
  tech: 0,
  pets: 2,
  auto: 3,
  appliance: 3,
  care: 3,
  move: 3,
  well: 3,
  build: 2,
  help: 3,
  vet: 3,
};

/** The room's depth behind the frontage line. */
export const ROOM_DEPTH = 3.4;
/** Where the glass's back face is, and the wall's thickness behind it. */
const BACK = -0.05;

/** The glass in the shop group's frame (x along the frontage, y up): the facade is w × h, centred. */
export function windowRect(spec: WindowSpec, w: number, h: number) {
  const X = (u: number) => (u - 0.5) * w;
  const Y = (v: number) => (1 - v) * h;
  const [gx0, gx1, gy0, gy1] = spec.glass;
  return { x0: X(gx0), x1: X(gx1), yTop: Y(gy0), yFloor: Y(gy1), X, Y };
}

/** The room behind the glass: 0.7 m wider than it, 3.4 m deep, as tall as its back wall's drawing. */
export function roomBox(rect: { x0: number; x1: number }, backAspect: number) {
  const width = rect.x1 - rect.x0 + 0.7;
  return { width, depth: ROOM_DEPTH, height: width / backAspect, cx: (rect.x0 + rect.x1) / 2, back: BACK - ROOM_DEPTH };
}

/** Furniture keeps its face to you, within a radian either way. */
export function faceToward(local: { x: number; z: number }, at: { x: number; z: number }): number {
  return Math.max(-1, Math.min(1, Math.atan2(local.x - at.x, local.z - at.z)));
}

/** The sheen slides across the glass as the viewer moves. */
export function sheenOffset(local: { x: number; z: number }): number {
  return -local.x * 0.035 + local.z * 0.01;
}

type Picture = CanvasImageSource & { width: number; height: number };

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const context = c.getContext("2d", { willReadFrequently: true });
  return context ? [c, context] : null;
}

function prep<T extends THREE.Texture>(texture: T): T {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The drawing with its glass cut out and its painted awning painted over (the wall above drawn down). */
export function punchWindow(drawing: THREE.Texture, spec: WindowSpec): THREE.Texture | null {
  const image = drawing.image as Picture | undefined;
  if (!image?.width) return null;
  const made = canvas(image.width, image.height);
  if (!made) return null;
  const [c, g] = made;
  g.drawImage(image, 0, 0);
  const W = c.width;
  const H = c.height;
  if (spec.awning) {
    const [ax0, ax1, ay0, ay1] = spec.awning;
    g.drawImage(c, ax0 * W, ay0 * H - H * 0.012, (ax1 - ax0) * W, H * 0.01, ax0 * W, ay0 * H, (ax1 - ax0) * W, (ay1 - ay0) * H);
    const shade = g.createLinearGradient(0, ay0 * H, 0, ay1 * H);
    shade.addColorStop(0, "rgba(60,20,30,0)");
    shade.addColorStop(1, "rgba(60,20,30,0.45)");
    g.fillStyle = shade;
    g.fillRect(ax0 * W, ay0 * H, (ax1 - ax0) * W, (ay1 - ay0) * H);
  }
  const [gx0, gx1, gy0, gy1] = spec.glass;
  g.clearRect(gx0 * W, gy0 * H, (gx1 - gx0) * W, (gy1 - gy0) * H);
  return prep(new THREE.CanvasTexture(c));
}

/** Striped cloth; the valance is scalloped along its foot. */
function awningTexture(colour: string, scallop: boolean): THREE.Texture | null {
  const made = canvas(512, scallop ? 64 : 128);
  if (!made) return null;
  const [c, g] = made;
  const n = 18;
  const sw = c.width / n;
  if (scallop) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(c.width, 0);
    g.lineTo(c.width, 30);
    for (let i = n - 1; i >= 0; i--) g.arc(i * sw + sw / 2, 30, sw / 2, 0, Math.PI, false);
    g.closePath();
    g.clip();
  }
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? "#fff4ef" : colour;
    g.fillRect(i * sw, 0, sw, c.height);
  }
  const sag = g.createLinearGradient(0, 0, 0, c.height);
  sag.addColorStop(0, "rgba(40,10,20,0.25)");
  sag.addColorStop(1, "rgba(255,255,255,0.08)");
  g.fillStyle = sag;
  g.fillRect(0, 0, c.width, c.height);
  return prep(new THREE.CanvasTexture(c));
}

/** Is a pixel a neon tube: very bright, very saturated, and not a lamp's warm hue? */
export function isNeon(r: number, g: number, b: number): boolean {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx ? (mx - mn) / mx : 0;
  let hue = 0;
  if (mx !== mn) {
    if (mx === r) hue = ((g - b) / (mx - mn)) * 60;
    else if (mx === g) hue = (2 + (b - r) / (mx - mn)) * 60;
    else hue = (4 + (r - g) / (mx - mn)) * 60;
    if (hue < 0) hue += 360;
  }
  const warm = hue > 15 && hue < 75;
  return mx > 235 && sat > 0.66 && !warm;
}

/** The neon on a back wall, with a soft halo, or null if it has almost none. */
function neonMask(wall: THREE.Texture): THREE.Texture | null {
  const image = wall.image as Picture | undefined;
  if (!image?.width) return null;
  const w = Math.min(512, image.width);
  const h = Math.max(1, Math.round((image.height / image.width) * w));
  const made = canvas(w, h);
  if (!made) return null;
  const [c, g] = made;
  g.drawImage(image, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h);
  const d = data.data;
  let lit = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (isNeon(d[i]!, d[i + 1]!, d[i + 2]!)) {
      lit++;
      continue;
    }
    d[i] = d[i + 1] = d[i + 2] = 0;
  }
  if (lit < w * h * 0.002) return null;
  g.putImageData(data, 0, 0);
  const halo = canvas(w, h);
  if (!halo) return null;
  const [hc, hg] = halo;
  hg.filter = "blur(6px)";
  hg.drawImage(c, 0, 0);
  hg.filter = "none";
  hg.globalCompositeOperation = "lighter";
  hg.drawImage(c, 0, 0);
  return prep(new THREE.CanvasTexture(hc));
}

function contactShadow(): THREE.Texture | null {
  const made = canvas(128, 64);
  if (!made) return null;
  const [c, g] = made;
  const gradient = g.createRadialGradient(64, 32, 2, 64, 32, 60);
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 64);
  return new THREE.CanvasTexture(c);
}

function sheenTexture(): THREE.Texture | null {
  const made = canvas(256, 128);
  if (!made) return null;
  const [c, g] = made;
  const band = g.createLinearGradient(0, 128, 256, 0);
  band.addColorStop(0.0, "rgba(255,255,255,0)");
  band.addColorStop(0.42, "rgba(255,255,255,0)");
  band.addColorStop(0.5, "rgba(255,240,245,0.55)");
  band.addColorStop(0.56, "rgba(255,255,255,0)");
  band.addColorStop(0.7, "rgba(255,255,255,0.18)");
  band.addColorStop(0.74, "rgba(255,255,255,0)");
  g.fillStyle = band;
  g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}

function poleTexture(): THREE.Texture | null {
  const made = canvas(64, 256);
  if (!made) return null;
  const [c, g] = made;
  g.fillStyle = "#fbf6f2";
  g.fillRect(0, 0, 64, 256);
  const colours = ["#d8283c", "#fbf6f2", "#2848b8", "#fbf6f2"];
  for (let k = -8; k < 16; k++) {
    g.fillStyle = colours[((k % 4) + 4) % 4]!;
    g.beginPath();
    g.moveTo(0, k * 32);
    g.lineTo(64, k * 32 - 64);
    g.lineTo(64, k * 32 - 32);
    g.lineTo(0, k * 32 + 32);
    g.closePath();
    g.fill();
  }
  const texture = prep(new THREE.CanvasTexture(c));
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.6);
  return texture;
}

export interface RoomArt {
  back: THREE.Texture;
  left: THREE.Texture | null;
  right: THREE.Texture | null;
  floor: THREE.Texture | null;
  props: THREE.Texture[];
}

export interface ShopWindow {
  group: THREE.Group;
  /** The hole in the carcass front, in the shop group's frame. */
  hole: { x0: number; x1: number; y0: number; y1: number };
  /** Per frame: furniture turns to the viewer, the sheen slides, the neon and pole move. */
  update(viewerLocal: THREE.Vector3, elapsed: number): void;
}

const aspectOf = (t: THREE.Texture) => {
  const image = t.image as { width?: number; height?: number } | undefined;
  return image?.width && image.height ? image.width / image.height : 1;
};

/** The window, the room behind it, the opening and the awning, for a facade of w × h. */
export function createShopWindow(
  spec: WindowSpec,
  w: number,
  h: number,
  art: RoomArt,
  glowTexture: THREE.Texture,
  neonColour = "#ff6fa8",
): ShopWindow {
  const group = new THREE.Group();
  group.name = "shop-window";
  const { x0, x1, yTop, yFloor, X, Y } = windowRect(spec, w, h);
  const FACE = FACADE_OUT;
  const box = roomBox({ x0, x1 }, aspectOf(art.back));
  const { width: RW, depth: RD, height: RH, cx, back: zb } = box;
  const ticks: Array<(local: THREE.Vector3, t: number) => void> = [];

  // The inside of a lit shop: warm, and out of the street's haze.
  const lit = (map: THREE.Texture | null, colour = 0xf2c8a8) =>
    new THREE.MeshBasicMaterial({ map, color: colour, toneMapped: false, fog: false });

  const room = new THREE.Group();
  room.name = "shop-room";
  group.add(room);
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), lit(prep(art.back)));
  backWall.position.set(cx, yFloor + RH / 2, zb);
  room.add(backWall);
  const neon = neonMask(art.back);
  if (neon) {
    const material = new THREE.MeshBasicMaterial({
      map: neon,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      opacity: 0.55,
    });
    const glowWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), material);
    glowWall.position.set(cx, yFloor + RH / 2, zb + 0.01);
    room.add(glowWall);
    ticks.push((_l, t) => {
      material.opacity = (0.45 + 0.2 * Math.sin(t * 2.1)) * (Math.sin(t * 23) > 0.985 ? 0.35 : 1);
    });
  }
  // The side walls show the part of their drawing nearest the back wall.
  for (const side of ["left", "right"] as const) {
    const source = art[side];
    const texture = source ? prep(source.clone()) : null;
    if (texture) {
      texture.repeat.x = RD / RW;
      texture.offset.x = side === "left" ? 1 - RD / RW : 0;
      texture.needsUpdate = true;
    }
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), lit(texture, texture ? 0xe8b898 : 0xc98a94));
    wall.position.set(side === "left" ? cx - RW / 2 : cx + RW / 2, yFloor + RH / 2, zb + RD / 2);
    wall.rotation.y = side === "left" ? Math.PI / 2 : -Math.PI / 2;
    room.add(wall);
  }
  const floorTexture = art.floor ? prep(art.floor.clone()) : null;
  if (floorTexture) {
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(RW / 2.4, RD / 2.4);
    floorTexture.needsUpdate = true;
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), lit(floorTexture, 0xc89080));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, yFloor + 0.002, zb + RD / 2);
  room.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), lit(null, 0x6a3a44));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(cx, yFloor + Math.min(RH, yTop - yFloor + 0.6), zb + RD / 2);
  room.add(ceiling);
  for (let i = 0; i < 3; i++) {
    const pendant = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffc98a,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    pendant.scale.set(0.9, 0.9, 1);
    pendant.position.set(cx + (i - 1) * (x1 - x0) * 0.33, yTop - 0.35, BACK - 1.1);
    room.add(pendant);
  }
  // The furniture: the two widest pieces are tables, the rest chairs.
  const sorted = [...art.props].sort((a, b) => aspectOf(b) - aspectOf(a));
  const wide = sorted.slice(0, 2);
  const chairs = sorted.slice(2);
  const shade = contactShadow();
  const place = (texture: THREE.Texture, x: number, z: number, height: number) => {
    const pw = height * aspectOf(texture);
    const piece = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, height),
      new THREE.MeshBasicMaterial({ map: prep(texture), transparent: true, alphaTest: 0.4, toneMapped: false, fog: false, color: 0xf0c8b0 }),
    );
    piece.name = "shop-room-prop";
    piece.position.set(x, yFloor + height / 2, z);
    room.add(piece);
    ticks.push((local) => {
      piece.rotation.y = faceToward(local, piece.position);
    });
    const underneath = new THREE.Mesh(
      new THREE.PlaneGeometry(pw * 1.1, 0.8),
      new THREE.MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false }),
    );
    underneath.rotation.x = -Math.PI / 2;
    underneath.position.set(x, yFloor + 0.01, z + 0.05);
    room.add(underneath);
  };
  chairs.slice(0, 3).forEach((texture, i) => place(texture, cx + (i - 1) * RW * 0.25, zb + 1.1, 1.1));
  if (wide[0]) place(wide[0], cx + RW / 2 - 1.2, zb + 2.5, 1.05);

  // The opening: the wall's thickness, the frames, the door, the glass.
  const bronze = new THREE.MeshStandardMaterial({ color: 0x2a211d, metalness: 0.6, roughness: 0.4 });
  const reveal = new THREE.MeshStandardMaterial({ color: 0xc88f98, roughness: 0.85, side: THREE.DoubleSide });
  const deep = FACE - BACK;
  const jamb = (width: number, height: number, at: [number, number, number], rx: number, ry: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), reveal);
    mesh.position.set(...at);
    mesh.rotation.set(rx, ry, 0);
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  jamb(deep, yTop - yFloor, [x0, (yTop + yFloor) / 2, (FACE + BACK) / 2], 0, Math.PI / 2);
  jamb(deep, yTop - yFloor, [x1, (yTop + yFloor) / 2, (FACE + BACK) / 2], 0, -Math.PI / 2);
  jamb(x1 - x0, deep, [cx, yTop, (FACE + BACK) / 2], Math.PI / 2, 0);
  jamb(x1 - x0, deep, [cx, yFloor, (FACE + BACK) / 2], -Math.PI / 2, 0);
  const zGlass = FACE - 0.14;
  for (const u of spec.mullions) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.1, yTop - yFloor, 0.08), bronze);
    mullion.position.set(X(u), (yTop + yFloor) / 2, zGlass);
    mullion.castShadow = true;
    group.add(mullion);
  }
  for (const y of [yTop - 0.04, yFloor + 0.04]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, 0.08), bronze);
    rail.position.set(cx, y, zGlass);
    group.add(rail);
  }
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b060, metalness: 0.9, roughness: 0.25, emissive: 0x7a5020, emissiveIntensity: 0.4 });
  for (const d of [-0.09, 0.09]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10), gold);
    handle.position.set(X(spec.door ?? spec.mullions[1] ?? 0.5) + d, yFloor + 1.05, zGlass + 0.07);
    group.add(handle);
  }
  const sheen = sheenTexture();
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0, yTop - yFloor),
    new THREE.MeshBasicMaterial({ map: sheen, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glass.name = "shop-glass";
  glass.position.set(cx, (yTop + yFloor) / 2, zGlass - 0.01);
  group.add(glass);
  if (sheen) {
    ticks.push((local) => {
      sheen.offset.x = sheenOffset(local);
    });
  }

  // The awning, out over the pavement, with its scalloped valance and cheeks.
  if (spec.awning) {
    const [ax0, ax1, ay0] = spec.awning;
    const awW = X(ax1) - X(ax0);
    const awD = 1.35;
    const slope = 0.42;
    const pivotY = Y(ay0) - 0.05;
    const cloth = awningTexture(spec.stripe, false);
    const awMat = new THREE.MeshStandardMaterial({ map: cloth, emissiveMap: cloth, side: THREE.DoubleSide, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.18 });
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(awW, awD), awMat);
    awning.name = "shop-awning";
    awning.rotation.x = slope - Math.PI / 2;
    awning.position.set((X(ax0) + X(ax1)) / 2, pivotY - (Math.sin(slope) * awD) / 2, FACE + 0.02 + (Math.cos(slope) * awD) / 2);
    awning.castShadow = true;
    group.add(awning);
    const edge = awningTexture(spec.stripe, true);
    const valMat = new THREE.MeshStandardMaterial({
      map: edge,
      emissiveMap: edge,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
    });
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(awW, 0.34), valMat);
    valance.position.set((X(ax0) + X(ax1)) / 2, pivotY - Math.sin(slope) * awD - 0.17, FACE + 0.02 + Math.cos(slope) * awD);
    valance.castShadow = true;
    group.add(valance);
    const cheekShape = new THREE.Shape();
    cheekShape.moveTo(0, 0);
    cheekShape.lineTo(Math.cos(slope) * awD, -Math.sin(slope) * awD);
    cheekShape.lineTo(Math.cos(slope) * awD, -Math.sin(slope) * awD - 0.34);
    cheekShape.lineTo(0, -0.25);
    cheekShape.closePath();
    const cheekMat = new THREE.MeshStandardMaterial({ color: spec.stripe, side: THREE.DoubleSide, roughness: 0.9, emissive: spec.stripe, emissiveIntensity: 0.15 });
    for (const ex of [X(ax0), X(ax1)]) {
      const cheek = new THREE.Mesh(new THREE.ShapeGeometry(cheekShape), cheekMat);
      cheek.rotation.y = -Math.PI / 2;
      cheek.position.set(ex, pivotY, FACE + 0.02);
      group.add(cheek);
    }
  }

  // The barber's pole, turning.
  if (spec.pole) {
    const stripes = poleTexture();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.8, 24, 1, true),
      new THREE.MeshBasicMaterial({ map: stripes, toneMapped: false, color: 0xe8e8e8 }),
    );
    pole.name = "barber-pole";
    const [px, py] = spec.pole;
    const at = new THREE.Vector3(X(px), Y(py), FACE + 0.26);
    pole.position.copy(at);
    group.add(pole);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, 0.82, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 }),
    );
    tube.position.copy(at);
    group.add(tube);
    for (const dy of [0.46, -0.46]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(dy > 0 ? 0.08 : 0.14, dy > 0 ? 0.14 : 0.08, 0.12, 20), gold);
      cap.position.set(at.x, at.y + dy, at.z);
      group.add(cap);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), gold);
    arm.position.set(at.x, at.y + 0.3, FACE + 0.13);
    group.add(arm);
    if (stripes) {
      ticks.push((_l, t) => {
        stripes.offset.y = (t * 0.35) % 1;
      });
    }
  }

  if (spec.halo) {
    const material = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(neonColour),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(material);
    halo.scale.set(3.2, 3.2, 1);
    halo.position.set(X(spec.halo[0]), Y(spec.halo[1]), 0.7);
    group.add(halo);
    ticks.push((_l, t) => {
      material.opacity = 0.35 + 0.2 * Math.sin(t * 2.3) * (Math.sin(t * 17) > 0.97 ? 0.2 : 1);
    });
  }

  return {
    group,
    hole: { x0, x1, y0: yFloor, y1: yTop },
    update(local, elapsed) {
      for (const tick of ticks) tick(local, elapsed);
    },
  };
}
