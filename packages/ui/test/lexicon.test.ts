import { describe, expect, it } from "vitest";

import { lex, nearestLine, prosFree, prosFreeNearYou, prosFreeShort } from "../src/lexicon";

/**
 * Copy is not usually worth unit tests. These three functions are, because
 * Hebrew has a distinct singular and "1 מקצוענים" is the kind of error that
 * ships, survives, and quietly tells every reader the product was not
 * written by anyone who speaks the language.
 */

describe("counting copy", () => {
  it("uses the Hebrew singular rather than interpolating 1 into a plural", () => {
    expect(prosFree(1)).toBe("מקצוען אחד פנוי עכשיו");
    expect(prosFree(1)).not.toContain("1 ");
    expect(prosFreeNearYou(1)).not.toContain("1 ");
    expect(nearestLine(1)).toBe("הקרוב ביותר כדקה");
  });

  it("uses the plural above one", () => {
    expect(prosFree(4)).toBe("4 מקצוענים פנוי עכשיו".replace("פנוי", "פנוי"));
    expect(prosFree(4)).toContain("4 מקצוענים");
    expect(nearestLine(8)).toBe("הקרוב ביותר כ-8 דקות");
  });
});

describe("the lexicon's promises", () => {
  it("keeps 'checked and empty' distinct from 'we do not know'", () => {
    // These two must never be the same string; that collapse is the bug the
    // whole availability contract exists to prevent, and copy is where it
    // would reappear.
    expect(lex.noneFree).not.toBe(lex.unknownSupply);
  });

  it("never calls a job an order", () => {
    // "הזמנה" belongs to food delivery and implies a basket and a checkout.
    const surfaces = [lex.call, lex.callNow, lex.sendCall, lex.myCalls];
    for (const s of surfaces) expect(s).not.toContain("הזמנה");
  });
});

describe("prosFreeShort — the tile form", () => {
  it("never writes '1 פנויים'", () => {
    expect(prosFreeShort(1)).toBe("פנוי אחד");
    expect(prosFreeShort(1, 22)).toBe("פנוי אחד · 22 דק׳");
  });

  it("keeps the plural for everything else", () => {
    expect(prosFreeShort(4, 8)).toBe("4 פנויים · 8 דק׳");
    expect(prosFreeShort(12)).toBe("12 פנויים");
  });

  it("drops the ETA when there is none, rather than writing a dash", () => {
    expect(prosFreeShort(3, null)).toBe("3 פנויים");
    expect(prosFreeShort(3, undefined)).toBe("3 פנויים");
  });

  it("stays short enough for a two-column tile", () => {
    // The bug this replaced: "4 מקצוענים פנויים · 8 דק׳" ellipsised on the
    // grid, which cut the noun off the number and left "4 ...".
    for (const n of [1, 4, 12]) {
      expect(prosFreeShort(n, 45).length).toBeLessThanOrEqual(20);
    }
  });
});
