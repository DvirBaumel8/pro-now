import * as THREE from "three";

import { type WorldAssetId, worldAssetUrl } from "../assets";
import {
  DOG_PARK,
  PARK_RUNNERS,
  PARK_STILL,
  PLACE_ART,
  SHOP_GROUND,
  STEAM_COLOUR,
  VENTS,
  VENT_PUFFS,
  ballAt,
  cameraInside,
  candleOpacity,
  furnitureLayout,
  mainBand,
  placeX,
  runnerAt,
  steamPuff,
  treeLayout,
} from "./dressing";
import { KERB_X, STREET_LENGTH } from "./street";
import { cutout, imageAspect, type Cutout } from "./vans";
import { clearOfWindow } from "./shopWindow";

/**
 * The scene side of dressing.ts: the demo's drawings stood up as crossed or
 * single cut-outs (lit, casting their drawing's shadow), at the layouts there.
 */

type Tick = (dt: number, t: number) => void;

/** One load per drawing; everything standing it up is fitted when it arrives. */
export function artLoader(loader: THREE.TextureLoader) {
  const loaded = new Map<WorldAssetId, { texture: THREE.Texture; ready: Array<(t: THREE.Texture) => void>; done: boolean }>();
  return (id: WorldAssetId, onReady: (texture: THREE.Texture) => void): THREE.Texture => {
    let entry = loaded.get(id);
    if (!entry) {
      const ready: Array<(t: THREE.Texture) => void> = [];
      const fresh = { texture: null as unknown as THREE.Texture, ready, done: false };
      fresh.texture = loader.load(worldAssetUrl(id), (texture) => {
        fresh.done = true;
        for (const f of ready.splice(0)) f(texture);
      });
      entry = fresh;
      loaded.set(id, entry);
    }
    if (entry.done) onReady(entry.texture);
    else entry.ready.push(onReady);
    return entry.texture;
  };
}

type Art = ReturnType<typeof artLoader>;

/**
 * A drawing stood up as `sides` cut-outs crossed at equal angles (the demo's
 * `cutout`: two for a tree or a table, so it has a body from any side).
 */
export function crossed(texture: THREE.Texture, height: number, sides = 2): { group: THREE.Group; fit(aspect: number): void } {
  const group = new THREE.Group();
  const planes: Cutout[] = [];
  for (let i = 0; i < sides; i += 1) {
    const plane = cutout(texture, height);
    plane.rotation.y = (Math.PI / sides) * i;
    group.add(plane);
    planes.push(plane);
  }
  const fit = (aspect: number) => {
    for (const plane of planes) plane.fit(aspect);
  };
  fit(imageAspect(texture) ?? 1);
  return { group, fit };
}

function standUp(art: Art, id: WorldAssetId, height: number, sides = 2): THREE.Group {
  let made: ReturnType<typeof crossed> | null = null;
  const texture = art(id, (t) => made?.fit(imageAspect(t) ?? 1));
  made = crossed(texture, height, sides);
  made.fit(imageAspect(texture) ?? 1);
  return made.group;
}

/** Trees at the kerb; the camera passing through one hides it (`canopies`). */
export function buildTrees(root: THREE.Group, art: Art, canopies: THREE.Object3D[]): void {
  for (const spot of treeLayout(Math.random, clearOfWindow)) {
    const tree = standUp(art, spot.tree, spot.height);
    tree.position.set(spot.x, 0, spot.z);
    tree.rotation.y = spot.yaw;
    root.add(tree);
    canopies.push(tree);
  }
}

/** Café tables with a candle, planters, benches and bins (the demo's layout and sizes). */
export function buildFurniture(root: THREE.Group, art: Art, glow: THREE.Texture, ticking: Tick[]): void {
  for (const spot of furnitureLayout(Math.random, clearOfWindow)) {
    const id: WorldAssetId =
      spot.kind === "cafe" ? "prop_cafe_set" : spot.kind === "bench" ? "prop_bench" : spot.kind === "bin" ? "prop_bin" : spot.planter!;
    const sides = spot.kind === "bench" || spot.kind === "bin" ? 1 : 2;
    const piece = standUp(art, id, spot.height, sides);
    piece.position.set(spot.x, 0, spot.z);
    piece.rotation.y = spot.yaw;
    root.add(piece);
    if (spot.kind === "cafe") {
      const flame = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glow,
          color: spot.hue,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      flame.scale.setScalar(0.8);
      flame.position.set(0, 0.86, 0.06);
      piece.add(flame);
      const x = spot.x;
      ticking.push((_dt, t) => {
        flame.material.opacity = candleOpacity(t, x);
      });
    }
  }
}

/** Two grates in the road breathing steam, four puffs each (the demo's `vent`). */
export function buildSteam(root: THREE.Group, glow: THREE.Texture, ticking: Tick[]): void {
  for (const vent of VENTS) {
    const puffs: Array<{ sprite: THREE.Sprite; phase: number }> = [];
    for (let i = 0; i < VENT_PUFFS; i += 1) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glow,
          color: STEAM_COLOUR,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.position.set(vent.x, 0, vent.z);
      root.add(sprite);
      puffs.push({ sprite, phase: i / VENT_PUFFS });
    }
    ticking.push((_dt, t) => {
      for (const { sprite, phase } of puffs) {
        const p = steamPuff(t, phase, vent.x);
        sprite.position.set(p.x, p.y, vent.z);
        sprite.scale.setScalar(p.scale);
        sprite.material.opacity = p.opacity;
      }
    });
  }
}

/** The rows of a loaded sheet's alpha, read small (at most 512 a side). */
function alphaOf(texture: THREE.Texture): { alpha: (x: number, y: number) => number; width: number; height: number } | null {
  const image = texture.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!image?.width || typeof document === "undefined") return null;
  const k = Math.min(1, 512 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * k));
  const height = Math.max(1, Math.round(image.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  return { alpha: (x, y) => data[(y * width + x) * 4 + 3] ?? 0, width, height };
}

/**
 * The four places, each the biggest drawing on its sheet (the spare props
 * under it left off), standing against the wall facing the street; the layby
 * in the parking lane, where the camera can pass through it.
 */
export function buildPlaces(root: THREE.Group, art: Art, canopies: THREE.Object3D[]): void {
  for (const place of PLACE_ART) {
    const stand = new THREE.Group();
    stand.position.set(placeX(place), 0, place.z);
    stand.rotation.y = place.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(stand);
    if (place.kerb) canopies.push(stand);
    art(place.asset, (sheet) => {
      const read = alphaOf(sheet);
      const band = read ? mainBand(read.alpha, read.width, read.height) : null;
      let texture = sheet;
      let aspect = imageAspect(sheet) ?? 1;
      if (band && read) {
        texture = sheet.clone();
        texture.needsUpdate = true;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        // Texture v runs from the bottom: the band's top row is the far end.
        texture.repeat.set(1, (band.y1 - band.y0 + 1) / read.height);
        texture.offset.set(0, (read.height - band.y1 - 1) / read.height);
        aspect = read.width / (band.y1 - band.y0 + 1);
      }
      const drawing = cutout(texture, place.height);
      drawing.fit(aspect);
      stand.add(drawing);
    });
  }
}

/**
 * THE DOG PARK, BUILT (the demo's): grass with a rail on three sides, open to
 * the pavement; two trees; the drawn park at the back; a bench; dogs running
 * their loops, one wagging, one breathing; people at the rail and a ball.
 * Each figure turns to the camera and faces the way it is going.
 */
export function buildDogPark(
  root: THREE.Group,
  art: Art,
  glow: THREE.Texture,
  camera: THREE.Camera,
  ticking: Tick[],
  canopies: THREE.Object3D[],
): void {
  const { x: px, z: pz, width: PW, length: PL } = DOG_PARK;
  const park = new THREE.Group();
  park.name = "dog-park";
  root.add(park);

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PL),
    new THREE.MeshStandardMaterial({ color: 0x2f4a2c, roughness: 0.95 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(px, 0.03, pz);
  grass.receiveShadow = true;
  park.add(grass);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x1b1722, roughness: 0.5, metalness: 0.2 });
  const rail = (x: number, z: number, len: number, along: "x" | "z") => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(along === "x" ? len : 0.07, 0.07, along === "z" ? len : 0.07), railMat);
    bar.position.set(x, 0.62, z);
    park.add(bar);
    const n = Math.max(2, Math.round(len / 1.5));
    for (let i = 0; i <= n; i += 1) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.09), railMat);
      const t = -len / 2 + (len * i) / n;
      post.position.set(along === "x" ? x + t : x, 0.34, along === "z" ? z + t : z);
      park.add(post);
    }
  };
  rail(px, pz - PL / 2, PW, "x");
  rail(px, pz + PL / 2, PW, "x");
  rail(px + PW / 2, pz, PL, "z");

  for (const dz of [-2.8, 3.1]) {
    const tree = standUp(art, "prop_jacaranda", 6.4);
    tree.position.set(px + 1.2, 0, pz + dz);
    park.add(tree);
    canopies.push(tree);
  }
  const back = standUp(art, "place_dogpark", 3.0, 1);
  back.position.set(px + PW / 2 - 0.12, 0, pz);
  back.rotation.y = -Math.PI / 2;
  park.add(back);
  const bench = standUp(art, "prop_bench", 1.0, 1);
  bench.position.set(px + 1.5, 0, pz - 1.2);
  bench.rotation.y = -Math.PI / 2;
  park.add(bench);

  // A figure: its drawing on a plane standing on the ground, and a soft shadow under it.
  type Figure = { holder: THREE.Group; mesh: THREE.Mesh };
  const figure = (id: WorldAssetId, h: number): Figure => {
    const holder = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      emissive: 0xffffff,
      emissiveIntensity: 0.22,
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0, 0.5, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(h, h, 1);
    const texture = art(id, (t) => {
      const aspect = imageAspect(t) ?? 1;
      mesh.scale.set(h * aspect * Math.sign(mesh.scale.x || 1), h, 1);
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    material.emissiveMap = texture;
    holder.add(mesh);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(h * 1.1, h * 0.35),
      new THREE.MeshBasicMaterial({ map: glow, color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    holder.add(shadow);
    park.add(holder);
    return { holder, mesh };
  };

  const runners = PARK_RUNNERS.map((r) => ({ spec: r, f: figure(r.id as WorldAssetId, r.height) }));
  const still = PARK_STILL.map((s) => {
    const f = figure(s.id as WorldAssetId, s.height);
    f.holder.position.set(px + s.dx, 0, pz + s.dz);
    return { spec: s, f };
  });
  const thrower = still.find((s) => s.spec.id === "park_person1")!.f;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8f24a, emissive: 0x9aad20, emissiveIntensity: 0.5, roughness: 0.6 }),
  );
  park.add(ball);

  const camRight = new THREE.Vector3();
  const face = (f: Figure, vx: number, vz: number) => {
    f.mesh.rotation.y = Math.atan2(camera.position.x - f.holder.position.x, camera.position.z - f.holder.position.z);
    // The drawings face left; mirrored while running to screen right.
    const toRight = vx * camRight.x + vz * camRight.z > 0;
    f.mesh.scale.x = Math.abs(f.mesh.scale.x) * (toRight ? -1 : 1);
  };
  ticking.push((_dt, t) => {
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    for (const { spec, f } of runners) {
      const at = runnerAt(spec, t);
      f.holder.position.set(at.x, 0, at.z);
      f.mesh.position.y = at.hop;
      face(f, at.vx, at.vz);
    }
    for (const { spec, f } of still) {
      face(f, 1, 0);
      if (spec.pose === "wag") f.mesh.rotation.z = Math.sin(t * 7) * 0.05;
      if (spec.pose === "breathe") f.mesh.scale.y = spec.height * (1 + Math.sin(t * 2.2) * 0.03);
      if (spec.pose === "stand") f.mesh.position.y = Math.sin(t * 1.3 + f.holder.position.z) * 0.015;
    }
    const b = ballAt(t, thrower.holder.position, runners[0]!.f.holder.position);
    ball.position.set(b.x, b.y, b.z);
  });
}

/** Each shop's sign smeared on the wet road in front of it (the demo's `signWet`). */
export function buildSignWet(
  root: THREE.Group,
  shop: { x: number; z: number; side: -1 | 1; neonColour: string },
  glow: THREE.Texture,
): THREE.Mesh {
  const { width, length, out, opacity } = SHOP_GROUND.signWet;
  const wet = new THREE.Mesh(
    new THREE.PlaneGeometry(width, length),
    new THREE.MeshBasicMaterial({
      map: glow,
      color: new THREE.Color(shop.neonColour),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  wet.name = "sign-wet";
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(shop.x - shop.side * out, 0.03, shop.z);
  root.add(wet);
  return wet;
}

/** Hide what the camera is standing in (the demo's canopy rule). */
export function hideCanopies(canopies: readonly THREE.Object3D[], camera: THREE.Camera, at = new THREE.Vector3()): void {
  for (const c of canopies) {
    c.getWorldPosition(at);
    c.visible = !cameraInside(camera.position, at);
  }
}

/** The demo's kerb: 0.55 m wide, 0.28 m high. */
export const KERB = { width: 0.55, height: 0.28 } as const;

export function buildKerbs(root: THREE.Group): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x7d7488, roughness: 0.7 });
  for (const side of [-1, 1] as const) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(KERB.width, KERB.height, STREET_LENGTH), material);
    kerb.position.set(KERB_X * side, KERB.height / 2, 0);
    kerb.receiveShadow = true;
    root.add(kerb);
  }
}
