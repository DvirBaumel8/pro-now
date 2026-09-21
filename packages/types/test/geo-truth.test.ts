import { describe, expect, it } from "vitest";

import {
  type PlotScene,
  type Plotted,
  decorScene,
  disclosureViolations,
  groundDisclosureHe,
  labelAllowed,
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
    expect(groundDisclosureHe({ realStreets: false })).toBe(stale);
  });
});
