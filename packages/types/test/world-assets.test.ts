import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANCHOR,
  manifestViolations,
  resolveScene,
  scenePlacementViolations,
  clampPan,
  NO_PAN,
  panOffsetFor,
  WORLD_COMPOSITION,
  WORLD_GROUND,
  type SceneBox,
  type ScenePlacement,
  type WorldAssetManifest,
  type WorldAssetManifestItem,
} from "../src/world-assets";

/**
 * A stand-in pack shaped like the real one. Every test below is about the
 * arithmetic and the rules, never about the art, which is the whole reason
 * the art lives outside the repository.
 */
function item(over: Partial<WorldAssetManifestItem> & { id: string }): WorldAssetManifestItem {
  return {
    file: `${over.id}.webp`,
    intrinsicWidth: 1000,
    intrinsicHeight: 1000,
    anchor: { ...DEFAULT_ANCHOR },
    role: "BUILDING",
    theme: "SHARED",
    defaultWidthRatio: 0.27,
    critical: false,
    ...over,
  };
}

const MANIFEST: WorldAssetManifest = {
  barbershop: item({ id: "barbershop", role: "HERO_BUILDING", theme: "HAIR", defaultWidthRatio: 0.36, critical: true }),
  residential_01: item({ id: "residential_01" }),
  residential_02: item({ id: "residential_02", defaultWidthRatio: 0.24 }),
  ficus: item({ id: "ficus", role: "TREE", defaultWidthRatio: 0.22 }),
  scooter: item({ id: "scooter", role: "VEHICLE", defaultWidthRatio: 0.16, intrinsicWidth: 1000, intrinsicHeight: 600 }),
  solar: item({ id: "solar", role: "ROOF_PROP", defaultWidthRatio: 0.08, anchor: { x: 0.5, y: 0.5 } }),
};

const BOX: SceneBox = { width: 430, height: 600, safeTop: 90, safeBottom: 150 };

describe("resolveScene", () => {
  it("sizes an asset as a share of world width, not in pixels", () => {
    const [r] = resolveScene(MANIFEST, [{ key: "a", assetId: "residential_01", x: 0.5, y: 0.8 }], BOX);
    expect(r.width).toBeCloseTo(430 * 0.27);
  });

  it("keeps that share when the viewport changes", () => {
    const place: ScenePlacement[] = [{ key: "a", assetId: "residential_01", x: 0.5, y: 0.8 }];
    const small = resolveScene(MANIFEST, place, BOX)[0];
    const large = resolveScene(MANIFEST, place, { ...BOX, width: 860 })[0];
    expect(large.width / 860).toBeCloseTo(small.width / 430);
  });

  it("derives height from the intrinsic aspect ratio", () => {
    const [r] = resolveScene(MANIFEST, [{ key: "a", assetId: "scooter", x: 0.5, y: 0.8 }], BOX);
    expect(r.height).toBeCloseTo(r.width * 0.6);
  });

  it("positions the ANCHOR at (x, y), not the corner", () => {
    // Two assets of very different heights on the same ground line should
    // share a bottom edge — this is what makes them stand on one street.
    const [a, b] = resolveScene(
      MANIFEST,
      [
        { key: "tall", assetId: "residential_01", x: 0.3, y: 0.8 },
        { key: "short", assetId: "scooter", x: 0.7, y: 0.8 },
      ],
      BOX
    ).sort((l, r) => l.left - r.left);
    expect(a.top + a.height).toBeCloseTo(b.top + b.height);
  });

  it("sorts back to front by ground line", () => {
    const order = resolveScene(
      MANIFEST,
      [
        { key: "front", assetId: "residential_01", x: 0.5, y: 0.9 },
        { key: "back", assetId: "residential_02", x: 0.5, y: 0.5 },
      ],
      BOX
    ).map((r) => r.key);
    expect(order).toEqual(["back", "front"]);
  });

  it("draws a vehicle in front of a building on the same ground line", () => {
    const order = resolveScene(
      MANIFEST,
      [
        { key: "building", assetId: "residential_01", x: 0.4, y: 0.8 },
        { key: "scooter", assetId: "scooter", x: 0.5, y: 0.8 },
      ],
      BOX
    ).map((r) => r.key);
    expect(order).toEqual(["building", "scooter"]);
  });

  it("gives an attached prop its parent's depth, not its own", () => {
    // A solar heater on a roof sits high on the screen, so its own ground
    // line would sort it far into the background — behind the building
    // holding it up.
    const scene = resolveScene(
      MANIFEST,
      [
        { key: "building", assetId: "residential_01", x: 0.5, y: 0.9 },
        { key: "heater", assetId: "solar", x: 0.5, y: 0.45, attachTo: "building" },
      ],
      BOX
    );
    expect(scene.map((r) => r.key)).toEqual(["building", "heater"]);
  });

  it("drops an unknown asset instead of crashing the scene", () => {
    const scene = resolveScene(
      MANIFEST,
      [
        { key: "ok", assetId: "residential_01", x: 0.5, y: 0.8 },
        { key: "missing", assetId: "not_in_pack", x: 0.5, y: 0.8 },
      ],
      BOX
    );
    expect(scene.map((r) => r.key)).toEqual(["ok"]);
  });
});

describe("scenePlacementViolations", () => {
  const ok: ScenePlacement[] = [
    { key: "shop", assetId: "barbershop", x: 0.5, y: 0.74 },
    { key: "left", assetId: "residential_01", x: 0.18, y: 0.72 },
    { key: "heater", assetId: "solar", x: 0.18, y: 0.55, attachTo: "left" },
  ];

  it("passes a legal scene", () => {
    expect(scenePlacementViolations(MANIFEST, ok, BOX)).toEqual([]);
  });

  it("catches an anchor outside 0..1", () => {
    const v = scenePlacementViolations(MANIFEST, [{ key: "a", assetId: "residential_01", x: 1.4, y: 0.8 }], BOX);
    expect(v.join(" ")).toContain("normalized");
  });

  it("catches an unknown asset id", () => {
    const v = scenePlacementViolations(MANIFEST, [{ key: "a", assetId: "ghost", x: 0.5, y: 0.8 }], BOX);
    expect(v.join(" ")).toContain("unknown asset");
  });

  it("catches a duplicate key", () => {
    const v = scenePlacementViolations(
      MANIFEST,
      [
        { key: "a", assetId: "residential_01", x: 0.3, y: 0.8 },
        { key: "a", assetId: "residential_02", x: 0.6, y: 0.8 },
      ],
      BOX
    );
    expect(v.join(" ")).toContain("Duplicate");
  });

  it("requires a roof prop to attach to something", () => {
    const v = scenePlacementViolations(MANIFEST, [{ key: "h", assetId: "solar", x: 0.5, y: 0.5 }], BOX);
    expect(v.join(" ")).toContain("must declare attachTo");
  });

  it("refuses to let a building attach", () => {
    const v = scenePlacementViolations(
      MANIFEST,
      [
        { key: "a", assetId: "residential_01", x: 0.3, y: 0.8 },
        { key: "b", assetId: "residential_02", x: 0.6, y: 0.8, attachTo: "a" },
      ],
      BOX
    );
    expect(v.join(" ")).toContain("cannot attach");
  });

  it("catches a building outside its width band", () => {
    const v = scenePlacementViolations(
      MANIFEST,
      [{ key: "a", assetId: "residential_01", x: 0.5, y: 0.8, scale: 2 }],
      BOX
    );
    expect(v.join(" ")).toContain("buildings run");
  });

  it("catches a critical asset reaching into the top HUD", () => {
    // Lifted until its roof crosses into the band the HUD occupies.
    const v = scenePlacementViolations(MANIFEST, [{ key: "shop", assetId: "barbershop", x: 0.5, y: 0.35 }], BOX);
    expect(v.join(" ")).toContain("top HUD");
  });

  it("catches a critical asset reaching into the bottom sheet", () => {
    const v = scenePlacementViolations(MANIFEST, [{ key: "shop", assetId: "barbershop", x: 0.5, y: 0.98 }], BOX);
    expect(v.join(" ")).toContain("bottom sheet");
  });

  it("lets background art be cropped by a safe zone", () => {
    // Same geometry, non-critical asset. Nothing is reported.
    const v = scenePlacementViolations(MANIFEST, [{ key: "b", assetId: "residential_01", x: 0.5, y: 1 }], BOX);
    expect(v).toEqual([]);
  });

  it("complains once depth is being authored by hand", () => {
    const many: ScenePlacement[] = Array.from({ length: WORLD_COMPOSITION.maxZIndexOverrides + 1 }, (_, i) => ({
      key: `a${i}`,
      assetId: "residential_01",
      x: 0.5,
      y: 0.8,
      zIndexOverride: i,
    }));
    expect(scenePlacementViolations(MANIFEST, many, BOX).join(" ")).toContain("escape hatch");
  });
});

describe("manifestViolations", () => {
  it("accepts the stand-in pack", () => {
    expect(manifestViolations(MANIFEST)).toEqual([]);
  });

  it("catches a key that disagrees with its item", () => {
    const bad: WorldAssetManifest = { wrong: item({ id: "right" }) };
    expect(manifestViolations(bad).join(" ")).toContain("does not match");
  });

  it("catches a zero intrinsic size before it becomes a blank screen", () => {
    const bad: WorldAssetManifest = { a: item({ id: "a", intrinsicWidth: 0 }) };
    expect(manifestViolations(bad).join(" ")).toContain("non-positive intrinsic size");
  });

  it("catches a defaultWidthRatio that was written as a pixel multiplier", () => {
    const bad: WorldAssetManifest = { a: item({ id: "a", defaultWidthRatio: 2.5 }) };
    expect(manifestViolations(bad).join(" ")).toContain("fraction of world width");
  });

  it("insists world art ships as WebP", () => {
    const bad: WorldAssetManifest = { a: item({ id: "a", file: "a.png" }) };
    expect(manifestViolations(bad).join(" ")).toContain("transparent WebP");
  });
});

describe("layer bands", () => {
  const BANDED: WorldAssetManifest = {
    ...MANIFEST,
    road: item({ id: "road", role: "GROUND", defaultWidthRatio: 1, anchor: { x: 0.5, y: 0.5 } }),
    rider: item({ id: "rider", role: "PRESENCE", defaultWidthRatio: 0.18 }),
  };

  it("keeps the ground behind everything, wherever it is anchored", () => {
    // The road's anchor sits low on the screen — lower than the building's
    // — so a single flat depth sort would draw it in FRONT of the building.
    const order = resolveScene(
      BANDED,
      [
        { key: "road", assetId: "road", x: 0.5, y: 0.95 },
        { key: "block", assetId: "residential_01", x: 0.5, y: 0.5 },
      ],
      BOX
    ).map((r) => r.key);
    expect(order).toEqual(["road", "block"]);
  });

  it("keeps the professional in front of the world, wherever they are", () => {
    const order = resolveScene(
      BANDED,
      [
        { key: "rider", assetId: "rider", x: 0.5, y: 0.2 },
        { key: "block", assetId: "residential_01", x: 0.5, y: 0.95 },
      ],
      BOX
    ).map((r) => r.key);
    expect(order).toEqual(["block", "rider"]);
  });

  it("never lets a roof prop sort behind the building holding it", () => {
    const order = resolveScene(
      BANDED,
      [
        { key: "heater", assetId: "solar", x: 0.5, y: 0.2, attachTo: "block" },
        { key: "block", assetId: "residential_01", x: 0.5, y: 0.95 },
      ],
      BOX
    ).map((r) => r.key);
    expect(order).toEqual(["block", "heater"]);
  });

  it("still sorts by ground line inside one band", () => {
    const order = resolveScene(
      BANDED,
      [
        { key: "front", assetId: "residential_01", x: 0.3, y: 0.9 },
        { key: "back", assetId: "residential_02", x: 0.7, y: 0.5 },
      ],
      BOX
    ).map((r) => r.key);
    expect(order).toEqual(["back", "front"]);
  });
});

describe("the ground and the room to travel on it", () => {
  const GROUNDED: WorldAssetManifest = {
    ...MANIFEST,
    road: item({ id: "road", role: "GROUND", defaultWidthRatio: 1.5, anchor: { x: 0.5, y: 0.5 } }),
    thin: item({ id: "thin", role: "GROUND", defaultWidthRatio: 1.05, anchor: { x: 0.5, y: 0.5 } }),
  };

  it("accepts a ground wide enough to pan across", () => {
    const v = scenePlacementViolations(GROUNDED, [{ key: "g", assetId: "road", x: 0.5, y: 0.5 }], BOX);
    expect(v).toEqual([]);
  });

  it("rejects a ground that would expose its own edge on the first drag", () => {
    const v = scenePlacementViolations(GROUNDED, [{ key: "g", assetId: "thin", x: 0.5, y: 0.5 }], BOX);
    expect(v.join(" ")).toContain("panning never exposes an edge");
  });

  it("keeps the journey lane clear of anything standing in it", () => {
    const v = scenePlacementViolations(GROUNDED, [{ key: "bench", assetId: "ficus", x: 0.3, y: 0.87 }], BOX);
    expect(v.join(" ")).toContain("journey lane");
  });

  it("lets a building stand behind the lane, even if its roof hangs over it", () => {
    // Ground contact above the lane; the drawn rectangle reaches well into
    // it, which is simply what a street of buildings looks like.
    const v = scenePlacementViolations(GROUNDED, [{ key: "shop", assetId: "barbershop", x: 0.5, y: 0.74 }], BOX);
    expect(v.join(" ")).not.toContain("journey lane");
  });

  it("lets the ground lie under the lane, because it is the road", () => {
    const v = scenePlacementViolations(GROUNDED, [{ key: "g", assetId: "road", x: 0.5, y: 0.88 }], BOX);
    expect(v.join(" ")).not.toContain("journey lane");
  });

  it("clamps a pan to the overhang so the world has no visible edge", () => {
    expect(clampPan({ x: 9, y: -9 })).toEqual({ x: WORLD_GROUND.minOverhang, y: -WORLD_GROUND.minOverhang });
    expect(clampPan({ x: 0.1, y: -0.1 })).toEqual({ x: 0.1, y: -0.1 });
  });

  it("moves nearer bands further than the ground, which is what reads as depth", () => {
    const pan = { x: 0.2, y: 0 };
    const ground = panOffsetFor("GROUND_LAYER", pan, BOX).dx;
    const object = panOffsetFor("WORLD_OBJECT", pan, BOX).dx;
    const presence = panOffsetFor("PRESENCE", pan, BOX).dx;
    expect(object).toBeGreaterThan(ground);
    expect(presence).toBeGreaterThan(object);
  });

  it("moves nothing when the world has not been panned", () => {
    expect(panOffsetFor("WORLD_OBJECT", NO_PAN, BOX)).toEqual({ dx: 0, dy: 0 });
  });
});
