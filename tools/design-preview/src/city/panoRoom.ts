import * as THREE from "three";

/**
 * A SHOP YOU STAND INSIDE, NOT A PICTURE OF ONE.
 *
 * ---------------------------------------------------------------------
 * WHY THIS REPLACES THE BOX
 * ---------------------------------------------------------------------
 * Amit, of every interior so far: *"בתוך החנות זה נראה תמונה ולא חנות
 * עם עומק והיקף מלא שאפשר להסתכל"*, and then what he wants instead:
 * *"פנורמה איכותית שיתן תחושה של וי אר ולא שמסתכלים על תמונה"*, *"חווית
 * חנויות 360 מעלות הכי אמיתית וחיה שאפשר."*
 *
 * The room used to be a box with the drawing on its back wall, which is
 * exactly a photograph at the end of a corridor: turn your head and you
 * see plaster. Here the drawing is a panorama of the whole room — left
 * wall, back wall, right wall, floor and ceiling — wrapped around you on
 * the inside of a cylinder, so turning your head turns you IN the room.
 *
 * ---------------------------------------------------------------------
 * AND WHY ROTATION ALONE WOULD NOT BE ENOUGH
 * ---------------------------------------------------------------------
 * A panorama you can only spin is still a picture — a picture wrapped
 * round your head. What says "space" is parallax: things near you moving
 * across things far from you as you move. So the counter in front of you
 * is a SECOND drawing, on a much closer arc, and the stick moves you a
 * step or so inside the room. Lean left and the counter slides across
 * the shelves behind it; that is the one cue that turns a panorama into
 * a place.
 *
 * Dust hangs in the light and drifts, because a still room reads as a
 * still image, and a room with air in it reads as a room.
 */
export interface PanoRoom {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** How far you may turn either way before the arc runs out, in radians. */
  maxYaw: number;
  /** Look where the viewer is looking, stand where they are standing. */
  update(dt: number, t: number, look: { yaw: number; pitch: number }, stand: { x: number; z: number }): void;
  setAspect(aspect: number): void;
  dispose(): void;
}

/** How far the room reaches around you. Behind you is the door. */
const ARC = (250 / 180) * Math.PI;
/** The walls. Far enough that a step inside the room is small against them. */
const R_WALL = 6;
/** The counter, near enough to move against the walls when you do. */
const R_FORE = 2.5;
/** How far the stick may take you from the middle of the room. */
export const PANO_STAND_RADIUS = 1.2;

export function buildPanoRoom(pano: THREE.Texture, fore?: THREE.Texture): PanoRoom {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0810);

  pano.colorSpace = THREE.SRGBColorSpace;
  pano.wrapS = pano.wrapT = THREE.ClampToEdgeWrapping;
  pano.anisotropy = 8;
  const img = pano.image as { width: number; height: number };
  const aspect = img.width / Math.max(1, img.height);

  /*
   * THE WALLS: the panorama on the inside of a cylinder.
   *
   * Its height is set by the drawing's own proportions — the arc length
   * over the aspect — so nothing is stretched.
   */
  const H = (R_WALL * ARC) / aspect;
  const wallGeo = new THREE.CylinderGeometry(R_WALL, R_WALL, H, 128, 1, true, Math.PI - ARC / 2, ARC);
  /* Seen from inside, a cylinder shows its drawing mirrored and its back
     faces. Flipping x fixes both at once. */
  wallGeo.scale(-1, 1, 1);
  /* Eye height sits a little above the middle of the drawing: these
     rooms are drawn from a standing person's eye, with more floor than
     ceiling in the frame. */
  const eyeOffset = -H * 0.08;
  const walls = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial({ map: pano, toneMapped: false }));
  walls.position.y = eyeOffset;
  scene.add(walls);

  /*
   * CEILING AND FLOOR BEYOND THE DRAWING.
   *
   * A phone held upright sees more height than any panorama is drawn
   * with. Clamping the texture carried the top and bottom rows on up and
   * down, and every ceiling light and floor tile became a vertical streak
   * — Amit's screenshots showed them as curtains. So the edge of the
   * drawing is read, blurred sideways until it has colour but no detail,
   * and faded into the dark: the ceiling continues as a warm glow and
   * the floor as shadow, and neither has anything in it to streak.
   */
  const edgeBand = (
    src: CanvasImageSource & { width: number; height: number },
    fromTop: boolean,
    rows: number
  ): THREE.CanvasTexture => {
    const COLS = 256, TALL = 64;
    const probe = document.createElement("canvas");
    probe.width = COLS; probe.height = rows;
    const pg = probe.getContext("2d", { willReadFrequently: true })!;
    const sh = Math.max(2, Math.round(src.height * 0.05));
    pg.drawImage(src, 0, fromTop ? 0 : src.height - sh, src.width, sh, 0, 0, COLS, rows);
    const d = pg.getImageData(0, 0, COLS, rows).data;
    const col: Array<[number, number, number]> = [];
    for (let x = 0; x < COLS; x++) {
      let r = 0, g = 0, bl = 0, n = 0;
      for (let dx = -10; dx <= 10; dx++) {
        const xx = Math.min(COLS - 1, Math.max(0, x + dx));
        for (let y = 0; y < rows; y++) {
          const i = (y * COLS + xx) * 4;
          if (d[i + 3]! < 128) continue;
          r += d[i]!; g += d[i + 1]!; bl += d[i + 2]!; n++;
        }
      }
      col.push(n ? [r / n, g / n, bl / n] : [30, 22, 34]);
    }
    const out = document.createElement("canvas");
    out.width = COLS; out.height = TALL;
    const og = out.getContext("2d")!;
    const im = og.createImageData(COLS, TALL);
    for (let y = 0; y < TALL; y++) {
      /* t: 0 at the drawing's edge, 1 far from it */
      const t = fromTop ? 1 - y / (TALL - 1) : y / (TALL - 1);
      const dark = Math.min(1, t * 1.6);
      for (let x = 0; x < COLS; x++) {
        const [r, g, bl] = col[x]!;
        const i = (y * COLS + x) * 4;
        im.data[i] = r * (1 - dark) + 11 * dark;
        im.data[i + 1] = g * (1 - dark) + 8 * dark;
        im.data[i + 2] = bl * (1 - dark) + 16 * dark;
        im.data[i + 3] = 255;
      }
    }
    og.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const BAND = H * 0.45;
  const addBand = (tex: THREE.Texture, y: number, r: number, arc: number, h: number) => {
    const g = new THREE.CylinderGeometry(r, r, h, 96, 1, true, Math.PI - arc / 2, arc);
    g.scale(-1, 1, 1);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.y = y;
    scene.add(m);
  };
  const panoSrc = pano.image as CanvasImageSource & { width: number; height: number };
  addBand(edgeBand(panoSrc, true, 8), eyeOffset + H / 2 + BAND / 2, R_WALL, ARC, BAND);
  addBand(edgeBand(panoSrc, false, 8), eyeOffset - H / 2 - BAND / 2, R_WALL, ARC, BAND);

  /*
   * THE COUNTER: the second drawing, close, below your eyes.
   *
   * Sized by its own aspect over a narrower arc, and sitting low, where a
   * counter is when you stand at it.
   */
  if (fore) {
    fore.colorSpace = THREE.SRGBColorSpace;
    fore.wrapS = fore.wrapT = THREE.ClampToEdgeWrapping;
    const fImg = fore.image as { width: number; height: number };
    const fArc = (150 / 180) * Math.PI;
    const fH = (R_FORE * fArc) / (fImg.width / Math.max(1, fImg.height));
    const foreGeo = new THREE.CylinderGeometry(R_FORE, R_FORE, fH, 96, 1, true, Math.PI - fArc / 2, fArc);
    foreGeo.scale(-1, 1, 1);
    const counter = new THREE.Mesh(
      foreGeo,
      new THREE.MeshBasicMaterial({ map: fore, transparent: true, alphaTest: 0.35, toneMapped: false })
    );
    const counterY = -1.05 - fH / 2 + fH * 0.62;
    counter.position.y = counterY;
    scene.add(counter);
    /*
     * And the counter's face on down to the floor, as colour read from
     * its own bottom edge — not by clamping the texture, which smeared a
     * hanging vine into a green streak under the counter.
     */
    const face = H * 0.5;
    addBand(
      edgeBand(fore.image as CanvasImageSource & { width: number; height: number }, false, 6),
      counterY - fH / 2 - face / 2 + 0.002,
      R_FORE,
      fArc,
      face
    );
  }

  /* Dust in the light: a few hundred motes, drifting, warm. */
  const N = 260;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * 4.2;
    pos[i * 3] = Math.sin(a) * r;
    pos[i * 3 + 1] = -1.4 + Math.random() * 3.2;
    pos[i * 3 + 2] = Math.cos(a) * r;
    seed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement("canvas");
  dot.width = dot.height = 32;
  {
    const g = dot.getContext("2d")!;
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,226,170,1)");
    gr.addColorStop(1, "rgba(255,226,170,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  }
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      size: 0.035, map: new THREE.CanvasTexture(dot), transparent: true,
      opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  scene.add(dust);

  const camera = new THREE.PerspectiveCamera(64, 1, 0.05, 50);
  camera.rotation.order = "YXZ";

  /* Never far enough round to see the gap behind you. */
  const maxYaw = ARC / 2 - 0.55;
  const at = new THREE.Vector2();

  return {
    scene,
    camera,
    maxYaw,
    update(dt, t, look, stand) {
      at.set(stand.x, stand.z);
      /* A breath, so standing still is not a freeze-frame. */
      camera.position.set(at.x, Math.sin(t * 0.9) * 0.012, at.y);
      camera.rotation.y = look.yaw;
      camera.rotation.x = look.pitch;
      const p = dustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < N; i++) {
        const s = seed[i]!;
        p.setY(i, p.getY(i) + Math.sin(t * 0.3 + s) * dt * 0.02 + dt * 0.006);
        if (p.getY(i) > 1.9) p.setY(i, -1.4);
        p.setX(i, p.getX(i) + Math.cos(t * 0.2 + s) * dt * 0.01);
      }
      p.needsUpdate = true;
    },
    setAspect(a) {
      camera.aspect = a;
      /* A phone held upright gets a wider vertical view, or it would be
         looking at the room through a letterbox turned on its side. */
      camera.fov = a < 1 ? 74 : 60;
      camera.updateProjectionMatrix();
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose();
      });
    },
  };
}
