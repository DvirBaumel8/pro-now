import * as THREE from "three";

import { contactShadow, neonMask, type RoomArt } from "./shopWindow";

/**
 * THE SHOP YOU WALK INTO, AS THE DEMO'S (tools/design-preview/src/city/boxRoom.ts
 * `buildBoxRoom`, and the room half of City.tsx's loop).
 *
 * The demo's room is its own scene with its own camera, drawn instead of the
 * street once you are through the door. Four walls of real space: the back,
 * left and right walls are each the shop's own drawing on a plane, the room
 * 4.6 m wide and 5 m deep and as tall as the back wall's drawing makes it. The
 * neon on the walls is found (very bright, very saturated, not lamplight) and
 * laid over them again, additively, breathing and now and then stuttering. The
 * floor is the floor drawing tiled every 2.6 m, laid a little short of opaque
 * over the whole room drawn upside down beneath it at 55%, so it shines; the
 * walls meet it in shadow. The ceiling is panelled in the back wall's own top
 * colour with six recessed downlights, a warm cove of LED light and a shadow
 * along the top of every wall, and two faint cones of light falling into the
 * room. The furniture stands in the room at three depths, each piece turning
 * to keep its face to you, with a contact shadow; one closer than 1.5 m lets
 * you see through it and one closer than 0.8 m steps out of the way. Dust
 * drifts in the light.
 *
 * You are in it: the walker stands where you stand, and the camera rides 2.4 m
 * behind and 2.2 m up, kept inside the walls. Pull back at the edge of where
 * you can stand and you walk out (City.tsx, "WALKING BACK OUT OF THE SHOP").
 *
 * Not ported: the order sheet's still of the room (`snapshot`): the product's
 * sheet is the catalogue list, with no picture. The demo's `panoRoom.ts` is not
 * ported either: it is the fallback for a shop with no box art, and every shop
 * the demo walks you into has its box (`BUILT_ROOMS`), the barber's included.
 */

/** The demo's room: wall to wall, front to back, the scale furniture is set by, eye height. */
export const BOX_ROOM = { width: 4.6, depth: 5.0, eye: 1.6 } as const;
/** The walker in the room, as the demo's `buildPlayer(walk, run, 1.78, …)`: metres tall. */
export const ROOM_FIGURE = 1.78;
const W = BOX_ROOM.width;
const D = BOX_ROOM.depth;
const K = W / 8;

/** The room is as tall as its back wall's drawing says, at the room's width. */
export function roomHeight(backAspect: number): number {
  return W / Math.max(1e-6, backAspect > 0 && Number.isFinite(backAspect) ? backAspect : 1);
}

/**
 * Where the furniture stands, widest first: the two widest pieces in front
 * either side, the rest in a row facing the back wall (a lone one off to the
 * side). [x, z, height in metres].
 */
export function furnitureSlots(pieces: number): Array<[number, number, number]> {
  const back = Math.max(0, pieces - 2);
  const slots: Array<[number, number, number]> = [
    [2.35 * K, 1.3 * K, 0.95],
    [-2.4 * K, 1.1 * K, 0.85],
  ];
  for (let i = 0; i < back; i++) {
    slots.push([back === 1 ? W * 0.28 : (-2.4 + (4.8 * i) / Math.max(1, back - 1)) * K, -D / 2 + 0.95, 1.0]);
  }
  return slots.slice(0, Math.max(0, pieces));
}

/** A tall narrow piece (a column, a plant) stands taller than a chair. */
export function pieceHeight(aspect: number, slotHeight: number): number {
  return aspect < 0.6 ? 1.55 : slotHeight;
}

/** A piece the camera is almost standing in: see-through under 1.5 m, gone under 0.8 m. */
export function propFade(near: number): { visible: boolean; opacity: number } {
  return { visible: near > 0.8, opacity: near >= 1.5 ? 1 : 0.45 + 0.55 * ((near - 0.8) / 0.7) };
}

/** The neon's breath, with a real sign's occasional stutter. */
export function neonBreath(t: number): number {
  const flick = Math.sin(t * 23.0) > 0.985 ? 0.35 : 1;
  return (0.45 + 0.2 * Math.sin(t * 2.1)) * flick;
}

/**
 * MOVING IN THE ROOM (City.tsx's room loop): sideways turns you, up and down
 * steps you forward and back, 1.1 m/s, within 1.2 m of where you came in;
 * the turn is held to 125° either way, behind you being the door.
 */
export const ROOM_MOVE = {
  speed: 1.1,
  standRadius: 1.2,
  maxYaw: (125 / 180) * Math.PI,
  /** The walk cycle's ground, per metre stepped (the demo's 2.2). */
  stride: 2.2,
  /** Pulling back at the rim (95% of the radius, stick past 0.45) for 0.4 s walks you out. */
  rim: 0.95,
  pullBack: 0.45,
  leaveAfter: 0.4,
  /**
   * The demo turns by the drag itself (0.006 rad a pixel, a 64 px stick: 0.38
   * rad a full push). The product's stick is a held offset, so a full push
   * turns at this rate instead (radians a second).
   */
  turnRate: 1.2,
} as const;

export interface RoomStand {
  x: number;
  z: number;
  yaw: number;
  /** Ground covered, for the walk cycle. */
  walked: number;
  /** How long you have been pulling back at the rim. */
  pushOut: number;
}

export function freshStand(): RoomStand {
  return { x: 0, z: 0, yaw: 0, walked: 0, pushOut: 0 };
}

/** One frame of the stick in the room; `leave` once you have pulled back out at the rim long enough. */
export function stepInRoom(stand: RoomStand, command: { x: number; z: number }, dt: number): { stand: RoomStand; leave: boolean } {
  const yaw = Math.max(-ROOM_MOVE.maxYaw, Math.min(ROOM_MOVE.maxYaw, stand.yaw - command.x * ROOM_MOVE.turnRate * dt));
  let { x, z, walked } = stand;
  const push = Math.abs(command.z);
  if (push > 0.08) {
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    x += -command.z * fx * ROOM_MOVE.speed * dt;
    z += -command.z * fz * ROOM_MOVE.speed * dt;
    walked += push * ROOM_MOVE.speed * ROOM_MOVE.stride * dt;
    const d = Math.hypot(x, z);
    if (d > ROOM_MOVE.standRadius) {
      x *= ROOM_MOVE.standRadius / d;
      z *= ROOM_MOVE.standRadius / d;
    }
  }
  const atRim = Math.hypot(x, z) >= ROOM_MOVE.standRadius * ROOM_MOVE.rim;
  let pushOut = atRim && command.z > ROOM_MOVE.pullBack ? stand.pushOut + dt : 0;
  const leave = pushOut > ROOM_MOVE.leaveAfter;
  if (leave) pushOut = 0;
  return { stand: { x, z, yaw, walked, pushOut }, leave };
}

/**
 * YOU, IN THE ROOM: the figure stands where you stand (the step scaled 1.4,
 * kept clear of the walls) and the camera is 2.4 m behind it and 2.2 m up,
 * inside the walls, tilted down 0.2.
 */
export function roomView(stand: { x: number; z: number; yaw: number }, t = 0) {
  const ax = Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, stand.x * 1.4));
  const az = Math.max(-D / 2 + 1.3, Math.min(D / 2 - 1.0, 0.2 + stand.z * 1.4));
  const fx = -Math.sin(stand.yaw);
  const fz = -Math.cos(stand.yaw);
  const back = 2.4;
  return {
    avatar: { x: ax, z: az },
    camera: {
      x: Math.max(-W / 2 + 0.25, Math.min(W / 2 - 0.25, ax - fx * back)),
      y: 2.2 + Math.sin(t * 0.9) * 0.01,
      z: Math.max(-D / 2 + 0.25, Math.min(D / 2 - 0.15, az - fz * back)),
    },
    yaw: stand.yaw,
    pitch: -0.2,
  };
}

/** A phone held upright sees the room through a wider lens. */
export function roomFov(aspect: number): number {
  return aspect < 1 ? 78 : 62;
}

export interface BoxRoom {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Put the walker in the room (or take it out). */
  follow(figure: THREE.Object3D | null): void;
  update(dt: number, t: number, stand: RoomStand): void;
  setAspect(aspect: number): void;
  dispose(): void;
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

function aspectOf(t: THREE.Texture): number {
  const image = t.image as { width?: number; height?: number } | undefined;
  return image?.width && image.height ? image.width / image.height : 1;
}

export function buildBoxRoom(art: RoomArt): BoxRoom {
  const scene = new THREE.Scene();
  scene.name = "shop-box-room";
  scene.background = new THREE.Color(0x0b0810);
  const owned: THREE.Texture[] = [];
  const own = <T extends THREE.Texture | null>(t: T): T => {
    if (t) owned.push(t);
    return t;
  };

  const prep = (t: THREE.Texture) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const H = roomHeight(aspectOf(art.back));

  const glows: THREE.MeshBasicMaterial[] = [];
  const reflect: THREE.Mesh[] = [];
  const wall = (tex: THREE.Texture | null, w: number, pos: [number, number, number], ry: number, tint: number) => {
    // A touch under full white: the drawings are already lit, and the glow would burn them.
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, H),
      new THREE.MeshBasicMaterial({ map: tex ? prep(tex) : null, color: tex ? 0xdedede : tint, toneMapped: false }),
    );
    m.name = "shop-room-wall";
    m.position.set(...pos);
    m.rotation.y = ry;
    scene.add(m);
    reflect.push(m);
    const mask = tex ? own(neonMask(tex)) : null;
    if (mask) {
      const gm = new THREE.MeshBasicMaterial({
        map: mask,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        opacity: 0.6,
      });
      const g = new THREE.Mesh(new THREE.PlaneGeometry(w, H), gm);
      g.position.set(...pos);
      g.rotation.y = ry;
      g.translateZ(0.01);
      scene.add(g);
      glows.push(gm);
    }
  };
  // A side wall with no drawing borrows the back wall's colour rather than showing a hole.
  const tint = edgeTint(art.back);
  wall(art.back, W, [0, H / 2, -D / 2], 0, tint);
  wall(art.left, D, [-W / 2, H / 2, 0], Math.PI / 2, tint);
  wall(art.right, D, [W / 2, H / 2, 0], -Math.PI / 2, tint);

  // The floor, tiled every 2.6 m, a little short of opaque over the room's reflection.
  const floorMat = new THREE.MeshBasicMaterial({ color: art.floor ? 0xffffff : 0x3a2a30, toneMapped: false });
  if (art.floor) {
    const f = own(prep(art.floor.clone()));
    f.wrapS = f.wrapT = THREE.RepeatWrapping;
    f.repeat.set(W / 2.6, D / 2.6);
    f.needsUpdate = true;
    floorMat.map = f;
  }
  floorMat.transparent = true;
  floorMat.opacity = 0.84;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.name = "shop-room-floor";
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = 2;
  scene.add(floor);

  // Walls meet the floor in shadow.
  const skirtTex = own(skirtShadow());
  if (skirtTex) {
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ map: skirtTex, transparent: true, depthWrite: false }));
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = 0.005;
    scene.add(skirt);
  }

  // A ceiling, not a lid: panelled, with downlights, in the shop's own colour.
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshBasicMaterial({ map: own(ceilingTex(new THREE.Color(tint))), color: 0xffffff, toneMapped: false }),
  );
  ceil.name = "shop-room-ceiling";
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  // Where wall meets ceiling: a line of warm light, and a shadow under it.
  const cove = own(stripTex([[0, "rgba(255,214,150,0)"], [0.45, "rgba(255,226,175,0.95)"], [0.55, "rgba(255,226,175,0.95)"], [1, "rgba(255,214,150,0)"]], 64));
  const shade = own(stripTex([[0, "rgba(0,0,0,0.55)"], [1, "rgba(0,0,0,0)"]], 64));
  for (const [w, pos, ry] of [
    [W, [0, H - 0.09, -D / 2 + 0.02], 0],
    [D, [-W / 2 + 0.02, H - 0.09, 0], Math.PI / 2],
    [D, [W / 2 - 0.02, H - 0.09, 0], -Math.PI / 2],
  ] as Array<[number, [number, number, number], number]>) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.18),
      new THREE.MeshBasicMaterial({ map: cove, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: 0.9 }),
    );
    strip.name = "shop-room-cove";
    strip.position.set(...pos);
    strip.rotation.y = ry;
    scene.add(strip);
    const under = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.35),
      new THREE.MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false, toneMapped: false }),
    );
    under.position.set(pos[0], H - 0.175, pos[2]);
    under.rotation.y = ry;
    under.translateZ(0.005);
    scene.add(under);
  }

  // Light falling from the downlights: faint cones, brighter at the lamp.
  const shaft = own(stripTex([[0, "rgba(255,230,185,1)"], [1, "rgba(255,230,185,0)"]], 128));
  for (const [x, z] of [
    [-W * 0.3, -D * 0.28],
    [W * 0.3, -D * 0.28],
  ] as Array<[number, number]>) {
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.95, H - 0.05, 24, 1, true),
      new THREE.MeshBasicMaterial({
        map: shaft,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        opacity: 0.055,
        toneMapped: false,
      }),
    );
    cone.name = "shop-room-shaft";
    cone.position.set(x, (H - 0.05) / 2, z);
    scene.add(cone);
  }

  // The furniture, standing in the room, each piece turning to face you.
  const pieces = [...art.props].sort((a, b) => aspectOf(b) - aspectOf(a));
  const slots = furnitureSlots(pieces.length);
  const shadowTex = own(contactShadow());
  const facing: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  pieces.forEach((tex, i) => {
    const [x, z, h0] = slots[i]!;
    const h = pieceHeight(aspectOf(tex), h0);
    const w = h * aspectOf(tex);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: prep(tex), transparent: true, alphaTest: 0.4, toneMapped: false }),
    );
    m.name = "shop-room-piece";
    m.position.set(x, h / 2, z);
    scene.add(m);
    facing.push(m);
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.15, 0.9),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.01, z + 0.05);
    scene.add(s);
  });

  // The walls once more, upside down under the floor, at 55%: the shine.
  const mirror = new THREE.Group();
  mirror.name = "shop-room-reflection";
  for (const o of reflect) {
    const c = o.clone();
    const mat = (o.material as THREE.MeshBasicMaterial).clone();
    mat.color = mat.color.clone().multiplyScalar(0.55);
    c.material = mat;
    mirror.add(c);
  }
  mirror.scale.y = -1;
  scene.add(mirror);

  // Dust in the light.
  const N = 220;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * W * 0.9;
    pos[i * 3 + 1] = Math.random() * H * 0.9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * D * 0.9;
    seed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.014,
      map: own(dot()),
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  // The walker's own shadow on the floor, under wherever it stands.
  const footShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  footShadow.rotation.x = -Math.PI / 2;
  footShadow.position.y = 0.012;
  footShadow.renderOrder = 3;
  footShadow.visible = false;
  scene.add(footShadow);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
  camera.rotation.order = "YXZ";
  let avatar: THREE.Object3D | null = null;
  const dustAt = dustGeo.attributes.position as THREE.BufferAttribute;

  return {
    scene,
    camera,
    follow(figure) {
      if (avatar) scene.remove(avatar);
      avatar = figure;
      if (figure) scene.add(figure);
      footShadow.visible = Boolean(figure);
    },
    update(dt, t, stand) {
      const view = roomView(stand, t);
      if (avatar) avatar.position.set(view.avatar.x, avatar.position.y, view.avatar.z);
      footShadow.position.x = view.avatar.x;
      footShadow.position.z = view.avatar.z;
      camera.position.set(view.camera.x, view.camera.y, view.camera.z);
      camera.rotation.set(view.pitch, view.yaw, 0);
      for (const m of facing) {
        m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
        const fade = propFade(Math.hypot(camera.position.x - m.position.x, camera.position.z - m.position.z));
        m.visible = fade.visible;
        m.material.opacity = fade.opacity;
      }
      const breath = neonBreath(t);
      for (const g of glows) g.opacity = breath;
      for (let i = 0; i < N; i++) {
        const s = seed[i]!;
        let y = dustAt.getY(i) + Math.sin(t * 0.3 + s) * dt * 0.02 + dt * 0.006;
        if (y > H * 0.95) y = 0.1;
        dustAt.setY(i, y);
      }
      dustAt.needsUpdate = true;
    },
    setAspect(aspect) {
      camera.aspect = aspect;
      camera.fov = roomFov(aspect);
      camera.updateProjectionMatrix();
    },
    dispose() {
      if (avatar) scene.remove(avatar);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      for (const t of owned) t.dispose();
    },
  };
}

/** The average colour of the top of a drawing, for walls and ceiling without art. */
function edgeTint(t: THREE.Texture): number {
  const image = t.image as Picture | undefined;
  const made = canvas(32, 4);
  if (!image?.width || !made) return 0x553344;
  const [, g] = made;
  g.drawImage(image, 0, 0, image.width, Math.max(2, image.height * 0.08), 0, 0, 32, 4);
  const d = g.getImageData(0, 0, 32, 4).data;
  let r = 0;
  let gg = 0;
  let b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]!;
    gg += d[i + 1]!;
    b += d[i + 2]!;
  }
  const n = d.length / 4;
  return (Math.round(r / n) << 16) | (Math.round(gg / n) << 8) | Math.round(b / n);
}

function skirtShadow(): THREE.Texture | null {
  const made = canvas(128, 128);
  if (!made) return null;
  const [c, g] = made;
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, "rgba(10,6,12,0.55)");
    gr.addColorStop(1, "rgba(10,6,12,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  };
  edge(0, 0, 0, 22); // back
  edge(0, 0, 22, 0); // left
  edge(128, 0, 106, 0); // right
  return new THREE.CanvasTexture(c);
}

function dot(): THREE.Texture | null {
  const made = canvas(32, 32);
  if (!made) return null;
  const [c, g] = made;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,226,170,1)");
  gr.addColorStop(1, "rgba(255,226,170,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/** The ceiling's six recessed downlights, on its 512 × 560 drawing. */
export const DOWNLIGHTS: ReadonlyArray<readonly [number, number]> = [
  [128, 150],
  [384, 150],
  [256, 420],
  [128, 420],
  [384, 420],
  [256, 150],
];

/** Panelled ceiling in the shop's own colour (42% at the edge, 60% in the middle), with recessed downlights. */
function ceilingTex(base: THREE.Color): THREE.Texture | null {
  const made = canvas(512, 560);
  if (!made) return null;
  const [c, g] = made;
  const dark = base.clone().multiplyScalar(0.42);
  const mid = base.clone().multiplyScalar(0.6);
  const css = (col: THREE.Color) => `rgb(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)})`;
  const bg = g.createRadialGradient(256, 280, 40, 256, 280, 360);
  bg.addColorStop(0, css(mid));
  bg.addColorStop(1, css(dark));
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(0,0,0,0.28)";
  g.lineWidth = 3;
  for (let x = 0; x <= 512; x += 128) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 560);
    g.stroke();
  }
  for (let y = 0; y <= 560; y += 140) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,0.06)";
  g.lineWidth = 2;
  for (let x = 2; x <= 512; x += 128) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 560);
    g.stroke();
  }
  for (const [x, y] of DOWNLIGHTS) {
    const halo = g.createRadialGradient(x, y, 4, x, y, 70);
    halo.addColorStop(0, "rgba(255,226,170,0.55)");
    halo.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = halo;
    g.fillRect(x - 70, y - 70, 140, 140);
    g.fillStyle = "rgba(40,30,25,0.9)";
    g.beginPath();
    g.arc(x, y, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff4dc";
    g.beginPath();
    g.arc(x, y, 10, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A 4-pixel-wide vertical gradient: the cove's light, the shadow under it, a cone of light. */
function stripTex(stops: Array<[number, string]>, height: number): THREE.Texture | null {
  const made = canvas(4, height);
  if (!made) return null;
  const [c, g] = made;
  const gr = g.createLinearGradient(0, 0, 0, height);
  for (const [at, colour] of stops) gr.addColorStop(at, colour);
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, height);
  return new THREE.CanvasTexture(c);
}
