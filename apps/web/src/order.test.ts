import { describe, expect, it } from "vitest";

import { composeDescription, detailsNoteHe, livePriceHe, orderSummary, priceRows } from "./order";

describe("the request form's price and order", () => {
  it("lists a service's example prices", () => {
    expect(priceRows("svc-nails").map((r) => r.nameHe)).toContain("מניקור");
    expect(priceRows("svc-nails")[0]!.amountHe).toMatch(/120/);
  });

  it("shows the same figure as the service page's \"from\" price", () => {
    // 285, not rounded to 290: the page says "החל מ־285 ₪".
    expect(priceRows("svc-clean")[0]!.amountHe).toMatch(/285/);
  });

  it("sums what was picked, and says nothing when nothing is", () => {
    const o = orderSummary("svc-nails", ["p1", "p2"]);
    expect(o?.namesHe).toBe("מניקור + פדיקור");
    expect(o?.totalHe).toMatch(/270/);
    expect(orderSummary("svc-nails", [])).toBeNull();
  });

  it("labels a picked price as an example", () => {
    expect(livePriceHe("svc-nails", ["p1"])).toContain("לפי המחירון לדוגמה");
    expect(livePriceHe("svc-nails", [])).toBe("בחרו מה להזמין מהמחירון");
  });

  it("never says a card is charged (D1: no money in the app)", () => {
    for (const id of ["svc-nails", "svc-clean", "svc-towing", "svc-moving"]) {
      expect(livePriceHe(id, ["p1"]) ?? "").not.toMatch(/כרטיס|משלמים רק/);
      expect(detailsNoteHe(id)).not.toMatch(/כרטיס/);
    }
  });

  it("puts the order and the destination in the professional's description", () => {
    // formatMoney adds bidi marks around the figure; the words are what matter.
    const plain = (s: string | undefined) => s?.replace(/[\u200e\u200f]/g, "").replace(/\u00a0/g, " ");
    expect(plain(composeDescription("svc-nails", " ציפורניים שבורות ", ["p1"], null))).toBe(
      "ציפורניים שבורות\nהוזמן: מניקור (120 ₪ לפי המחירון לדוגמה)"
    );
    expect(composeDescription("svc-towing", "", [], "מוסך בבני ברק")).toBe("יעד: מוסך בבני ברק");
    expect(composeDescription("svc-nails", "  ", [], "  ")).toBeUndefined();
  });
});
