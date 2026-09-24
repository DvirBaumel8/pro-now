import * as THREE from "three";

import {
  CITY_BUILDING_IDS,
  CITY_MATERIAL_IDS,
  CITY_PLACE_IDS,
  CITY_PROP_IDS,
  CITY_VEHICLE_IDS,
  CITY_WALKER_IDS,
} from "@pro-now/types";

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
  /**
   * Which department's house this is.
   *
   * A shop in this street is not a shop you buy from — almost every
   * service in the catalogue is *עד הבית*, and the professional comes
   * to you. It is the TRADE's house: you go in to see what the trade
   * does and to call somebody. So the building has to know which
   * trade it stands for, or walking in can only ever show you a
   * pretty room.
   */
  department?: string;
  /** The neon over the door, drawn rather than photographed. */
  neonColour?: string;
}

export interface StreetHandles {
  scene: THREE.Scene;
  shops: Array<ShopSpec & { doorway: THREE.Vector3 }>;
  /**
   * Places that are not shops.
   *
   * Almost every service in this catalogue is *עד הבית* — the
   * professional comes to you — and for a dog walker, a courier or a
   * tow truck a shopfront would be a lie: there are no premises to
   * walk into. But there is a place, and a place can be walked up to.
   */
  places: Array<{ id: string; he: string; department: string | null; spot: THREE.Vector3 }>;
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
const BAY = 8.8;

/**
 * ---------------------------------------------------------------------
 * THE ART THE STREET IS WAITING FOR
 * ---------------------------------------------------------------------
 * Amit: *"מת שכבר יעופו הבניינים המוזרים מסביב לעסקים שלנו ויהיו בתים
 * שמחים."*
 *
 * The buildings between his shopfronts are plain boxes with flat
 * rectangles for windows. On their own they are unremarkable; three
 * metres from a hand-painted shopfront they are the reason he said the
 * street looks like 2004, and he is right — the drawings and the
 * geometry are not in the same decade and the eye goes straight to the
 * gap.
 *
 * The fix is art, not code: flat orthographic elevations of ordinary
 * buildings, in the same hand, which clad the blocks exactly the way
 * his shopfronts already do. They are being drawn.
 *
 * So the ENGINE is ready for them first. Every id below is optional —
 * where the file exists it is used, and where it does not the
 * procedural version carries on. Nothing here has to change on the day
 * they land: they drop into `public/world` and the street becomes his.
 */
/*
 * The vocabulary itself lives in `@pro-now/types` — see `world-city.ts`
 * for why. Two consumers read it: this renderer, to know what to load,
 * and `art-delivery.test.ts`, to know which delivered files are spoken
 * for. Declaring it twice is how the two quietly drift apart.
 */
export {
  CITY_BUILDING_IDS as BUILDING_FACADE_IDS,
  CITY_MATERIAL_IDS as MATERIAL_IDS,
  CITY_PROP_IDS as PROP_IDS,
  CITY_PLACE_IDS as PLACE_IDS,
  CITY_VEHICLE_IDS as VEHICLE_IDS,
} from "@pro-now/types";

/** Every optional id, for the loader to try. */
export const OPTIONAL_ART: readonly string[] = [
  ...CITY_BUILDING_IDS,
  ...CITY_MATERIAL_IDS,
  ...CITY_PROP_IDS,
  ...CITY_PLACE_IDS,
  ...CITY_VEHICLE_IDS,
  ...CITY_WALKER_IDS,
];


/**
 * A delivered texture, tiled, or null.
 *
 * The drawn materials are albedo with flat lighting, so they take the
 * engine's light. The canvas fallbacks below were always a stand-in for
 * exactly this.
 */
function tiled(
  tex: THREE.Texture | undefined,
  repeatX: number,
  repeatY: number
): THREE.Texture | null {
  if (!tex) return null;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

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
  /*
   * RECALIBRATED FOR REAL ALBEDO.
   *
   * Every number below was chosen against the canvas stand-ins, which
   * were drawn deliberately dark — a surface with no dark in it cannot
   * hold a shadow, and the pools of lamplight only existed because the
   * pavement between them was nearly black.
   *
   * The delivered materials are the opposite: properly de-shaded
   * albedo, and the paving is cream. The same lights that made a near-
   * black canvas texture read as stone blew the real stone to white
   * within five metres of the camera — with bloom on top of it.
   *
   * So the budget halves. This is not a taste change; it is the
   * arithmetic of having replaced a 0.2 albedo with a 0.7 one.
   */
  scene.add(new THREE.HemisphereLight(0x8290d0, 0x3d3140, 0.95));
  const moon = new THREE.DirectionalLight(0xb9c4ee, 0.8);
  moon.position.set(-34, 50, 26);
  /*
   * ---------------------------------------------------------------
   * SHADOWS COME BACK, IN A BOX THAT FOLLOWS YOU
   * ---------------------------------------------------------------
   * Amit: *"עדיין נראה כמו ציור, לא מבין מה עשינו בזה."*
   *
   * Two things were missing and shadows were the larger. I turned
   * them off for the frame rate, and that was the wrong economy: a
   * shadow falling across a surface is how the eye decides the
   * surface is IN SPACE. Without one, a perfect drawing stays a
   * drawing — which is exactly the sentence he kept writing.
   *
   * The old cost came from covering the whole three-hundred-metre
   * street: a second depth pass over every building, lamp, tree and
   * passer-by in it. But you can only see shadows near you. The
   * shadow camera is fourteen metres square and rides with the
   * player, so it renders a handful of buildings instead of thirty,
   * and 1024 pixels across fourteen metres is finer than 2048 across
   * the whole street ever was.
   */
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -16;
  moon.shadow.camera.right = 16;
  moon.shadow.camera.top = 16;
  moon.shadow.camera.bottom = -16;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 90;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.04;
  scene.add(moon.target);
  /*
   * WAS: NO SHADOW MAP.
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
  const paveMap =
    tiled(textures["mat_paving"], 26, 62) ?? paving();
  const pave = new THREE.Mesh(
    new THREE.PlaneGeometry(FRONT_X * 2 + 22, STREET_LENGTH),
    new THREE.MeshStandardMaterial({ map: paveMap, roughness: 0.45, metalness: 0.08 })
  );
  pave.rotation.x = -Math.PI / 2;
  pave.receiveShadow = true;
  scene.add(pave);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF * 2, STREET_LENGTH),
    new THREE.MeshStandardMaterial({
      map: tiled(textures["mat_road"], 2, 34) ?? asphalt(),
      roughness: 0.22,
      metalness: 0.35,
    })
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
  const delivered = [
    tiled(textures["mat_plaster_warm"], 3, 3),
    tiled(textures["mat_plaster_cool"], 3, 3),
    tiled(textures["mat_stone"], 3, 3),
  ].filter((x): x is THREE.Texture => Boolean(x));
  const wallMats =
    delivered.length > 0
      ? delivered.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9 }))
      : wallTints.map(
          (t) => new THREE.MeshStandardMaterial({ map: plaster(t), roughness: 0.94 })
        );
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x120e1a, roughness: 0.9 });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x2a2433,
    roughness: 0.55,
    metalness: 0.4,
  });
  const shops: Array<ShopSpec & { doorway: THREE.Vector3 }> = [];
  /** Somewhere in the street you can be met that is not a shop. */
  const places: Array<{
    id: string;
    he: string;
    department: string | null;
    spot: THREE.Vector3;
  }> = [];

  /** A window that may be somebody's lit flat. */
  function flat(g: THREE.Group, x: number, y: number, lit: boolean) {
    const m = new THREE.MeshStandardMaterial({
      color: lit ? 0xffd9a0 : 0x0b0913,
      emissive: lit ? 0xffb15e : 0x000000,
      emissiveIntensity: lit ? 1.2 : 0,
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

  /**
   * THE THINGS THAT STICK OUT.
   *
   * Amit, twice: *"עדיין נראה כמו ציור"*, and then *"הבניינים לא
   * נראים לך כמו תמונה?"*
   *
   * They did, and nothing about the drawings was the reason. A real
   * balcony projects eighty centimetres from a wall; a canopy a
   * metre; a cornice thirty centimetres. Every one of ours was
   * painted INSIDE the plane, so moving sideways moved nothing
   * relative to anything else — and parallax between near and far is
   * most of how depth is measured.
   *
   * These are thin boxes in a stone colour, standing clear of the
   * drawing. They do two things at once: they shift against the
   * painted detail as you walk past, and — now that the moon casts
   * again — they lay a shadow ACROSS the drawing. A shadow falling on
   * a painted balcony is the moment the eye stops asking.
   */
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0xbfae99, roughness: 0.85 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x4a3540, roughness: 0.8 });

  function ledge(
    g: THREE.Group,
    y: number,
    w: number,
    out: number,
    thick = 0.22,
    mat = ledgeMat
  ) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, thick, out), mat);
    m.position.set(0, y, out / 2 + 0.36);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  /**
   * HOW BIG A FACADE IS, AND WHY THE WIDTH LEADS.
   *
   * ---------------------------------------------------------------
   * THE BUG THIS ENDS
   * ---------------------------------------------------------------
   * Amit: *"החנות נהרסה, והתערבבה עם הבניינים."*
   *
   * Measured, he was describing this exactly. The bay was narrowed
   * from 11.5 metres to 8.8 — correct, because the redrawn shopfronts
   * are tall and narrow — and the code went on laying every facade at
   * `BAY + 0.6` and clamping only the HEIGHT. So the width fell out of
   * each file's aspect ratio and had no relationship to the bay:
   *
   *     bld_arch          9.40m in an 8.8m bay   +0.60 into its neighbours
   *     bld_balconies     9.40m                  +0.60
   *     sponsor_lust     11.74m                  +2.94
   *     shop_hair         7.81m                  -0.99, a gap
   *
   * Two painted facades in the same plane, overlapping by thirty
   * centimetres each side, interleave and flicker. Lust overlapped by
   * nearly three metres — a metre and a half into each neighbour —
   * which is why the shop he cares most about looked the most
   * destroyed.
   *
   * ---------------------------------------------------------------
   * THE RULE
   * ---------------------------------------------------------------
   * The WIDTH is what the street owns: a bay is a bay and nothing may
   * cross into its neighbour. So width is capped first and height
   * follows from the drawing's own proportions. The height band still
   * applies, but it can only make a facade SMALLER — never wider than
   * the bay it stands in.
   *
   * Nothing is stretched, ever. A drawing that cannot fill its bay is
   * centred with a party wall either side, which is what a terrace of
   * different buildings actually looks like.
   */
  function facadeSize(
    img: { width: number; height: number },
    band: { min: number; max: number }
  ): { w: number; h: number } {
    const aspect = img.width / img.height;
    let w = BAY;
    let h = w / aspect;
    if (h > band.max) {
      h = band.max;
      w = Math.min(BAY, h * aspect);
    } else if (h < band.min) {
      h = band.min;
      w = Math.min(BAY, h * aspect);
    }
    return { w, h };
  }

  /**
   * A CUT-OUT THAT STANDS UP.
   *
   * A painted tree on one flat plane is a sticker: walk past it and it
   * has no side. Two planes crossed at right angles is the oldest
   * trick in real-time graphics and it still works, because what the
   * eye reads as a tree's volume is mostly the silhouette changing as
   * you move — and with two of them one is always nearly square-on.
   *
   * Lit rather than unlit: the drawing carries its own painted light,
   * so it goes in as an emissive map at a low intensity and takes the
   * street's lamps on top. A fully unlit cut-out is the thing that
   * made the shopfronts look like decals (see `shopBay`).
   */
  function cutout(
    tex: THREE.Texture,
    height: number,
    sides = 2,
    /** For a texture cropped to part of its sheet, whose `image` is
        still the whole sheet. Zero means "use the image". */
    aspect = 0
  ): THREE.Group {
    tex.colorSpace = THREE.SRGBColorSpace;
    const img = tex.image as { width: number; height: number };
    const w = height * (aspect || img.width / img.height);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.14,
      transparent: true,
      alphaTest: 0.42,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const g = new THREE.Group();
    for (let i = 0; i < sides; i += 1) {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(w, height), mat);
      q.position.y = height / 2;
      q.rotation.y = (Math.PI / sides) * i;
      g.add(q);
    }
    return g;
  }

  /**
   * THE TOP BAND OF A SHEET THAT HOLDS MORE THAN ONE THING.
   *
   * The four place drawings each arrived as a place on top and a row of
   * spare props under it — `place_bench_stop` is a pergola and a bench,
   * and then two PRO NOW van rears; `place_roadside` is a tow truck,
   * and then a kerb and four traffic cones. Mapped whole onto one
   * plane, the extras hang in the air below the place like a shelf of
   * offcuts.
   *
   * Measured rather than guessed, the same way the walk cycles are: a
   * row belongs to the drawing if anything in it is opaque, and the
   * first run of such rows is the thing itself.
   */
  function topBand(tex: THREE.Texture): { tex: THREE.Texture; aspect: number } {
    const img = tex.image as HTMLImageElement | undefined;
    if (!img || !img.width) return { tex, aspect: 0 };
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x2 = c.getContext("2d", { willReadFrequently: true });
    if (!x2) return { tex, aspect: 0 };
    x2.drawImage(img, 0, 0);
    const d = x2.getImageData(0, 0, c.width, c.height).data;
    let y0 = -1;
    let y1 = -1;
    for (let y = 0; y < c.height; y += 1) {
      let n = 0;
      for (let x = 0; x < c.width; x += 1) {
        if ((d[(y * c.width + x) * 4 + 3] ?? 0) > 40) { n += 1; if (n > 3) break; }
      }
      if (n > 3) { if (y0 < 0) y0 = y; y1 = y; }
      else if (y0 >= 0 && y - y1 > 12) break;
    }
    if (y0 < 0 || y1 - y0 < 20) return { tex, aspect: 0 };
    /* Nothing to crop: the drawing already fills the sheet. */
    if (y0 <= 2 && y1 >= c.height - 3) return { tex, aspect: 0 };
    const t = tex.clone();
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    /* Texture V runs from the BOTTOM, so the top band is the far end. */
    t.repeat.set(1, (y1 - y0 + 1) / c.height);
    t.offset.set(0, (c.height - y1 - 1) / c.height);
    /*
     * The clone SHARES `image` with the original — that is the whole
     * point of a clone, and it is also a trap: `image` is what three
     * uploads to the GPU, so overwriting it with a plain {width,height}
     * to fix the quad's shape produces a texture with no pixels in it.
     * The band's aspect is returned alongside instead.
     */
    return { tex: t, aspect: c.width / (y1 - y0 + 1) };
  }

  /** A plain building, for the bays between his shops. */
  function ordinary(side: -1 | 1, z: number, seed: number) {
    const g = new THREE.Group();
    g.position.set(FRONT_X * side, 0, z);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

    /*
     * ---------------------------------------------------------------
     * A DRAWN BUILDING, WHERE ONE HAS BEEN DRAWN
     * ---------------------------------------------------------------
     * Amit: *"מת שכבר יעופו הבניינים המוזרים מסביב לעסקים שלנו."*
     *
     * Everything below this branch — the plaster box, the flat
     * rectangles for windows, the balcony slabs — was a stand-in for
     * exactly this, and it is the thing that made him say the street
     * looks like 2004. A flat orthographic elevation clads the block
     * the same way his shopfronts do, and then the bay is his.
     *
     * The HEIGHT is the fixed quantity, for the reason the shopfronts
     * taught: let the bay width decide it and a building's storey
     * height comes out of a file's aspect ratio, which is not a
     * decision anybody made. A four-storey building is about 14
     * metres, so that is the band, and a drawing outside it is scaled
     * whole rather than stretched.
     */
    const drawn = textures[CITY_BUILDING_IDS[seed % CITY_BUILDING_IDS.length]!];
    if (drawn) {
      drawn.colorSpace = THREE.SRGBColorSpace;
      const img = drawn.image as { width: number; height: number };
      /* Four storeys of a narrow Mediterranean street, not a tower:
         it is looked at from three metres away, and fifteen metres of
         wall at three metres is not a building, it is a cliff. */
      const { w, h } = facadeSize(img, { min: 9.6, max: 11.6 });

      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({
          map: drawn,
          emissiveMap: drawn,
          emissive: 0xffffff,
          emissiveIntensity: 0.16,
          transparent: true,
          alphaTest: 0.35,
          roughness: 0.88,
        })
      );
      face.position.set(0, h / 2, 0.36);
      face.receiveShadow = true;
      g.add(face);

      /*
       * A CORNICE, AND NOTHING ELSE.
       *
       * The first attempt also put a ledge under each balcony line, at
       * fractions of the height guessed from the six elevations. On
       * screen they cut straight through windows — because the six
       * drawings do not actually share a storey rhythm, and a guessed
       * fraction is wrong for most of them.
       *
       * The parapet is the one projection whose position IS known: it
       * is the top. So that is the one that gets built, and it earns
       * its place twice over — it breaks the silhouette against the
       * sky, and it lays a shadow straight down the face beneath it,
       * which is the thing that stops a drawing reading as a drawing.
       */
      ledge(g, h - 0.22, w + 0.22, 0.3, 0.24);

      /*
       * THE PARTY WALL.
       *
       * Now that a facade may be NARROWER than its bay — see
       * `facadeSize` — the block behind it has to fill what the
       * drawing does not, or the street shows a raw slab between
       * buildings. Amit saw one in the first screenshot after the
       * change: a flat grey-green panel standing where two shops meet.
       *
       * So the carcass is bay-wide and set back, and the strip that
       * shows either side of a narrow drawing is plaster — which is
       * what a party wall between two buildings actually is.
       */
      const depth = 11;
      const carcass = new THREE.Mesh(
        new THREE.BoxGeometry(BAY, h - 0.6, depth),
        wallMats[seed % wallMats.length]!
      );
      carcass.position.set(0, (h - 0.6) / 2, -depth / 2 - 0.05);
      g.add(carcass);

      scene.add(g);
      return;
    }

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
          /* Halved again once bloom arrived: an emissive surface at
             0.95 is over the bloom threshold across its whole area, so
             a shop window stopped being a lit window and became a
             floodlight on the pavement. */
          emissiveIntensity: 0.28,
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
      emit(FRONT_X * side - side * 2.0, 2.2, z - side * -0.5, warmth, 70, 12);
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshBasicMaterial({
          map: glowTex, color: warmth, transparent: true, opacity: 0.11,
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
      /*
       * The redrawn shopfronts are two-storey and nearly square, so a
       * bay-wide facade came out fourteen metres tall — and you stand
       * three metres from it. At that distance a fourteen-metre wall
       * is a wall; you see the bottom third and nothing else. Eight
       * and a half is a two-storey shop and it fits in the frame from
       * the pavement, which is the only place anybody looks at it.
       */
      const size = facadeSize(img, { min: 7.9, max: 9.2 });
      const w = size.w;
      faceH = size.h;
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
          /*
       * THE DRAWING IS ALREADY LIT. STOP LIGHTING IT.
       *
       * Amit, in front of the new pet shop: *"לא רואים כלום, רק אור
       * צהוב. עבדנו קשה על ההדמיה של חנות החיות — איפה היא?"*
       *
       * He is right and it is my arithmetic, not his art. Every
       * shopfront he commissioned is painted with its own warm
       * interior glow — that IS the drawing. Then this code fed the
       * same texture back as an emissive map at 0.55, put a 110-candela
       * lamp two metres in front of it, laid an additive pool on the
       * pavement under it and ran the whole thing through bloom.
       *
       * Four warm lights on one warm painting. What you get is not a
       * lit shop, it is a yellow rectangle, and the work he paid for
       * is underneath it where nobody can see it.
       *
       * So the painting carries its own light and the street adds a
       * whisper.
       */
      emissiveIntensity: 0.18,
          transparent: true,
          alphaTest: 0.35,
          roughness: 0.82,
          metalness: 0.04,
        })
      );
      face.receiveShadow = true;
      face.position.set(0, faceH / 2, 0.42);
      face.receiveShadow = true;
      g.add(face);

      /*
       * A cornice at the top, and a canopy over the shop window — the
       * one projection every shopfront in the world has, and the one
       * that throws the most useful shadow, because it falls straight
       * down the glass.
       */
      ledge(g, faceH - 0.2, w + 0.22, 0.3, 0.22);
      /* The canopy sits on the awning line every one of these
         shopfronts is drawn with, and its shadow falls straight down
         the glass — the most useful shadow on the street. */
      ledge(g, faceH * 0.45, w + 0.06, 0.55, 0.14, canopyMat);
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
    /* Bay-wide, for the same reason as the ordinary bays above: a
       shopfront narrower than its bay would otherwise show the street
       a bare edge instead of a party wall. */
    const depth = 11;
    const carcass = new THREE.Mesh(
      new THREE.BoxGeometry(BAY, Math.max(3.4, faceH - 0.5), depth),
      wallMats[1]!
    );
    carcass.position.set(0, Math.max(3.4, faceH - 0.5) / 2, -depth / 2 - 0.05);
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

      emit(x - s.side * 2.6, faceH + 2.4, s.z, c3, 210, 24);
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
      emit(x - s.side * 2, faceH + 0.9, s.z, c3, 85, 16);
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
    emit(x - s.side * 2.4, 2.7, s.z, s.sponsor ? 0xff6f86 : 0xffc07a, 42, 11);
    lamps.push(new THREE.Vector3(x - s.side * 1.6, 2.7, s.z));

    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: s.sponsor ? 0xff6f86 : 0xffc07a, transparent: true,
        opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false,
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
        map: glowTex, color: c3, transparent: true, opacity: s.sponsor ? 0.11 : 0.05,
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
    /* The drawn lamp where one has arrived, the turned column where it
       has not. Only the COLUMN changes: the light, the halo, the pool
       and the wet streak below are the same either way, because those
       are the lamp doing its job and a drawing cannot do it. */
    const drawnLamp = textures["prop_lamp"];
    if (drawnLamp) {
      const col = cutout(drawnLamp, 5.6);
      col.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(col);
    } else {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 5.4, 10), poleMat);
      pole.position.y = 2.7;
      g.add(pole);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.45, 12), poleMat);
      base.position.y = 0.22;
      g.add(base);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.12), poleMat);
      arm.position.set(-Math.sign(x) * 0.75, 5.4, 0);
      g.add(arm);
    }
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(drawnLamp ? 0.16 : 0.3, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff0d0, emissive: 0xffc069, emissiveIntensity: 5.2, roughness: 0.2,
        toneMapped: true,
      })
    );
    head.position.set(drawnLamp ? 0 : -Math.sign(x) * 1.45, drawnLamp ? 4.4 : 5.3, 0);
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
    emit(x - Math.sign(x) * 1.45, 5.0, z, 0xffb45e, 95, 22);

    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        /*
         * Brighter than it was. With most of the street's lamps no
         * longer real lights (see the pool above), this painted disc
         * IS the light a distant lamp throws — so it has to do the
         * job the PointLight used to, and at 0.2 it did not.
         */
        map: glowTex, color: 0xffb45e, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(-Math.sign(x) * 1.45, 0.02, 0);
    g.add(disc);
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 17),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: 0xffb45e, transparent: true, opacity: 0.1,
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
  /*
   * The body colour is READ OFF THE DRAWN VAN, not chosen. It is the
   * warm off-white of `van_back.webp`, darkened enough that a street
   * lamp cannot push it past the bloom threshold — which is what turned
   * the oncoming van into a white brick with a black brick on top.
   */
  const PRONOW = { body: 0xcbb9b4, band: 0xff6b4a };

  /**
   * ---------------------------------------------------------------------
   * THE VAN IS A DRAWING WHERE THE DRAWING IS THE RIGHT VIEW
   * ---------------------------------------------------------------------
   * The note above says the drawn vehicles are broadside and this road
   * runs away from the camera, so the livery was built out of boxes
   * instead. Half of that was right and half of it threw away the best
   * asset in the pack: `van_back.webp` is a REAR view of Amit's own van,
   * with PRO NOW and "שירותים עד הבית" across the doors and the five
   * trade badges under them — and a rear view is exactly what a vehicle
   * driving AWAY from you looks like.
   *
   * So a van receding down the street is that drawing, and only a
   * vehicle coming towards you stays geometry. Which is also honest
   * about what an oncoming car is at night: headlights and a dark shape.
   * There is no front view in the pack, and inventing one out of boxes
   * is what produced the white brick with the black brick on top.
   */
  function car(dir: 1 | -1, lane: number, speed: number, z: number, ours = false) {
    const g = new THREE.Group();
    /* Negative z is away from the camera, which watches from the near
       end of the street — see `SPAWN` and the shadow box in `update`. */
    const away = dir < 0;
    const drawnVan = ours && away ? textures["van_back"] : undefined;
    if (drawnVan) {
      const body = cutout(drawnVan, 2.45, 1);
      g.add(body);
      /* Tail lamps are IN the drawing, so what is added here is only
         what a drawing cannot hold: the red wash they throw back at
         you, and the pool the headlights lay down out of sight ahead. */
      const tail = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: 0xff3b30, transparent: true, opacity: 0.30,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      tail.scale.set(3.6, 2.2, 1);
      tail.position.set(0, 1.0, 0.5);
      g.add(tail);
      emitters.push({
        pos: new THREE.Vector3(),
        colour: new THREE.Color(0xfff0cc),
        intensity: 62,
        distance: 14,
        follow: g,
        offsetZ: -6.4,
      });
      g.position.set(lane, 0, z);
      g.userData = { dir, speed };
      scene.add(g);
      cars.push(g);
      return;
    }

    const bodyColour = ours
      ? PRONOW.body
      /* Dark, but not black. The old set bottomed out at 0x11131b,
         which under a street lamp is still a silhouette — and a
         silhouette three metres from the camera is a hole in the
         picture rather than a car. */
      : [0x4a5170, 0x5e3c4c, 0x3d5145, 0x50492f, 0x2b3042][Math.floor(Math.random() * 5)]!;
    const len = ours ? 5.2 : 4.3;
    const tall = ours ? 1.7 : 0.95;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, tall, len),
      /*
       * METAL WITH NOTHING TO REFLECT IS BLACK.
       *
       * A `metalness` of 0.75 says "this surface has no diffuse colour
       * at all; everything you see in it is the environment" — and this
       * scene has no environment map, so the environment is nothing. The
       * cars came out as black bricks with two glowing dots, which is
       * most of why the traffic looked twenty years old in a street that
       * otherwise does not.
       *
       * Car paint at night is mostly a dark diffuse body with a hard
       * highlight where a lamp catches it, and that is what a low
       * metalness and a mid roughness give under real lights.
       */
      new THREE.MeshStandardMaterial({
        color: bodyColour,
        roughness: ours ? 0.42 : 0.38,
        metalness: 0.12,
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
      sign.position.set(0, 2.15, dir > 0 ? len / 2 - 0.6 : -len / 2 + 0.6);
      g.add(sign);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.56, 0.4),
        new THREE.MeshStandardMaterial({ color: PRONOW.band, roughness: 0.5 })
      );
      box.position.copy(sign.position).setZ(sign.position.z - (dir > 0 ? -0.12 : 0.12));
      g.add(box);
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.62, 1.5),
        new THREE.MeshStandardMaterial({
        color: 0x14111d, roughness: 0.16, metalness: 0.1,
        /* Glass at night is not black: it holds the street. */
        emissive: 0x2a2440, emissiveIntensity: 0.5,
      })
      );
      cab.position.set(0, 1.62, dir > 0 ? len / 2 - 1.2 : -len / 2 + 1.2);
      g.add(cab);
    } else {
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.7, 2.1),
        new THREE.MeshStandardMaterial({
          color: 0x14111d, roughness: 0.16, metalness: 0.1,
          emissive: 0x2a2440, emissiveIntensity: 0.5,
        })
      );
      cabin.position.set(0, 1.45, -0.1);
      g.add(cabin);
    }

    const lampMat = (c: number, i: number) =>
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i });
    /*
     * THE LIGHTS WERE ON THE WRONG END OF EVERY CAR.
     *
     * `update` advances a car by `dir * speed * dt`, so `dir > 0` drives
     * towards +z — and the headlights, the beam and the light pool were
     * all placed at -z for exactly that car. Every vehicle in the street
     * was driving backwards: white lights and a beam of tarmac behind
     * it, red lamps leading. It is the kind of thing nobody sees and
     * everybody feels, because a street full of cars reversing at 11
     * metres a second is not a street anybody has stood in.
     *
     * The nose is where the car is going. One expression, used by the
     * lamps, the beam and the pool, so they cannot disagree again.
     */
    const nose = dir > 0 ? len / 2 : -len / 2;
    const tailEnd = -nose;
    for (const sx of [-0.58, 0.58]) {
      /*
       * A HEADLAMP IS A SMALL BRIGHT THING INSIDE A BIG SOFT ONE.
       *
       * At intensity 5 the lamp box was a panel of flat white, and a
       * car passing within a few metres of the camera filled a tenth of
       * the screen with it. What reads as a headlight is the halo — the
       * same three-pass logic as the neon in `textures.ts` — so the box
       * is turned down to a filament and the size is given to a sprite,
       * which costs nothing and cannot clip.
       */
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.08), lampMat(0xfff3d6, 2.2));
      hl.position.set(sx, ours ? 0.9 : 0.74, nose + dir * 0.02);
      g.add(hl);
      const flare = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: 0xffe9bd, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      flare.scale.set(1.05, 1.05, 1);
      flare.position.copy(hl.position);
      g.add(flare);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.08), lampMat(0xff3b30, 1.6));
      tl.position.set(sx, ours ? 1.0 : 0.82, tailEnd - dir * 0.02);
      g.add(tl);
      const tlGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: 0xff3b30, transparent: true, opacity: 0.32,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      tlGlow.scale.set(1.0, 1.0, 1);
      tlGlow.position.copy(tl.position);
      g.add(tlGlow);
    }
    /*
     * THE BEAM IS THE FAINT HALF OF THE HEADLIGHT, NOT THE LOUD HALF.
     *
     * Turning this plane off entirely and re-shooting was the test: what
     * was left — the real point light's pool on the tarmac — read better
     * than what was there, because a plane with a hard edge lying on the
     * road is a shape, and a pool of light is not. But the pool only
     * exists for the ten cars nearest the viewer (see `emit`), so the
     * plane stays for everything beyond them, narrowed and dimmed until
     * it is a suggestion rather than a spotlight.
     */
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 11),
      new THREE.MeshBasicMaterial({
        /* The pool on the tarmac, and no brighter. Additive over a
           light-coloured car body is how a van becomes a white slab,
           and bloom then finishes the job. */
        map: glowTex, color: 0xfff0cc, transparent: true, opacity: 0.055,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    beam.rotation.x = -Math.PI / 2;
    beam.position.set(0, 0.04, dir * 7.5);
    g.add(beam);
    /* The tarmac under a car lifts when the pool reaches it. The
       emitter follows the group, because this one moves. */
    emitters.push({
      pos: new THREE.Vector3(),
      colour: new THREE.Color(0xfff0cc),
      /*
       * FAR ENOUGH AHEAD THAT THE CAR IS NOT STANDING IN ITS OWN POOL.
       *
       * The pool exists to lift the tarmac in front of a car. At 3.2m
       * and 90 candela it was also lighting the car's own nose from
       * half a metre away, and the pale van came back white — the
       * brightest object in the street was a parked box.
       */
      intensity: 62,
      distance: 14,
      follow: g,
      offsetZ: dir * 6.4,
    });

    g.position.set(lane, 0, z);
    g.userData = { dir, speed };
    scene.add(g);
    cars.push(g);
  }
  const laneA = -ROAD_HALF * 0.5;
  const laneB = ROAD_HALF * 0.5;
  /* Two of ours going away, where the drawing is the right view, and
     one coming towards you, which is the geometry. One in three, as the
     note above says. */
  /*
   * OURS ARE THE ONES DRIVING AWAY, BECAUSE THAT IS THE VIEW WE HAVE.
   *
   * A PRO NOW van was coming towards the camera too, built out of boxes
   * with the wordmark on a plane — and three metres from the lens it was
   * a white slab lit to pure white by its own headlight pool. There is
   * no front view of the van in the pack, so there is no honest way to
   * draw one, and a brand rendered badly says something worse about the
   * brand than a brand not rendered at all.
   *
   * Two of the four in the receding lane are ours and they are the
   * drawing; everything coming the other way is an ordinary dark car,
   * which at night is headlights and a shape. When a front view arrives
   * this is one line.
   */
  for (let i = 0; i < 4; i += 1) car(-1, laneA, 11 + Math.random() * 5, -110 + i * 74, i === 1 || i === 3);
  for (let i = 0; i < 4; i += 1) car(1, laneB, 10 + Math.random() * 5, -70 + i * 78);

  /* ---------------------------------------------------------------
     PEOPLE WHO ARE NOT YOU

     /docs/03c §16.3: *motion without agency is ambience, motion with
     agency is an entity*. These are ambience and nothing more — they
     are not professionals, they carry no claim about supply, and none
     of them is ever named.

     They used to be geometry, with an honest argument behind it: the
     only walk cycle delivered was Amit's own character, and putting
     the customer's own likeness on six passers-by is worse than a
     silhouette. That argument expired the moment `walk_man`,
     `walk_woman` and `walk_dogwalker` arrived — three back-view cycles
     of people who are nobody in particular — and what was left was a
     blocky mannequin with rectangles for arms, standing three metres
     from the camera in the one screen Amit reviews most. He named it:
     *"חוץ מהדמות שלי הכל נראה מלפני מאה שנה."*

     So the geometry figure is gone rather than kept as a fallback.
     Everyone in the street walks away from the camera, which is the
     view the pack holds. Nobody walks towards it: there is no front
     view, and inventing one out of boxes is the thing that was wrong.
     When front-facing cycles arrive, this takes a `dir` again.
     --------------------------------------------------------------- */
  /* ---------------------------------------------------------------
     SLICING A SHEET THAT IS NOT A GRID

     Measured: `walk_man` holds 7 figures at 0-304, 329-628, 640-941,
     942-1242, 1244-1508, 1512-1767, 1770-2023 — widths from 254 to 305
     and gaps from 1 to 25 pixels. Slicing that with a uniform
     `repeat.set(1/n, 1)` clips a shoulder off every other pose, which
     is the fault that put three smeared rectangles on the pavement the
     last time a sheet was assumed rather than measured.

     So the frames are FOUND: a column belongs to a figure if anything
     in it is opaque, a run of such columns is a figure, and a run much
     wider than the median is two figures touching and is split.
     --------------------------------------------------------------- */
  interface Cycle {
    frames: THREE.Texture[];
    /** Width of one frame's sampling window, over its height. */
    aspect: number;
  }

  function cycle(tex: THREE.Texture | undefined, forceEven = 0): Cycle | null {
    if (!tex) return null;
    const img = tex.image as HTMLImageElement | undefined;
    if (!img || !img.width) return null;
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x2 = c.getContext("2d", { willReadFrequently: true });
    if (!x2) return null;
    x2.drawImage(img, 0, 0);
    const data = x2.getImageData(0, 0, c.width, c.height).data;

    const rects: Array<[number, number]> = [];
    if (forceEven > 0) {
      /* `walk_dogwalker` is a person AND a dog per pose, and the gap
         between the two is as wide as the gap between poses — so the
         run rule finds a person here and a dog there. It is the one
         sheet that is evenly spaced, and it says so here rather than
         being guessed at. */
      const w = c.width / forceEven;
      for (let i = 0; i < forceEven; i += 1) {
        rects.push([Math.round(i * w), Math.round((i + 1) * w) - 1]);
      }
    } else {
      const col = new Int32Array(c.width);
      for (let x = 0; x < c.width; x += 1) {
        let n = 0;
        for (let y = 0; y < c.height; y += 1) {
          if ((data[(y * c.width + x) * 4 + 3] ?? 0) > 40) n += 1;
        }
        col[x] = n;
      }
      const runs: Array<[number, number]> = [];
      let start = -1;
      for (let x = 0; x < c.width; x += 1) {
        if (col[x]! > 2 && start < 0) start = x;
        else if (col[x]! <= 2 && start >= 0) { runs.push([start, x - 1]); start = -1; }
      }
      if (start >= 0) runs.push([start, c.width - 1]);
      const keep = runs.filter(([a, z]) => z - a > 40);
      if (keep.length === 0) return null;
      const widths = keep.map(([a, z]) => z - a + 1).sort((a, b) => a - b);
      const median = widths[Math.floor(widths.length / 2)]!;
      for (const [a, z] of keep) {
        const w = z - a + 1;
        const parts = Math.max(1, Math.round(w / median));
        for (let i = 0; i < parts; i += 1) {
          rects.push([Math.round(a + (w * i) / parts), Math.round(a + (w * (i + 1)) / parts) - 1]);
        }
      }
    }
    if (rects.length === 0) return null;

    /*
     * ONE WINDOW WIDTH FOR THE WHOLE CYCLE.
     *
     * Each pose is a different number of pixels wide — a stride is
     * wider than a stand — and giving every frame its own quad would
     * make the figure grow and shrink as it walked. So the window is
     * the widest frame, centred on each pose, and the quad never
     * changes size. The pose moves inside it, which is what a pose
     * does.
     */
    const unit = Math.max(...rects.map(([a, z]) => z - a + 1));
    const frames = rects.map(([a, z]) => {
      const t = tex.clone();
      t.needsUpdate = true;
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(unit / c.width, 1);
      t.offset.set(((a + z + 1) / 2 - unit / 2) / c.width, 0);
      return t;
    });
    return { frames, aspect: unit / c.height };
  }

  interface Walker {
    g: THREE.Group;
    speed: number;
    cycle: Cycle;
    material: THREE.MeshStandardMaterial;
    stride: number;
    walked: number;
  }
  const walkers: Walker[] = [];

  function drawnWalker(
    x: number,
    z: number,
    c: Cycle,
    height: number,
    stride: number,
    /** Zero for somebody standing still — the cycle then holds frame 0. */
    speed = 0.9 + Math.random() * 0.7
  ) {
    const g = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      map: c.frames[0]!,
      emissiveMap: c.frames[0]!,
      emissive: 0xffffff,
      emissiveIntensity: 0.14,
      transparent: true,
      alphaTest: 0.42,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(height * c.aspect, height), material);
    quad.position.y = height / 2;
    g.add(quad);

    /* The same contact shadow the player has, and for the same reason:
       a plane facing the camera casts a sheet, not a person. */
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(height * c.aspect * 0.8, height * 0.34),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    g.add(shadow);

    g.position.set(x, 0, z);
    scene.add(g);
    walkers.push({ g, speed, cycle: c, material, stride, walked: 0 });
  }

  /*
   * The drawn cycles, measured once. `walk_dog` is deliberately not in
   * the crowd: a loose dog trotting down a pavement on its own is a lost
   * dog, and it belongs at the park — see `PLACED`.
   */
  const peopleCycles = [
    cycle(textures["walk_man"]),
    cycle(textures["walk_woman"]),
    cycle(textures["walk_dogwalker"], 6),
  ].filter((c): c is Cycle => c !== null);

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
    const c = peopleCycles.length
      ? peopleCycles[Math.floor(Math.random() * peopleCycles.length)]!
      : null;
    if (c) drawnWalker(x, z, c, 1.62 + Math.random() * 0.14, 1.9);
  }

  /*
   * ONE DOG, STANDING IN THE DOG PARK.
   *
   * It was trotting down the pavement with the crowd, and a dog walking
   * a street on its own at night is a lost dog — the opposite of what
   * the park is for. It stands in the park instead, which is a dog
   * being a dog somewhere a dog belongs, and it claims nothing: a dog
   * is not a professional and nobody is waiting for you here.
   */
  {
    const dog = cycle(textures["walk_dog"]);
    if (dog) drawnWalker(FRONT_X - 2.6, 60.2, dog, 0.72, 1.1, 0);
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
  /*
   * The palm and the jacaranda are the two things in this street that
   * Amit named without naming: the sphere-on-a-stick trees are the
   * loudest remaining piece of 2004 in the frame. Where the drawings
   * have landed they stand instead, as crossed cut-outs.
   */
  const drawnTrees = [textures["prop_palm"], textures["prop_jacaranda"]].filter(
    (t): t is THREE.Texture => Boolean(t)
  );
  let treeTurn = 0;

  function tree(x: number, z: number, scale = 1) {
    if (drawnTrees.length > 0) {
      const t = drawnTrees[treeTurn++ % drawnTrees.length]!;
      /*
       * Five metres, not seven. The drawn palm is nearly as wide as it
       * is tall, so at seven it was a four-and-a-half-metre crown two
       * metres from the walker — the whole left of the frame. A real
       * street palm of this kind is about five, and at five the crown
       * passes overhead instead of across the lens.
       */
      const g = cutout(t, (4.9 + Math.random() * 0.9) * scale);
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * Math.PI;
      scene.add(g);
      return;
    }
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
    tree(FURNITURE_X - 0.3, z - 7, 0.94 + Math.random() * 0.12);
    tree(-FURNITURE_X + 0.3, z - 18.5, 0.94 + Math.random() * 0.12);
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
  const drawnCafe = textures["prop_cafe_set"];
  function cafe(x: number, z: number, hue: number) {
    const g = new THREE.Group();
    if (drawnCafe) {
      const set = cutout(drawnCafe, 1.35);
      g.add(set);
      const flame = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex, color: hue, transparent: true, opacity: 0.85,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        })
      );
      flame.scale.setScalar(0.8);
      flame.position.set(0, 0.86, 0.06);
      g.add(flame);
      ticking.push((_dt, t) => {
        flame.material.opacity = 0.62 + Math.sin(t * 6.1 + x) * 0.16;
      });
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * Math.PI;
      scene.add(g);
      return;
    }
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
  const drawnPlanters = [
    textures["prop_planter_box"],
    textures["prop_planter_round"],
  ].filter((t): t is THREE.Texture => Boolean(t));
  let planterTurn = 0;

  function planter(x: number, z: number) {
    if (drawnPlanters.length > 0) {
      const t = drawnPlanters[planterTurn++ % drawnPlanters.length]!;
      const g = cutout(t, 1.15);
      g.position.set(x, 0, z);
      g.rotation.y = Math.random() * Math.PI;
      scene.add(g);
      return;
    }
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

  /*
   * Benches and bins are drawn too, where they have arrived. The café
   * set keeps its geometry either way, because its candle is a light
   * source and a cut-out cannot hold one.
   */
  const drawnBench = textures["prop_bench"];
  const drawnBin = textures["prop_bin"];
  function furnish(x: number, z: number, tex: THREE.Texture | undefined, h: number) {
    if (!tex) return;
    const g = cutout(tex, h);
    g.position.set(x, 0, z);
    g.rotation.y = (Math.random() - 0.5) * 0.7 + (x > 0 ? -Math.PI / 2 : Math.PI / 2);
    scene.add(g);
  }

  /*
   * The park's footprint, kept clear. A café table standing in the
   * middle of a fenced dog park is the same fault as a table standing
   * inside a building — furniture laid out on a grid that does not know
   * what else is there.
   */
  const inPark = (x: number, z: number) =>
    x > 0 && Math.abs(z - 61.6) < 5.4 && x > FRONT_X - 4.6;

  for (let z = STREET_LENGTH / 2 - 24; z > -STREET_LENGTH / 2; z -= 31) {
    if (!inPark(FRONT_X - 2.0, z)) cafe(FRONT_X - 2.0, z, flowerHues[Math.floor(Math.random() * 3)]!);
    cafe(-FRONT_X + 2.0, z - 15, 0xffc07a);
    if (!inPark(FRONT_X - 1.3, z - 7)) planter(FRONT_X - 1.3, z - 7);
    planter(-FRONT_X + 1.3, z - 22);
    if (!inPark(FRONT_X - 1.6, z - 18)) furnish(FRONT_X - 1.6, z - 18, drawnBench, 1.0);
    furnish(-FRONT_X + 1.6, z - 3, drawnBench, 1.0);
    if (!inPark(FRONT_X - 1.2, z - 26)) furnish(FRONT_X - 1.2, z - 26, drawnBin, 1.05);
  }

  /* ---------------------------------------------------------------
     PLACES AND PARKED VEHICLES

     Amit, on the dog walker: *"אין לו חנות, צריך לחשוב על דרך אחרת
     לפגוש אותו, כי משהו כן צריך להיפתח."*

     The places stand between the shops. They are scenery — no
     availability, no ETA, nobody waiting inside — and they are the
     shape the trades that COME TO YOU need: a dog walker meets you at
     the park, a tow truck at the layby, a courier at the pickup point.

     The vehicles are PARKED. The moving traffic stays geometry,
     because a broadside drawing on a road running away from the
     camera is the mismatch that made the old painted traffic look
     wrong — but a van at the kerb is seen side-on, which is exactly
     what the drawing is.
     --------------------------------------------------------------- */
  {
    /*
     * A PLACE IS SOMEWHERE YOU CAN BE MET, SO IT HAS TO BE FINDABLE.
     *
     * Rotating the five drawings through whatever bay came next made
     * them scenery, which is half of what Amit asked for and the
     * easier half. *"צריך לחשוב על דרך אחרת לפגוש אותו, כי משהו כן
     * צריך להיפתח."*
     *
     * So each one is placed deliberately, carries the trade it
     * belongs to, and goes into `places` where the proximity check can
     * find it — the same way a shop does. Walk up to the dog park and
     * it offers dog walking; walk up to the layby and it offers the
     * roadside trades.
     *
     * `place_bench_stop` deliberately has no trade. A street needs
     * places that are simply nice to stand in, and a bench that tried
     * to sell you something would be the worst object in the city.
     */
    const PLACED: ReadonlyArray<{
      id: string;
      asset: string;
      he: string;
      department: string | null;
      z: number;
      side: -1 | 1;
      height: number;
    }> = [
      /*
       * ON THE PAVEMENT YOU ARE ACTUALLY WALKING ON.
       *
       * Four of the five places started on the far side of the road,
       * and the proximity check is a radius of 8 metres from a spot
       * 2.6m off the wall — which is 13 metres away across the road, so
       * the dog park could not be reached from the pavement the player
       * spawns on and walks down. Measured: walking to z 61.6 named the
       * pets shop and never the park.
       *
       * The two places a person is most likely to want — the one Amit
       * asked for and the one that is simply somewhere to sit — are on
       * the near side now. The rest stay across the road, because a
       * street with everything on one side is a corridor.
       */

      { id: "roadside", asset: "place_roadside",   he: "מפרץ עצירה",    department: "VEHICLE",   z:   8.8, side: -1, height: 3.6 },
      { id: "pickup",   asset: "place_pickup",     he: "נקודת שליחויות", department: "LOGISTICS", z: -79.2, side:  1, height: 3.8 },
      { id: "garden",   asset: "place_garden",     he: "פינת המשתלה",   department: "HOME_CARE", z: -26.4, side: -1, height: 3.4 },
      { id: "bench",    asset: "place_bench_stop", he: "פינת ישיבה",    department: null,        z: -114.4, side:  1, height: 3.4 },
    ];

    for (const pl of PLACED) {
      const tex = textures[pl.asset];
      if (!tex) continue;
      const band = topBand(tex);
      const g = cutout(band.tex, pl.height, 1, band.aspect);
      const x = FRONT_X * pl.side - pl.side * 0.5;
      g.position.set(x, 0, pl.z);
      g.rotation.y = pl.side < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(g);
      places.push({
        id: pl.id,
        he: pl.he,
        department: pl.department,
        /* Where somebody stands to be met here: off the wall, on the
           pavement, the same offset a shop doorway uses. */
        spot: new THREE.Vector3(x - pl.side * 2.6, 0, pl.z),
      });
    }

    /* ---------------------------------------------------------------
       THE DOG PARK, BUILT RATHER THAN DRAWN

       Amit asked for it by name — *"צריך גם לעבוד על גינת כלבים לדוג
       ווקרים"* — and the file that came back under the name is a
       pet-grooming shopfront (see `CITY_BUILDING_IDS`). A shopfront is
       the one thing this place must not be: standing at it, the screen
       says "אין כאן חנות — המקצוען מגיע אליכם".

       So it is made out of what a small city dog park is made out of:
       a patch of grass, a low rail around it, two trees and a bench,
       with the drawn dog standing in it. Every piece is either real
       delivered art or a box, nothing pretends to be a photograph of a
       park, and it can be replaced by one cut-out the day a drawing of
       a park arrives.
       --------------------------------------------------------------- */
    {
      /*
       * SET AGAINST THE BUILDING, NOT ACROSS THE PAVEMENT.
       *
       * The first version was six metres wide on a six-and-a-half metre
       * pavement, so the only way down the street was straight through
       * the park — which is charming once and an obstacle every time
       * after. Four metres against the wall leaves two and a bit to
       * walk past on, and the gate still faces the pavement.
       */
      const pz = 61.6;
      const px = FRONT_X - 2.2;
      const PW = 4.0;
      const PL = 8.0;
      const g = new THREE.Group();

      const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(PW, PL),
        new THREE.MeshStandardMaterial({ color: 0x2f4a2c, roughness: 0.95 })
      );
      grass.rotation.x = -Math.PI / 2;
      grass.position.y = 0.03;
      grass.receiveShadow = true;
      g.add(grass);

      /* A low rail, which is what tells you it is a park and not a
         verge. Posts and a top bar, dark like the lamp posts. */
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x1b1722, roughness: 0.5, metalness: 0.2,
      });
      const rail = (x: number, z: number, len: number, along: "x" | "z") => {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(along === "x" ? len : 0.07, 0.07, along === "z" ? len : 0.07),
          railMat
        );
        bar.position.set(x, 0.62, z);
        g.add(bar);
        const n = Math.max(2, Math.round(len / 1.5));
        for (let i = 0; i <= n; i += 1) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.09), railMat);
          const t = -len / 2 + (len * i) / n;
          post.position.set(along === "x" ? x + t : x, 0.34, along === "z" ? z + t : z);
          g.add(post);
        }
      };
      /* Open towards the pavement, so it can be walked into. */
      rail(px, pz - PL / 2, PW, "x");
      rail(px, pz + PL / 2, PW, "x");
      rail(px + PW / 2, pz, PL, "z");

      grass.position.set(px, 0.03, pz);

      const tree = textures["prop_jacaranda"] ?? textures["prop_palm"];
      if (tree) {
        for (const dz of [-2.8, 3.1]) {
          const t = cutout(tree, 6.4);
          t.position.set(px + 1.2, 0, pz + dz);
          g.add(t);
        }
      }
      const benchTex = textures["prop_bench"];
      if (benchTex) {
        const bench = cutout(benchTex, 1.0);
        bench.position.set(px + 1.5, 0, pz - 1.2);
        bench.rotation.y = -Math.PI / 2;
        g.add(bench);
      }
      scene.add(g);

      places.push({
        id: "dogpark",
        he: "גינת הכלבים",
        department: "PETS",
        spot: new THREE.Vector3(px - 2.2, 0, pz),
      });
    }

    const parked: Array<[string, number]> = [
      ["van_side", 2.3],
      ["scooter_side", 1.3],
      ["van_back", 2.3],
      ["scooter_back", 1.3],
    ];
    let pk = 0;
    for (let z = STREET_LENGTH / 2 - 34; z > -STREET_LENGTH / 2 + 10; z -= 47) {
      const [id, h] = parked[pk++ % parked.length]!;
      const tex = textures[id];
      if (!tex) continue;
      const side: -1 | 1 = pk % 2 ? 1 : -1;
      const g = cutout(tex, h, 1);
      g.position.set(side * (KERB_X - 1.1), 0, z);
      /* Side views face across the road; rear views face down it. */
      g.rotation.y = id.endsWith("_side") ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : 0;
      scene.add(g);
    }
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
  const _focus = new THREE.Vector3();
  function update(dt: number, elapsed: number, camera: THREE.Camera) {
    /*
     * The shadow box rides with the viewer — see the moon above. It
     * is aimed a few metres ahead of the camera rather than at it, so
     * the sharp part of the map is where you are looking.
     */
    camera.getWorldDirection(_focus);
    _focus.multiplyScalar(7).add(camera.position).setY(0);
    moon.target.position.copy(_focus);
    moon.target.updateMatrixWorld();
    moon.position.set(_focus.x - 22, 34, _focus.z + 17);
    moon.updateMatrixWorld();

    for (const c of cars) {
      const { dir, speed } = c.userData as { dir: 1 | -1; speed: number };
      c.position.z += dir * speed * dt;
      if (c.position.z > HALF) c.position.z = -HALF;
      if (c.position.z < -HALF) c.position.z = HALF;
    }
    for (const w of walkers) {
      /* Everyone walks away from the camera; see the note above. */
      w.g.position.z -= w.speed * dt;
      if (w.g.position.z > HALF) w.g.position.z = -HALF;
      if (w.g.position.z < -HALF) w.g.position.z = HALF;
      /* Driven by ground covered, never by a clock: a timer plays the
         same poses at the same rate whether the figure is moving or
         not, and the feet slide. */
      w.walked += w.speed * dt;
      const n = w.cycle.frames.length;
      const i = Math.min(n - 1, Math.floor((((w.walked / w.stride) % 1) + 1) % 1 * n));
      const frame = w.cycle.frames[i]!;
      if (w.material.map !== frame) {
        w.material.map = frame;
        w.material.emissiveMap = frame;
        w.material.needsUpdate = true;
      }
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

  return { scene, shops, places, lamps, update };
}

export { neon, glow };
