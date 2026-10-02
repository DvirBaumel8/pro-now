import * as THREE from "three";

import {
  CITY_BUILDING_IDS,
  CITY_FLEET_IDS,
  CITY_FLEET_TRADES,
  CITY_HEIGHT_IDS,
  CITY_LAYERED_BUILDING_IDS,
  CITY_TREE_IDS,
  CITY_MATERIAL_IDS,
  CITY_PLACE_IDS,
  CITY_PROP_IDS,
  CITY_ROOF_IDS,
  CITY_VEHICLE_IDS,
  CITY_WALKER_IDS,
  CITY_PARK_IDS,
} from "@pro-now/demo-types";

import { contactShadow, neonMask } from "./boxRoom";
import { measureCycle, type Cycle } from "./sheet";
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
  /**
   * The services THIS house sells, when its department has more than
   * one house in the street.
   *
   * Amit: *"יש עסקים שלא מתאימים לתיאור שלהם — פותח עסק אחר."* He was
   * describing a real bug and it is this one: the sheet was built from
   * the DEPARTMENT, so the nail bar and the hair salon are both BEAUTY
   * and both offered haircuts, manicures and makeup. Walking into
   * "ציפורניים" and being offered a haircut is the shop telling you it
   * does not know what it is.
   *
   * Absent means "everything the department does", which is right for
   * the nine trades that have one house each.
   */
  services?: readonly string[];
  /** The neon over the door, drawn rather than photographed. */
  neonColour?: string;
}

export interface StreetHandles {
  scene: THREE.Scene;
  /** Shops whose window you can see into — framed close when you stop. */
  windowShops: Set<string>;
  /** The professional's own van, driven by the host. */
  heroVan: (trade: string) => THREE.Group | null;
  shops: Array<
    ShopSpec & {
      doorway: THREE.Vector3;
      /**
       * Where a person stands INSIDE, for the shops that have a room.
       * Absent means the door opens a list rather than a place.
       */
      roomSpot?: THREE.Vector3;
      /** Fades the shopfront out of the way on the way in. */
      fadeFace?: (k: number) => void;
    }
  >;
  /**
   * Places that are not shops.
   *
   * Almost every service in this catalogue is *עד הבית* — the
   * professional comes to you — and for a dog walker, a courier or a
   * tow truck a shopfront would be a lie: there are no premises to
   * walk into. But there is a place, and a place can be walked up to.
   */
  places: Array<{
    id: string;
    he: string;
    department: string | null;
    /**
     * The service ids offered here, when a place offers fewer than its
     * whole department. Amit: *"בגינת כלבים אמור להיות רק דוג ווקר."*
     * Absent means the whole department.
     */
    services?: readonly string[];
    spot: THREE.Vector3;
  }>;
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
/*
 * On the salon's pavement, twelve metres short of its door. Amit: *"אם
 * המספרה אמורה להיות ראשונה, תמקם אותה בתחילת הרחוב, שאגיע אליה ראשון
 * ולא אלך לחנות מתה."* The finished shop is the first thing you meet;
 * the ones still being redrawn come after it.
 */
export const SPAWN = { x: -6.3, z: STREET_LENGTH / 2 - 50 } as const;
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
} from "@pro-now/demo-types";

/** Every optional id, for the loader to try. */
export const OPTIONAL_ART: readonly string[] = [
  ...CITY_BUILDING_IDS,
  ...CITY_MATERIAL_IDS,
  ...CITY_PROP_IDS,
  ...CITY_PLACE_IDS,
  /*
   * Front and back only. The fleet also has side and top views, and
   * they are for other places — the side for the route on the waiting
   * screen, the top for its map — and nothing in this street draws
   * them. Loading them here anyway was eighteen large drawings, the
   * top views the largest in the set, uploaded to a phone's GPU for
   * nothing: about a hundred megabytes of the budget whose overrun is
   * what closed the tab on Amit's phone.
   */
  ...CITY_FLEET_IDS.filter((id) => /_(front|back)$/.test(id)),
  /* A shop redrawn with a see-into window has no relief map any more —
     asking for one was three wasted round trips per shop on a phone. */
  ...CITY_HEIGHT_IDS.filter((id) => !/^shop_(hair|home|nails|lust|pets|auto|appliance|care|move|well|build|help|vet)_height$/.test(id)),
  ...CITY_LAYERED_BUILDING_IDS,
  ...CITY_ROOF_IDS,
  ...CITY_TREE_IDS,
  ...CITY_VEHICLE_IDS,
  ...CITY_WALKER_IDS,
  ...CITY_PARK_IDS,
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

/*
 * THE PICTURE'S PIXELS, READ ONCE AND SMALL.
 *
 * `mainBand` and `centrePiece` both need to know where a drawing is
 * opaque, and both used to copy the whole image into a canvas and read
 * it back at full size — on every call, for every clone. Profiled, the
 * two of them and the little `on` test inside were two and a half
 * seconds of the load. They only ever return FRACTIONS of the picture
 * (a band's top and bottom, a column run's edges), and a fraction is
 * the same at 512 as at 2048, so the read is done once per image at
 * 512 on its long edge and shared.
 */
const scanByImage = new WeakMap<
  object,
  { c: { width: number; height: number }; d: Uint8ClampedArray } | null
>();
function scanAlpha(
  img: HTMLImageElement
): { c: { width: number; height: number }; d: Uint8ClampedArray } | null {
  const hit = scanByImage.get(img);
  if (hit !== undefined) return hit;
  const k = Math.min(1, 512 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k));
  const h = Math.max(1, Math.round(img.height * k));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d", { willReadFrequently: true });
  let out: { c: { width: number; height: number }; d: Uint8ClampedArray } | null = null;
  if (g) {
    g.drawImage(img, 0, 0, w, h);
    out = { c: { width: w, height: h }, d: g.getImageData(0, 0, w, h).data };
  }
  scanByImage.set(img, out);
  return out;
}

/* Keyed by the decoded picture, which every clone of a texture shares. */
const reliefByImage = new WeakMap<
  object,
  { normal: THREE.Texture; height: THREE.Texture } | null
>();
const reliefCache = new Map<
  THREE.Texture,
  { normal: THREE.Texture; height: THREE.Texture } | null
>();

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
  textures: Record<string, THREE.Texture | undefined>,
  /** Daylight: see `daylight.ts`. The street is built for the evening. */
  opts: { day?: boolean } = {}
): StreetHandles {
  const day = opts.day === true;
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
  /* Lamps are still on in the morning, but nobody sees their pools. */
  const lampScale = day ? 0.18 : 1;
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
    if (day) {
      /* Morning: a clear Mediterranean sky, paler to the horizon. */
      g.addColorStop(0, "#3f86d6");
      g.addColorStop(0.45, "#76b1ea");
      g.addColorStop(0.8, "#bcdcf4");
      g.addColorStop(1, "#f1e6cf");
    } else {
      g.addColorStop(0, "#0b1030");
      g.addColorStop(0.42, "#1d2050");
      g.addColorStop(0.72, "#4a3364");
      g.addColorStop(0.9, "#8a4f63");
      g.addColorStop(1, "#c07a5e");
    }
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 256);
  }
  const skyTex = new THREE.CanvasTexture(sky);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = day ? new THREE.FogExp2(0xc4d8ec, 0.0075) : new THREE.FogExp2(DARK_SKY, 0.0125);

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
    if (!day) scene.add(stars);

    /* The towers. Flat boxes with lit windows painted on, far enough
       away that nobody ever gets to see they have no sides. */
    const towerWin = (() => {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 256;
      const x = c.getContext("2d")!;
      x.fillStyle = day ? "#8fa3bd" : "#0a0814";
      x.fillRect(0, 0, 64, 256);
      for (let r = 0; r < 30; r += 1)
        for (let col = 0; col < 6; col += 1)
          if (day) {
            x.fillStyle = "rgba(210,228,245,0.55)";
            x.fillRect(4 + col * 10, 6 + r * 8, 6, 4);
          } else if (Math.random() > 0.55) {
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
  /* By day the sky does the lighting and the sun casts the shadows; the
     lamps and shop spill are turned down to a glow (`lampScale`). */
  scene.add(day ? new THREE.HemisphereLight(0xdcebff, 0x9c8a74, 1.9) : new THREE.HemisphereLight(0x8290d0, 0x3d3140, 0.95));
  const moon = day ? new THREE.DirectionalLight(0xfff1da, 2.9) : new THREE.DirectionalLight(0xb9c4ee, 0.8);
  moon.position.set(-34, day ? 70 : 50, 26);
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
    new THREE.MeshStandardMaterial({
      map: paveMap,
      /* Cut stone has a lip on every edge, and a lamp finds it. Without
         this the pavement is a photograph of stone lying flat on the
         floor — which is what it was. */
      normalMap: relief(paveMap),
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.45,
      metalness: 0.08,
    })
  );
  pave.rotation.x = -Math.PI / 2;
  pave.receiveShadow = true;
  scene.add(pave);

  const roadMap = tiled(textures["mat_road"], 2, 34) ?? asphalt();
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF * 2, STREET_LENGTH),
    new THREE.MeshStandardMaterial({
      map: roadMap,
      normalMap: relief(roadMap),
      normalScale: new THREE.Vector2(0.35, 0.35),
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
  /*
   * THE TRIM WAS SO DARK IT READ AS A HOLE.
   *
   * 0x120e1a against a lit plaster facade is not "dark metal", it is
   * black — and every parapet, every sign bracket and every shutter
   * frame in the street came out as a hard black bar laid over the
   * drawing. Amit: *"הבתים קרטון."* A black bar with no shading in it
   * is the most cardboard object there is.
   *
   * Painted ironwork at night is a dark warm grey that picks up the
   * sky above it and the lamps beside it. This is dark enough to stay
   * trim and light enough to have a lit side.
   */
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x2b2536,
    roughness: 0.72,
    metalness: 0.18,
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x2a2433,
    roughness: 0.55,
    metalness: 0.4,
  });
  const shops: StreetHandles["shops"] = [];
  /** Somewhere in the street you can be met that is not a shop. */
  const places: Array<{
    id: string;
    he: string;
    department: string | null;
    /**
     * The service ids this place offers, when it is fewer than the
     * whole department. Absent means "everything the department does".
     */
    services?: readonly string[];
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
  const canopies: THREE.Object3D[] = [];
  const _canopyAt = new THREE.Vector3();
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
    /*
     * -----------------------------------------------------------------
     * A CUT-OUT THAT CASTS NO SHADOW IS A STICKER
     * -----------------------------------------------------------------
     * Amit: *"הבתים קרטון."* The trees, the benches, the parked vans
     * and the people had exactly one thing under them — a soft dark
     * blob — and a blob is a patch, not a shadow. Nothing in the street
     * was planted in it.
     *
     * They could not cast one, and the reason is worth writing down
     * because it is invisible: three builds the shadow pass from a
     * depth material, and it copies `alphaMap` and `alphaTest` across
     * but NOT `map`. A cut-out's silhouette lives in its map's alpha
     * channel, so every one of these would have cast a solid
     * RECTANGLE — a tree throwing the shadow of a packing crate.
     *
     * So each carries its own depth material, which does have the map,
     * and the shadow is the shape of the drawing.
     */
    const depth = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: tex,
      alphaTest: 0.42,
    });
    const g = new THREE.Group();
    for (let i = 0; i < sides; i += 1) {
      const q = new THREE.Mesh(new THREE.PlaneGeometry(w, height), mat);
      q.position.y = height / 2;
      q.rotation.y = (Math.PI / sides) * i;
      q.castShadow = true;
      q.customDepthMaterial = depth;
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
  function mainBand(tex: THREE.Texture): { tex: THREE.Texture; aspect: number } {
    const img = tex.image as HTMLImageElement | undefined;
    if (!img || !img.width) return { tex, aspect: 0 };
    const scanned = scanAlpha(img);
    if (!scanned) return { tex, aspect: 0 };
    const { c, d } = scanned;
    /*
     * THE BIGGEST BAND, NOT THE FIRST ONE.
     *
     * This began as "take the top band", because the four place
     * drawings arrive as a place with a row of spare props under it.
     * Then the shop interiors arrived shaped differently: measured,
     * `shop_tech_inside.webp` is 3400 x 2404 and holds THREE things —
     * a 125-pixel strip of somebody else's drawing along the top, the
     * workshop itself from 218 to 1976, and a jacaranda blossom from
     * 2027 down.
     *
     * Standing in that room, the blossom was a metre-high magenta bush
     * growing out of the floor in front of the workbench, and the
     * stray strip was a shadow across the ceiling. Amit saw it
     * immediately.
     *
     * A sheet that holds several drawings has one that is the drawing
     * and the rest are offcuts, and the one that is the drawing is the
     * biggest. That rule is right for the places too — their place is
     * always taller than their row of props.
     */
    let y0 = -1;
    let y1 = -1;
    let runStart = -1;
    let gap = 0;
    for (let y = 0; y < c.height; y += 1) {
      let n = 0;
      for (let x = 0; x < c.width; x += 1) {
        if ((d[(y * c.width + x) * 4 + 3] ?? 0) > 40) { n += 1; if (n > 3) break; }
      }
      if (n > 3) {
        if (runStart < 0) runStart = y;
        gap = 0;
        if (y - runStart > y1 - y0) { y0 = runStart; y1 = y; }
      } else if (runStart >= 0 && ++gap > Math.max(4, Math.round(c.height * 0.006))) {
        /* Proportional, not 12 rows: the light edition is half the
           height, and a fixed gap would merge bands that the full-size
           file keeps apart. 0.006 of 2048 is the old 12. */
        runStart = -1;
      }
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

  /* ---------------------------------------------------------------
     THE DRAWINGS ARE FLAT, AND THAT IS MOST OF WHAT "CARDBOARD" MEANS

     Amit, of the street as a whole: *"הבתים קרטון."* He is right and
     it is not the art's fault. Every facade is one plane. A real wall
     has twenty to forty centimetres of relief in it — window reveals,
     a door set back, a moulding that catches the lamp on its top edge
     and shades its underside — and all of that is what tells an eye
     "this is a building" before it has read a single detail.

     We cannot model that: the windows are painted INTO the picture,
     so there is no geometry to push in. But the light can be told the
     shape anyway. A normal map turns every pixel into a surface angle,
     and then the street's own lamps sculpt the drawing — a moulding
     lights along its top and darkens underneath as you walk past it,
     which is exactly what the flat version could never do.

     The height is read from the drawing's own brightness. On a
     painted elevation that is a remarkably good guess: an artist
     paints a recess dark and a projection light, because that is what
     they look like. The map is built at 1024 across whatever the
     source is — a normal map carries angles, not detail, and doing
     this at 3400 x 3509 on thirteen shopfronts would cost seconds of
     the load for a difference nobody can see.
     --------------------------------------------------------------- */
  function relief(tex: THREE.Texture | undefined): THREE.Texture | null {
    return reliefMaps(tex)?.normal ?? null;
  }

  /**
   * ---------------------------------------------------------------------
   * AND THE SAME HEIGHTS, PUSHED INTO THE GEOMETRY FOR REAL
   * ---------------------------------------------------------------------
   * Amit, looking down at the street from the arrival shot: *"הבתים
   * עדיין על הפנים ונראים שטוחים וקרטון."*
   *
   * He is right and the reason is the angle. Three layers 40cm apart
   * separate beautifully at eye level — walk past and the balcony
   * slides across the wall — and from above they are three stickers on
   * the front of a box, because 40cm on a ten-metre building is
   * nothing when you are looking down at it.
   *
   * A normal map has the same problem: it tilts the LIGHT and never
   * moves a single vertex, so a silhouette stays a silhouette and a
   * window stays level with the wall around it.
   *
   * A displacement map moves the vertices. The same height that the
   * normal map is derived from, on a wall subdivided finely enough to
   * carry it, pushes the windows a real 25 centimetres into the
   * masonry and lifts the cornices out of it — and then the light and
   * the geometry agree, which they never did before.
   *
   * Only the WALL layer. The balconies and the plants are cut-outs
   * with holes in them, and displacing a hole tears it.
   */
  function reliefMaps(
    tex: THREE.Texture | undefined
  ): { normal: THREE.Texture; height: THREE.Texture } | null {
    if (!tex) return null;
    const cached = reliefCache.get(tex);
    if (cached !== undefined) return cached;
    const img = tex.image as HTMLImageElement | undefined;
    if (!img || !img.width) { reliefCache.set(tex, null); return null; }

    /*
     * ONCE PER DRAWING, NOT ONCE PER USE.
     *
     * This was cached by TEXTURE, and almost nothing reaches here as
     * the texture that was loaded: `mainBand`, `centrePiece` and
     * `tiled` all hand over clones, so one facade used in three layers
     * and two roof props was Sobel-filtered five times. Profiled, this
     * function and its inner loop were four of the eight seconds
     * between the last download and the first step. The maps now hang
     * off the IMAGE, and each use gets a clone of them dressed with its
     * own tiling — a clone shares the pixels, so it is free.
     */
    let made = reliefByImage.get(img);
    if (made === undefined) {
      made = computeRelief(img);
      reliefByImage.set(img, made);
    }
    if (!made) { reliefCache.set(tex, null); return null; }
    const dress = (from: THREE.Texture) => {
      const t = from.clone();
      t.wrapS = tex.wrapS;
      t.wrapT = tex.wrapT;
      /* A tiled floor tiles its relief too, or the stones light up in
         one square metre and nowhere else. */
      t.repeat.copy(tex.repeat);
      t.offset.copy(tex.offset);
      return t;
    };
    const pair = { normal: dress(made.normal), height: dress(made.height) };
    pair.normal.anisotropy = 4;
    reliefCache.set(tex, pair);
    return pair;
  }

  function computeRelief(
    img: HTMLImageElement
  ): { normal: THREE.Texture; height: THREE.Texture } | null {
    /* 512, not 1024: a normal map carries angles, not detail, and the
       displacement it feeds is a 128-square grid. Four times fewer
       pixels through a Sobel filter for nothing anybody can see. */
    const W = Math.min(512, img.width);
    const H = Math.max(1, Math.round((img.height / img.width) * W));
    const src = document.createElement("canvas");
    src.width = W;
    src.height = H;
    const sx = src.getContext("2d", { willReadFrequently: true });
    if (!sx) return null;
    sx.drawImage(img, 0, 0, W, H);
    const d = sx.getImageData(0, 0, W, H).data;

    /* Height = luminance, and transparent pixels are "no wall": left
       flat so a cut-out's empty margin does not grow a cliff edge. */
    const hgt = new Float32Array(W * H);
    for (let i = 0, p2 = 0; i < hgt.length; i += 1, p2 += 4) {
      const a = (d[p2 + 3] ?? 0) / 255;
      hgt[i] = a < 0.5
        ? 0
        : (0.2126 * (d[p2] ?? 0) + 0.7152 * (d[p2 + 1] ?? 0) + 0.0722 * (d[p2 + 2] ?? 0)) / 255;
    }

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ox = out.getContext("2d")!;
    const im = ox.createImageData(W, H);
    const o = im.data;
    /* How deep the relief reads. Too high and a painted shadow becomes
       a canyon; this is the value at which a window frame reads as a
       frame and a brick stays a brick. */
    const STRENGTH = 2.6;
    /*
     * The heights with a two-pixel border copied out from the edge, so
     * a tap never needs clamping. The clamp was four Math.min/max per
     * tap, fourteen taps per pixel, and profiled it was most of the
     * cost of this whole function; the arithmetic it guarded is
     * trivial.
     */
    const PAD = 2;
    const PW = W + PAD * 2;
    const padded = new Float32Array(PW * (H + PAD * 2));
    for (let y = -PAD; y < H + PAD; y += 1) {
      const sy = Math.min(H - 1, Math.max(0, y));
      for (let x = -PAD; x < W + PAD; x += 1) {
        padded[(y + PAD) * PW + x + PAD] = hgt[sy * W + Math.min(W - 1, Math.max(0, x))]!;
      }
    }
    const at = (x: number, y: number) => padded[(y + PAD) * PW + x + PAD]!;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        /* Sobel, which is the cheapest gradient that is not noisy. */
        const gx =
          at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
          (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
        const gy =
          at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
          (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
        let nx = gx * STRENGTH;
        let ny = gy * STRENGTH;
        const nz = 1;
        const len = Math.hypot(nx, ny, nz);
        nx /= len;
        ny /= len;
        const i = (y * W + x) * 4;
        o[i] = Math.round((nx * 0.5 + 0.5) * 255);
        o[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        o[i + 2] = Math.round((nz / len * 0.5 + 0.5) * 255);
        o[i + 3] = 255;
      }
    }
    ox.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(out);
    /* A normal map is DATA, never colour — tagging it sRGB bends every
       angle in it towards the flat. */
    t.colorSpace = THREE.NoColorSpace;

    /*
     * The height itself, as a picture, for the displacement.
     *
     * Blurred once with a five-tap box: the albedo carries paint
     * detail as well as shape, and displacing on the paint makes a
     * brick wall look like corrugated iron. Shape survives a blur;
     * paint does not.
     */
    const hOut = document.createElement("canvas");
    hOut.width = W;
    hOut.height = H;
    const hx = hOut.getContext("2d")!;
    const hi = hx.createImageData(W, H);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const v =
          (at(x, y) * 2 + at(x - 2, y) + at(x + 2, y) + at(x, y - 2) + at(x, y + 2)) / 6;
        const i = (y * W + x) * 4;
        const g2 = Math.round(v * 255);
        hi.data[i] = g2;
        hi.data[i + 1] = g2;
        hi.data[i + 2] = g2;
        hi.data[i + 3] = 255;
      }
    }
    hx.putImageData(hi, 0, 0);
    const h2 = new THREE.CanvasTexture(hOut);
    h2.colorSpace = THREE.NoColorSpace;
    return { normal: t, height: h2 };
  }

  /**
   * THE THING IN THE MIDDLE OF THE PICTURE, AND NOTHING ELSE IN IT.
   *
   * Amit, of a PRO NOW van parked on a roof: *"אוי ואבוי מה עשית."*
   *
   * The six roof props arrived as separate files cut out of one sheet,
   * and every one of them carries a slice of its neighbours: `roof_ac`
   * has a washing line in it, `roof_tank` has half a chimney, and
   * `roof_rail` has the front of a delivery van. Drawn whole on a
   * roof, that van is exactly as absurd as it sounds.
   *
   * What is reliable about these files is that the object the file is
   * NAMED after is the one in the middle — the bleed is whatever got
   * caught at the edges. So this takes the run of columns containing
   * the centre of the canvas, and then the rows within it, and returns
   * that window.
   *
   * It is a crop, not a repair: the right fix is a recut, and it is on
   * the list to ask for.
   */
  function centrePiece(tex: THREE.Texture): { tex: THREE.Texture; aspect: number } {
    const img = tex.image as HTMLImageElement | undefined;
    if (!img || !img.width) return { tex, aspect: 0 };
    const scanned = scanAlpha(img);
    if (!scanned) return { tex, aspect: 0 };
    const { c, d } = scanned;
    const on = (x: number, y: number) => (d[(y * c.width + x) * 4 + 3] ?? 0) > 40;

    const col = new Int32Array(c.width);
    for (let x = 0; x < c.width; x += 1) {
      let n = 0;
      for (let y = 0; y < c.height; y += 1) if (on(x, y)) n += 1;
      col[x] = n;
    }
    const mid = Math.floor(c.width / 2);
    /* If the centre column is empty, walk out to the nearest column
       that is not — the object is near the middle, not always on it. */
    let seed = -1;
    for (let k = 0; k < c.width; k += 1) {
      if (mid - k >= 0 && col[mid - k]! > 2) { seed = mid - k; break; }
      if (mid + k < c.width && col[mid + k]! > 2) { seed = mid + k; break; }
    }
    if (seed < 0) return { tex, aspect: 0 };
    let x0 = seed;
    let x1 = seed;
    while (x0 > 0 && col[x0 - 1]! > 2) x0 -= 1;
    while (x1 < c.width - 1 && col[x1 + 1]! > 2) x1 += 1;

    let y0 = -1;
    let y1 = -1;
    for (let y = 0; y < c.height; y += 1) {
      let n = 0;
      for (let x = x0; x <= x1; x += 1) if (on(x, y)) { n += 1; if (n > 2) break; }
      if (n > 2) { if (y0 < 0) y0 = y; y1 = y; }
    }
    if (y0 < 0 || x1 - x0 < 10 || y1 - y0 < 10) return { tex, aspect: 0 };

    const t = tex.clone();
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set((x1 - x0 + 1) / c.width, (y1 - y0 + 1) / c.height);
    t.offset.set(x0 / c.width, (c.height - y1 - 1) / c.height);
    return { tex: t, aspect: (x1 - x0 + 1) / (y1 - y0 + 1) };
  }

  /**
   * A HEIGHT MAP WITH NO HOLES IN IT.
   *
   * The delivered maps carry the drawing's own alpha, so the margin
   * around a building is TRANSPARENT — and a transparent pixel reads
   * as black, which is "recessed 22 centimetres". The vertices along
   * the silhouette were pushed in while the ones just inside were not,
   * and every roofline in the street came out serrated like a saw.
   *
   * `alphaTest` hides those pixels but it cannot un-move them: it runs
   * in the fragment stage, and displacement happens to vertices long
   * before that.
   *
   * So the map is flattened onto mid grey first. Mid grey is the
   * building line — no displacement at all — which is exactly right
   * for a part of the plane where there is no building.
   */
  const flatHeightCache = new Map<THREE.Texture, THREE.Texture>();
  function flatHeight(tex: THREE.Texture | undefined): THREE.Texture | null {
    if (!tex) return null;
    const cached = flatHeightCache.get(tex);
    if (cached) return cached;
    const img = tex.image as HTMLImageElement | undefined;
    if (!img || !img.width) return null;
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x2 = c.getContext("2d");
    if (!x2) return null;
    x2.fillStyle = "#808080";
    x2.fillRect(0, 0, c.width, c.height);
    x2.drawImage(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    flatHeightCache.set(tex, t);
    return t;
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
    /*
     * -----------------------------------------------------------------
     * THREE LAYERS, AND THAT IS WHAT STOPS IT BEING CARDBOARD
     * -----------------------------------------------------------------
     * Amit said it four times: *"הבתים קרטון."* Lighting could not
     * answer it and a normal map could not answer it, because the
     * complaint is not about light — it is about PARALLAX. Walk past a
     * real building and the balcony slides across the wall behind it
     * and the plants slide across the balcony. One plane has nothing
     * to slide against, so it reads as a picture however well it is
     * lit, and the eye knows within one step.
     *
     * Each building now arrives as three drawings on the same canvas
     * and the same registration — wall, balconies, plants — and they
     * are hung twenty-two and forty centimetres in front of each
     * other. That is roughly a real balcony's projection, and it is
     * enough: at walking speed the layers separate visibly.
     *
     * Measured on delivery: all eighteen files are 2048 x 2300 and
     * composite exactly, which is the thing that had to be true and
     * the thing worth checking before writing a line of this.
     */
    const kind = (seed % 6) + 1;
    const wallTexture = textures[`bld_${kind}_wall`];
    const drawn = wallTexture ?? textures[CITY_BUILDING_IDS[seed % CITY_BUILDING_IDS.length]!];
    if (drawn) {
      drawn.colorSpace = THREE.SRGBColorSpace;
      const img = drawn.image as { width: number; height: number };
      /* Four storeys of a narrow Mediterranean street, not a tower:
         it is looked at from three metres away, and fifteen metres of
         wall at three metres is not a building, it is a cliff. */
      const { w, h } = facadeSize(img, { min: 9.6, max: 11.6 });

      /*
       * -----------------------------------------------------------------
       * A DRAWN HEIGHT MAP, AND THE WALL IS FINALLY A WALL
       * -----------------------------------------------------------------
       * This is what the whole "הבתים קרטון" argument came down to, and
       * it could not be solved in code: the street had been inferring
       * relief from each drawing's own brightness, and on a NIGHT facade
       * the brightest thing is a lit WINDOW. As a normal map that is
       * survivable — a wrong tilt on glass reads as glass. As geometry
       * it was a disaster: every window bulged out of the wall like a
       * blister, measured and thrown away within one build.
       *
       * These maps are drawn as height. Mid grey is the wall, white is
       * what projects, black is what recedes, and the lit windows are
       * BLACK — which is the one fact no amount of image processing was
       * ever going to recover from a picture.
       *
       * So the wall is subdivided and actually displaced: windows go in
       * a real 22 centimetres, cornices come out, and the silhouette at
       * the edge of the building changes as you walk past it. Only the
       * wall layer — the balconies and plants are cut-outs with holes in
       * them and displacing a hole tears it.
       */
      const wallHeight = wallTexture
        ? flatHeight(textures[`bld_${kind}_wall_height`]) ?? undefined
        : undefined;

      const layer = (tex: THREE.Texture, z: number, lit: number, height?: THREE.Texture) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const maps = reliefMaps(tex);
        const m = new THREE.Mesh(
          height
            ? new THREE.PlaneGeometry(w, h, 128, 128)
            : new THREE.PlaneGeometry(w, h),
          new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            emissive: 0xffffff,
            emissiveIntensity: lit,
            normalMap: maps?.normal ?? null,
            normalScale: new THREE.Vector2(1.2, 1.2),
            /*
             * -------------------------------------------------------
             * NO DISPLACEMENT, AND THE REASON IS WORTH KEEPING
             * -------------------------------------------------------
             * This carried a real displacement map for one build, on
             * the height derived from the drawing's own brightness —
             * the same height the normal map uses. Measured on screen
             * it was clearly worse, and the reason is specific to a
             * NIGHT drawing:
             *
             * the brightest thing on a lit facade is a lit WINDOW, so
             * brightness-as-height pushed every window OUT of the wall
             * and left the plaster between them sunk. Windows bulging
             * out of a building like blisters, at any scale, because
             * the assumption behind the height map — bright means
             * proud, dark means recessed — is true of daylight and
             * false of a window with a lamp behind it.
             *
             * The normal map survives because it only tilts the light
             * and a wrong tilt on a window reads as glass. Geometry
             * cannot be wrong quietly.
             *
             * Real relief needs a real height map, which is a thing to
             * ask the artist for, not to infer.
             */
            /* Mid grey is the building line, so the scale is doubled
               and the bias pulls it back: 0.5 lands at zero, white at
               +22cm and black at -22cm. */
            displacementMap: height ?? null,
            displacementScale: height ? 0.44 : 0,
            displacementBias: height ? -0.22 : 0,
            transparent: true,
            alphaTest: 0.35,
            roughness: 0.88,
          })
        );
        m.position.set(0, h / 2, z);
        m.receiveShadow = true;
        /* The front two layers cast onto the wall behind them, which is
           the other half of what makes them read as standing off it. */
        if (z > 0.4) {
          m.castShadow = true;
          m.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: tex,
            alphaTest: 0.42,
          });
        }
        g.add(m);
        return m;
      };

      layer(drawn, 0.36, 0.16, wallHeight);
      if (wallTexture) {
        const mid = textures[`bld_${kind}_mid`];
        const front = textures[`bld_${kind}_front`];
        if (mid) layer(mid, 0.58, 0.14);
        if (front) layer(front, 0.76, 0.12);
      }

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
       * -----------------------------------------------------------------
       * AND SOMETHING ON THE ROOF
       * -----------------------------------------------------------------
       * The roofline is where an eye decides whether it is looking at a
       * building or at a flat, and every roof in this street was a
       * ruler. A real one has a water tank on it, a chimney, an air
       * conditioner, an aerial, washing.
       *
       * Two per roof, picked by the same seed that picks the building,
       * so a given bay always looks the same and the street does not
       * reshuffle itself on reload. They stand ON the parapet and a
       * little back from it, which is where those things live.
       */
      const roofKit = CITY_ROOF_IDS.map((id) => textures[id]).filter(
        (t): t is THREE.Texture => Boolean(t)
      );
      if (roofKit.length > 0) {
        const heights = [2.4, 1.6, 1.3, 2.1, 1.5, 0.9];
        for (let i = 0; i < 2; i += 1) {
          const pick = (seed * 3 + i * 5) % roofKit.length;
          const piece = centrePiece(roofKit[pick]!);
          const prop = cutout(piece.tex, heights[pick] ?? 1.6, 1, piece.aspect);
          prop.position.set(
            (i === 0 ? -1 : 1) * (BAY * 0.22 + ((seed + i) % 3) * 0.4),
            h - 0.1,
            -0.6 - ((seed + i * 2) % 3) * 0.5
          );
          g.add(prop);
        }
      }

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

    /*
     * -----------------------------------------------------------------
     * A ROOF, AND A PARAPET THAT STANDS ON IT
     * -----------------------------------------------------------------
     * Amit, looking down the street from the arrival shot: *"הבתים
     * עדיין נראים שטוחים וקרטון."* From up there the giveaway is not
     * the facade at all — it is the TOP. Every building was a box whose
     * lid was a bare grey slab of the same plaster as its sides, all of
     * them at the same height, forming one continuous shelf down the
     * street.
     *
     * A real roof has a surface you can see — felt, tile, a screed —
     * and a parapet standing PROUD of it rather than flush with the
     * wall. This is both: a tiled deck, and a parapet that is a rail
     * around the deck instead of a lid on a box.
     */
    const roofTex = textures["mat_stone"] ?? textures["mat_paving"];
    if (roofTex) {
      const rt = roofTex.clone();
      rt.needsUpdate = true;
      rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
      rt.repeat.set(3, 4);
      rt.colorSpace = THREE.SRGBColorSpace;
      const deck = new THREE.Mesh(
        new THREE.PlaneGeometry(BAY + 0.44, depth + 0.34),
        new THREE.MeshStandardMaterial({ map: rt, color: 0x9a8f96, roughness: 0.95 })
      );
      deck.rotation.x = -Math.PI / 2;
      deck.position.set(0, h + 0.04, -depth / 2 - 0.08);
      deck.receiveShadow = true;
      g.add(deck);
    }

    /* The parapet as a rail round the edge, not a lid: four low walls
       with the deck visible between them. */
    for (const [dx, dz, bw, bd] of [
      [0, (depth + 0.4) / 2 - 0.12, BAY + 0.5, 0.24],
      [0, -(depth + 0.4) / 2 + 0.12, BAY + 0.5, 0.24],
      [(BAY + 0.5) / 2 - 0.12, 0, 0.24, depth + 0.4],
      [-(BAY + 0.5) / 2 + 0.12, 0, 0.24, depth + 0.4],
    ] as const) {
      const wallp = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.62, bd), trimMat);
      wallp.position.set(dx, h + 0.31, -depth / 2 - 0.08 + dz);
      wallp.castShadow = true;
      g.add(wallp);
    }

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

  /** The redrawn buildings that turn to face the viewer. See shopBay. */
  const heroFaces: Array<{ face: THREE.Mesh; group: THREE.Group }> = [];
  /** Per-frame life for the redrawn shopfronts (their neon). */
  const redrawnTicks: Array<(t: number) => void> = [];
  /** Per-frame life that needs the camera — the dog park's dogs. */
  const parkTicks: Array<(dt: number, t: number, camera: THREE.Camera) => void> = [];
  const _heroLocal = new THREE.Vector3();

  /*
   * THE DEPTH A REDRAWN SHOPFRONT GETS IN FRONT OF ITS WALL.
   *
   * The drawing carries the awning, the sign and the roof as paint. Paint
   * has no shadow and no edge, which is the flatness Amit keeps naming.
   * So the three things that stick out of a real shopfront are built:
   *   - the awning, striped, sloping out over the pavement, laid exactly
   *     over the painted one so the drawing and the object agree;
   *   - the neon, as light: a halo over the painted tubes that breathes;
   *   - the roof, with the kit a Tel Aviv roof actually carries.
   * Placed by fractions of the facade measured on the drawing, so the
   * built awning covers the painted awning rather than floating near it.
   */
  /*
   * A SHOP WINDOW YOU CAN SEE INTO.
   *
   * Amit: *"זה פשוט נראה כמו תמונה מודבקת על קיר ולא כמו חנות אמיתית
   * שאפשר להיכנס דרכה."* A painted window is a picture of a room; walk
   * past it and nothing inside moves. So where a shop's room has been
   * built (room_<id>_back…), the glass is cut OUT of the drawing and the
   * real room stands behind the hole — the same walls, mirrors and chairs
   * you walk into — so the inside slides against the frame as you pass,
   * which is the one thing a picture can never do. The awning becomes an
   * object hanging out over the pavement, and the barber's pole turns.
   *
   * Fractions of the drawing, measured on the file: the glass between
   * its outer frames, the painted awning, the mullions and the pole.
   */
  interface WindowSpec {
    glass: [number, number, number, number]; // x0, x1, y0 (top), y1 (bottom)
    /** A striped awning: the painted one is painted over and built. */
    awning?: [number, number, number, number]; // x0, x1, y0, y1
    /** A flat canopy (a boutique's): built as a slab under the painted fascia. */
    canopy?: [number, number, number]; // x0, x1, y of its underside
    mullions: number[];
    /** Where the two door leaves meet, if not the middle mullion. */
    door?: number;
    pole?: [number, number]; // x, y of the barber's pole
    stripe: string;
  }
  const SHOP_WINDOWS: Record<string, WindowSpec> = {
    hair: {
      glass: [243 / 1254, 1023 / 1254, 745 / 1254, 1172 / 1254],
      awning: [205 / 1254, 1062 / 1254, 634 / 1254, 742 / 1254],
      mullions: [332 / 1254, 627 / 1254, 920 / 1254],
      pole: [226 / 1254, 850 / 1254],
      stripe: "#f25c86",
    },
    home: {
      glass: [203 / 1254, 1035 / 1254, 757 / 1254, 1170 / 1254],
      awning: [150 / 1254, 1098 / 1254, 636 / 1254, 752 / 1254],
      mullions: [343 / 1254, 626 / 1254, 908 / 1254],
      stripe: "#2b4a8a",
    },
    nails: {
      glass: [257 / 1254, 997 / 1254, 725 / 1254, 1166 / 1254],
      awning: [94 / 1254, 1154 / 1254, 583 / 1254, 712 / 1254],
      mullions: [508 / 1254, 744 / 1254],
      door: 627 / 1254,
      stripe: "#9b4fb0",
    },
    /* Measured on `shop_tech.webp` (3400 x 3509): the display window
       and its door inside the dark frame, the awning bar above. */
    tech: {
      glass: [700 / 3400, 2940 / 3400, 1950 / 3509, 3330 / 3509],
      awning: [560 / 3400, 3020 / 3400, 1720 / 3509, 1900 / 3509],
      mullions: [1670 / 3400],
      door: 2710 / 3400,
      stripe: "#2c3e66",
    },
    /* Measured on `shop_pets.webp` (1254 x 1254). */
    pets: {
      glass: [230 / 1254, 1028 / 1254, 770 / 1254, 1182 / 1254],
      awning: [188 / 1254, 1066 / 1254, 675 / 1254, 772 / 1254],
      mullions: [505 / 1254, 752 / 1254],
      door: 627 / 1254,
      stripe: "#2f6b4a",
    },
    auto: {
      glass: [190 / 1254, 1070 / 1254, 722 / 1254, 1150 / 1254],
      awning: [160 / 1254, 1092 / 1254, 620 / 1254, 725 / 1254],
      mullions: [458 / 1254, 792 / 1254],
      door: 627 / 1254,
      stripe: "#e8741e",
    },
    appliance: {
      glass: [142 / 1254, 1108 / 1254, 714 / 1254, 1140 / 1254],
      awning: [48 / 1254, 1200 / 1254, 626 / 1254, 714 / 1254],
      mullions: [496 / 1254, 764 / 1254],
      door: 627 / 1254,
      stripe: "#f2c230",
    },
    care: {
      glass: [180 / 1254, 1080 / 1254, 714 / 1254, 1126 / 1254],
      awning: [36 / 1254, 1220 / 1254, 624 / 1254, 714 / 1254],
      mullions: [474 / 1254, 780 / 1254],
      door: 627 / 1254,
      stripe: "#1a9aa6",
    },
    move: {
      glass: [206 / 1254, 1054 / 1254, 706 / 1254, 1136 / 1254],
      awning: [150 / 1254, 1104 / 1254, 604 / 1254, 706 / 1254],
      mullions: [442 / 1254, 814 / 1254],
      door: 627 / 1254,
      stripe: "#6a3fb0",
    },
    well: {
      glass: [186 / 1254, 1066 / 1254, 718 / 1254, 1140 / 1254],
      awning: [64 / 1254, 1188 / 1254, 618 / 1254, 712 / 1254],
      mullions: [466 / 1254, 786 / 1254],
      door: 627 / 1254,
      stripe: "#1a9a8a",
    },
    build: {
      glass: [198 / 1254, 1062 / 1254, 754 / 1254, 1120 / 1254],
      awning: [100 / 1254, 1158 / 1254, 662 / 1254, 752 / 1254],
      mullions: [494 / 1254, 762 / 1254],
      door: 627 / 1254,
      stripe: "#e8741e",
    },
    help: {
      glass: [200 / 1254, 1060 / 1254, 720 / 1254, 1150 / 1254],
      awning: [126 / 1254, 1128 / 1254, 628 / 1254, 716 / 1254],
      mullions: [470 / 1254, 780 / 1254],
      door: 622 / 1254,
      stripe: "#9ccf1a",
    },
    vet: {
      glass: [200 / 1254, 1056 / 1254, 702 / 1254, 1104 / 1254],
      awning: [96 / 1254, 1152 / 1254, 608 / 1254, 700 / 1254],
      mullions: [462 / 1254, 790 / 1254],
      door: 624 / 1254,
      stripe: "#3fa8d8",
    },
    lust: {
      glass: [309 / 1536, 1233 / 1536, 376 / 1024, 902 / 1024],
      canopy: [96 / 1536, 1428 / 1536, 368 / 1024],
      mullions: [599 / 1536, 990 / 1536],
      door: 795 / 1536,
      stripe: "#7a0f24",
    },
  };
  const windowFacing: Array<{ m: THREE.Mesh; group: THREE.Group }> = [];
  const windowShops = new Set<string>();
  const windowSheens: Array<{ tex: THREE.Texture; group: THREE.Group }> = [];

  /** The drawing with its glass cut out and its painted awning painted over. */
  function punchWindow(tex: THREE.Texture, spec: WindowSpec): THREE.Texture {
    const img = tex.image as CanvasImageSource & { width: number; height: number };
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const W = c.width, H = c.height;
    if (spec.awning) {
    const [ax0, ax1, ay0, ay1] = spec.awning;
    /* the wall just above the awning, drawn down over where it hung */
    g.drawImage(c, ax0 * W, ay0 * H - H * 0.012, (ax1 - ax0) * W, H * 0.01, ax0 * W, ay0 * H, (ax1 - ax0) * W, (ay1 - ay0) * H);
    const sh = g.createLinearGradient(0, ay0 * H, 0, ay1 * H);
    sh.addColorStop(0, "rgba(60,20,30,0)");
    sh.addColorStop(1, "rgba(60,20,30,0.45)");
    g.fillStyle = sh;
    g.fillRect(ax0 * W, ay0 * H, (ax1 - ax0) * W, (ay1 - ay0) * H);
    }
    const [gx0, gx1, gy0, gy1] = spec.glass;
    g.clearRect(gx0 * W, gy0 * H, (gx1 - gx0) * W, (gy1 - gy0) * H);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  function awningTex(colour: string, scallop: boolean): THREE.CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 512; c.height = scallop ? 64 : 128;
    const g = c.getContext("2d")!;
    const n = 18, sw = c.width / n;
    if (scallop) {
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(c.width, 0); g.lineTo(c.width, 30);
      for (let i = n - 1; i >= 0; i--) g.arc(i * sw + sw / 2, 30, sw / 2, 0, Math.PI, false);
      g.closePath();
      g.clip();
    }
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? "#fff4ef" : colour;
      g.fillRect(i * sw, 0, sw, c.height);
    }
    /* cloth: a soft sag between the ribs, lighter at the front edge */
    const sag = g.createLinearGradient(0, 0, 0, c.height);
    sag.addColorStop(0, "rgba(40,10,20,0.25)");
    sag.addColorStop(1, "rgba(255,255,255,0.08)");
    g.fillStyle = sag;
    g.fillRect(0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }

  function shopWindow(g: THREE.Group, s: ShopSpec, w: number, faceH: number, spec: WindowSpec) {
    const X = (u: number) => (u - 0.5) * w;
    const Y = (v: number) => (1 - v) * faceH;
    const [gx0, gx1, gy0, gy1] = spec.glass;
    const x0 = X(gx0), x1 = X(gx1), yTop = Y(gy0), yF = Y(gy1);
    const FACE = 0.42, BACK = -0.05;
    g.userData.hole = { x0, x1, y0: yF, y1: yTop };
    g.userData.faceW = w;

    /* ----- the room behind the glass ----- */
    const back = textures[`room_${s.id}_back.webp`]!;
    const bImg = back.image as { width: number; height: number };
    const RW = x1 - x0 + 0.7, RD = 3.4, cx = (x0 + x1) / 2;
    const RH = RW / (bImg.width / bImg.height);
    const zb = BACK - RD;
    /* Warm, and out of the street's haze: the inside of a lit shop at
       night is the most saturated thing on the street, not the palest. */
    const lit = (map: THREE.Texture | null, colour = 0xf2c8a8) =>
      new THREE.MeshBasicMaterial({ map, color: colour, toneMapped: false, fog: false });
    const prep = (t: THREE.Texture) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const room = new THREE.Group();
    g.add(room);
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), lit(prep(back)));
    backWall.position.set(cx, yF + RH / 2, zb);
    room.add(backWall);
    const glow = neonMask(back);
    if (glow) {
      const gm = new THREE.MeshBasicMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55 });
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), gm);
      gl.position.set(cx, yF + RH / 2, zb + 0.01);
      room.add(gl);
      redrawnTicks.push((t) => { gm.opacity = (0.45 + 0.2 * Math.sin(t * 2.1)) * (Math.sin(t * 23) > 0.985 ? 0.35 : 1); });
    }
    /* Side walls show the part of their drawing nearest the back wall:
       the room is shallower than it is wide. */
    const side = (id: "left" | "right") => {
      const src = textures[`room_${s.id}_${id}.webp`];
      const t = src ? prep(src.clone()) : null;
      if (t) {
        t.repeat.x = RD / RW;
        t.offset.x = id === "left" ? 1 - RD / RW : 0;
        t.needsUpdate = true;
      }
      const m = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), lit(t, t ? 0xe8b898 : 0xc98a94));
      m.position.set(id === "left" ? cx - RW / 2 : cx + RW / 2, yF + RH / 2, zb + RD / 2);
      m.rotation.y = id === "left" ? Math.PI / 2 : -Math.PI / 2;
      room.add(m);
    };
    side("left");
    side("right");
    const fsrc = textures[`room_${s.id}_floor.webp`];
    const ft = fsrc ? prep(fsrc.clone()) : null;
    if (ft) { ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(RW / 2.4, RD / 2.4); ft.needsUpdate = true; }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), lit(ft, 0xc89080));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, yF + 0.002, zb + RD / 2);
    room.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), lit(null, 0x6a3a44));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, yF + Math.min(RH, yTop - yF + 0.6), zb + RD / 2);
    room.add(ceil);
    /* pendant lights, warm, hanging in a row just inside the glass */
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc98a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      l.scale.set(0.9, 0.9, 1);
      l.position.set(cx + (i - 1) * (x1 - x0) * 0.33, yTop - 0.35, BACK - 1.1);
      room.add(l);
    }
    /* The furniture, standing on the floor at its own depth. */
    const props = [1, 2, 3, 4, 5, 6].map((n) => textures[`room_${s.id}_prop${n}.webp`]).filter((t): t is THREE.Texture => Boolean(t));
    const aspect = (t: THREE.Texture) => { const i = t.image as { width: number; height: number }; return i.width / i.height; };
    const sorted = [...props].sort((a, b) => aspect(b) - aspect(a));
    const wide = sorted.slice(0, 2), chairs = sorted.slice(2);
    const shade = contactShadow();
    const place = (t: THREE.Texture, x: number, z: number, h: number) => {
      const pw = h * aspect(t);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, h), new THREE.MeshBasicMaterial({ map: prep(t), transparent: true, alphaTest: 0.4, toneMapped: false, fog: false, color: 0xf0c8b0 }));
      m.position.set(x, yF + h / 2, z);
      room.add(m);
      windowFacing.push({ m, group: g });
      const sd = new THREE.Mesh(new THREE.PlaneGeometry(pw * 1.1, 0.8), new THREE.MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false }));
      sd.rotation.x = -Math.PI / 2;
      sd.position.set(x, yF + 0.01, z + 0.05);
      room.add(sd);
    };
    chairs.slice(0, 3).forEach((t, i) => place(t, cx + (i - 1) * RW * 0.25, zb + 1.1, 1.1));
    if (wide[0]) place(wide[0], cx + RW / 2 - 1.2, zb + 2.5, 1.05);

    /* ----- the opening: the wall's thickness, the frames, the glass ----- */
    const bronze = new THREE.MeshStandardMaterial({ color: 0x2a211d, metalness: 0.6, roughness: 0.4 });
    const reveal = new THREE.MeshStandardMaterial({ color: 0xc88f98, roughness: 0.85, side: THREE.DoubleSide });
    const deep = FACE - BACK;
    const jamb = (wid: number, hei: number, pos: [number, number, number], rx: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, hei), reveal);
      m.position.set(...pos); m.rotation.set(rx, ry, 0);
      m.receiveShadow = true;
      g.add(m);
    };
    jamb(deep, yTop - yF, [x0, (yTop + yF) / 2, (FACE + BACK) / 2], 0, Math.PI / 2);
    jamb(deep, yTop - yF, [x1, (yTop + yF) / 2, (FACE + BACK) / 2], 0, -Math.PI / 2);
    jamb(x1 - x0, deep, [cx, yTop, (FACE + BACK) / 2], Math.PI / 2, 0);
    jamb(x1 - x0, deep, [cx, yF, (FACE + BACK) / 2], -Math.PI / 2, 0);
    const zGlass = FACE - 0.14;
    for (const u of spec.mullions) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, yTop - yF, 0.08), bronze);
      m.position.set(X(u), (yTop + yF) / 2, zGlass);
      m.castShadow = true;
      g.add(m);
    }
    for (const y of [yTop - 0.04, yF + 0.04]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, 0.08), bronze);
      m.position.set(cx, y, zGlass);
      g.add(m);
    }
    /* the door: the middle mullion is where its two leaves meet */
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b060, metalness: 0.9, roughness: 0.25, emissive: 0x7a5020, emissiveIntensity: 0.4 });
    for (const d of [-0.09, 0.09]) {
      const hdl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10), gold);
      hdl.position.set(X(spec.door ?? spec.mullions[1] ?? 0.5) + d, yF + 1.05, zGlass + 0.07);
      g.add(hdl);
    }
    /* Glass: almost nothing, and a sheen that slides as you move. */
    const sheenC = document.createElement("canvas");
    sheenC.width = 256; sheenC.height = 128;
    const sg = sheenC.getContext("2d")!;
    const band = sg.createLinearGradient(0, 128, 256, 0);
    band.addColorStop(0.0, "rgba(255,255,255,0)");
    band.addColorStop(0.42, "rgba(255,255,255,0)");
    band.addColorStop(0.5, "rgba(255,240,245,0.55)");
    band.addColorStop(0.56, "rgba(255,255,255,0)");
    band.addColorStop(0.7, "rgba(255,255,255,0.18)");
    band.addColorStop(0.74, "rgba(255,255,255,0)");
    sg.fillStyle = band; sg.fillRect(0, 0, 256, 128);
    const sheen = new THREE.CanvasTexture(sheenC);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(x1 - x0, yTop - yF),
      new THREE.MeshBasicMaterial({ map: sheen, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glass.position.set(cx, (yTop + yF) / 2, zGlass - 0.01);
    g.add(glass);
    /* the sheen moves with the viewer, which is what glass does */
    windowSheens.push({ tex: sheen, group: g });

    /* ----- a boutique's canopy: a slab with a light strip under it ----- */
    if (spec.canopy) {
      const [cx0, cx1, cy] = spec.canopy;
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(X(cx1) - X(cx0), 0.14, 0.95),
        new THREE.MeshStandardMaterial({ color: spec.stripe, roughness: 0.55, metalness: 0.15 })
      );
      slab.position.set((X(cx0) + X(cx1)) / 2, Y(cy) + 0.07, FACE + 0.47);
      slab.castShadow = true;
      g.add(slab);
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(X(cx1) - X(cx0) - 0.3, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xffd9b0, toneMapped: false })
      );
      strip.rotation.x = Math.PI / 2;
      strip.position.set((X(cx0) + X(cx1)) / 2, Y(cy) - 0.005, FACE + 0.8);
      g.add(strip);
    }

    /* ----- the awning, out over the pavement ----- */
    if (spec.awning) {
    const [ax0, ax1, ay0] = spec.awning;
    const awW = X(ax1) - X(ax0), awD = 1.35, slope = 0.42;
    const pivotY = Y(ay0) - 0.05;
    const awMat = new THREE.MeshStandardMaterial({ map: awningTex(spec.stripe, false), side: THREE.DoubleSide, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.18 });
    awMat.emissiveMap = awMat.map;
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(awW, awD), awMat);
    awning.rotation.x = slope - Math.PI / 2;
    awning.position.set((X(ax0) + X(ax1)) / 2, pivotY - Math.sin(slope) * awD / 2, FACE + 0.02 + Math.cos(slope) * awD / 2);
    awning.castShadow = true;
    g.add(awning);
    const valMat = new THREE.MeshStandardMaterial({ map: awningTex(spec.stripe, true), side: THREE.DoubleSide, transparent: true, alphaTest: 0.4, roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.2 });
    valMat.emissiveMap = valMat.map;
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(awW, 0.34), valMat);
    valance.position.set((X(ax0) + X(ax1)) / 2, pivotY - Math.sin(slope) * awD - 0.17, FACE + 0.02 + Math.cos(slope) * awD);
    valance.castShadow = true;
    g.add(valance);
    /* its two end cheeks, so from along the street it has a side */
    const cheekShape = new THREE.Shape();
    cheekShape.moveTo(0, 0);
    cheekShape.lineTo(Math.cos(slope) * awD, -Math.sin(slope) * awD);
    cheekShape.lineTo(Math.cos(slope) * awD, -Math.sin(slope) * awD - 0.34);
    cheekShape.lineTo(0, -0.25);
    cheekShape.closePath();
    const cheekMat = new THREE.MeshStandardMaterial({ color: spec.stripe, side: THREE.DoubleSide, roughness: 0.9, emissive: spec.stripe, emissiveIntensity: 0.15 });
    for (const ex of [X(ax0), X(ax1)]) {
      const ch = new THREE.Mesh(new THREE.ShapeGeometry(cheekShape), cheekMat);
      ch.rotation.y = -Math.PI / 2;
      ch.position.set(ex, pivotY, FACE + 0.02);
      g.add(ch);
    }
    }

    /* ----- the barber's pole, turning ----- */
    if (spec.pole) {
      const pc = document.createElement("canvas");
      pc.width = 64; pc.height = 256;
      const pg = pc.getContext("2d")!;
      pg.fillStyle = "#fbf6f2"; pg.fillRect(0, 0, 64, 256);
      const cols = ["#d8283c", "#fbf6f2", "#2848b8", "#fbf6f2"];
      for (let k = -8; k < 16; k++) {
        pg.fillStyle = cols[((k % 4) + 4) % 4]!;
        pg.beginPath();
        pg.moveTo(0, k * 32); pg.lineTo(64, k * 32 - 64); pg.lineTo(64, k * 32 - 32); pg.lineTo(0, k * 32 + 32);
        pg.closePath(); pg.fill();
      }
      const pt = new THREE.CanvasTexture(pc);
      pt.colorSpace = THREE.SRGBColorSpace;
      pt.wrapS = pt.wrapT = THREE.RepeatWrapping;
      pt.repeat.set(2, 1.6);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 24, 1, true), new THREE.MeshBasicMaterial({ map: pt, toneMapped: false, color: 0xe8e8e8 }));
      const [px, py] = spec.pole;
      const at = new THREE.Vector3(X(px), Y(py), FACE + 0.26);
      pole.position.copy(at);
      g.add(pole);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.82, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2 }));
      tube.position.copy(at);
      g.add(tube);
      for (const dy of [0.46, -0.46]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(dy > 0 ? 0.08 : 0.14, dy > 0 ? 0.14 : 0.08, 0.12, 20), gold);
        cap.position.set(at.x, at.y + dy, at.z);
        g.add(cap);
      }
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), gold);
      arm.position.set(at.x, at.y + 0.3, FACE + 0.13);
      g.add(arm);
      redrawnTicks.push((t) => { pt.offset.y = (t * 0.35) % 1; });
    }
  }

  function redrawnDepth(g: THREE.Group, s: ShopSpec, w: number, faceH: number, hasWindow = false) {
    if (!hasWindow) {
    const stripes = document.createElement("canvas");
    stripes.width = 256; stripes.height = 8;
    const sx = stripes.getContext("2d")!;
    for (let i = 0; i < 16; i++) {
      sx.fillStyle = i % 2 ? "#fff3ee" : (s.neonColour ?? "#ff6fa8");
      sx.fillRect(i * 16, 0, 16, 8);
    }
    const stripeTex = new THREE.CanvasTexture(stripes);
    stripeTex.colorSpace = THREE.SRGBColorSpace;
    const awnW = w * 0.72, awnD = 1.25;
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(awnW, 0.07, awnD),
      new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8, emissive: 0xffffff, emissiveMap: stripeTex, emissiveIntensity: 0.12 })
    );
    awning.position.set(0, faceH * 0.43, 0.42 + awnD / 2);
    awning.rotation.x = 0.32;
    awning.castShadow = true;
    g.add(awning);
    /* the scalloped front edge, the one line that says "awning" from afar */
    const valance = new THREE.Mesh(
      new THREE.BoxGeometry(awnW, 0.32, 0.04),
      new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.8, emissive: 0xffffff, emissiveMap: stripeTex, emissiveIntensity: 0.12 })
    );
    valance.position.set(0, faceH * 0.43 - Math.sin(0.32) * awnD / 2 - 0.16, 0.42 + Math.cos(0.32) * awnD);
    g.add(valance);
    }

    /* The neon's own light over the painted scissors. */
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(s.neonColour ?? "#ff6fa8"),
      transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.scale.set(3.2, 3.2, 1);
    halo.position.set(w * 0.13, faceH * 0.55, 0.7);
    /* Laid over the salon's painted scissors; another shop's neon is
       somewhere else, so it gets no halo rather than one in the wrong place. */
    if (s.id === "hair" || !hasWindow) g.add(halo);
    redrawnTicks.push((t: number) => { halo.material.opacity = 0.35 + 0.2 * Math.sin(t * 2.3) * (Math.sin(t * 17) > 0.97 ? 0.2 : 1); });

    /* The roof: solar panels and a water heater, on top of the building. */
    const roofKit = CITY_ROOF_IDS.map((id) => textures[id]).filter((t): t is THREE.Texture => Boolean(t));
    [0, 3].forEach((pick, i) => {
      const src = roofKit[pick % Math.max(1, roofKit.length)];
      if (!src) return;
      const piece = centrePiece(src);
      const prop = cutout(piece.tex, i === 0 ? 1.9 : 1.5, 1, piece.aspect);
      prop.position.set((i === 0 ? -1 : 1) * w * 0.22, faceH - 0.1, -1.2);
      g.add(prop);
    });
  }

  /** One of his shops: the drawing is the building. */
  function shopBay(s: ShopSpec) {
    const g = new THREE.Group();
    const x = FRONT_X * s.side;
    g.position.set(x, 0, s.z);
    g.rotation.y = s.side < 0 ? Math.PI / 2 : -Math.PI / 2;

    /*
     * -----------------------------------------------------------------
     * THE BUILDING HE CHOSE, STANDING IN THE STREET
     * -----------------------------------------------------------------
     * Amit, pointing at the pink salon drawn at three-quarters: *"זה
     * מה שאני רוצה שיראו ברחוב!!! לא כתמונת מעבר!!! אני רוצה שיראו
     * אותו ברחוב בערך כמו בתמונה."*
     *
     * Where a shop's redrawn building has arrived (`hero_<id>`), it IS
     * the shop in the street: stood on the plot, a little taller than a
     * flat front because it carries its own roof, and turning gently to
     * keep its face to you as you walk — a drawing at three-quarters
     * seen from its edge is exactly the cardboard he keeps pointing at.
     * No carcass behind it and no ledges on it: the drawing has its own
     * depth and its own cornice, and a box showing through its sky would
     * undo both.
     */
    /*
     * ...and then, measured from every angle, it was not. A drawing made
     * at three-quarters from above is right from exactly one place — in
     * front of the shop — and a sheet of card from every other. Amit, on
     * the board of angles: *"נראה מעוות ולא טוב."*
     *
     * So a redrawn shop is built instead: its STRAIGHT facade (drawn
     * face-on, so perspective is the engine's and correct from anywhere,
     * the way the houses either side are), and in front of it the things
     * that give a real shopfront its depth — an awning that stands out
     * from the wall and throws a shadow, its neon breathing, and what
     * lives on its roof. `isHero` now means "this shop has been redrawn".
     */
    const win = SHOP_WINDOWS[s.id] && textures[`room_${s.id}_back.webp`] && textures[s.facade] ? SHOP_WINDOWS[s.id] : undefined;
    /* A shop with a see-into window is a redrawn shop, whether or not a
       three-quarter drawing of it exists. */
    const isHero = Boolean(textures[`hero_${s.id}.webp`]) || Boolean(win);
    if (win) windowShops.add(s.id);
    const tex = win ? punchWindow(textures[s.facade]!, win) : textures[s.facade];
    /** The shopfront's own material, so the way in can fade it. */
    let faceMat: THREE.MeshStandardMaterial | null = null;
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
      /* The shopfronts get the same treatment as the houses — see the
         note on `wallHeight` in `ordinary`. */
      const shopHeight = isHero ? null : flatHeight(textures[`shop_${s.id}_height`]);
      const face = new THREE.Mesh(
        shopHeight
          ? new THREE.PlaneGeometry(w, faceH, 128, 128)
          : new THREE.PlaneGeometry(w, faceH),
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
          /* The relief the drawing cannot have. See `relief`. */
          normalMap: isHero ? null : relief(tex),
          normalScale: new THREE.Vector2(1.15, 1.15),
          displacementMap: shopHeight ?? null,
          displacementScale: shopHeight ? 0.44 : 0,
          displacementBias: shopHeight ? -0.22 : 0,
          transparent: true,
          alphaTest: 0.35,
          roughness: 0.82,
          metalness: 0.04,
        })
      );
      face.receiveShadow = true;
      face.position.set(0, faceH / 2, 0.42);
      g.add(face);
      faceMat = face.material as THREE.MeshStandardMaterial;
      /* Faces the street square, like the buildings either side of it.
         Amit: *"ככה צריכים לראות, זה הזווית"* — standing in front of the
         shop, the building filling the view. Turning it to follow the
         camera made it lean at every angle except that one. */

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
      if (!isHero) ledge(g, faceH * 0.45, w + 0.06, 0.55, 0.14, canopyMat);
      if (isHero) redrawnDepth(g, s, w, faceH, Boolean(win));
      if (win) shopWindow(g, s, w, faceH, win);
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
    /* Behind a see-into window the carcass's front is a wall with the
       window's hole in it, so the room inside shows and nothing else. */
    const hole = g.userData.hole as { x0: number; x1: number; y0: number; y1: number } | undefined;
    const carcH = Math.max(3.4, faceH - 0.5);
    const carcass = new THREE.Mesh(
      new THREE.BoxGeometry(BAY, carcH, depth),
      hole
        ? [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? new THREE.MeshBasicMaterial({ visible: false }) : wallMats[1]!))
        : wallMats[1]!
    );
    carcass.position.set(0, carcH / 2, -depth / 2 - 0.05);
    if (hole) {
      const front = new THREE.Shape();
      front.moveTo(-BAY / 2, 0); front.lineTo(BAY / 2, 0); front.lineTo(BAY / 2, carcH); front.lineTo(-BAY / 2, carcH); front.closePath();
      const h = new THREE.Path();
      h.moveTo(hole.x0, hole.y0); h.lineTo(hole.x0, hole.y1); h.lineTo(hole.x1, hole.y1); h.lineTo(hole.x1, hole.y0); h.closePath();
      front.holes.push(h);
      const panel = new THREE.Mesh(new THREE.ShapeGeometry(front), wallMats[1]!);
      panel.position.z = -0.05;
      g.add(panel);
    }
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

      /* Softer over a see-into window, so the shop is the brightest thing, not the street. */
      emit(x - s.side * 2.6, faceH + 2.4, s.z, c3, g.userData.hole ? 80 : 210, g.userData.hole ? 16 : 24);
      lamps.push(new THREE.Vector3(x, faceH + 2.4, s.z));
    } else if (!isHero) {
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
    /* Beside a see-into window the blade hangs at the building's corner,
       the way a real one does, not across the middle of the front —
       where, seen head-on, its arm was a black stick over the balcony. */
    const faceW = g.userData.faceW as number | undefined;
    const signX = faceW ? faceW / 2 - 0.35 : 0;
    const ARM = 2.5;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, ARM), trimMat);
    bracket.position.set(signX, 6.9, ARM / 2);
    g.add(bracket);
    const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.18), trimMat);
    wallPlate.position.set(signX, 6.9, 0.12);
    g.add(wallPlate);

    const bladeH = s.sponsor ? 2.6 : 1.2;
    const bladeW = s.sponsor ? 2.3 : 2.2;
    const bladeZ = ARM / 2;
    const bladeTop = 6.72;
    for (const dz of [-bladeW / 2 + 0.16, bladeW / 2 - 0.16]) {
      const drop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.05), trimMat);
      drop.position.set(signX, bladeTop + 0.1, bladeZ + dz);
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
      blade.position.set(signX, bladeTop - bladeH / 2, bladeZ);
      g.add(blade);
      faceFade(blade, 1);
    }
    const blade = { position: new THREE.Vector3(signX, bladeTop - bladeH / 2, bladeZ) };

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
    /* A see-into window lights its pavement warm, like a lit shop: the
       sponsor's red on everything turned the whole street pink. */
    emit(x - s.side * 2.4, 2.7, s.z, s.sponsor && !g.userData.hole ? 0xff6f86 : 0xffc07a, g.userData.hole ? 26 : 42, 11);

    /*
     * -----------------------------------------------------------------
     * THE SIGN, REFLECTED IN THE WET ROAD
     * -----------------------------------------------------------------
     * Amit: *"הרבה חלקים נראים ציור."* A lot of that is the ground. A
     * night street photographs the way it does because every lit sign
     * is ALSO on the tarmac, stretched and soft — and a road with
     * nothing in it reads as a painted floor however good its texture
     * is.
     *
     * The street lamps have had this since the beginning and the
     * shopfronts never did, which is why the most colourful objects in
     * the street were the only ones leaving no mark on it. One long
     * additive smear per sign, in the sign's own colour, lying on the
     * asphalt in front of it — reflections belong where the water is.
     */
    const signWet = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 26),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: c3,
        transparent: true,
        opacity: s.sponsor ? 0.3 : 0.19,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    signWet.rotation.x = -Math.PI / 2;
    signWet.position.set(x - s.side * 7.4, 0.03, s.z);
    scene.add(signWet);
    lamps.push(new THREE.Vector3(x - s.side * 1.6, 2.7, s.z));

    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshBasicMaterial({
        map: glowTex, color: s.sponsor ? 0xff6f86 : 0xffc07a, transparent: true,
        /* A redrawn building is painted with its own glow; a pool of
           light in front of it burned a white blob into the pavement. */
        opacity: isHero ? 0.025 : 0.07, blending: THREE.AdditiveBlending, depthWrite: false,
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
    /* ---------------------------------------------------------------
       AND A ROOM BEHIND THE DRAWING

       Amit: *"רוצה שיכנסו לתוך החנויות ככה שלא ייתקעו בקרטון — שיהיה
       אפשר לעשות צעד פנימה לתוך החנות, להרגיש חוויה אמיתית ולא
       להסתכל על בית מקרטון."*

       The interiors he commissioned are straight-on views of a room —
       a bench, a wall of shelves, a counter, lit warm. Shown as a
       full-screen picture they are a poster of a shop. Stood up as the
       BACK WALL of an actual volume, with side walls, a floor, a
       ceiling and two warm lamps in it, they are a room you are
       standing in: the shelves recede past you at the edges of vision,
       the floor runs away under your feet, and the doorway is behind
       your shoulder.

       Nothing is invented. The room is the size of the bay, the
       picture keeps its own proportions, and the walls are the same
       plaster the rest of the street is built from.
       --------------------------------------------------------------- */
    /*
     * A shop has a room if ANY room of it arrived — not only the old
     * single interior picture. On the published site the salon's old
     * picture was missing while its whole 3D room was there, and because
     * the door was decided by the old picture alone, pressing "היכנס"
     * opened the flat list instead of the room. Amit: *"איפה החנות? איפה
     * התלת מימד?"* The box room and the panorama now open the door too;
     * the old picture, where it exists, still lines the fallback box.
     */
    const roomTex =
      (s.interior ? textures[s.interior] : undefined) ??
      textures[`room_${s.id}_back.webp`] ??
      textures[`room_${s.id}_pano.webp`];
    let fadeFace: ((k: number) => void) | null = null;
    let roomSpot: THREE.Vector3 | undefined;
    if (roomTex) {
      /*
       * -----------------------------------------------------------------
       * THE WHOLE ROOM, NOT A CROP OF IT
       * -----------------------------------------------------------------
       * Amit, after walking into the first one: *"זה לא מה שהתכוונתי —
       * שיראו את כל הפנים של החנות ולא קלוז אין."*
       *
       * The first version fixed the wall's size and cropped the drawing
       * to cover it, which is correct for a wall and wrong for this:
       * the drawing IS the shop, and cutting its edges off to fit a
       * ceiling height I picked throws away the thing he commissioned.
       *
       * So the drawing decides. The wall is the full width of the bay
       * and as tall as the picture's own proportions make it, the
       * ceiling goes above that, and nothing is cropped — you walk in
       * and the whole shop is in front of you.
       */
      const rIm = roomTex.image as { width: number; height: number };
      /* The delivered interiors carry offcuts above and below the room
         — see `mainBand`. The wall gets the room and nothing else. */
      const band = mainBand(roomTex);
      const roomMap = band.tex;
      const RD = 7.2;   /* how deep the room goes */
      /* Ceiling above the picture, never through it. */
      const RH = Math.max(
        3.9,
        Math.min(7.4, BAY / (band.aspect || rIm.width / rIm.height)) + 0.4
      );
      const room = new THREE.Group();

      /* Warm plaster, and dark enough that two ceiling lamps read as
         two lamps rather than as a lit ceiling. */
      const innerMat = new THREE.MeshStandardMaterial({
        color: 0x2a232f,
        roughness: 0.96,
      });
      /*
       * A SHOP FLOOR, NOT A CASTLE WALL.
       *
       * At three repeats across a bay the stone came out in blocks a
       * metre and a half wide. And the texture has to be CLONED before
       * its repeat is set: `tiled` writes the repeat onto the texture
       * itself, and these are the same objects the pavement outside is
       * using — re-tiling one here would re-tile the whole street.
       */
      const floorSrc = textures["mat_paving"] ?? textures["mat_stone"];
      const floorTex = floorSrc ? floorSrc.clone() : null;
      if (floorTex) {
        floorTex.needsUpdate = true;
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(5, 4);
        floorTex.colorSpace = THREE.SRGBColorSpace;
        floorTex.anisotropy = 8;
      }
      const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex ?? undefined,
        color: floorTex ? 0xffffff : 0x4a3f48,
        roughness: 0.6,
        metalness: 0.05,
      });

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(BAY, RD), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0.02, -RD / 2);
      floor.receiveShadow = true;
      room.add(floor);

      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(BAY, RD), innerMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(0, RH, -RD / 2);
      room.add(ceil);

      for (const sx of [-1, 1] as const) {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(RD, RH), innerMat);
        sw.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
        sw.position.set((sx * BAY) / 2, RH / 2, -RD / 2);
        /*
         * Not a shadow receiver. A flat wall a metre from the camera,
         * lit by a directional light that reaches it through the
         * building it is inside, is the classic place for shadow acne
         * — and it showed up as a checkerboard crawling across the
         * plaster. Nothing indoors casts onto these walls anyway.
         */
        room.add(sw);
      }

      /*
       * THE PICTURE, AS THE FAR WALL — WHOLE, NEVER STRETCHED.
       *
       * The drawings are wider than they are tall and the room is
       * wider still, so the fit is by WIDTH and the height follows.
       * A picture squeezed to fill a wall is the same fault the
       * shopfronts had, one room further in.
       */
      /*
       * THE PICTURE COVERS THE WALL, FLOOR TO CEILING.
       *
       * Fitting it by width hung it on the wall like a television —
       * a lit rectangle with plaster above and below it, which is the
       * one thing a room must not look like. A room's back wall IS the
       * picture, so the wall is the wall and the texture is cropped to
       * cover it, keeping its own proportions. What falls outside the
       * crop is the far edges of the drawing, which is exactly what
       * you lose by standing in a room rather than looking at a photo
       * of one.
       */
      const bw = BAY;
      const bh = Math.min(7.4, bw / (band.aspect || rIm.width / rIm.height));
      /* No crop. The wall was sized from the picture, so the picture
         goes on whole — `mainBand` has already trimmed the offcuts and
         its window is the one we keep. */
      const wallTex = roomMap;
      /*
       * Plaster behind the picture, floor to ceiling.
       *
       * The wall is sized to the drawing and the ceiling is above it,
       * so there is a strip between the two — and through that strip
       * you could see the night sky over the back of the shop.
       */
      const backing = new THREE.Mesh(
        new THREE.PlaneGeometry(bw, RH),
        innerMat
      );
      backing.position.set(0, RH / 2, -RD);
      room.add(backing);

      /*
       * -----------------------------------------------------------------
       * THE ROOM IN THREE LAYERS, LIKE THE BUILDINGS
       * -----------------------------------------------------------------
       * A back wall alone is a photograph at the end of a box. Where
       * the three layers exist — the shelves, what stands in the middle
       * of the room, and the counter nearest you — they are hung apart
       * in depth, and the room gains the same parallax the street
       * outside it has. Walk in and the counter moves across the
       * shelves behind it.
       */
      const roomLayers = ["mid", "front"]
        .map((k) => textures[`shop_${s.id}_inside_${k}`])
        .filter((t): t is THREE.Texture => Boolean(t));
      roomLayers.forEach((tex, i) => {
        const band2 = mainBand(tex);
        const lh = Math.min(7.4, bw / (band2.aspect || 2));
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(bw, lh),
          new THREE.MeshStandardMaterial({
            map: band2.tex,
            emissiveMap: band2.tex,
            emissive: 0xffffff,
            emissiveIntensity: 0.24,
            transparent: true,
            alphaTest: 0.4,
            roughness: 0.88,
            side: THREE.DoubleSide,
          })
        );
        m.position.set(0, lh / 2, -RD + 0.9 + i * 1.5);
        room.add(m);
      });

      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(bw, bh),
        new THREE.MeshStandardMaterial({
          map: wallTex,
          emissiveMap: wallTex,
          emissive: 0xffffff,
          /* The room is painted lit, exactly like the shopfronts, and
             for the same reason it is not lit again from scratch. */
          emissiveIntensity: 0.26,
          normalMap: relief(roomMap),
          normalScale: new THREE.Vector2(0.9, 0.9),
          roughness: 0.86,
        })
      );
      back.position.set(0, bh / 2, -RD + 0.02);
      room.add(back);

      /* Two warm lamps in the ceiling. A room lit only by its own
         painting reads as a lightbox; these put light ON the floor and
         the side walls, which is what says "volume". */
      const world = new THREE.Vector3();
      for (const dz of [-1.9, -5.3]) {
        /* Small and warm. At 0.12 with `toneMapped: false` these went
           through the bloom as two white suns on the ceiling. */
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xffd9a8 })
        );
        bulb.position.set(0, RH - 0.22, dz);
        room.add(bulb);
        /* The emitter pool works in world space and the bay is rotated
           to face the street, so the lamp's position is converted once
           here rather than re-derived from the side. */
        world.set(0, RH - 0.55, dz);
        g.updateMatrixWorld();
        g.localToWorld(world);
        emit(world.x, world.y, world.z, 0xffd9a0, 30, 7.5);
        lamps.push(world.clone());
      }

      /*
       * A FRONT, WITH THE SHOP WINDOW CUT OUT OF IT.
       *
       * The room was open to the street along its whole width, which
       * is not a shop and is not watertight either: standing inside,
       * the very edges of a 72-degree lens caught the pavement past
       * the jamb, and a magenta planter from the terrace outside
       * appeared to be standing in the middle of the workshop.
       *
       * Two piers and a transom leave a window three and a half metres
       * wide in the middle — which is a shopfront — and the street is
       * then something you see THROUGH the glass from a room you are
       * standing in, rather than a hole in the world.
       */
      const OPEN = 3.6;
      const pier = (BAY - OPEN) / 2;
      for (const sx of [-1, 1] as const) {
        const jamb = new THREE.Mesh(new THREE.PlaneGeometry(pier, RH), innerMat);
        /* Set back from the very front: at -0.04 the pier and the side
           wall shared the same corner plane and the two fought for it,
           which showed as a checkerboard crawling up the jamb. */
        jamb.position.set(sx * (OPEN / 2 + pier / 2), RH / 2, -0.18);
        jamb.rotation.y = Math.PI;
        room.add(jamb);
      }
      const transom = new THREE.Mesh(new THREE.PlaneGeometry(OPEN, RH * 0.22), innerMat);
      transom.position.set(0, RH - (RH * 0.22) / 2, -0.18);
      transom.rotation.y = Math.PI;
      room.add(transom);

      g.add(room);

      /*
       * THE FRONT OF THE SHOP HAS TO GET OUT OF THE WAY.
       *
       * The facade is one opaque plane across the whole bay — there is
       * no door in it to walk through, because the door is painted.
       * So on the way in it fades, and on the way out it comes back.
       * From inside, the street is then visible where the glass would
       * be, which is what a shop window is.
       */
      const fm = faceMat;
      if (fm) {
        fadeFace = (k: number) => {
          fm.opacity = 1 - k;
          /* `alphaTest` and a fading opacity fight: the test keeps
             every pixel the drawing calls solid, whatever the opacity
             says. It is released for the fade and restored after. */
          fm.alphaTest = k > 0.02 ? 0 : 0.35;
          fm.depthWrite = k < 0.5;
          fm.needsUpdate = true;
        };
      }
      /* Where you end up standing: three and a half metres in, which
         is far enough that the doorway is behind you and near enough
         that the far wall is not in your face. Local -z is into the
         building, and the bay faces the street, so in world terms that
         is further out along the shop's own side. */
      roomSpot = new THREE.Vector3(x + s.side * 3.4, 0, s.z);
    }

    shops.push({
      ...s,
      doorway: new THREE.Vector3(x - s.side * 3.0, 0, s.z),
      roomSpot,
      fadeFace: fadeFace ?? undefined,
    });
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
  /* Nothing stands in front of a shop window you can see into: a lamp
     post across the glass is exactly where the eye was meant to go. */
  const clearOfWindow = (x: number, z: number, reach = 6.5) =>
    !specs.some((sp) => SHOP_WINDOWS[sp.id] && Math.sign(x) === Math.sign(FRONT_X * sp.side) && Math.abs(z - sp.z) < reach);
  for (let z = STREET_LENGTH / 2 - 8; z > -STREET_LENGTH / 2; z -= 23) {
    if (clearOfWindow(FURNITURE_X, z)) lamp(FURNITURE_X, z);
    if (clearOfWindow(-FURNITURE_X, z - 11.5)) lamp(-FURNITURE_X, z - 11.5);
  }

  /* ---------------------------------------------------------------
     TRAFFIC — headlights are most of what a night street IS
     --------------------------------------------------------------- */
  const cars: THREE.Group[] = [];
  /* Where cars stand parked, so moving traffic can go round them. */
  const parkedSpots: Array<{ side: number; z: number }> = [];
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
  function car(dir: 1 | -1, lane: number, speed: number, z: number, ours = false, forced?: { trade: string }): THREE.Group | undefined {
    const g = new THREE.Group();
    /* Negative z is away from the camera, which watches from the near
       end of the street — see `SPAWN` and the shadow box in `update`. */
    const away = dir < 0;
    /*
     * -----------------------------------------------------------------
     * EVERY VEHICLE IN THE STREET IS ONE OF OURS NOW, AND DRAWN
     * -----------------------------------------------------------------
     * Amit: *"אלה כלי הרכב שאני רוצה שיסעו בכבישים של העיר כל הזמן"*,
     * and, about the boxes that were there before, *"שיבינו שזה רכב של
     * בעל המקצוע הרלוונטי"*.
     *
     * Eleven trades, each with a front and a back view — which is
     * exactly the pair a street running away from the camera needs. A
     * car coming towards you shows its face; one leaving shows its
     * back. The geometry cars existed only because neither drawing
     * existed, and they are gone.
     *
     * The trade is chosen from the lane and the position so a given
     * vehicle keeps its identity instead of reshuffling every frame.
     */
    const trade = forced?.trade ?? CITY_FLEET_TRADES[
      Math.abs(Math.round(z / 7) + (dir > 0 ? 3 : 0)) % CITY_FLEET_TRADES.length
    ]!;
    const drawnFront = textures[`pn_${trade}_front`];
    const drawnBack = textures[`pn_${trade}_back`];
    if (drawnFront && drawnBack) {
      /*
       * ---------------------------------------------------------------
       * A VAN HAS A LENGTH
       * ---------------------------------------------------------------
       * Amit: *"המכוניות עדיין קרטון, אין נפח."* One drawing on one
       * plane is a van only from dead astern; from the pavement, at an
       * angle, it was a sheet of card sliding down the road.
       *
       * So the van is built the way a model maker would build it from
       * three drawings: the rear drawing on the tail, the front drawing
       * on the nose, the side drawing along its left flank, and between
       * them a body in the drawing's own paint with the coral band and
       * the wordmark on the right flank, four wheels that turn, and a
       * body that rides on its springs. Every face reads the right way
       * round — the side drawing has its cab on the left, which is the
       * van's left side, so that is where it goes; mirroring it for the
       * other flank would print PRO NOW backwards.
       *
       * Built nose-to-minus-z and turned to face the way it drives.
       */
      const H = 2.3;
      const sideTex = textures[`pn_${trade}_side`] ?? textures["van_side"];
      const sideImg = sideTex?.image as { width: number; height: number } | undefined;
      const L = sideImg ? H * (sideImg.width / sideImg.height) : 3.6;
      const Wd = H * 0.96;
      const ride = new THREE.Group();
      const tailFace = cutout(drawnBack, H, 1);
      tailFace.position.z = L / 2;
      ride.add(tailFace);
      const noseFace = cutout(drawnFront, H, 1);
      noseFace.rotation.y = Math.PI;
      noseFace.position.z = -L / 2;
      ride.add(noseFace);
      if (sideTex) {
        const flank = cutout(sideTex, H, 1);
        flank.rotation.y = -Math.PI / 2;
        flank.position.x = -Wd * 0.43;
        ride.add(flank);
      }
      const paint = new THREE.MeshStandardMaterial({ color: PRONOW.body, roughness: 0.5, metalness: 0.08 });
      const shell = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.84, 1.5, L * 0.9), paint);
      shell.position.y = 1.18;
      shell.castShadow = true;
      ride.add(shell);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.8, 0.3, L * 0.72), paint);
      roof.position.set(0, 2.02, L * 0.06);
      roof.castShadow = true;
      ride.add(roof);
      /* The right flank: band, glass over the cab, and the wordmark. */
      const band = new THREE.Mesh(
        new THREE.PlaneGeometry(L * 0.88, 0.24),
        new THREE.MeshStandardMaterial({ color: PRONOW.band, roughness: 0.5 })
      );
      band.rotation.y = Math.PI / 2;
      band.position.set(Wd * 0.42 + 0.005, 0.72, 0);
      ride.add(band);
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(L * 0.26, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x14111d, roughness: 0.16, emissive: 0x2a2440, emissiveIntensity: 0.5 })
      );
      glass.rotation.y = Math.PI / 2;
      glass.position.set(Wd * 0.42 + 0.006, 1.55, -L * 0.3);
      ride.add(glass);
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.6),
        new THREE.MeshStandardMaterial({ map: markTex, transparent: true, color: 0x1a1522, roughness: 0.6 })
      );
      mark.rotation.y = Math.PI / 2;
      mark.position.set(Wd * 0.42 + 0.007, 1.3, L * 0.14);
      ride.add(mark);
      /* A dark skirt over the wheels, a door seam and a second window,
         so the plain flank reads as a van's side and not a crate's. */
      const trim = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.7 });
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.86, 0.3, L * 0.92), trim);
      skirt.position.y = 0.5;
      ride.add(skirt);
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 1.1), trim);
      seam.rotation.y = Math.PI / 2;
      seam.position.set(Wd * 0.42 + 0.006, 1.2, -L * 0.1);
      ride.add(seam);
      const rearGlass = glass.clone();
      rearGlass.scale.set(0.55, 0.8, 1);
      rearGlass.position.set(Wd * 0.42 + 0.006, 1.6, L * 0.32);
      ride.add(rearGlass);
      g.add(ride);
      const tyre = new THREE.MeshStandardMaterial({ color: 0x16131b, roughness: 0.85 });
      const hub = new THREE.MeshStandardMaterial({ color: 0x9a96a4, roughness: 0.4, metalness: 0.3 });
      const wheels: THREE.Object3D[] = [];
      for (const wz of [-L / 2 + 0.62, L / 2 - 0.62]) {
        for (const wx of [-Wd * 0.36, Wd * 0.36]) {
          const w = new THREE.Group();
          const t = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 18), tyre);
          t.rotation.z = Math.PI / 2;
          w.add(t);
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 12), hub);
          cap.rotation.z = Math.PI / 2;
          w.add(cap);
          w.position.set(wx, 0.36, wz);
          g.add(w);
          wheels.push(w);
        }
      }
      if (dir > 0) g.rotation.y = Math.PI;
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
      tail.material.color.set(away ? 0xff3b30 : 0xfff0cc);
      tail.material.opacity = away ? 0.3 : 0.4;
      /* In the van's own frame the tail is always +z; the group is
         turned to face the way it drives. */
      tail.position.set(0, 1.0, L / 2 + 0.4);
      g.add(tail);
      emitters.push({
        pos: new THREE.Vector3(),
        colour: new THREE.Color(0xfff0cc),
        intensity: 62,
        distance: 14,
        follow: g,
        offsetZ: dir * 6.4,
      });
      g.position.set(lane, 0, z);
      g.userData = { dir, speed, ride, wheels, phase: Math.abs(z) % 6.28, scripted: Boolean(forced), laneX: lane };
      scene.add(g);
      cars.push(g);
      return g;
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
  /*
   * SLOWER, AND MORE OF THEM.
   *
   * Amit: *"חייב שיבחינו בהם ויתנו להם מקום, שיסעו לאט ויקבלו תשומת
   * לב מהלקוח."* Eleven metres a second is a main road; this is a
   * high street where the point is that you look at what goes past.
   */
  for (let i = 0; i < 5; i += 1) car(-1, laneA, 5 + Math.random() * 2.5, -120 + i * 58, true);
  for (let i = 0; i < 5; i += 1) car(1, laneB, 4.5 + Math.random() * 2.5, -92 + i * 61, true);

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
  interface Walker {
    g: THREE.Group;
    speed: number;
    cycle: Cycle;
    material: THREE.MeshStandardMaterial;
    /** Carries the same frame, so the shadow walks too. */
    depth: THREE.MeshDepthMaterial;
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
    /* Same reasoning as `cutout`: the silhouette is in the map, and the
       shadow pass does not read the map unless it is given one. The
       frame changes as they walk, so the depth material is updated with
       it — a person whose shadow is stuck on one pose is worse than a
       person with no shadow. */
    const depth = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: c.frames[0]!,
      alphaTest: 0.42,
    });
    quad.castShadow = true;
    quad.customDepthMaterial = depth;
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
    walkers.push({ g, speed, cycle: c, material, depth, stride, walked: 0 });
  }

  /*
   * The drawn cycles, measured once. `walk_dog` is deliberately not in
   * the crowd: a loose dog trotting down a pavement on its own is a lost
   * dog, and it belongs at the park — see `PLACED`.
   */
  const peopleCycles = [
    measureCycle(textures["walk_man"]),
    measureCycle(textures["walk_woman"]),
    measureCycle(textures["walk_dogwalker"], 6),
  ].filter((c): c is Cycle => c !== null);

  for (let i = 0; i < 14; i += 1) {
    const side = Math.random() > 0.5 ? 1 : -1;
    /* Near the kerb. They used to be spread across the full pavement,
       which put one in the camera's lap every few seconds — and a
       background figure inspected at three metres stops being
       background. Out there they are what they are meant to be. */
    /*
     * A LANE OF THEIR OWN, BETWEEN THE TREES AND THE TABLES.
     *
     * Amit: *"שאר האנשים בשכונה הולכים דרך עצים ודברים."* They were
     * spawned from 4.3 to 6.2 metres off the centre line, and the
     * street lamps stand at 4.0 and the trees at 3.7 with a canopy
     * five metres across — so every walker on the kerb side passed
     * straight through a tree.
     *
     * The pavement runs from 3.3 to 9.7. The kerb furniture occupies
     * up to about 4.4 and the tables, benches and planters start at
     * 7.7, which leaves a clear corridor of three metres down the
     * middle. That is where people walk in a real street, too.
     */
    const x = side * (5.4 + Math.random() * 1.7);
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
    /*
     * BIG ENOUGH TO BE A DOG.
     *
     * Amit: *"חייב שיהיו כלבים יותר גדולים בגינת כלבים שיבינו שזה
     * כלב."* At 0.72m — which is roughly a real dog — a drawing seen
     * from across a park is a dark smudge on the grass, and the point
     * of the park is that you can tell what it is at a glance. A
     * metre and a bit reads as a dog from the pavement, and there are
     * two of them, because one dog in a dog park is a lost dog.
     */
    const dog = textures["park_dog1"] ? null : measureCycle(textures["walk_dog"]);
    if (dog) {
      drawnWalker(FRONT_X - 2.6, 60.2, dog, 1.15, 1.1, 0);
      drawnWalker(FRONT_X - 1.4, 63.4, dog, 1.0, 1.1, 0);
    }
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

  /*
   * A TREE THE CAMERA IS STANDING IN GETS OUT OF THE WAY.
   *
   * The follow camera rides a couple of metres behind and above you, and
   * past a tree on the kerb it went straight through the crown — the
   * whole screen became flat purple petals, which is the cut-out giving
   * itself away more completely than anything else in the street. Within
   * a couple of metres of the camera a tree is hidden; you are under it.
   */
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
      canopies.push(g);
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
    if (clearOfWindow(FURNITURE_X, z - 7, 16)) tree(FURNITURE_X - 0.3, z - 7, 0.94 + Math.random() * 0.12);
    if (clearOfWindow(-FURNITURE_X, z - 18.5, 16)) tree(-FURNITURE_X + 0.3, z - 18.5, 0.94 + Math.random() * 0.12);
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
    x > 0 && Math.abs(z - 58.4) < 5.4 && x > FRONT_X - 4.6;

  for (let z = STREET_LENGTH / 2 - 24; z > -STREET_LENGTH / 2; z -= 31) {
    if (!inPark(FRONT_X - 2.0, z) && clearOfWindow(FRONT_X, z, 7)) cafe(FRONT_X - 2.0, z, flowerHues[Math.floor(Math.random() * 3)]!);
    if (clearOfWindow(-FRONT_X, z - 15, 7)) cafe(-FRONT_X + 2.0, z - 15, 0xffc07a);
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
      /**
       * Stands in the parking lane rather than against the wall.
       *
       * Amit: *"משאית על המדרכה."* He was right and it was mine: every
       * place was placed the same way, half a metre off the building
       * line — which is correct for a bench, a parcel point and a
       * nursery, and absurd for a tow truck with a car on its back. It
       * was parked on the pavement, against a shop window.
       *
       * A layby is a piece of ROAD. That is what the word means.
       */
      kerb?: boolean;
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

      { id: "roadside", asset: "place_roadside",   he: "מפרץ עצירה",    department: "VEHICLE",   z:   8.8, side:  1, height: 3.6, kerb: true },
      { id: "pickup",   asset: "place_pickup",     he: "נקודת שליחויות", department: "LOGISTICS", z: -79.2, side:  1, height: 3.8 },
      { id: "garden",   asset: "place_garden",     he: "פינת המשתלה",   department: "HOME_CARE", z: -26.4, side: -1, height: 3.4 },
      { id: "bench",    asset: "place_bench_stop", he: "פינת ישיבה",    department: null,        z: -114.4, side:  1, height: 3.4 },
    ];

    for (const pl of PLACED) {
      const tex = textures[pl.asset];
      if (!tex) continue;
      const band = mainBand(tex);
      const g = cutout(band.tex, pl.height, 1, band.aspect);
      const x = pl.kerb
        ? pl.side * (KERB_X - 1.2)
        : FRONT_X * pl.side - pl.side * 0.5;
      g.position.set(x, 0, pl.z);
      g.rotation.y = pl.side < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(g);
      if (pl.kerb) canopies.push(g);
      places.push({
        id: pl.id,
        he: pl.he,
        department: pl.department,
        /* Where somebody stands to be met here. Off the wall for a
           place on the pavement; up ON the pavement, behind the kerb,
           for one parked in the road — you do not wait for a tow truck
           by standing in the traffic. */
        spot: new THREE.Vector3(
          pl.kerb ? pl.side * (KERB_X + 1.6) : x - pl.side * 2.6,
          0,
          pl.z
        ),
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
      /* A gap of pavement between the park and the pet shop (Amit: "צמודה
         מדי לחנות חיות") — the shop starts at about z 64.4. */
      const pz = 58.4;
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
          canopies.push(t);
        }
      }
      /*
       * The drawn park, standing at the back of the built one.
       *
       * `place_dogpark` arrived as a wide strip — grass, a fence,
       * agility hoops, a bench — which is a backdrop rather than a
       * place you can walk around. So it stands against the wall and
       * the geometry in front of it is what you actually walk into.
       */
      const parkArt = textures["place_dogpark"];
      if (parkArt) {
        const band = mainBand(parkArt);
        const art = cutout(band.tex, 3.0, 1, band.aspect);
        art.position.set(px + PW / 2 - 0.12, 0, pz);
        art.rotation.y = -Math.PI / 2;
        g.add(art);
      }

      const benchTex = textures["prop_bench"];
      if (benchTex) {
        const bench = cutout(benchTex, 1.0);
        bench.position.set(px + 1.5, 0, pz - 1.2);
        bench.rotation.y = -Math.PI / 2;
        g.add(bench);
      }
      scene.add(g);

      /*
       * THE PARK, WITH DOGS IN IT DOING DOG THINGS.
       *
       * Amit: *"גינת הכלבים צריכה שדרוג משמעותי — כלבים גדולים ותנועה,
       * ובני אדם ששומרים עליהם."* The dogs are drawn from the side, so they
       * read as dogs from the pavement. Three run their own loops inside
       * the fence, one leaps now and then, one stands wagging, one lies and
       * breathes; the people stand at the rail, and a ball flies between
       * one of them and the running golden. Each figure turns to face the
       * camera and faces the way it is going.
       */
      const figure = (tex: THREE.Texture, h: number) => {
        const img = tex.image as { width: number; height: number };
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(h * (img.width / img.height), h),
          new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.22, transparent: true, alphaTest: 0.4, roughness: 0.9, side: THREE.DoubleSide })
        );
        m.geometry.translate(0, h / 2, 0);
        const holder = new THREE.Group();
        holder.add(m);
        const sh = new THREE.Mesh(
          new THREE.PlaneGeometry(h * 1.1, h * 0.35),
          new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
        );
        sh.rotation.x = -Math.PI / 2;
        sh.position.y = 0.02;
        holder.add(sh);
        scene.add(holder);
        return { holder, m };
      };
      const tx = (id: string) => textures[id];
      const runners: Array<{ f: ReturnType<typeof figure>; rx: number; rz: number; w: number; ph: number; leap: boolean }> = [];
      const loopR = [[PW / 2 - 0.5, PL / 2 - 0.8], [PW / 2 - 0.9, PL / 2 - 2.0], [PW / 2 - 0.7, PL / 2 - 1.3]];
      ["park_dog1", "park_dog2", "park_dog3"].forEach((id, i) => {
        const t = tx(id);
        if (!t) return;
        const f = figure(t, i === 1 ? 1.55 : 1.45);
        runners.push({ f, rx: loopR[i]![0]!, rz: loopR[i]![1]!, w: [0.55, 0.42, 0.7][i]!, ph: i * 2.1, leap: i === 1 });
      });
      const still: Array<{ f: ReturnType<typeof figure>; kind: "wag" | "breathe" | "stand" }> = [];
      const place = (id: string, h: number, x: number, z: number, kind: "wag" | "breathe" | "stand") => {
        const t = tx(id);
        if (!t) return null;
        const f = figure(t, h);
        f.holder.position.set(x, 0, z);
        still.push({ f, kind });
        return f;
      };
      place("park_dog4", 1.5, px + 0.9, pz + PL / 2 - 1.2, "wag");
      place("park_dog5", 1.05, px + 1.1, pz - PL / 2 + 1.4, "breathe");
      const thrower = place("park_person1", 1.76, px - PW / 2 + 0.35, pz + 1.6, "stand");
      place("park_person2", 1.7, px + 1.5, pz + PL / 2 - 0.6, "stand");
      place("park_person3", 1.3, px - PW / 2 + 0.45, pz - 2.2, "stand");
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd8f24a, emissive: 0x9aad20, emissiveIntensity: 0.5, roughness: 0.6 }));
      ball.visible = Boolean(thrower && runners[0]);
      scene.add(ball);
      const camRight = new THREE.Vector3();
      parkTicks.push((dt, t, camera) => {
        camRight.setFromMatrixColumn(camera.matrixWorld, 0);
        const face = (f: ReturnType<typeof figure>, vx: number, vz: number) => {
          f.m.rotation.y = Math.atan2(camera.position.x - f.holder.position.x, camera.position.z - f.holder.position.z);
          /* The drawings face left; mirror while the dog runs to screen right. */
          const toRight = vx * camRight.x + vz * camRight.z > 0;
          f.m.scale.x = toRight ? -1 : 1;
        };
        for (const r of runners) {
          const a = t * r.w + r.ph;
          const x = px + Math.cos(a) * r.rx, z = pz + Math.sin(a) * r.rz;
          const vx = -Math.sin(a) * r.rx, vz = Math.cos(a) * r.rz;
          const hop = r.leap ? Math.max(0, Math.sin(t * 1.6 + r.ph)) ** 6 * 1.1 : Math.abs(Math.sin(t * 9 + r.ph)) * 0.08;
          r.f.holder.position.set(x, 0, z);
          r.f.m.position.y = hop;
          face(r.f, vx, vz);
        }
        for (const s of still) {
          face(s.f, 1, 0);
          if (s.kind === "wag") s.f.m.rotation.z = Math.sin(t * 7) * 0.05;
          if (s.kind === "breathe") s.f.m.scale.y = 1 + Math.sin(t * 2.2) * 0.03;
          if (s.kind === "stand") s.f.m.position.y = Math.sin(t * 1.3 + s.f.holder.position.z) * 0.015;
        }
        if (ball.visible && thrower && runners[0]) {
          /* Thrown to the golden, over and over: an arc every 2.2 s. */
          const k = (t % 2.2) / 2.2;
          const from = thrower.holder.position, to = runners[0].f.holder.position;
          ball.position.set(from.x + (to.x - from.x) * k, 1.3 + Math.sin(k * Math.PI) * 2.2 - k * 0.9, from.z + (to.z - from.z) * k);
        }
        void dt;
      });

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
      /* Never parked across a shop window you can see into. */
      if (!clearOfWindow(side * KERB_X, z, 8)) continue;
      const g = cutout(tex, h, 1);
      /* Half up on the kerb, the way people really park here — and noted, so traffic goes round it. */
      g.position.set(side * (KERB_X - 0.55), 0, z);
      /* Side views face across the road; rear views face down it. */
      g.rotation.y = id.endsWith("_side") ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : 0;
      parkedSpots.push({ side, z });
      scene.add(g);
      canopies.push(g);
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
    for (const c of canopies) {
      c.getWorldPosition(_canopyAt);
      c.visible = Math.hypot(camera.position.x - _canopyAt.x, camera.position.z - _canopyAt.z) > 2.4;
    }
    /* The redrawn buildings keep their face to you, within limits: past
       about fifty degrees a three-quarter drawing stops reading as one. */
    for (const f of redrawnTicks) f(elapsed);
    for (const f of parkTicks) f(dt, elapsed, camera);
    /* Furniture behind a shop window keeps its face to you, like in the room. */
    for (const f of windowFacing) {
      _heroLocal.copy(camera.position);
      f.group.worldToLocal(_heroLocal);
      const a = Math.atan2(_heroLocal.x - f.m.position.x, _heroLocal.z - f.m.position.z);
      f.m.rotation.y = Math.max(-1.0, Math.min(1.0, a));
    }
    for (const w of windowSheens) {
      _heroLocal.copy(camera.position);
      w.group.worldToLocal(_heroLocal);
      w.tex.offset.x = -_heroLocal.x * 0.035 + _heroLocal.z * 0.01;
    }
    for (const h of heroFaces) {
      _heroLocal.copy(camera.position);
      h.group.worldToLocal(_heroLocal);
      const a = Math.atan2(_heroLocal.x - h.face.position.x, _heroLocal.z - h.face.position.z);
      h.face.rotation.y = Math.max(-0.9, Math.min(0.9, a));
    }
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

    /* His lane is kept clear around him: nobody drives through the professional's van (Amit, 2026-09-29). */
    const hero = cars.find((c) => (c.userData as { scripted?: boolean }).scripted);
    for (const c of cars) {
      if (hero && c !== hero && Math.abs(c.position.x - hero.position.x) < 1) {
        c.visible = Math.abs(c.position.z - hero.position.z) > 34;
      }
      const { dir, speed, ride, wheels, phase, scripted } = c.userData as {
        dir: 1 | -1; speed: number; ride?: THREE.Object3D; wheels?: THREE.Object3D[]; phase?: number; scripted?: boolean;
      };
      /* The professional's own van is placed by whoever drives it (see `heroVan`). */
      if (!scripted) c.position.z += dir * speed * dt;
      /* Nobody drives through a parked car: ease towards the centre line while passing one. */
      const laneX = (c.userData as { laneX?: number }).laneX;
      if (laneX !== undefined) {
        const side = Math.sign(laneX);
        /* Look AHEAD, the way a driver does: start moving out 18m before the
           parked car and stay out until past it. Reacting at 7.5m at 6m/s
           meant driving into it (Amit, 2026-09-29). */
        const blocked = parkedSpots.some((q) => {
          if (q.side !== side) return false;
          const ahead = (q.z - c.position.z) * dir;
          return ahead > -7 && ahead < 18;
        });
        const want = blocked ? side * 0.35 : laneX;
        c.position.x += (want - c.position.x) * Math.min(1, dt * 3.2);
      }
      /* A van on its springs, and wheels that turn with the road. */
      if (ride) {
        const tt = performance.now() / 1000 + (phase ?? 0);
        ride.position.y = 0.03 * Math.sin(tt * 7.3) + 0.015 * Math.sin(tt * 13.1);
        ride.rotation.z = 0.008 * Math.sin(tt * 3.7);
      }
      if (wheels) for (const w of wheels) w.rotation.x -= (speed * dt) / 0.36;
      if (!scripted && c.position.z > HALF) c.position.z = -HALF;
      if (!scripted && c.position.z < -HALF) c.position.z = HALF;
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
        w.depth.map = frame;
        w.depth.needsUpdate = true;
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
        l.intensity = e.intensity * lampScale;
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

  /* By day a halo is a smudge in the sky, not a light: the additive
     glows (lamp haloes, neon wash, tail-light spill) are kept faint. */
  if (day) {
    scene.traverse((o) => {
      const m = (o as THREE.Sprite).material as THREE.SpriteMaterial | undefined;
      if ((o as THREE.Sprite).isSprite && m && m.blending === THREE.AdditiveBlending) m.opacity *= 0.3;
    });
  }
  /**
   * THE PROFESSIONAL'S OWN VAN, for the tracking view: his trade's livery,
   * in the lane that runs away from the camera, standing still until the
   * host moves it (`userData.speed` turns its wheels).
   */
  const heroVan = (trade: string): THREE.Group | null => car(-1, laneA, 0, 0, true, { trade }) ?? null;

  return { scene, shops, places, lamps, update, windowShops, heroVan };
}

export { neon, glow };
