import { describe, expect, it } from "vitest";

import { SIGN_MIN_WIDTH, signAccent, signFontSize } from "../src/components/livingmap/signStyle";

describe("a shop's sign tells you whose shop it is", () => {
  it("gives the same professional the same colour every time", () => {
    // An index would change when the candidate list is re-ordered, and a
    // shop that changes colour between two frames of one search reads as a
    // different shop.
    expect(signAccent("cand_7")).toBe(signAccent("cand_7"));
  });

  it("gives two professionals different colours often enough to matter", () => {
    const ids = Array.from({ length: 24 }, (_, i) => `cand_${i}`);
    const distinct = new Set(ids.map(signAccent));
    // Not a promise of uniqueness — with six colours and enough shops two
    // will collide, and that is fine because the NAME is the identifier.
    // The colour only has to do the work before you read.
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });

  it("refuses to draw a name too small to read", () => {
    // An unreadable sign on every shop at once is noise, not signage.
    expect(SIGN_MIN_WIDTH).toBeGreaterThan(60);
  });

  it("keeps every sign in one type family whatever the camera does", () => {
    // Unbounded scaling gives the near shop a headline and the far one
    // nothing legible, and the street stops reading as one product.
    expect(signFontSize(60)).toBeGreaterThanOrEqual(9);
    expect(signFontSize(4000)).toBeLessThanOrEqual(15);
    expect(signFontSize(120)).toBeGreaterThan(signFontSize(80));
  });
});
