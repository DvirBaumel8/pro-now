import * as THREE from "three";

import type { PanoRoom } from "./panoRoom";

/**
 * A SHOP YOU CAN WALK AROUND IN: FOUR WALLS OF REAL SPACE.
 *
 * ---------------------------------------------------------------------
 * WHY NOT THE PANORAMA
 * ---------------------------------------------------------------------
 * The 360 panorama was one drawing stretched round you: about two
 * thousand pixels across 250 degrees, so a phone screen saw five hundred
 * of them, and Amit saw exactly what that is — *"רחוק ממה שדיברנו"*: a
 * soft picture wrapped round his head.
 *
 * Here every wall is its own full drawing — back, left, right, each
 * 1536 wide and drawn straight-on — on a real box, with a floor and a
 * ceiling. The PERSPECTIVE is no longer painted in; the engine makes it,
 * so it is correct from wherever you stand, and the resolution on screen
 * is four times what the panorama gave.
 *
 * The furniture stands IN the room, not on its walls: each piece is cut
 * from its own drawing and placed at its own depth, with a shadow under
 * it. Walk and it moves across the walls behind it. That is depth that no
 * single picture can fake.
 */
export interface BoxRoomArt {
  back: THREE.Texture;
  left?: THREE.Texture;
  right?: THREE.Texture;
  floor?: THREE.Texture;
  /** Pieces of furniture, already keyed out of their green, one per texture. */
  props?: THREE.Texture[];
  /** The trade's professional, standing at work in the room. */
  pro?: THREE.Texture;
}

/*
 * A SALON-SIZED ROOM.
 *
 * It was eight metres by eight, and the walls stand as tall as their
 * drawings make them — so the counter under the mirrors came out nearly
 * two metres high, and the walker beside it looked like a child. Amit:
 * *"תעשה פרופורציה נכונה, זה נראה מוזר מאוד."* At 4.6 metres wide the
 * ceiling is three metres and the counter is at hip height, which is a
 * real shop; everything placed in it is scaled by `K`.
 */
const W = 4.6; // wall to wall
const D = 5.0; // front to back
const K = W / 8;
const EYE = 1.6;

export const BOX_STAND = { x: 2.2 * K, zNear: 3.4 * (D / 8), zFar: 0.6 * K };

export function buildBoxRoom(art: BoxRoomArt): PanoRoom {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0810);

  const prep = (t: THREE.Texture) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const backImg = art.back.image as { width: number; height: number };
  /* The room is as tall as the back wall's drawing says it is. */
  const H = W / (backImg.width / Math.max(1, backImg.height));

  /*
   * NEON THAT IS LIT, NOT PAINTED.
   *
   * Amit: *"שלא ייראה תמונות, שייראה חי!"* The signs on these walls are
   * drawn glowing, and a drawing of a glow is still a drawing. So the
   * neon is FOUND — pixels that are both very bright and very saturated,
   * which is what neon is and paint almost never is — and laid over the
   * wall a second time, additively, at an intensity that breathes. The
   * bloom pass does the rest: it spills light off the tubes the way a real
   * sign does, and it flickers now and then, the way a real one does.
   */
  const glows: THREE.MeshBasicMaterial[] = [];
  const reflect: THREE.Object3D[] = [];
  const wall = (tex: THREE.Texture | undefined, w: number, pos: [number, number, number], ry: number, tint = 0xffffff) => {
    /* A touch under full white: these drawings are already lit, and the
       bloom pass would otherwise burn their brightest shelves to white. */
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, H),
      new THREE.MeshBasicMaterial({ map: tex ? prep(tex) : null, color: tex ? 0xdedede : tint, toneMapped: false })
    );
    m.position.set(...pos);
    m.rotation.y = ry;
    scene.add(m);
    reflect.push(m);
    const mask = tex ? neonMask(tex) : null;
    if (mask) {
      const gm = new THREE.MeshBasicMaterial({
        map: mask, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, toneMapped: false, opacity: 0.6,
      });
      const g = new THREE.Mesh(new THREE.PlaneGeometry(w, H), gm);
      g.position.set(...pos);
      g.rotation.y = ry;
      g.translateZ(0.01);
      scene.add(g);
      glows.push(gm);
    }
    return m;
  };
  /* A side wall with no drawing of its own borrows the back wall's colour
     rather than showing a hole; see `edgeTint`. */
  const tint = edgeTint(art.back);
  wall(art.back, W, [0, H / 2, -D / 2], 0);
  wall(art.left, D, [-W / 2, H / 2, 0], Math.PI / 2, tint);
  wall(art.right, D, [W / 2, H / 2, 0], -Math.PI / 2, tint);

  /* The floor, tiled at a metre and a half. */
  const floorMat = new THREE.MeshBasicMaterial({ color: art.floor ? 0xffffff : 0x3a2a30, toneMapped: false });
  if (art.floor) {
    const f = prep(art.floor);
    f.wrapS = f.wrapT = THREE.RepeatWrapping;
    f.repeat.set(W / 2.6, D / 2.6);
    floorMat.map = f;
  }
  /*
   * A FLOOR THAT SHINES.
   *
   * Everything in the room is drawn once more, upside down, under the
   * floor, and the floor is laid over it a little short of opaque: the
   * signs and the furniture show in it the way they show in polished
   * stone. It is the oldest trick there is, and it is most of what makes
   * a painted room read as a lit one.
   */
  floorMat.transparent = true;
  floorMat.opacity = 0.84;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = 2;
  scene.add(floor);

  /* Walls meet the floor in shadow, the way a room does. */
  const skirt = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshBasicMaterial({ map: skirtShadow(), transparent: true, depthWrite: false })
  );
  skirt.rotation.x = -Math.PI / 2;
  skirt.position.y = 0.005;
  scene.add(skirt);

  /*
   * A CEILING, NOT A LID.
   *
   * Amit: *"גם החזית וגם הבפנים כמו קרטון."* Measured on every shop: the
   * top quarter of the screen inside was one flat colour — the walls
   * stopped and a plain slab sat on them, which is exactly a cardboard
   * box with its flaps folded in. A real shop's ceiling is where its light
   * comes from, so this one is panelled, has recessed downlights that the
   * bloom pass makes glow, a warm cove of LED light along the top of every
   * wall, and soft shafts of light falling from the lamps into the room.
   * None of it is drawn per shop: it takes the shop's own colour.
   */
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshBasicMaterial({ map: ceilingTex(new THREE.Color(tint)), toneMapped: false })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  /* The corner where wall meets ceiling, in shadow, and a line of light under it. */
  const cove = coveTex();
  for (const [w, pos, ry] of [
    [W, [0, H - 0.09, -D / 2 + 0.02], 0],
    [D, [-W / 2 + 0.02, H - 0.09, 0], Math.PI / 2],
    [D, [W / 2 - 0.02, H - 0.09, 0], -Math.PI / 2],
  ] as Array<[number, [number, number, number], number]>) {
    const cm = new THREE.MeshBasicMaterial({
      map: cove, transparent: true, depthWrite: false, toneMapped: false,
      blending: THREE.AdditiveBlending, opacity: 0.9,
    });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.18), cm);
    strip.position.set(...pos);
    strip.rotation.y = ry;
    scene.add(strip);
    const shade = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 0.35),
      new THREE.MeshBasicMaterial({ map: shadeTex(), transparent: true, depthWrite: false, toneMapped: false })
    );
    shade.position.set(pos[0], H - 0.175, pos[2]);
    shade.rotation.y = ry;
    shade.translateZ(0.005);
    scene.add(shade);
  }

  /* Light falling from the downlights: faint cones, brighter at the lamp. */
  const shaftTex = shaftGradient();
  for (const [x, z] of [[-W * 0.3, -D * 0.28], [W * 0.3, -D * 0.28]] as Array<[number, number]>) {
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.95, H - 0.05, 24, 1, true),
      new THREE.MeshBasicMaterial({
        map: shaftTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, opacity: 0.055, toneMapped: false,
      })
    );
    cone.position.set(x, (H - 0.05) / 2, z);
    scene.add(cone);
  }

  /*
   * THE FURNITURE, STANDING IN THE ROOM.
   *
   * Widest piece is the counter and stands across the middle of the room;
   * the rest are set either side at different depths so that no two are
   * the same distance from you — which is what makes them move against
   * each other as you walk.
   */
  const pieces = [...(art.props ?? [])].sort((a, b) => aspectOf(b) - aspectOf(a));
  /*
   * Where things stand: the two widest pieces (the counter, the sofa) in
   * front either side, where they do not block the room; everything else
   * — the chairs — in a row facing the back wall, where the mirrors are.
   * Three depths, so walking moves them against each other and against
   * the walls. [x, z, height in metres]
   */
  const back = pieces.slice(2);
  const slots: Array<[number, number, number]> = [
    [2.35 * K, 1.3 * K, 0.95],
    [-2.4 * K, 1.1 * K, 0.85],
    ...back.map((_, i): [number, number, number] => {
      const n = back.length;
      /* A lone piece stands off to one side, not dead behind the walker. */
      return [n === 1 ? W * 0.28 : (-2.4 + (4.8 * i) / Math.max(1, n - 1)) * K, -D / 2 + 0.95, 1.0];
    }),
  ];
  const shadowTex = contactShadow();
  /*
   * EACH PIECE TURNS TO FACE YOU.
   *
   * Amit: *"הרהיטים לא עומדים נכון."* A piece of furniture is one drawing
   * seen from the front, and standing it in a room as a fixed card meant
   * that walking past it showed it from the side — a pink sofa as thin as
   * a sheet of card, a counter bent into a trapezoid. So each piece turns
   * about its own upright to face the camera every frame: it keeps its
   * place in the room, and so all of its parallax, and never shows the
   * edge that would give it away. Their reflections turn with them.
   */
  const facing: THREE.Mesh[] = [];
  pieces.slice(0, slots.length).forEach((tex, i) => {
    const [x, z, h0] = slots[i]!;
    /* A tall narrow piece — a display column, a plant — stands taller
       than a chair; its drawing says so by its shape. */
    const h = aspectOf(tex) < 0.6 ? 1.55 : h0;
    const w = h * aspectOf(tex);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: prep(tex), transparent: true, alphaTest: 0.4, toneMapped: false })
    );
    m.position.set(x, h / 2, z);
    scene.add(m);
    /* Not mirrored under the floor: Amit read the upside-down copies as
       the furniture itself standing on its head — *"הרהיטים הפוכים"*. */
    facing.push(m);
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.15, 0.9),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.01, z + 0.05);
    scene.add(s);
  });

  /*
   * THE PROFESSIONAL, AT WORK IN HIS OWN SHOP.
   *
   * Amit: *"בא לי פה את המקצוען בחנות שלו."* The trade's figure stands
   * in front of the middle mirrors, between the chairs, turning to face
   * you like the furniture does, with a shadow at his feet.
   */
  /* No professional in the room: Amit wants only his own figure inside
     — *"בתוך החנות תשאיר רק את הדמות שלי."* */

  /* The mirror image under the floor. */
  const mirror = new THREE.Group();
  for (const o of reflect) {
    const c = (o as THREE.Mesh).clone();
    const mat = ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).clone();
    mat.color = mat.color.clone().multiplyScalar(0.55);
    (c as THREE.Mesh).material = mat;
    mirror.add(c);
  }
  mirror.scale.y = -1;
  const mirrorFacing: THREE.Mesh[] = [];
  mirror.renderOrder = 0;
  scene.add(mirror);

  /* Dust in the light. */
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
      size: 0.014, map: dot(), transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  scene.add(dust);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
  camera.rotation.order = "YXZ";
  let avatar: THREE.Object3D | null = null;

  return {
    scene,
    camera,
    /* Behind you is the door you came through. */
    maxYaw: (125 / 180) * Math.PI,
    follow(obj) {
      if (avatar) scene.remove(avatar);
      avatar = obj;
      if (obj) scene.add(obj);
    },
    snapshot(renderer, w, h) {
      /* The room as the order sheet shows it: from just inside the door,
         a little back, the professional among his mirrors and shelves. */
      const cam = new THREE.PerspectiveCamera(56, w / h, 0.05, 60);
      cam.position.set(0.2, 1.65, 1.5);
      cam.lookAt(0.95, 1.25, -2.4);
      for (const m of facing) m.rotation.y = Math.atan2(cam.position.x - m.position.x, cam.position.z - m.position.z);
      const hidden = avatar;
      if (hidden) hidden.visible = false;
      const rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      const px = new Uint8Array(w * h * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
      renderer.setRenderTarget(prev);
      rt.dispose();
      if (hidden) hidden.visible = true;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d")!;
      const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
      g.putImageData(img, 0, 0);
      return c.toDataURL("image/jpeg", 0.88);
    },
    update(dt, t, look, stand) {
      /* `stand` arrives as a step from the middle of the doorway area. */
      if (avatar) {
        /*
         * YOU, IN THE ROOM.
         *
         * Amit: *"שירגיש שהדמות בפנים ויראו אותה קצת מהזווית של
         * המצלמה."* The figure stands where you stand and the camera is
         * behind it and a little above, as in the street — kept inside the
         * walls, so near the door it comes in over your shoulder.
         */
        const ax = Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, stand.x * 1.4));
        const az = Math.max(-D / 2 + 1.3, Math.min(D / 2 - 1.0, 0.2 + stand.z * 1.4));
        avatar.position.set(ax, 0, az);
        avatar.rotation.y = look.yaw;
        const fx = -Math.sin(look.yaw), fz = -Math.cos(look.yaw);
        const back = 2.4;
        camera.position.set(
          Math.max(-W / 2 + 0.25, Math.min(W / 2 - 0.25, ax - fx * back)),
          2.2 + Math.sin(t * 0.9) * 0.01,
          Math.max(-D / 2 + 0.25, Math.min(D / 2 - 0.15, az - fz * back))
        );
        camera.rotation.y = look.yaw;
        camera.rotation.x = look.pitch - 0.2;
      } else {
        const x = Math.max(-BOX_STAND.x, Math.min(BOX_STAND.x, stand.x * 1.8));
        const z = Math.max(BOX_STAND.zFar, Math.min(BOX_STAND.zNear, BOX_STAND.zNear + stand.z * 1.8));
        camera.position.set(x, EYE + Math.sin(t * 0.9) * 0.01, z);
        camera.rotation.y = look.yaw;
        camera.rotation.x = look.pitch;
      }
      for (let i = 0; i < facing.length; i++) {
        const m = facing[i]!;
        const ry = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
        m.rotation.y = ry;
        /*
         * A piece the camera is almost standing in shows as a giant cut
         * edge across the bottom of the screen — the paper giving itself
         * away. Closer than a metre and a half it lets you see through it,
         * and closer than eighty centimetres it steps out of the way.
         */
        const near = Math.hypot(camera.position.x - m.position.x, camera.position.z - m.position.z);
        const mm = m.material as THREE.MeshBasicMaterial;
        m.visible = near > 0.8;
        mm.opacity = near >= 1.5 ? 1 : 0.45 + 0.55 * ((near - 0.8) / 0.7);
        if (mirrorFacing[i]) mirrorFacing[i]!.rotation.y = ry;
      }
      /* Breathing, with a real sign's occasional stutter. */
      const flick = Math.sin(t * 23.0) > 0.985 ? 0.35 : 1;
      const breathe = 0.45 + 0.2 * Math.sin(t * 2.1);
      for (const g of glows) g.opacity = breathe * flick;
      const p = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        const s = seed[i]!;
        p.setY(i, p.getY(i) + Math.sin(t * 0.3 + s) * dt * 0.02 + dt * 0.006);
        if (p.getY(i) > H * 0.95) p.setY(i, 0.1);
      }
      p.needsUpdate = true;
    },
    setAspect(a) {
      camera.aspect = a;
      camera.fov = a < 1 ? 78 : 62;
      camera.updateProjectionMatrix();
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
    },
  };
}

/** Very bright AND very saturated: neon, and almost nothing else. */
export function neonMask(t: THREE.Texture): THREE.CanvasTexture | null {
  const img = t.image as CanvasImageSource & { width: number; height: number };
  const w = Math.min(512, img.width), h = Math.max(1, Math.round((img.height / img.width) * w));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  let lit = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!, gg = d[i + 1]!, bl = d[i + 2]!;
    const mx = Math.max(r, gg, bl), mn = Math.min(r, gg, bl);
    const sat = mx ? (mx - mn) / mx : 0;
    /*
     * Neon's hues, not lamplight's. The first version took "bright and
     * saturated" and caught every warmly-lit shelf too — the whole wall
     * glowed and burned out. Lamplight is orange-to-yellow; the tubes on
     * these walls are pink, violet and cyan. So warm hues are excluded.
     */
    let hue = 0;
    if (mx !== mn) {
      if (mx === r) hue = ((gg - bl) / (mx - mn)) * 60;
      else if (mx === gg) hue = (2 + (bl - r) / (mx - mn)) * 60;
      else hue = (4 + (r - gg) / (mx - mn)) * 60;
      if (hue < 0) hue += 360;
    }
    const warm = hue > 15 && hue < 75;
    /* 0.66: a pink WALL is pink too, but pale — (250,160,180) is 0.36;
       a pink TUBE is (255,60,200), 0.76. */
    if (mx > 235 && sat > 0.66 && !warm) { lit++; continue; }
    d[i] = d[i + 1] = d[i + 2] = 0;
  }
  if (lit < w * h * 0.002) return null;
  g.putImageData(id, 0, 0);
  /* A soft halo round each tube, so the glow reaches past its edge. */
  const halo = document.createElement("canvas");
  halo.width = w; halo.height = h;
  const hg = halo.getContext("2d")!;
  hg.filter = "blur(6px)";
  hg.drawImage(c, 0, 0);
  hg.filter = "none";
  hg.globalCompositeOperation = "lighter";
  hg.drawImage(c, 0, 0);
  const tex = new THREE.CanvasTexture(halo);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function aspectOf(t: THREE.Texture): number {
  const img = t.image as { width: number; height: number } | undefined;
  if (!img || !img.height) return 1;
  /* A cut piece carries its own window on the sheet in repeat. */
  return (img.width * t.repeat.x) / (img.height * t.repeat.y);
}

/** The average colour of the top of a drawing, for walls and ceiling without art. */
function edgeTint(t: THREE.Texture): number {
  const img = t.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  c.width = 32; c.height = 4;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return 0x553344;
  g.drawImage(img, 0, 0, img.width, Math.max(2, img.height * 0.08), 0, 0, 32, 4);
  const d = g.getImageData(0, 0, 32, 4).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]!; gg += d[i + 1]!; b += d[i + 2]!; }
  const n = d.length / 4;
  return (Math.round(r / n) << 16) | (Math.round(gg / n) << 8) | Math.round(b / n);
}

function skirtShadow(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
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

export function contactShadow(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 32, 2, 64, 32, 60);
  gr.addColorStop(0, "rgba(0,0,0,0.55)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 64);
  return new THREE.CanvasTexture(c);
}

function dot(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,226,170,1)");
  gr.addColorStop(1, "rgba(255,226,170,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/** Panelled ceiling in the shop's own colour, with recessed downlights. */
function ceilingTex(base: THREE.Color): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 560;
  const g = c.getContext("2d")!;
  const dark = base.clone().multiplyScalar(0.42);
  const mid = base.clone().multiplyScalar(0.6);
  const css = (col: THREE.Color, a = 1) =>
    `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${a})`;
  const bg = g.createRadialGradient(256, 280, 40, 256, 280, 360);
  bg.addColorStop(0, css(mid));
  bg.addColorStop(1, css(dark));
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  /* panels */
  g.strokeStyle = "rgba(0,0,0,0.28)";
  g.lineWidth = 3;
  for (let x = 0; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 560); g.stroke(); }
  for (let y = 0; y <= 560; y += 140) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,0.06)";
  g.lineWidth = 2;
  for (let x = 2; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 560); g.stroke(); }
  /* downlights, each with a warm halo on the ceiling around it */
  for (const [x, y] of [[128, 150], [384, 150], [256, 420], [128, 420], [384, 420], [256, 150]] as Array<[number, number]>) {
    const halo = g.createRadialGradient(x, y, 4, x, y, 70);
    halo.addColorStop(0, "rgba(255,226,170,0.55)");
    halo.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = halo;
    g.fillRect(x - 70, y - 70, 140, 140);
    g.fillStyle = "rgba(40,30,25,0.9)";
    g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff4dc";
    g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A line of warm LED light, strongest in the middle of its height. */
function coveTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, "rgba(255,214,150,0)");
  gr.addColorStop(0.45, "rgba(255,226,175,0.95)");
  gr.addColorStop(0.55, "rgba(255,226,175,0.95)");
  gr.addColorStop(1, "rgba(255,214,150,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(c);
}

/** The shadow a wall has just under the ceiling. */
function shadeTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, "rgba(0,0,0,0.55)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(c);
}

/** Bright at the lamp, gone by the floor. */
function shaftGradient(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,230,185,1)");
  gr.addColorStop(1, "rgba(255,230,185,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(c);
}
