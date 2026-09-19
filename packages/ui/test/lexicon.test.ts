import { describe, expect, it } from "vitest";

import { lex, nearestLine, prosFree, prosFreeNearYou } from "../src/lexicon";

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
