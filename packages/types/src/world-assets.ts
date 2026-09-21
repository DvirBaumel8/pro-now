/**
 * THE WORLD ASSET CONTRACT — scene composition for the Living Map.
 *
 * ---------------------------------------------------------------------
 * WHY THIS FILE REPLACES DRAWING THE WORLD IN CODE
 * ---------------------------------------------------------------------
 * The first Living Map drew its world with SVG primitives and was rejected
 * on sight. The diagnosis was not that the drawing was bad; it was that the
 * approach could not reach the target at all. From
 * `/docs/03c-LIVING-MAP-ART-DIRECTION.md`:
 *
 *     HUD, text, glow, rings, paths, interaction  →  code
 *     buildings, vehicles, trees, props           →  raster assets
 *
 * So this module holds no art. It holds the contract that art arrives
 * under, and the arithmetic that decides where a piece of it lands and what
 * occludes what. When the asset pack changes, nothing here changes.
 *
 * ---------------------------------------------------------------------
 * NO GRID
 * ---------------------------------------------------------------------
 * The projection is a fixed 3/4 miniature perspective, not 2:1 isometric,
 * for a stated reason: an isometric grid reads as SimCity, which is the
 * opposite of the target. A tile engine would quietly impose that grid
 * anyway, so there is no tile engine. Placement is a normalized anchor plus
 * a scale, and depth is computed rather than authored.
 */

import type { WorldInteraction } from "./world-play";

/**
 * THE FIVE BANDS, AND WHY DEPTH IS COMPUTED INSIDE ONE OF THEM.
 *
 * ChatGPT added this after the first depth pass: *"כך שום דוד שמש לא
 * ישפיע בטעות על depth של בניין שלם."* The failure it prevents is
 * specific. Ground, objects, props, the moving professional and the HUD
 * are different kinds of thing, and sorting them in one flat list means a
 * water heater's ground line can compete with a building's. Bands sort
 * first and absolutely; the computed depth order only ever decides
 * position WITHIN a band.
 *
 * So a prop can never end up behind the wall it is bolted to, and the
 * ground can never rise in front of anything standing on it, whatever
 * anyone writes in a placement.
 */
export type WorldLayer = "GROUND_LAYER" | "WORLD_OBJECT" | "WORLD_PROP" | "PRESENCE" | "HUD";

/** The order the bands stack in. HUD is drawn by the screen, not the stage. */
export const WORLD_LAYER_ORDER: readonly WorldLayer[] = ["GROUND_LAYER", "WORLD_OBJECT", "WORLD_PROP", "PRESENCE"];

/** What a piece of world art is. Decides its band, its bias and its size. */
export type WorldAssetRole =
  | "BUILDING"
  | "HERO_BUILDING"
  | "VEHICLE"
  | "CHARACTER"
  | "TREE"
  | "STREET_PROP"
  /** The road, the pavement, the paving. One surface, always behind. */
  | "GROUND"
  /** The professional on the way. Always in front of the world. */
  | "PRESENCE"
  /** Sits on a roof — a solar water heater, a water tank. Attaches. */
  | "ROOF_PROP"
  /** Sits on a wall — an AC unit, an awning. Attaches. */
  | "WALL_PROP";

/** `SHARED` art appears in every world; themed art only in its own. */
export type WorldAssetTheme = "SHARED" | "HAIR";

/**
 * One entry in the asset pack's manifest.
 *
 * The manifest is the contract, and it is the ONLY source of an asset's
 * dimensions, anchor and semantics. Nothing is inferred from a filename:
 * `shared_residential_01_v01.webp` tells the reader what it is and tells
 * the code nothing, which is the point — a rename must not be able to move
 * a building.
 *
 * `defaultWidthRatio` is exactly what it says: the share of the WORLD'S
 * WIDTH this asset occupies at instance scale 1. It was called
 * `defaultScale` for an afternoon and renamed on ChatGPT's instruction,
 * because "scale" reads as a pixel multiplier and the difference is not
 * cosmetic — a building authored as a multiplier is a building that
 * changes size with the phone. At 0.27 it is 27% of the world's width on
 * every device, and its height follows from the intrinsic aspect ratio.
 */
export interface WorldAssetManifestItem {
  id: string;
  file: string;

  intrinsicWidth: number;
  intrinsicHeight: number;

  /** Where the art touches the ground, in its own 0..1 space. */
  anchor: { x: number; y: number };

  role: WorldAssetRole;
  theme: WorldAssetTheme;

  /** Share of world width at instance scale 1. See above. */
  defaultWidthRatio: number;

  /**
   * True when the asset carries meaning the composition depends on — the
   * hero barbershop, the destination building, the provider character.
   * Critical assets may not enter a safe zone; background may be cropped.
   */
  critical: boolean;

  animatedVariant?: boolean;

  /*
   * THE INVARIANTS, AS COMPILE ERRORS.
   *
   * An asset knows what it is. The scene knows where it is. The moment a
   * manifest can hold a position, someone will put a real one there and the
   * illustration becomes a claim about a place. Same reasoning as
   * `WorldDecoration` in `living-map.ts`, same enforcement.
   */
  lat?: never;
  lng?: never;
  coordinates?: never;
  gx?: never;
  gy?: never;
  businessName?: never;
  poiId?: never;
  address?: never;
}

export type WorldAssetManifest = Readonly<Record<string, WorldAssetManifestItem>>;

/** The default, and only the default. Props that attach override it. */
export const DEFAULT_ANCHOR = { x: 0.5, y: 1 } as const;

/**
 * Placing one asset in one scene.
 *
 * `x` and `y` are the position of the asset's ANCHOR in the world box, not
 * of its top-left corner. That distinction is what lets a building and a
 * scooter of wildly different heights both "stand" on the same line.
 */
export interface ScenePlacement {
  /** Unique within the scene. Props reference it to attach. */
  key: string;
  assetId: string;
  x: number;
  y: number;
  /** Multiplies the manifest's `defaultWidthRatio`. Defaults to 1. */
  scale?: number;
  /**
   * Roof and wall props only: the key of what they sit on. They inherit
   * their parent's depth so they can never sort behind it.
   */
  attachTo?: string;
  /**
   * The escape hatch, and it is meant to stay rare. Authoring z by hand for
   * every asset produces forty arbitrary numbers and a depth order that
   * breaks on the first different viewport — which is exactly what computed
   * depth exists to prevent.
   */
  zIndexOverride?: number;
  /**
   * Makes this object part of the world's play. Absent for most things —
   * the street should hold a few surprises, not become a board of buttons.
   * See `world-play.ts` for what an interaction may and may not do.
   */
  interaction?: WorldInteraction;
}

/** The area the world gets, and the two bands it may not intrude on. */
export interface SceneBox {
  width: number;
  height: number;
  /** Height of the top HUD, measured from the top of the world box. */
  safeTop: number;
  /** Height of the bottom sheet, measured from the bottom. */
  safeBottom: number;
}

export interface ResolvedPlacement {
  key: string;
  assetId: string;
  item: WorldAssetManifestItem;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Which band it sorts in. Absolute — depth never crosses a band. */
  layer: WorldLayer;
  /** Larger draws in front, WITHIN its band. Computed, not authored. */
  depthOrder: number;
}

/**
 * How far each role floats off its ground line.
 *
 * A scooter at the same y as a building should draw in front of it, because
 * it is standing in the street rather than on the building's footprint.
 * That is what this expresses: a small, uniform nudge per role rather than
 * a hand-written z on every placement.
 */
const LAYER_BIAS: Readonly<Record<WorldAssetRole, number>> = {
  GROUND: 0,
  BUILDING: 0,
  HERO_BUILDING: 0,
  TREE: 8,
  STREET_PROP: 12,
  VEHICLE: 20,
  CHARACTER: 28,
  ROOF_PROP: 1,
  WALL_PROP: 1,
  PRESENCE: 0,
};

/** Which band each role belongs to. The first key of the sort. */
export const LAYER_OF_ROLE: Readonly<Record<WorldAssetRole, WorldLayer>> = {
  GROUND: "GROUND_LAYER",
  BUILDING: "WORLD_OBJECT",
  HERO_BUILDING: "WORLD_OBJECT",
  TREE: "WORLD_OBJECT",
  VEHICLE: "WORLD_OBJECT",
  CHARACTER: "WORLD_OBJECT",
  STREET_PROP: "WORLD_PROP",
  ROOF_PROP: "WORLD_PROP",
  WALL_PROP: "WORLD_PROP",
  PRESENCE: "PRESENCE",
};

/** Roles that must declare `attachTo`, and roles that must not. */
const ATTACHING_ROLES: ReadonlySet<WorldAssetRole> = new Set<WorldAssetRole>(["ROOF_PROP", "WALL_PROP"]);

/**
 * The size bands, from the art direction. Stated as ranges because they
 * came as ranges; enforced because the last set of composition rules lived
 * in prose and was followed by a screen that broke all of them.
 */
export const WORLD_COMPOSITION = {
  buildingWidth: { min: 0.22, max: 0.32 },
  heroBuildingWidth: { min: 0.32, max: 0.4 },
  /** No critical asset taller than this share of the world box. */
  maxCriticalHeight: 0.3,
  /** The world's share of the screen, top HUD and bottom sheet excluded. */
  worldShareOfScreen: { min: 0.65, max: 0.7 },
  /** More overrides than this in one scene means depth is being authored. */
  maxZIndexOverrides: 2,
} as const;

/**
 * ---------------------------------------------------------------------
 * THE GROUND, AND THE ROOM TO TRAVEL ON IT
 * ---------------------------------------------------------------------
 * Amit's note about the world was not about polish: *"חייב גם שכל הרקע
 * מסביב יהיה של העולם שלנו ולא כחול כהה סתם, ממש חווית טיול בין השבילים
 * של בעלי המקצוע."* A few objects on empty navy is a collage; a surface
 * that fills the screen and runs past its edges is a place.
 *
 * Three rules follow, and they are checkable, so they are checked.
 */
export const WORLD_GROUND = {
  /**
   * The ground extends at least this far beyond the viewport on every
   * side. Without the overhang there is nowhere to pan to — the first
   * finger-drag would expose the edge of the world.
   */
  minOverhang: 0.25,
  /**
   * THE LANE, as a band of GROUND LINES rather than a column of pixels.
   *
   * The first version of this rule reserved a vertical strip down the
   * middle of the screen, and every legal composition failed it at once —
   * correctly, because a street drawn in 3/4 perspective does not run up
   * the screen. It runs ACROSS it, with the buildings standing behind it
   * and the near pavement in front.
   *
   * So the corridor is a range of `y`: anything whose ground contact falls
   * inside it is standing in the road. Buildings stand behind it, the near
   * kerb is in front of it, and the professional travels along it.
   */
  corridor: { from: 0.8, to: 0.94 },
} as const;

/**
 * How much each band moves when the world is panned.
 *
 * Nearer things move further — the ordinary parallax of looking out of a
 * moving window. It is deliberately gentle: at 1.10 the professional drifts
 * ten percent faster than the pavement, which reads as depth. Push it and
 * the scene comes apart, because these are flat images pretending to have
 * distance between them.
 */
const PARALLAX: Readonly<Record<WorldLayer, number>> = {
  GROUND_LAYER: 1,
  WORLD_OBJECT: 1.05,
  WORLD_PROP: 1.05,
  PRESENCE: 1.1,
  HUD: 0,
};

/** A pan offset, as a fraction of the viewport. `{x:0,y:0}` is centred. */
export interface WorldPan {
  x: number;
  y: number;
}

export const NO_PAN: WorldPan = { x: 0, y: 0 };

/**
 * Keep a pan inside the ground's overhang.
 *
 * The clamp is what makes dragging feel like a window onto a bigger place
 * rather than like sliding a picture around: you can move until the world's
 * edge would appear, and then you cannot.
 */
export function clampPan(pan: WorldPan, overhang: number = WORLD_GROUND.minOverhang): WorldPan {
  const limit = Math.max(0, overhang);
  return {
    x: Math.max(-limit, Math.min(limit, pan.x)),
    y: Math.max(-limit, Math.min(limit, pan.y)),
  };
}

/** Where a resolved placement sits once the world has been panned. */
export function panOffsetFor(layer: WorldLayer, pan: WorldPan, box: SceneBox): { dx: number; dy: number } {
  const f = PARALLAX[layer];
  return { dx: pan.x * box.width * f, dy: pan.y * box.height * f };
}

/**
 * Turn placements into rectangles, sorted back to front.
 *
 * Unknown asset ids are dropped rather than thrown on, because a scene that
 * renders without one building is recoverable and a crash mid-search is
 * not. `scenePlacementViolations` is what makes the omission loud.
 */
export function resolveScene(
  manifest: WorldAssetManifest,
  placements: readonly ScenePlacement[],
  box: SceneBox
): ResolvedPlacement[] {
  const byKey = new Map<string, ResolvedPlacement>();
  const out: ResolvedPlacement[] = [];

  for (const p of placements) {
    const item = manifest[p.assetId];
    if (!item) continue;

    const ratio = item.defaultWidthRatio * (p.scale ?? 1);

    /*
     * THE GROUND IS A FLOOR, NOT A PICTURE.
     *
     * Every other asset takes its height from its own aspect ratio,
     * because a building has a shape. The ground has no shape worth
     * preserving — it has a job, which is to cover the viewport. Sizing it
     * by aspect meant a landscape floor could only fill a tall phone by
     * being blown up several times over, which zoomed the world in until
     * the barbershop was standing in a pedestrian crossing.
     *
     * So it covers both axes independently and is drawn with `cover`, and
     * `ratio` becomes an honest zoom control: 1.5 means "half a screen of
     * world spare in every direction".
     */
    const isGround = item.role === "GROUND";
    const width = box.width * ratio;
    const height = isGround ? box.height * ratio : width * (item.intrinsicHeight / item.intrinsicWidth);

    const anchorX = box.width * p.x;
    const anchorY = box.height * p.y;

    const resolved: ResolvedPlacement = {
      key: p.key,
      assetId: p.assetId,
      item,
      left: anchorX - width * item.anchor.x,
      top: anchorY - height * item.anchor.y,
      width,
      height,
      layer: LAYER_OF_ROLE[item.role],
      depthOrder: anchorY + LAYER_BIAS[item.role],
    };

    // An attached prop borrows its parent's depth. Its own ground line is
    // meaningless — an AC unit three storeys up would otherwise sort as if
    // it were standing further back than the wall holding it.
    if (p.attachTo) {
      const parent = byKey.get(p.attachTo);
      if (parent) resolved.depthOrder = parent.depthOrder + LAYER_BIAS[item.role];
    }
    if (p.zIndexOverride !== undefined) resolved.depthOrder = p.zIndexOverride;

    byKey.set(p.key, resolved);
    out.push(resolved);
  }

  /*
   * Band first, then depth inside it. The two-key sort is the whole point:
   * no arrangement of anchors can lift the ground in front of a building or
   * push an AC unit behind its wall.
   */
  return out.sort((a, b) => {
    const band = WORLD_LAYER_ORDER.indexOf(a.layer) - WORLD_LAYER_ORDER.indexOf(b.layer);
    return band !== 0 ? band : a.depthOrder - b.depthOrder;
  });
}

/**
 * Everything wrong with a scene, in words a person can act on.
 *
 * This is the same device as `livingMapViolations`: the rules that decide
 * whether a composition is legal are checkable, so they are checked, and
 * the check runs at render in development rather than living in a document
 * nobody opens.
 */
export function scenePlacementViolations(
  manifest: WorldAssetManifest,
  placements: readonly ScenePlacement[],
  box: SceneBox
): string[] {
  const v: string[] = [];
  const seen = new Set<string>();
  let overrides = 0;

  for (const p of placements) {
    if (seen.has(p.key)) v.push(`Duplicate placement key "${p.key}".`);
    seen.add(p.key);

    const item = manifest[p.assetId];
    if (!item) {
      v.push(`Placement "${p.key}" references unknown asset "${p.assetId}".`);
      continue;
    }

    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
      v.push(`Placement "${p.key}" is at (${p.x}, ${p.y}); anchors are normalized 0..1.`);
    }
    if ((p.scale ?? 1) <= 0) v.push(`Placement "${p.key}" has a non-positive scale.`);
    if (p.zIndexOverride !== undefined) overrides += 1;

    const attaches = ATTACHING_ROLES.has(item.role);
    if (attaches && !p.attachTo) {
      v.push(`"${p.key}" is a ${item.role} and must declare attachTo — props sit on something.`);
    }
    if (!attaches && p.attachTo) {
      v.push(`"${p.key}" is a ${item.role} and cannot attach; only roof and wall props do.`);
    }
    if (p.attachTo && !seen.has(p.attachTo)) {
      v.push(`"${p.key}" attaches to "${p.attachTo}", which is not placed before it.`);
    }

    const width = item.defaultWidthRatio * (p.scale ?? 1);
    if (item.role === "BUILDING") {
      const { min, max } = WORLD_COMPOSITION.buildingWidth;
      if (width < min || width > max) {
        v.push(`"${p.key}" is ${(width * 100).toFixed(0)}% of world width; buildings run ${min * 100}–${max * 100}%.`);
      }
    }
    if (item.role === "HERO_BUILDING") {
      const { min, max } = WORLD_COMPOSITION.heroBuildingWidth;
      if (width < min || width > max) {
        v.push(`"${p.key}" is ${(width * 100).toFixed(0)}% of world width; a hero runs ${min * 100}–${max * 100}%.`);
      }
    }
  }

  if (overrides > WORLD_COMPOSITION.maxZIndexOverrides) {
    v.push(
      `${overrides} zIndexOverrides in one scene. Depth is meant to be computed; overrides are an escape hatch, not a layout method.`
    );
  }

  /*
   * THE GROUND'S OWN CONTRACT. Both of these are things that look fine in
   * a still frame and break the moment the world moves.
   */
  for (const p of placements) {
    const item = manifest[p.assetId];
    if (!item || item.role !== "GROUND") continue;

    const covered = item.defaultWidthRatio * (p.scale ?? 1);
    const needed = 1 + WORLD_GROUND.minOverhang * 2;
    if (covered < needed) {
      v.push(
        `Ground "${p.key}" covers ${covered.toFixed(2)}x the viewport; it needs ${needed.toFixed(2)}x so panning never exposes an edge.`
      );
    }
  }

  for (const r of resolveScene(manifest, placements, box)) {
    if (!r.item.critical) continue;

    if (r.height > box.height * WORLD_COMPOSITION.maxCriticalHeight) {
      v.push(
        `"${r.key}" is ${((r.height / box.height) * 100).toFixed(0)}% of world height; critical assets stop at ${WORLD_COMPOSITION.maxCriticalHeight * 100}%.`
      );
    }
    if (r.top < box.safeTop) {
      v.push(`"${r.key}" reaches into the top HUD. Background may be cropped there; a critical asset may not.`);
    }
    if (r.top + r.height > box.height - box.safeBottom) {
      v.push(`"${r.key}" reaches into the bottom sheet. Background may be cropped there; a critical asset may not.`);
    }

  }

  /*
   * THE LANE MUST STAY DRIVEABLE. Checked on ground contact rather than on
   * the drawn rectangle: a building's roof may well hang over the road, and
   * that is what a street looks like. What may not happen is something
   * STANDING in the lane the professional travels along.
   */
  for (const p of placements) {
    const item = manifest[p.assetId];
    if (!item || item.role === "GROUND" || item.role === "PRESENCE") continue;
    if (ATTACHING_ROLES.has(item.role)) continue;

    const { from, to } = WORLD_GROUND.corridor;
    if (p.y > from && p.y < to) {
      v.push(
        `"${p.key}" stands in the journey lane (y ${p.y}); it is the road the professional travels along, not a parking space.`
      );
    }
  }

  return v;
}

/**
 * Is a manifest entry self-consistent?
 *
 * Worth checking on load rather than trusting, because the manifest arrives
 * from outside the repository and a zero intrinsic width produces an
 * infinite aspect ratio and a blank screen several layers away from the
 * mistake.
 */
export function manifestViolations(manifest: WorldAssetManifest): string[] {
  const v: string[] = [];
  for (const [id, item] of Object.entries(manifest)) {
    if (item.id !== id) v.push(`Manifest key "${id}" does not match its item's id "${item.id}".`);
    if (item.intrinsicWidth <= 0 || item.intrinsicHeight <= 0) {
      v.push(`"${id}" has a non-positive intrinsic size.`);
    }
    if (item.anchor.x < 0 || item.anchor.x > 1 || item.anchor.y < 0 || item.anchor.y > 1) {
      v.push(`"${id}" has an anchor outside 0..1.`);
    }
    if (item.defaultWidthRatio <= 0 || item.defaultWidthRatio > 1) {
      v.push(`"${id}" has defaultWidthRatio ${item.defaultWidthRatio}; it is a fraction of world width.`);
    }
    if (!item.file.endsWith(".webp")) {
      v.push(`"${id}" is "${item.file}"; world art ships as transparent WebP.`);
    }
  }
  return v;
}

/**
 * THE GROUND AS A MATERIAL, NOT AS A SCENE.
 *
 * ---------------------------------------------------------------------
 * WHY FOUR FILES AND NOT ONE CITY
 * ---------------------------------------------------------------------
 * The neighbourhood plate is a picture of a place: a road with markings,
 * palms, benches, lamps, crossings. Repeat it across a real extract and
 * two things go wrong at once. The eye finds the same palm every 108
 * metres however the copies are flipped, and — worse — the painted road
 * fights the real road carved over it from the extract.
 *
 * ChatGPT's answer was a change of kind rather than of quantity:
 *
 *     "4 tiles seamless של ground בלבד, שכל אחד 1024×1024... בלי דקל,
 *      ספסל, פנס, מעבר חציה או אובייקט גדול שחוזר במיקום קבוע. ה-base
 *      tile צריך להיות חומר, לא סצנה."
 *
 * So: paving and stone, seamless on all four edges and against each
 * other, with nothing in them anybody could recognise twice. Everything
 * that used to be painted in — the trees, the lamps, the benches — comes
 * back as props scattered in code from a seed per tile coordinate, so
 * the same corner always looks the same without the same corner
 * appearing eight times.
 *
 * The ids follow the `world_` prefix, so `kindOfAssetId` already calls
 * them GROUND and the visual register already forbids them being
 * photographs.
 */
export const GROUND_MATERIAL_IDS = [
  "world_ground_mat_1",
  "world_ground_mat_2",
  "world_ground_mat_3",
  "world_ground_mat_4",
] as const;

export type GroundMaterialId = (typeof GROUND_MATERIAL_IDS)[number];

/**
 * Which material tiles this build actually has.
 *
 * Returns them in a fixed order, and an EMPTY array until at least two
 * exist. One tile is not a material kit — it is the same wallpaper with
 * extra steps — so a half-delivered set falls back to the painted plate
 * rather than shipping a worse version of the thing it replaces.
 */
export function groundMaterials(
  has: (assetId: string) => boolean
): GroundMaterialId[] {
  const found = GROUND_MATERIAL_IDS.filter((id) => has(id));
  return found.length >= 2 ? found : [];
}
