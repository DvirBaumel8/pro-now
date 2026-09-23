import * as THREE from "three";

import { asphalt, glow, neon, paving, plaster, wordmark } from "./textures";

/**
 * THE STREET, WITH VOLUME AND WITH NIGHT IN IT.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL
 * ---------------------------------------------------------------------
 * Amit, after a day of the painted world: *"זה ככ ישן ולא בכיוון שלי...
 * אני חייב שזה יהיה מציאות מדומה מכל הבחינות."*
 *
 * Every complaint he made — the camera angle is old, the figure is
 * tiny, there is no life, the sponsor's shop is a black rectangle — is
 * one symptom of one cause. The world was a PAINTING with cutouts
 * standing on it, which is the technique of 1998: there is one painted
 * viewpoint, so the camera cannot move; the figure must match the
 * painting's scale, so it is small; nothing can be lit, because the
 * light is already in the paint.
 *
 * This is the same street as geometry. The shopfronts he commissioned
 * are still the shopfronts — they are buildings now rather than
 * stickers on a photograph — and the two things they were missing, a
 * camera and a light, are what a scene gives them.
 *
 * ---------------------------------------------------------------------
 * THE THREE THINGS THAT MAKE IT A STREET AND NOT A MODEL
 * ---------------------------------------------------------------------
 * 1. IT IS CONTINUOUS. The first build put the seven shops at their
 *    map coordinates, 32 metres apart, and 21 of every 32 metres was
 *    empty pavement with black sky behind it. Seven kiosks in a field.
 *    A street is a WALL with doors in it, so the bays between the
 *    drawings are filled with ordinary buildings, and the drawings are
 *    what you notice because the ordinary is there to notice them
 *    against.
 *
 * 2. IT IS NARROW. Sixteen metres between facades, with the road in
 *    the middle. Wider than that and a phone screen holds one pavement
 *    and some sky; at this width you see your own shopfronts close on
 *    one side, the far ones across the road, and headlights passing
 *    between. The first build was 30 metres across and the camera
 *    could only ever frame paving.
 *
 * 3. THE LIGHT COMES FROM THINGS IN IT. Lamps, shop windows, neon,
 *    headlights, lit flats upstairs. Nothing is lit by a general
 *    brightness turned up until the model is visible — that is the
 *    exact move that produces the flat grey look he called "old".
 *    Pools of warm light on dark wet stone ARE the night; the dark is
 *    not the absence of the look, it is the look.
 */

export interface ShopSpec {
  id: string;
  he: string;
  facade: string;
  interior?: string;
  /** Distance along the street. Negative is further from the start. */
  z: number;
  /** -1 puts it on the left pavement, 1 on the right. */
  side: -1 | 1;
  sponsor?: boolean;
  /** The neon over the door, drawn rather than photographed. */
  neonColour?: string;
}

export interface StreetHandles {
  scene: THREE.Scene;
  shops: Array<ShopSpec & { doorway: THREE.Vector3 }>;
  /** Every warm light in the street, for tinting the figure. */
  lamps: THREE.Vector3[];
  update: (dt: number, elapsed: number, camera: THREE.Camera) => void;
}

/* ---------------------------------------------------------------------
   THE PLAN OF THE STREET, IN METRES
   ---------------------------------------------------------------------
   Road down the middle, a pavement each side, buildings on the kerb
   line. The previous version had the road at x = 13.9 while the
   right-hand shops stood at x = 7.4 — the shops backed onto the
   carriageway and faced a pavement nine metres wide with a tree in the
   middle of it. Nothing about the lighting could have fixed that.
   --------------------------------------------------------------------- */
/** The carriageway runs from -ROAD_HALF to +ROAD_HALF. */
export const ROAD_HALF = 3.3;
/** Where the kerb runs, both sides. */
export const KERB_X = ROAD_HALF;
/**
 * How wide one pavement is.
 *
 * 4.8 was a pavement, arithmetically, and useless: the lamp column and
 * the tree tub take 1.5 metres of it, which left the walker 1.3 metres
 * from a trunk, and a screenshot came back as a wall of leaves with a
 * black pole through it. Street furniture needs its own metre before
 * the walking width starts.
 */
export const PAVEMENT = 6.4;
/** The building line. Facades stand here, facing the middle. */
export const FRONT_X = KERB_X + PAVEMENT;
/** How far a pedestrian may get from the centre line before the wall. */
export const WALK_LIMIT = FRONT_X - 0.9;
export const STREET_LENGTH = 300;
/**
 * WHERE YOU ARRIVE.
 *
 * Exported because two things need to agree about it: the camera, which
 * puts you here, and the crowd, which must not. The first frame of the
 * street had a stranger standing inside the player — funny once, and
 * the first thing anybody sees.
 */
export const SPAWN = { x: 6.3, z: STREET_LENGTH / 2 - 46 } as const;
/** One building's frontage along the street. */
const BAY = 11.5;

const DARK_SKY = 0x2a2448;

/* ---------------------------------------------------------------------
   NEON, DRAWN
   --------------------------------------------------------------------- */

/** The brand's name bent into tube, which is what a neon sign is. */
function textSign(label: string, colour: string): THREE.Texture {
  return neon(
    (x, w, h) => {
      x.font = `700 ${Math.round(h * 0.52)}px "Heebo", "Arial Hebrew", system-ui, sans-serif`;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.strokeText(label, w / 2, h / 2);
      x.fillText(label, w / 2, h / 2);
    },
    colour,
    1024,
    256
  );
}

/**
 * LUST'S BOTTLE.
 *
 * Amit: *"החנות של לאסט עם השחור ובחסות נראית מזעזע במקום שיהיה איזה
 * בקבוק בושם שלהם דולק בנאון גדול ומרשים."*
 *
 * So it is drawn as a sign-maker would bend it: one continuous outline
 * for the flask, a cap, the atomiser and its bulb, three little bursts
 * of spray, and the name under it. Nothing here is their logo — a
 * brand's mark is theirs to supply — it is a perfume bottle in light.
 */
function perfumeSign(colour: string): THREE.Texture {
  return neon(
    (x, w, h) => {
      const cx = w * 0.5;
      /* flask */
      x.beginPath();
      x.moveTo(cx - 118, h * 0.42);
      x.bezierCurveTo(cx - 150, h * 0.62, cx - 140, h * 0.84, cx - 92, h * 0.88);
      x.lineTo(cx + 92, h * 0.88);
      x.bezierCurveTo(cx + 140, h * 0.84, cx + 150, h * 0.62, cx + 118, h * 0.42);
      x.lineTo(cx + 118, h * 0.32);
      x.lineTo(cx - 118, h * 0.32);
      x.closePath();
      x.stroke();
      /* shoulder and neck */
      x.beginPath();
      x.moveTo(cx - 52, h * 0.32);
      x.lineTo(cx - 52, h * 0.22);
      x.lineTo(cx + 52, h * 0.22);
      x.lineTo(cx + 52, h * 0.32);
      x.stroke();
      /* cap */
      x.beginPath();
      x.moveTo(cx - 62, h * 0.22);
      x.lineTo(cx - 56, h * 0.1);
      x.lineTo(cx + 56, h * 0.1);
      x.lineTo(cx + 62, h * 0.22);
      x.closePath();
      x.stroke();
      /* atomiser arm and bulb */
      x.beginPath();
      x.moveTo(cx + 62, h * 0.16);
      x.lineTo(cx + 132, h * 0.16);
      x.stroke();
      x.beginPath();
      x.arc(cx + 162, h * 0.17, 27, 0, Math.PI * 2);
      x.stroke();
      /* the spray */
      for (let i = 0; i < 3; i += 1) {
        const a = -0.5 + i * 0.36;
        x.beginPath();
        x.moveTo(cx - 70, h * 0.15);
        x.lineTo(cx - 70 - Math.cos(a) * 78, h * 0.15 - Math.sin(a) * 78);
        x.stroke();
      }
      /* the name, inside the flask */
      x.font = `700 ${Math.round(h * 0.2)}px "Georgia", serif`;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.strokeText("Lust", cx, h * 0.63);
      x.fillText("Lust", cx, h * 0.63);
    },
    colour,
    640,
    640
  );
}

export function buildStreet(
  specs: readonly ShopSpec[],
  textures: Record<string, THREE.Texture | undefined>
): StreetHandles {
  const scene = new THREE.Scene();
  const glowTex = glow();
  const lamps: THREE.Vector3[] = [];
  /* Everything that has to move, pulse or flicker, collected once. */
  const ticking: Array<(dt: number, t: number) => void> = [];

  /*
   * ---------------------------------------------------------------
   * SIXTY LIGHTS, SIX LAMPS
   * ---------------------------------------------------------------
   * Measured in the browser: five frames a second. A street that looks
   * like this and runs like that is worth nothing, and the cause was
   * not the geometry.
   *
   * three.js compiles the light count into every material's shader and
   * every lit fragment loops over ALL of them. Eleven shops with a
   * spill and a sign, twenty-six street lamps, nine lit cafés and
   * eight cars came to about sixty point lights, so every pixel of
   * every wall was doing sixty attenuation calculations. Nothing else
   * in the scene came close to costing that.
   *
   * A street does not need sixty lights because you cannot see sixty
   * lights: the ones fifty metres behind you contribute nothing you
   * would notice. So there are SIX real point lights, and they are
   * lent — every few frames, the six emitters nearest the camera take
   * them, and the rest keep their halo sprites and their pools on the
   * pavement, which are additive planes and cost nothing.
   *
   * What you lose is a wall lit by a lamp far behind you. What you
   * keep is the whole look, at a frame rate.
   */
  interface Emitter {
    pos: THREE.Vector3;
    colour: THREE.Color;
    intensity: number;
    distance: number;
    /** Cars move; their emitter is re-read from the group each pass. */
    follow?: THREE.Object3D;
    offsetZ?: number;
  }
  const emitters: Emitter[] = [];
  function emit(
    x: number, y: number, z: number,
    colour: THREE.ColorRepresentation, intensity: number, distance: number
  ) {
    emitters.push({
      pos: new THREE.Vector3(x, y, z),
      colour: new THREE.Color(colour),
      intensity,
      distance,
    });
  }

  /*
   * Eight, not six. Six left the street visibly dark past about
   * twenty-five metres, because on a pavement with a lamp every
   * eleven metres and a shop every eleven, six is barely the block
   * you are standing in. Eight is still a seventh of what was there.
   */
  const POOL = 10;
  const pool: THREE.PointLight[] = [];
  for (let i = 0; i < POOL; i += 1) {
    const l = new THREE.PointLight(0xffffff, 0, 20, 2);
    scene.add(l);
    pool.push(l);
  }

  /*
   * ---------------------------------------------------------------
   * SIGNS SEEN EDGE-ON
   * ---------------------------------------------------------------
   * Every sign here is a plane with no thickness and additive
   * blending, and a plane seen edge-on is one pixel wide — but an
   * additive pixel at full brightness, so it does not disappear, it
   * becomes a razor-thin vertical streak hanging in the air. A
   * screenshot standing under Lust's bottle had one of these above
   * the roofline looking exactly like a rendering fault.
   *
   * A real sign is not infinitely thin and stops being readable long
   * before it is edge-on, so they are faded out by how square-on the
   * viewer is to them. Registered here and driven from `update`,
   * because the camera is the only thing that knows.
   */
  const flatSigns: Array<{
    mesh: THREE.Mesh | THREE.Sprite;
    material: THREE.Material & { opacity: number };
    base: number;
  }> = [];
  const _n = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _to = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  function faceFade(mesh: THREE.Mesh, base: number) {
    flatSigns.push({
      mesh,
      material: mesh.material as THREE.Material & { opacity: number },
      base,
    });
  }
  /* The glow AROUND a sign is not faded: a neon tube's halo in damp
     air is visible from the side, which is most of why you can tell
     there is a sign round the corner. Only the lettering goes. */

  /* ---------------------------------------------------------------
     SKY AND AIR
     A flat colour behind a street reads as a backdrop; a gradient
     reads as air. Fog is what makes a street feel long — the far end
     dissolves instead of ending — but it has to be thin enough that
     the next shop along is still a shop. At 0.018 the building 40
     metres away was half gone.
     --------------------------------------------------------------- */
  const sky = document.createElement("canvas");
  sky.width = 4;
  sky.height = 256;
  {
    const x = sky.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 256);
    /*
     * IT IS EIGHT IN THE EVENING, NOT TWO IN THE MORNING.
     *
     * Amit: *"בא לי שהרחוב יהיה טיפה יותר מואר ושמח ולא מפחיד וחשוך,
     * יותר את סגנון הרחוב שעיצבנו בתמונה."*
     *
     * He is right and I know exactly how it happened: I built a
     * cinematic night — nearly everything black, light only from the
     * lamps. That photographs beautifully in a single frame and is a
     * grim place to spend time in, and the painted world he
     * commissioned is a WARM EVENING, not a night.
     *
     * This is not turning the brightness up, which flattens a scene
     * into a grey model. It is moving the hour: a sky that still has
     * light left in it, a horizon that glows, haze that is blue
     * rather than black, and twice as many shopfronts with their
     * lights on.
     */
    g.addColorStop(0, "#0b1030");
    g.addColorStop(0.42, "#1d2050");
    g.addColorStop(0.72, "#4a3364");
    g.addColorStop(0.9, "#8a4f63");
    g.addColorStop(1, "#c07a5e");
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 256);
  }
  const skyTex = new THREE.CanvasTexture(sky);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.FogExp2(DARK_SKY, 0.0125);

  /*
   * STARS AND A CITY BEYOND THE END OF THE STREET.
   *
   * The gradient alone gives a sky with nothing in it, and the street
   * ends in a wall of fog with nothing behind it — which reads as the
   * edge of the model, because that is what it is. A field of points
   * above and a band of lit towers at the vanishing point cost almost
   * nothing and put a world on the other side of the fog.
   */
  {
    const pts = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 150 + Math.random() * 60;
      pts[i * 3] = Math.cos(a) * r;
      pts[i * 3 + 1] = 45 + Math.random() * 110;
      pts[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xcfd4ff, size: 0.9, sizeAttenuation: true,
        transparent: true, opacity: 0.75, depthWrite: false, fog: false,
      })
    );
    scene.add(stars);

    /* The towers. Flat boxes with lit windows painted on, far enough
       away that nobody ever gets to see they have no sides. */
    const towerWin = (() => {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 256;
      const x = c.getContext("2d")!;
      x.fillStyle = "#0a0814";
      x.fillRect(0, 0, 64, 256);
      for (let r = 0; r < 30; r += 1)
        for (let col = 0; col < 6; col += 1)
          if (Math.random() > 0.55) {
            x.fillStyle = `rgba(255,${180 + Math.random() * 60},${110 + Math.random() * 80},${0.4 + Math.random() * 0.5})`;
            x.fillRect(4 + col * 10, 6 + r * 8, 6, 4);
          }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    /*
     * Far, small and dim. At 60 metres past the end of the street and
     * full brightness they loomed over the rooftops like a painted
     * backdrop in a theatre — the exact "sticker on a photograph"
     * effect this whole rewrite exists to get away from. Distance is
     * what makes a skyline read as distance.
     */
    for (const far of [-1, 1] as const) {
      for (let i = 0; i < 22; i += 1) {
        const w = 9 + Math.random() * 15;
        const h = 26 + Math.random() * 62;
        const t = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({
            map: towerWin, transparent: true, fog: false, toneMapped: false,
            color: 0x8e8aa8, opacity: 0.72, depthWrite: false,
          })
        );
        t.position.set(
          (Math.random() - 0.5) * 520,
          h / 2 + 1,
          far * (STREET_LENGTH / 2 + 220 + Math.random() * 260)
        );
        if (far > 0) t.rotation.y = Math.PI;
        scene.add(t);
      }
    }
  }

  /* ---------------------------------------------------------------
     LIGHT

     PHYSICAL UNITS, WHICH COST AN HOUR TO LEARN.

     three.js stopped scaling lights for you at r155: a PointLight's
     intensity is candela now and a DirectionalLight's is lux. The
     numbers that lit a scene under the old convention — 0.3, 16 —
     mean in these units roughly what they sound like, which is
     nothing, and the first build came out a black rectangle with three
     faint smudges on it. The second, corrected by multiplying until
     something appeared, came out white.

     What settles it is not the light alone but the pair: exposure at
     1.0 and lamps in the low hundreds of candela. Exposure above 1 on
     a dark scene lifts the shadows, which sounds like the thing to do
     and is how the pavement ended up looking like a beach.
     --------------------------------------------------------------- */
  scene.add(new THREE.HemisphereLight(0x8290d0, 0x3d3140, 2.15));
  const moon = new THREE.DirectionalLight(0xb9c4ee, 1.45);
  moon.position.set(-34, 50, 26);
  /*
   * NO SHADOW MAP.
   *
   * A 2048² map over a hundred-and-twenty-metre street meant a second
   * depth pass across every building, lamp, tree and passer-by in it,
   * for a moon shadow that the street lamps mostly wash out anyway. On
   * a night street the shadows that read are the CONTACT ones — the
   * dark under a figure's feet, under a car, at the base of a lamp —
   * and those are drawn directly, where the eye looks for them.
   *
   * Kept as a light, dropped as a caster.
   */
  scene.add(moon);

  /* ---------------------------------------------------------------
     GROUND
     Wet, which is most of what makes a night street photograph well:
     a low roughness picks up a long specular streak from every lamp,
     and that streak is what the eye reads as "it rained".
     --------------------------------------------------------------- */
  const pave = new THREE.Mesh(
    new THREE.PlaneGeometry(FRONT_X * 2 + 22, STREET_LENGTH),
    new THREE.MeshStandardMaterial({ map: paving(), roughness: 0.45, metalness: 0.08 })
  );
  pave.rotation.x = -Math.PI / 2;
  pave.receiveShadow = true;
  scene.add(pave);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF * 2, STREET_LENGTH),
    new THREE.MeshStandardMaterial({ map: asphalt(), roughness: 0.22, metalness: 0.35 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.011;
  road.receiveShadow = true;
  scene.add(road);

  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x7d7488, roughness: 0.7 });
  for (const sx of [-1, 1] as const) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, STREET_LENGTH), kerbMat);
    k.position.set(KERB_X * sx, 0.14, 0);
    k.receiveShadow = true;
    scene.add(k);
  }

  /* ---------------------------------------------------------------
     THE TERRACE

     Every bay along both sides gets a building. Where a shop's z falls
     inside a bay, the building IS his drawing; everywhere else it is
     an ordinary block with lit flats over a shuttered front. The
     ordinary ones are the reason the drawings read as shops rather
     than as exhibits.
     --------------------------------------------------------------- */
  const wallTints = ["#4a3a3c", "#3d3344", "#54423a", "#40374e", "#5a4640"];
  const wallMats = wallTints.map(
    (t) => new THREE.MeshStandardMaterial({ map: plaster(t), roughness: 0.94 })
  );
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x120e1a, roughness: 0.9 });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x2a2433,
    roughness: 0.55,
    metalness: 0.4,
  });
  const shops: Array<ShopSpec & { doorway: THREE.Vector3 }> = [];

  /** A window that may be somebody's lit flat. */
  function flat(g: THREE.Group, x: number, y: number, lit: boolean) {
    const m = new THREE.MeshStandardMaterial({
      color: lit ? 0xffd9a0 : 0x0b0913,
      emissive: lit ? 0xffb15e : 0x000000,
      emissiveIntensity: lit ? 1.9 : 0,
      roughness: 0.25,
      metalness: 0.35,
    });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.85), m);
    w.position.set(x, y, 0.07);
    g.add(w);
    /* A frame, so it is a window and not a bright rectangle. */
    const f = new THREE.Mesh(new THREE.BoxGeometry(1.76, 2.1, 0.12), trimMat);
    f.position.set(x, y, 0.02);
    g.add(f);
    if (lit && Math.random() > 0.72) {
      /* One flat in four has a television in it. */
      ticking.push((_dt, t) => {
        m.emissiveIntensity = 1.2 + Math.sin(t * 7.3 + x) * 0.35 + Math.sin(t * 2.1) * 0.2;
      });
    }
  }

  /** A plain building, for the bays between his shops. */
  function ordinary(side: -1 | 1, z: number, seed: number) {
    const g = new THREE.Group();
    g.position.set(FRONT_X * side, 0, z);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

    const storeys = 3 + (seed % 3);
    const h = 4.2 + storeys * 2.9;
    const depth = 11;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(BAY, h, depth),
      wallMats[seed % wallMats.length]!
    );
    block.position.set(0, h / 2, -depth / 2 - 0.08);
    block.castShadow = block.receiveShadow = true;
    g.add(block);

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(BAY + 0.5, 0.65, depth + 0.4), trimMat);
    parapet.position.set(0, h + 0.3, -depth / 2 - 0.08);
    parapet.castShadow = true;
    g.add(parapet);

    /*
     * THE GROUND FLOOR, AND WHY A THIRD OF THEM ARE OPEN.
     *
     * A terrace of shuttered fronts is a street after closing time,
     * and that is a specific, dead-feeling place. Roughly one bay in
     * three is a lit window instead — a café, a kiosk, somewhere with
     * its lights on — and those are what put warm rectangles down the
     * whole length of the street instead of only under the lamps.
     *
     * None of them is named and none of them is a PRO NOW trade. They
     * are the city the marketplace stands in, not the marketplace.
     */
    const open = seed % 2 === 1;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(BAY - 2.4, 0.5, 0.8), trimMat);
    lintel.position.set(-0.5, 3.9, 0.35);
    lintel.castShadow = true;
    g.add(lintel);

    if (open) {
      const warmth = [0xffc88a, 0xffd9a8, 0xb9e2ff, 0xffd0b0, 0xc9f0d8][seed % 5]!;
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(BAY - 3.4, 3.2),
        new THREE.MeshStandardMaterial({
          color: warmth,
          emissive: warmth,
          emissiveIntensity: 0.95,
          roughness: 0.15,
          metalness: 0.5,
        })
      );
      glass.position.set(-0.5, 2.0, 0.1);
      g.add(glass);
      /* Mullions, so it is a shopfront and not a lightbox. */
      for (const mx of [-2.6, 0, 2.6]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.2), trimMat);
        m.position.set(-0.5 + mx, 2.0, 0.16);
        g.add(m);
      }
      emit(FRONT_X * side - side * 2.0, 2.2, z - side * -0.5, warmth, 110, 13);
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial({
          map: glowTex, color: warmth, transparent: true, opacity: 0.2,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(-0.5, 0.03, 2.6);
      g.add(pool);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(BAY - 2.8, 0.14, 1.6),
        new THREE.MeshStandardMaterial({
          /* Awnings carry most of the colour a street has by day and
             nearly all of the cheer it has by night. */
          color: [0xa3324a, 0x2d5f86, 0x3f7a4a, 0xc0783a, 0x6d4a8f][seed % 5]!,
          roughness: 0.85,
        })
      );
      awning.position.set(-0.5, 4.25, 0.95);
      awning.rotation.x = 0.12;
      awning.castShadow = true;
      g.add(awning);
    } else {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(BAY - 3.4, 3.4, 0.3), shutterMat);
      shutter.position.set(-0.5, 1.85, 0.06);
      g.add(shutter);
    }

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.9, 0.22), trimMat);
    door.position.set(BAY / 2 - 1.5, 1.45, 0.08);
    g.add(door);

    for (let s = 0; s < storeys; s += 1) {
      for (let c = -1; c <= 1; c += 1) {
        flat(g, c * 3.5, 5.9 + s * 2.9, Math.random() > 0.3);
      }
      /* A balcony every other storey, which is what this city has. */
      if (s % 2 === 1) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(BAY - 2, 0.9, 0.16), trimMat);
        rail.position.set(0, 5.1 + s * 2.9, 0.82);
        g.add(rail);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(BAY - 2, 0.16, 1.7), trimMat);
        slab.position.set(0, 4.7 + s * 2.9, 0.45);
        slab.castShadow = true;
        g.add(slab);
      }
    }
    scene.add(g);
  }

  /** One of his shops: the drawing is the building. */
  function shopBay(s: ShopSpec) {
    const g = new THREE.Group();
    const x = FRONT_X * s.side;
    g.position.set(x, 0, s.z);
    g.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;

    const tex = textures[s.facade];
    let faceH = 8.4;
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      const img = tex.image as { width: number; height: number };
      /*
       * ---------------------------------------------------------
       * A SHOPFRONT IS A HEIGHT, NOT A FILE'S ASPECT RATIO
       * ---------------------------------------------------------
       * Amit: *"שהכל יהיה פרופורציונלי למציאות."*
       *
       * Every other dimension in this street is a real measurement —
       * the road is 6.6 metres, a storey is 2.9, a lamp is 5.4, a car
       * is 4.3 long, the walker is 1.78. The shopfronts were the one
       * exception: each drawing was stretched to fill the 12.1-metre
       * bay and whatever height came out, came out. Measured across
       * the eleven delivered files that is 7.96m for the car shop and
       * 10.06m for the repairs shop — the SAME kind of building,
       * two-thirds of a storey apart, decided by nothing but how the
       * artist happened to crop the canvas.
       *
       * So the HEIGHT is the fixed quantity now, between 8.0 and 8.9
       * metres, which is a two-storey shop building; the width follows
       * from the drawing's own aspect. Nothing is squashed — a
       * drawing outside the band is scaled down whole, not distorted,
       * because a stretched door stops being a door.
       *
       * The carcass behind is 9.1m wide and every result is wider than
       * that, so no drawing shrinks far enough to expose it.
       */
      const SHOPFRONT_H = { min: 8.0, max: 8.9 };
      const aspect = img.width / img.height;
      let w = BAY + 0.6;
      faceH = w / aspect;
      if (faceH > SHOPFRONT_H.max) {
        faceH = SHOPFRONT_H.max;
        w = faceH * aspect;
      } else if (faceH < SHOPFRONT_H.min) {
        faceH = SHOPFRONT_H.min;
        w = faceH * aspect;
      }
      /*
       * THE DRAWING IS LIT BY THE STREET, NOT PRINTED ON IT.
       *
       * It was a MeshBasicMaterial — unlit, full brightness — which
       * means the one thing in the scene that ignored the night was
       * the thing the night was built for. On a screenshot the
       * shopfronts glowed like decals on a dark photograph, which is
       * precisely the complaint that started this rewrite: *"רואים
       * שהיא מודבקת."*
       *
       * Standard material, so the lamps and the shop's own spill fall
       * across it and the far ones go into the fog with everything
       * else. The drawing's own painted light is kept by feeding the
       * same texture back as an emissive map at about a third — so a
       * window the artist painted as lit stays lit, and the brickwork
       * around it does not.
       */
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(w, faceH),
        new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: 0xffffff,
          emissiveIntensity: 0.55,
          transparent: true,
          alphaTest: 0.35,
          roughness: 0.82,
          metalness: 0.04,
        })
      );
      face.receiveShadow = true;
      face.position.set(0, faceH / 2, 0.42);
      g.add(face);
    }

    /*
     * A CARCASS BEHIND THE DRAWING, NARROWER THAN IT.
     *
     * The drawings are three-quarter views with their own roofs and
     * their own silhouettes, so a block the same size behind one
     * shows through wherever the art is transparent — which is the
     * sky around the roof, exactly where it is most obvious. Narrower
     * and shorter, it gives the drawing depth at its edges and stays
     * inside it everywhere else.
     */
    const depth = 11;
    const carcass = new THREE.Mesh(
      new THREE.BoxGeometry(BAY - 2.4, Math.max(3.4, faceH - 1.6), depth),
      wallMats[1]!
    );
    carcass.position.set(0, Math.max(3.4, faceH - 1.6) / 2, -depth / 2 - 0.05);
    carcass.castShadow = carcass.receiveShadow = true;
    g.add(carcass);

    /* ----- the sign over the door ----- */
    const colour = s.neonColour ?? (s.sponsor ? "#ff3d63" : "#7ad7ff");
    const c3 = new THREE.Color(colour);

    if (s.sponsor) {
      /*
       * The bottle, mounted on a bracket clear of the facade, big
       * enough to be the thing you see from the far end of the street.
       */
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 4.4),
        new THREE.MeshBasicMaterial({
          map: perfumeSign(colour),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        })
      );
      sign.position.set(0, faceH + 2.6, 1.5);
      g.add(sign);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: c3, transparent: true, opacity: 0.5,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      halo.scale.set(13, 13, 1);
      halo.position.copy(sign.position);
      g.add(halo);

      /* It breathes, the way a gas tube does, and never blinks off:
         a sponsor's sign that flickers reads as broken, not as alive. */
      /* It breathes rather than blinks — see above. The breath is
         applied to the BASE brightness, which the edge-on fade then
         scales, so the two do not fight over the same number. */
      const entry = {
        mesh: sign as THREE.Mesh,
        material: sign.material as THREE.MeshBasicMaterial,
        base: 0.9,
      };
      flatSigns.push(entry);
      ticking.push((_dt, t) => {
        const k = 0.86 + Math.sin(t * 1.9) * 0.1 + Math.sin(t * 5.7) * 0.04;
        entry.base = k;
        halo.material.opacity = 0.34 + k * 0.22;
      });

      emit(x - s.side * 2.6, faceH + 2.4, s.z, c3, 320, 26);
      lamps.push(new THREE.Vector3(x, faceH + 2.4, s.z));
    } else {
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(6.6, 1.65),
        new THREE.MeshBasicMaterial({
          map: textSign(s.he, colour),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        })
      );
      sign.position.set(0, faceH + 1.1, 1.1);
      g.add(sign);
      faceFade(sign, 1);
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: c3, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      halo.scale.set(9, 5, 1);
      halo.position.copy(sign.position);
      g.add(halo);
      emit(x - s.side * 2, faceH + 0.9, s.z, c3, 130, 18);
    }

    /*
     * ---------------------------------------------------------------
     * THE PROJECTING SIGN, WHICH IS WHY A HIGH STREET LOOKS LIKE ONE
     * ---------------------------------------------------------------
     * A sign flat on the facade faces ACROSS the street. Walk down the
     * street and you see all of them edge-on — which is exactly what
     * the first build did, and why a screenshot down the pavement
     * showed a canyon of blank wall with the shops invisible until you
     * were level with them.
     *
     * Every real shopping street solves this the same way: a second
     * sign on a bracket, at right angles to the wall, hanging over the
     * pavement. It faces the people walking towards it. It is the
     * single cheapest thing here and it does more than the lighting.
     *
     * Double-sided, because it is seen from both directions.
     */
    /*
     * The arm reaches out over the pavement and the sign HANGS from
     * it on two short drops. The first attempt braced the sign with a
     * single stay at its own centre, which put a black bar straight
     * down the middle of the word — a sign-maker would never, and a
     * screenshot showed exactly why.
     */
    const ARM = 2.5;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, ARM), trimMat);
    bracket.position.set(0, 6.9, ARM / 2);
    g.add(bracket);
    const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.18), trimMat);
    wallPlate.position.set(0, 6.9, 0.12);
    g.add(wallPlate);

    const bladeH = s.sponsor ? 2.6 : 1.2;
    const bladeW = s.sponsor ? 2.3 : 2.2;
    const bladeZ = ARM / 2;
    const bladeTop = 6.72;
    for (const dz of [-bladeW / 2 + 0.16, bladeW / 2 - 0.16]) {
      const drop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), trimMat);
      drop.position.set(0, bladeTop + 0.1, bladeZ + dz);
      g.add(drop);
    }

    /*
     * TWO FACES, NOT ONE DOUBLE-SIDED ONE.
     *
     * `DoubleSide` shows the same texture through the back of the
     * plane, which means MIRRORED — and a screenshot from the far
     * pavement had every Hebrew sign in the street written backwards.
     * A real blade sign is painted on both faces, so it is modelled
     * as both faces: two single-sided planes back to back, each
     * turned to its own side of the street.
     */
    const bladeTex = s.sponsor ? perfumeSign(colour) : textSign(s.he, colour);
    for (const face of [1, -1] as const) {
      const blade = new THREE.Mesh(
        new THREE.PlaneGeometry(bladeW, bladeH),
        new THREE.MeshBasicMaterial({
          map: bladeTex,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        })
      );
      blade.rotation.y = (Math.PI / 2) * face;
      blade.position.set(0, bladeTop - bladeH / 2, bladeZ);
      g.add(blade);
      faceFade(blade, 1);
    }
    const blade = { position: new THREE.Vector3(0, bladeTop - bladeH / 2, bladeZ) };

    const bladeGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex, color: c3, transparent: true, opacity: s.sponsor ? 0.42 : 0.26,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    bladeGlow.scale.setScalar(s.sponsor ? 7.5 : 4.6);
    bladeGlow.position.copy(blade.position);
    bladeGlow.position.z += 0.05;
    g.add(bladeGlow);

    /* ----- the light the shop throws onto its own pavement ----- */
    emit(x - s.side * 2.4, 2.7, s.z, s.sponsor ? 0xff6f86 : 0xffc07a, 190, 16);
    lamps.push(new THREE.Vector3(x - s.side * 1.6, 2.7, s.z));

    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: s.sponsor ? 0xff6f86 : 0xffc07a, transparent: true,
        opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.03, 3.6);
    g.add(pool);

    /*
     * THE REFLECTION.
     *
     * A real mirror on the ground is a second render of the whole
     * scene, on a phone, every frame. What the eye actually reads as
     * "wet" is a smeared vertical column of the sign's colour running
     * towards the viewer — so that is what is drawn, stretched along
     * the street and fading out, under every sign.
     */
    const wet = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 15),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: c3, transparent: true, opacity: s.sponsor ? 0.24 : 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    wet.rotation.x = -Math.PI / 2;
    wet.position.set(0, 0.04, 7.5);
    g.add(wet);

    scene.add(g);
    shops.push({ ...s, doorway: new THREE.Vector3(x - s.side * 3.0, 0, s.z) });
  }

  /* Lay the terrace: a bay every BAY metres, his shops where they fall. */
  const claimed = new Set<string>();
  for (const side of [-1, 1] as const) {
    let seed = side < 0 ? 0 : 5;
    for (let z = STREET_LENGTH / 2 - BAY / 2; z > -STREET_LENGTH / 2; z -= BAY) {
      seed += 1;
      const mine = specs.find(
        (s) => s.side === side && Math.abs(s.z - z) <= BAY / 2 && !claimed.has(s.id)
      );
      if (mine) {
        claimed.add(mine.id);
        shopBay({ ...mine, z });
      } else {
        ordinary(side, z, seed);
      }
    }
  }
  /* A shop whose z fell outside the laid bays still gets built, rather
     than silently vanishing — the map is the source of truth for where
     a trade is, not this loop's arithmetic. */
  for (const s of specs) if (!claimed.has(s.id)) shopBay(s);

  /* ---------------------------------------------------------------
     LAMPS
     --------------------------------------------------------------- */
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x0e0b14, roughness: 0.45, metalness: 0.6 });
  function lamp(x: number, z: number) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 5.4, 10), poleMat);
    pole.position.y = 2.7;
    pole.castShadow = true;
    g.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.45, 12), poleMat);
    base.position.y = 0.22;
    g.add(base);
    /* The arm reaches over the pavement, the way a street lamp does. */
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), poleMat);
    arm.position.set(-Math.sign(x) * 0.75, 5.4, 0);
    g.add(arm);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff0d0, emissive: 0xffc069, emissiveIntensity: 5.2, roughness: 0.2,
        toneMapped: true,
      })
    );
    head.position.set(-Math.sign(x) * 1.45, 5.3, 0);
    g.add(head);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex, color: 0xffb45e, transparent: true, opacity: 0.72,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    halo.scale.set(5.4, 5.4, 1);
    halo.position.copy(head.position);
    g.add(halo);
    emit(x - Math.sign(x) * 1.45, 5.0, z, 0xffb45e, 190, 24);

    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        /*
         * Brighter than it was. With most of the street's lamps no
         * longer real lights (see the pool above), this painted disc
         * IS the light a distant lamp throws — so it has to do the
         * job the PointLight used to, and at 0.2 it did not.
         */
        map: glowTex, color: 0xffb45e, transparent: true, opacity: 0.34,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(-Math.sign(x) * 1.45, 0.02, 0);
    g.add(disc);
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 17),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: 0xffb45e, transparent: true, opacity: 0.2,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    streak.rotation.x = -Math.PI / 2;
    streak.position.set(-Math.sign(x) * 1.45, 0.025, 7.5);
    g.add(streak);

    g.position.set(x, 0, z);
    scene.add(g);
    lamps.push(new THREE.Vector3(x - Math.sign(x) * 1.45, 5, z));
  }
  /** Where the street furniture stands: on the kerb, out of the way. */
  const FURNITURE_X = KERB_X + 0.7;
  for (let z = STREET_LENGTH / 2 - 8; z > -STREET_LENGTH / 2; z -= 23) {
    lamp(FURNITURE_X, z);
    lamp(-FURNITURE_X, z - 11.5);
  }

  /* ---------------------------------------------------------------
     TRAFFIC — headlights are most of what a night street IS
     --------------------------------------------------------------- */
  const cars: THREE.Group[] = [];
  /*
   * ONE VEHICLE IN THREE IS OURS.
   *
   * Amit: *"בא לי שכלי הרכב שמסתובבים בכביש יהיו של פרו נאו... בא לי
   * שהכל ידבר את המותג."*
   *
   * Not all of them. A street where every car belongs to one company
   * is not a city, it is a depot — and the point of the world is that
   * PRO NOW operates inside a real place. One in three is enough to
   * say the brand is moving through the neighbourhood, which is the
   * claim, and it stays a claim about presence and not about supply:
   * these vans are scenery, they carry no job and are never counted.
   *
   * The drawn vehicles in the art pack are BROADSIDE views, and this
   * road runs away from the camera — the same mismatch that made the
   * old painted traffic look wrong. So the livery is built rather
   * than pasted: brand colours, a coral band, and the wordmark on the
   * flank and over the cab.
   */
  const markTex = wordmark();
  const PRONOW = { body: 0xf2eef6, band: 0xff6b4a };

  function car(dir: 1 | -1, lane: number, speed: number, z: number, ours = false) {
    const g = new THREE.Group();
    const bodyColour = ours
      ? PRONOW.body
      : [0x2a2f3d, 0x3a2430, 0x243028, 0x2e2a1f, 0x11131b][Math.floor(Math.random() * 5)]!;
    const len = ours ? 5.2 : 4.3;
    const tall = ours ? 1.7 : 0.95;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, tall, len),
      new THREE.MeshStandardMaterial({
        color: bodyColour,
        roughness: ours ? 0.45 : 0.28,
        metalness: ours ? 0.25 : 0.75,
      })
    );
    body.position.y = ours ? 1.15 : 0.68;
    g.add(body);

    if (ours) {
      /* The coral band, low along the flank. */
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.26, len * 0.92),
        new THREE.MeshStandardMaterial({ color: PRONOW.band, roughness: 0.5 })
      );
      band.position.y = 0.62;
      g.add(band);
      /* The wordmark on both flanks, and lit above the cab. */
      for (const sx of [-1, 1] as const) {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(2.3, 0.72),
          new THREE.MeshStandardMaterial({
            map: markTex, transparent: true, color: 0x1a1522, roughness: 0.6,
          })
        );
        m.position.set(sx * 0.94, 1.32, 0.2);
        m.rotation.y = (Math.PI / 2) * sx;
        g.add(m);
      }
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.46),
        new THREE.MeshBasicMaterial({
          map: markTex, transparent: true, toneMapped: false, side: THREE.DoubleSide,
        })
      );
      sign.position.set(0, 2.15, dir > 0 ? -len / 2 + 0.6 : len / 2 - 0.6);
      g.add(sign);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.56, 0.4),
        new THREE.MeshStandardMaterial({ color: PRONOW.band, roughness: 0.5 })
      );
      box.position.copy(sign.position).setZ(sign.position.z - (dir > 0 ? -0.12 : 0.12));
      g.add(box);
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.62, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x0b0910, roughness: 0.1, metalness: 0.95 })
      );
      cab.position.set(0, 1.62, dir > 0 ? -len / 2 + 1.2 : len / 2 - 1.2);
      g.add(cab);
    } else {
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.7, 2.1),
        new THREE.MeshStandardMaterial({ color: 0x0b0910, roughness: 0.1, metalness: 0.95 })
      );
      cabin.position.set(0, 1.45, -0.1);
      g.add(cabin);
    }

    const lampMat = (c: number, i: number) =>
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i });
    for (const sx of [-0.58, 0.58]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.08), lampMat(0xfff3d6, 5));
      hl.position.set(sx, ours ? 0.9 : 0.74, dir > 0 ? -len / 2 - 0.02 : len / 2 + 0.02);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.08), lampMat(0xff3b30, 3));
      tl.position.set(sx, ours ? 1.0 : 0.82, dir > 0 ? len / 2 + 0.02 : -len / 2 - 0.02);
      g.add(tl);
    }
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 14),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: 0xfff0cc, transparent: true, opacity: 0.17,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.04, dir > 0 ? -7.5 : 7.5);
    g.add(beam);
    /* The tarmac under a car lifts when the pool reaches it. The
       emitter follows the group, because this one moves. */
    emitters.push({
      pos: new THREE.Vector3(),
      colour: new THREE.Color(0xfff0cc),
      intensity: 90,
      distance: 13,
      follow: g,
      offsetZ: dir > 0 ? -3.2 : 3.2,
    });

    g.position.set(lane, 0, z);
    g.userData = { dir, speed };
    scene.add(g);
    cars.push(g);
  }
  const laneA = -ROAD_HALF * 0.5;
  const laneB = ROAD_HALF * 0.5;
  for (let i = 0; i < 4; i += 1) car(-1, laneA, 11 + Math.random() * 5, -110 + i * 74, i === 1);
  for (let i = 0; i < 4; i += 1) car(1, laneB, 10 + Math.random() * 5, -70 + i * 78, i === 2);

  /* ---------------------------------------------------------------
     PEOPLE WHO ARE NOT YOU

     /docs/03c §16.3: *motion without agency is ambience, motion with
     agency is an entity*. These are ambience and nothing more — they
     are not professionals, they carry no claim about supply, and
     none of them is ever named. A street with nobody on it reads as
     an architectural render, which is the other half of "old".

     They are geometry, not drawings, for an honest reason as much as
     a technical one: the only walk cycle delivered is Amit's own
     character, and putting the customer's own likeness on six
     passers-by is worse than a silhouette. At night, on a lit street,
     a dark figure with a warm rim is what a stranger IS.
     --------------------------------------------------------------- */
  const crowd: Array<{ g: THREE.Group; dir: 1 | -1; speed: number; legs: THREE.Object3D[] }> = [];
  const coatColours = [0x2a2338, 0x1d2b33, 0x33242a, 0x232a22, 0x2e2a35];
  function person(x: number, z: number, dir: 1 | -1) {
    const g = new THREE.Group();
    const scale = 0.94 + Math.random() * 0.14;
    /*
     * Dark, and deliberately so. The first pass used mid-tone clothing
     * and the figures picked up so much of Lust's magenta that they
     * came out as bright pink mannequins standing in the street. A
     * stranger at night is a silhouette with a rim of whatever they
     * are walking past; the coat has to be dark enough for that to be
     * what happens.
     */
    const coat = new THREE.MeshStandardMaterial({
      color: coatColours[Math.floor(Math.random() * coatColours.length)]!,
      roughness: 0.92,
    });
    const skin = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.85 });

    /* Shoulders wider than the waist, and a head that is not a ball
       on a post: the silhouette is the whole of the character here. */
    /*
     * The join at the neck is the whole thing. A barrel torso with a
     * ball above it reads as a shop mannequin however well it is lit —
     * a screenshot with one three metres from the camera under Lust's
     * sign was the worst object in the frame. So the chest TAPERS to
     * the shoulders, the shoulders are their own mass, and the neck is
     * thick enough to be a neck.
     */
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.165, 0.46, 10), coat);
    chest.position.y = 1.18;
    chest.castShadow = true;
    g.add(chest);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 9), coat);
    shoulders.position.y = 1.4;
    shoulders.scale.set(1.08, 0.52, 0.78);
    shoulders.castShadow = true;
    g.add(shoulders);
    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.15, 0.24, 10), coat);
    hips.position.y = 0.9;
    g.add(hips);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.085, 0.13, 8), skin);
    neck.position.y = 1.52;
    g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.113, 12, 10), skin);
    head.position.y = 1.65;
    head.scale.set(1, 1.16, 1.02);
    head.castShadow = true;
    g.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.66),
      new THREE.MeshStandardMaterial({ color: 0x14100f, roughness: 1 })
    );
    hair.position.y = 1.665;
    hair.scale.set(1, 1.14, 1.02);
    g.add(hair);

    const legs: THREE.Object3D[] = [];
    for (const sx of [-0.09, 0.09]) {
      const hip = new THREE.Group();
      hip.position.set(sx, 0.78, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.062, 0.78, 7), coat);
      thigh.position.y = -0.39;
      thigh.castShadow = true;
      hip.add(thigh);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), coat);
      shoe.position.set(0, -0.76, 0.04);
      hip.add(shoe);
      g.add(hip);
      legs.push(hip);
    }
    /* Outside the shoulder mass. At ±0.235 the arms were buried inside
       a 0.227-wide shoulder sphere, and the figure had no limbs at all
       above the waist. */
    for (const sx of [-0.275, 0.275]) {
      const sh = new THREE.Group();
      sh.position.set(sx, 1.38, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.58, 6), coat);
      arm.position.set(0, -0.29, 0.03);
      sh.add(arm);
      g.add(sh);
      legs.push(sh);
    }

    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(g);
    crowd.push({ g, dir, speed: 0.9 + Math.random() * 0.7, legs });
  }
  for (let i = 0; i < 14; i += 1) {
    const side = Math.random() > 0.5 ? 1 : -1;
    /* Near the kerb. They used to be spread across the full pavement,
       which put one in the camera's lap every few seconds — and a
       background figure inspected at three metres stops being
       background. Out there they are what they are meant to be. */
    const x = side * (KERB_X + 1.0 + Math.random() * 1.9);
    /* Anywhere but standing on top of you at the moment you arrive. */
    let z = 0;
    do {
      z = -STREET_LENGTH / 2 + Math.random() * STREET_LENGTH;
    } while (Math.abs(z - SPAWN.z) < 13);
    person(x, z, Math.random() > 0.5 ? 1 : -1);
  }

  /* ---------------------------------------------------------------
     TREES, AT THE KERB WHERE THEY BELONG

     The first build put them in the middle of the pavement, which is
     where the camera is, and a screenshot came back as a wall of
     leaves. They stand at the kerb now, alternating with the lamps,
     with the canopy above head height so the camera passes under it.
     --------------------------------------------------------------- */
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x4c3f31, roughness: 0.9 });
  /*
   * A LEAF COLOUR THAT SURVIVES THE NIGHT.
   *
   * 0x2c5638 under a hemisphere light is black, and a screenshot came
   * back with an unlit tree filling a third of the frame as a shapeless
   * dark mass. Trees are the one thing in a street that is never lit
   * from below and rarely from above, so the material has to carry
   * some value of its own — and they stand beside the lamps now rather
   * than in the gaps between them.
   */
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x5c8f5e, roughness: 0.8 });
  function tree(x: number, z: number, scale = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 4.2, 8), barkMat);
    trunk.position.y = 2.1;
    trunk.castShadow = true;
    g.add(trunk);
    for (let i = 0; i < 5; i += 1) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.75 + Math.random() * 0.4, 10, 8), leafMat);
      b.position.set((Math.random() - 0.5) * 1.5, 4.5 + Math.random() * 1.1, (Math.random() - 0.5) * 1.5);
      b.castShadow = true;
      g.add(b);
    }
    const grate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1620, roughness: 0.9 })
    );
    grate.position.y = 0.05;
    g.add(grate);
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    scene.add(g);
  }
  /* Every 34 metres and no closer. A tree at every lamp is an avenue,
     and an avenue is a green tunnel you cannot see a shop through. */
  for (let z = STREET_LENGTH / 2 - 8; z > -STREET_LENGTH / 2; z -= 46) {
    tree(FURNITURE_X, z - 7, 0.7 + Math.random() * 0.14);
    tree(-FURNITURE_X, z - 18.5, 0.7 + Math.random() * 0.14);
  }

  /* ---------------------------------------------------------------
     THE THINGS THAT MAKE A STREET SOMEWHERE YOU WANT TO BE

     Amit: *"תחשוב אווירה שמחה שכיף להיות בה."*

     Lighting moved the hour from two in the morning to eight in the
     evening, and that is as far as light alone goes — a well-lit
     empty street is a well-lit empty street. What makes somewhere
     feel good to be in is evidence that OTHER PEOPLE chose to be
     there: somebody hung lights across the road, somebody put tables
     out, somebody plants flowers and waters them.

     None of it is ours and none of it is a claim. It is a
     neighbourhood that was already nice before PRO NOW rented a
     shopfront in it.
     --------------------------------------------------------------- */

  /*
   * FESTOON LIGHTS, AS ONE DRAW CALL.
   *
   * Nine strings of eleven bulbs is ninety-nine objects, and ninety-
   * nine meshes with ninety-nine sprites over them is how a scene
   * quietly goes back to five frames a second. Every bulb in the
   * street is one `Points` cloud with a glow sprite on it — a single
   * draw call for the whole lot — and the cables are plain lines.
   */
  {
    const bulbs: number[] = [];
    const tints: number[] = [];
    const cable = new THREE.BufferGeometry();
    const cablePts: number[] = [];
    const WARM = [
      [1, 0.82, 0.55], [1, 0.72, 0.42], [1, 0.9, 0.7],
      [0.68, 0.86, 1], [1, 0.62, 0.62], [0.78, 1, 0.78],
    ];
    for (let z = STREET_LENGTH / 2 - 16; z > -STREET_LENGTH / 2; z -= 31) {
      const x0 = -KERB_X - 1.4, x1 = KERB_X + 1.4;
      const top = 7.4, sag = 1.9;
      const N = 13;
      let prev: [number, number, number] | null = null;
      for (let i = 0; i <= N; i += 1) {
        const t = i / N;
        const x = x0 + (x1 - x0) * t;
        const y = top - sag * (1 - Math.pow(2 * t - 1, 2));
        const zz = z + Math.sin(t * Math.PI) * 0.6;
        if (prev) cablePts.push(prev[0], prev[1], prev[2], x, y, zz);
        prev = [x, y, zz];
        if (i > 0 && i < N) {
          bulbs.push(x, y - 0.22, zz);
          /* `z` is negative down half the street, and a negative
             modulo in JS stays negative — which indexes off the front
             of the array and hands you `undefined`. The city stopped
             building at "בונה את העיר…" for exactly this. */
          const c = WARM[(((i + Math.round(z)) % WARM.length) + WARM.length) % WARM.length]!;
          tints.push(c[0]!, c[1]!, c[2]!);
        }
      }
    }
    cable.setAttribute("position", new THREE.Float32BufferAttribute(cablePts, 3));
    scene.add(
      new THREE.LineSegments(
        cable,
        new THREE.LineBasicMaterial({ color: 0x120e1a, transparent: true, opacity: 0.85 })
      )
    );
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(bulbs, 3));
    bg.setAttribute("color", new THREE.Float32BufferAttribute(tints, 3));
    const lamps2 = new THREE.Points(
      bg,
      new THREE.PointsMaterial({
        map: glowTex, size: 1.5, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.95, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      })
    );
    scene.add(lamps2);
    /* A slow breath across the whole string, so it is not a decal. */
    ticking.push((_dt, t) => {
      (lamps2.material as THREE.PointsMaterial).opacity = 0.82 + Math.sin(t * 1.4) * 0.13;
    });
  }

  /*
   * TABLES OUTSIDE. Somebody is sitting there, or was five minutes
   * ago — either way a chair on a pavement is a street that people
   * use rather than pass through.
   */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2430, roughness: 0.5, metalness: 0.5 });
  function cafe(x: number, z: number, hue: number) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), woodMat);
    top.position.y = 0.74;
    g.add(top);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.74, 8), metalMat);
    stem.position.y = 0.37;
    g.add(stem);
    for (let i = 0; i < 2; i += 1) {
      const a = i * Math.PI + 0.5;
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), metalMat);
      seat.position.set(Math.cos(a) * 0.78, 0.46, Math.sin(a) * 0.78);
      g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.05), metalMat);
      back.position.set(Math.cos(a) * 0.96, 0.68, Math.sin(a) * 0.96);
      back.rotation.y = -a;
      g.add(back);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 6), metalMat);
      leg.position.set(Math.cos(a) * 0.78, 0.23, Math.sin(a) * 0.78);
      g.add(leg);
    }
    /* A candle on the table. Tiny, and it is the whole point. */
    const flame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex, color: hue, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      })
    );
    flame.scale.setScalar(0.9);
    flame.position.y = 0.86;
    g.add(flame);
    ticking.push((_dt, t) => {
      flame.material.opacity = 0.7 + Math.sin(t * 6.1 + x) * 0.16;
    });
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI;
    scene.add(g);
  }

  /* Flowers, in a box, in colour. */
  const flowerHues = [0xff6b9d, 0xffd166, 0xff8b4a, 0xc08bff, 0xfff1f1];
  function planter(x: number, z: number) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.46, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x7a5a44, roughness: 0.9 })
    );
    box.position.y = 0.23;
    g.add(box);
    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.06, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 1 })
    );
    soil.position.y = 0.46;
    g.add(soil);
    for (let i = 0; i < 16; i += 1) {
      const f = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + Math.random() * 0.05, 6, 5),
        new THREE.MeshStandardMaterial({
          color: flowerHues[i % flowerHues.length]!,
          roughness: 0.8,
          emissive: flowerHues[i % flowerHues.length]!,
          emissiveIntensity: 0.14,
        })
      );
      f.position.set(
        (Math.random() - 0.5) * 1.28,
        0.54 + Math.random() * 0.22,
        (Math.random() - 0.5) * 0.34
      );
      g.add(f);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0x3f7a4a, roughness: 0.95 })
      );
      leaf.position.copy(f.position).setY(f.position.y - 0.11);
      leaf.scale.set(1, 0.5, 1);
      g.add(leaf);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }

  for (let z = STREET_LENGTH / 2 - 24; z > -STREET_LENGTH / 2; z -= 31) {
    cafe(FRONT_X - 2.0, z, flowerHues[Math.floor(Math.random() * 3)]!);
    cafe(-FRONT_X + 2.0, z - 15, 0xffc07a);
    planter(FRONT_X - 1.3, z - 7);
    planter(-FRONT_X + 1.3, z - 22);
  }

  /* ---------------------------------------------------------------
     STEAM

     One grate in the road, breathing. It is three additive sprites
     rising and fading, and it does more for "this is a city at night"
     than any geometry costing the same.
     --------------------------------------------------------------- */
  function vent(x: number, z: number) {
    const puffs: THREE.Sprite[] = [];
    for (let i = 0; i < 4; i += 1) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: 0xbfc6e0, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      s.position.set(x, 0, z);
      s.userData = { phase: i / 4 };
      scene.add(s);
      puffs.push(s);
    }
    ticking.push((_dt, t) => {
      for (const s of puffs) {
        const ph = ((t * 0.19 + (s.userData as { phase: number }).phase) % 1);
        s.position.y = ph * 6.5;
        s.position.x = x + Math.sin(ph * 3 + (s.userData as { phase: number }).phase * 9) * 0.9;
        const k = Math.sin(ph * Math.PI);
        s.scale.setScalar(1.6 + ph * 5.5);
        s.material.opacity = k * 0.17;
      }
    });
  }
  vent(-1.6, 36);
  vent(2.1, -58);

  /* ---------------------------------------------------------------
     UPDATE
     --------------------------------------------------------------- */
  const HALF = STREET_LENGTH / 2;
  let lendClock = 1;
  function update(dt: number, elapsed: number, camera: THREE.Camera) {
    for (const c of cars) {
      const { dir, speed } = c.userData as { dir: 1 | -1; speed: number };
      c.position.z += dir * speed * dt;
      if (c.position.z > HALF) c.position.z = -HALF;
      if (c.position.z < -HALF) c.position.z = HALF;
    }
    for (const p of crowd) {
      p.g.position.z += p.dir * p.speed * dt;
      if (p.g.position.z > HALF) p.g.position.z = -HALF;
      if (p.g.position.z < -HALF) p.g.position.z = HALF;
      /* Legs and arms out of phase with each other, which is walking. */
      /* [hip L, hip R, shoulder L, shoulder R] — a leg swings with the
         OPPOSITE arm, which is the whole of what makes it read as a
         walk rather than a shuffle. */
      const swing = Math.sin(elapsed * p.speed * 4.4 + p.g.position.x) * 0.5;
      p.legs[0]!.rotation.x = swing;
      p.legs[1]!.rotation.x = -swing;
      p.legs[2]!.rotation.x = -swing * 0.65;
      p.legs[3]!.rotation.x = swing * 0.65;
    }
    for (const f of ticking) f(dt, elapsed);

    /*
     * LENDING THE SIX LAMPS OUT.
     *
     * Not every frame: the answer changes only as fast as you walk, and
     * re-sorting sixty emitters sixty times a second to get the same
     * six is the kind of work that looks free and is not. Every fifth
     * of a second is well under the rate at which you could notice.
     */
    lendClock += dt;
    if (lendClock >= 0.2) {
      lendClock = 0;
      for (const e of emitters) {
        if (e.follow) e.pos.set(e.follow.position.x, 0.7, e.follow.position.z + (e.offsetZ ?? 0));
      }
      emitters.sort(
        (a, b) =>
          a.pos.distanceToSquared(camera.position) - b.pos.distanceToSquared(camera.position)
      );
      for (let i = 0; i < pool.length; i += 1) {
        const e = emitters[i];
        const l = pool[i]!;
        if (!e) { l.intensity = 0; continue; }
        l.position.copy(e.pos);
        l.color.copy(e.colour);
        l.intensity = e.intensity;
        l.distance = e.distance;
      }
    }

    /* How square-on the viewer is to each sign. Under 0.12 it is edge
       on and gone; over 0.45 it is fully lit. */
    for (const sign of flatSigns) {
      sign.mesh.getWorldPosition(_w);
      _n.set(0, 0, 1).applyQuaternion(sign.mesh.getWorldQuaternion(_q));
      _to.copy(camera.position).sub(_w).normalize();
      const face = Math.abs(_n.dot(_to));
      const k = Math.max(0, Math.min(1, (face - 0.12) / 0.33));
      sign.material.opacity = sign.base * k * k * (3 - 2 * k);
    }
  }

  return { scene, shops, lamps, update };
}

export { neon, glow };
