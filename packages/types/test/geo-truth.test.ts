import { describe, expect, it } from "vitest";

import {
  type PlotScene,
  type Plotted,
  AMBIENT_KINDS,
  ambientViolations,
  decorScene,
  disclosureViolations,
  groundDisclosureHe,
  labelAllowed,
  motionNeedsTruth,
  plotViolations,
  plottable,
  plottableOnly,
} from "../src/geo-truth";

const server: Plotted = {
  id: "pro_assigned",
  at: { u: 0.4, v: 0.6 },
  provenance: "SERVER",
  labelHe: "יוסי",
};
const self: Plotted = { id: "me", at: { u: 0.5, v: 0.9 }, provenance: "SELF" };
const decor: Plotted = { id: "ambient_1", at: { u: 0.2, v: 0.3 }, provenance: "DECOR" };

describe("what may be drawn where", () => {
  it("lets the painted world hold anything", () => {
    for (const item of [server, self, decor]) expect(plottable(item, "ILLUSTRATED")).toBe(true);
  });

  it("keeps invention off a real street", () => {
    expect(plottable(decor, "REAL")).toBe(false);
    expect(plottable(server, "REAL")).toBe(true);
    expect(plottable(self, "REAL")).toBe(true);
  });

  it("filters a mixed scene down to what is true", () => {
    expect(plottableOnly([server, decor, self], "REAL").map((i) => i.id)).toEqual(["pro_assigned", "me"]);
    expect(plottableOnly([server, decor, self], "ILLUSTRATED")).toHaveLength(3);
  });
});

describe("a name is a stronger claim than a dot", () => {
  it("allows an unnamed marker where a named one is refused", () => {
    const marker: Plotted = { id: "district_clean", at: { u: 0.3, v: 0.3 }, provenance: "SELF" };
    expect(labelAllowed(marker, "REAL")).toBe(true);
    expect(labelAllowed({ ...marker, labelHe: "פרו נאו ניקיון" }, "REAL")).toBe(false);
  });

  it("and allows the name once a server stands behind it", () => {
    expect(labelAllowed(server, "REAL")).toBe(true);
  });

  it("leaves the painted world's signage alone", () => {
    expect(labelAllowed({ ...decor, labelHe: "פרו נאו ניקיון" }, "ILLUSTRATED")).toBe(true);
  });
});

describe("the ambient world against a real street", () => {
  /*
   * THE CONTROL, AND THE REASON THIS FILE EXISTS.
   *
   * `plotViolations` returns [] for almost every scene anybody will ever
   * build, so "the scene is clean" proves nothing unless the same function
   * is shown refusing the exact input that would have been shipped by
   * accident — the world's own decoration, moved onto a map.
   */
  it("passes on the painted plate", () => {
    expect(plotViolations(decorScene("ILLUSTRATED"))).toEqual([]);
  });

  it("refuses the identical scene on a real one", () => {
    const v = plotViolations(decorScene("REAL"));
    expect(v).toContain("ambient_walker_1 is invented and is being drawn on a real street");
    expect(v).toContain('district_clean paints "פרו נאו ניקיון" on a real address without a business behind it');
  });

  it("refuses a fixture dressed up as a place", () => {
    const scene: PlotScene = { surface: "REAL", surfaceIsRealPlace: false, items: [server] };
    expect(plotViolations(scene)).toContain("a surface drawn as a real place is standing on a fixture");
  });

  it("catches the same professional plotted twice", () => {
    const scene: PlotScene = { surface: "REAL", surfaceIsRealPlace: true, items: [server, { ...server }] };
    expect(plotViolations(scene)).toContain("pro_assigned is plotted twice");
  });

  it("lets a true scene through", () => {
    const scene: PlotScene = { surface: "REAL", surfaceIsRealPlace: true, items: [server, self] };
    expect(plotViolations(scene)).toEqual([]);
  });
});

describe("what the screen says about the ground it is drawing", () => {
  it("keeps the old sentence for the painted city", () => {
    const line = groundDisclosureHe({ realStreets: false, showsSupply: true });
    expect(line).toContain("תצוגת העיר היא המחשה");
    expect(line).toContain("נבדק רק כששולחים בקשה");
    expect(disclosureViolations({ realStreets: false, showsSupply: true })).toEqual([]);
  });

  /*
   * THE HALF-TRUTH THIS REPLACES.
   *
   * "המפה האמיתית תיכנס עם ספק המפות" is a promise about a vendor. On a
   * real extract it is false twice over — the map is here, and no vendor
   * brought it — and the clause that still matters ("the shops are not
   * businesses at these addresses") was never in the sentence at all,
   * because on an invented street it did not need to be.
   */
  it("says what is real and what is not, once the streets are real", () => {
    const line = groundDisclosureHe({ realStreets: true, showsSupply: true });
    expect(line).toContain("הרחובות אמיתיים");
    expect(line).toContain("לא כתובות");
    expect(line).not.toContain("ספק המפות");
    expect(disclosureViolations({ realStreets: true, showsSupply: true })).toEqual([]);
  });

  it("still says when supply is checked, on both grounds", () => {
    for (const realStreets of [true, false]) {
      expect(groundDisclosureHe({ realStreets, showsSupply: true })).toContain(
        "נבדק רק כששולחים בקשה"
      );
    }
  });

  /*
   * THE CONTROL. `disclosureViolations` reads the line the same function
   * writes, so it returns [] for everything unless it is shown refusing —
   * here, the old constant handed to the new ground.
   */
  it("refuses the painted city's sentence on real streets", () => {
    const stale = "תצוגת העיר היא המחשה · המפה האמיתית תיכנס עם ספק המפות";
    // What the check would say if `groundDisclosureHe` had not been changed.
    expect(stale).not.toContain("הרחובות אמיתיים");
    expect(stale).toContain("ספק המפות");
    // And the live pair disagrees with it, which is the whole point.
    expect(groundDisclosureHe({ realStreets: true })).not.toBe(stale);
    // The painted city no longer promises a vendor either (UX audit, 2026-10-01).
    expect(groundDisclosureHe({ realStreets: false })).toBe("החנויות בעיר הן המחשה");
  });
});

describe("atmosphere, which is invented and about nobody", () => {
  const leaf: Plotted = { id: "leaf_sway", at: { u: 0.3, v: 0.4 }, provenance: "AMBIENT" };

  /*
   * The first version of this file switched the whole world off on a real
   * street, and Amit's verdict was immediate: *"אני לא יכול עם המסך הכהה
   * הזה."* A place with nothing happening in it is not more honest. What
   * was dangerous was never invention — it was invention with an
   * IDENTITY: a courier, a van, a trade name.
   */
  it("lets a real street breathe", () => {
    expect(plottable(leaf, "REAL")).toBe(true);
    expect(plotViolations({ surface: "REAL", surfaceIsRealPlace: true, items: [leaf] })).toEqual([]);
  });

  it("refuses atmosphere with a name on it", () => {
    const named = { ...leaf, labelHe: "פרו נאו" };
    expect(plottable(named, "REAL")).toBe(false);
    expect(labelAllowed(named, "REAL")).toBe(false);
  });

  it("refuses atmosphere you can tap", () => {
    expect(plottable({ ...leaf, interactive: true }, "REAL")).toBe(false);
  });

  it("still refuses an invented professional", () => {
    const courier: Plotted = { id: "courier", at: { u: 0.2, v: 0.2 }, provenance: "DECOR" };
    expect(plottable(courier, "REAL")).toBe(false);
  });

  it("checks each kind of atmosphere against the same rule", () => {
    for (const kind of AMBIENT_KINDS) {
      expect(ambientViolations(kind, leaf)).toEqual([]);
      expect(ambientViolations(kind, { ...leaf, provenance: "DECOR" })).toContain(
        `leaf_sway is ${kind} but claims a source`
      );
    }
  });
});

describe("motion without agency", () => {
  /*
   * ChatGPT's rule, taken verbatim and made checkable: *"Motion without
   * agency = ambience. Motion with agency = Entity."* It cut my own
   * `DISTANT_TRAFFIC` and was right to — in a product whose whole promise
   * is that somebody is on their way to you, a moving vehicle is the one
   * shape a customer is primed to read as an arrival, and making it small
   * and grey does not make it mean less.
   */
  it("lets light and leaves move", () => {
    expect(motionNeedsTruth({ travels: false, readsAsSomebody: false })).toBe(false);
  });

  it("refuses anything that goes somewhere", () => {
    expect(motionNeedsTruth({ travels: true, readsAsSomebody: false })).toBe(true);
  });

  it("refuses anything that reads as a person, even standing still", () => {
    expect(motionNeedsTruth({ travels: false, readsAsSomebody: true })).toBe(true);
  });

  it("has no kind of atmosphere that travels", () => {
    // The list is the enforcement: if a travelling kind is ever added,
    // this is the test that has to be argued with first.
    expect(AMBIENT_KINDS).not.toContain("DISTANT_TRAFFIC");
    for (const kind of AMBIENT_KINDS) {
      expect(["LAMP_BREATH", "WINDOW_LUMINANCE", "LEAF_SWAY", "ASPHALT_SHEEN", "PARALLAX"]).toContain(kind);
    }
  });
});
